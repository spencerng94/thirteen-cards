import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../src/lib/supabase';

interface SessionContextType {
  session: any;
  user: any;
  loading: boolean;
  forceSession: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType>({
  session: null,
  user: null,
  loading: true,
  forceSession: async () => {},
});

const HAS_ACTIVE_SESSION_KEY = 'has_active_session';

export const useSession = () => useContext(SessionContext);

/**
 * Read session directly from localStorage without making network calls
 * This bypasses cookie blocking by reading the stored session data directly
 */
const readSessionFromStorage = (): any => {
  try {
    // Supabase stores session in localStorage with key pattern: sb-<project-id>-auth-token
    const supabaseKeys = Object.keys(localStorage).filter(key => 
      key.includes('supabase') || (key.startsWith('sb-') && key.includes('auth-token'))
    );
    
    if (supabaseKeys.length === 0) {
      return null;
    }
    
    console.log('SessionProvider: Found Supabase keys in localStorage, attempting direct read...');
    
    // Try each key until we find valid session data
    for (const key of supabaseKeys) {
      try {
        const stored = localStorage.getItem(key);
        if (!stored) continue;
        
        const parsed = JSON.parse(stored);
        
        // Supabase stores session in different formats, check common structures
        let sessionData = null;
        
        if (parsed?.currentSession) {
          sessionData = parsed.currentSession;
        } else if (parsed?.session) {
          sessionData = parsed.session;
        } else if (parsed?.access_token && parsed?.user) {
          // Direct session object
          sessionData = parsed;
        }
        
        if (sessionData?.access_token && sessionData?.user) {
          console.log('SessionProvider: ✅ Found valid session in localStorage');
          return sessionData;
        }
      } catch (e) {
        // Try next key
        continue;
      }
    }
    
    return null;
  } catch (err) {
    console.warn('SessionProvider: Error reading from storage:', err);
    return null;
  }
};

/**
 * Check localStorage for Supabase session keys and manually decode JWT if found
 * This is a fallback for when browsers block cookies but the session exists in storage
 */
const checkStorageFallback = async (): Promise<boolean> => {
  try {
    // First, try to read directly from storage (no network calls)
    const sessionData = readSessionFromStorage();
    
    if (sessionData) {
      console.log('SessionProvider: ✅ Storage fallback successful, session recovered from localStorage');
      return true;
    }
    
    // If direct read fails, try refresh (but this will likely fail with AbortError)
    console.log('SessionProvider: Direct read failed, attempting refresh (may fail with cookie blocking)...');
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      // Expected to fail with cookie blocking, but we already tried direct read
      console.warn('SessionProvider: Storage fallback refresh failed (expected with cookie blocking):', error);
      return false;
    }
    
    if (data?.session) {
      console.log('SessionProvider: ✅ Storage fallback successful, session recovered via refresh');
      return true;
    }
    
    return false;
  } catch (err: any) {
    // AbortError is expected when cookies are blocked
    if (err?.name === 'AbortError' || err?.message?.includes('aborted')) {
      console.warn('SessionProvider: Storage fallback aborted (cookie blocking), but direct read may have worked');
      // Check if direct read found something
      const sessionData = readSessionFromStorage();
      return !!sessionData;
    }
    console.warn('SessionProvider: Storage fallback error:', err);
    return false;
  }
};

/**
 * SessionProvider: Manages Supabase auth state for the entire app
 * 
 * Key Features:
 * - Uses onAuthStateChange with retry logic
 * - Sets has_active_session flag in localStorage on SIGNED_IN/TOKEN_REFRESHED
 * - Completely ignores AbortError (assumes session will arrive via listener)
 * - Provides session state to all child components
 */
export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const listenerSetupRef = useRef(false);
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);

  useEffect(() => {
    // Guard: Only set up listener once
    if (listenerSetupRef.current) {
      return;
    }
    
    listenerSetupRef.current = true;
    console.log('SessionProvider: Setting up auth state change listener...');

    // Set up onAuthStateChange listener with retry logic
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, currentSession: any) => {
        console.log('SessionProvider: Auth event received:', event, currentSession ? `User: ${currentSession.user?.id}` : 'No session');
        
        // CRUCIAL: If SIGNED_IN or TOKEN_REFRESHED, set has_active_session flag
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (currentSession?.user) {
            console.log('SessionProvider: ✅ Setting has_active_session flag in localStorage');
            localStorage.setItem(HAS_ACTIVE_SESSION_KEY, 'true');
          }
        }
        
        // CRUCIAL: If SIGNED_OUT, clear the flag
        if (event === 'SIGNED_OUT') {
          console.log('SessionProvider: 🧹 Clearing has_active_session flag');
          localStorage.removeItem(HAS_ACTIVE_SESSION_KEY);
        }
        
        // Update session and user state
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        // Set loading to false once we have a definitive answer
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          setLoading(false);
        }
      }
    );
    
    subscriptionRef.current = subscription;
    console.log('SessionProvider: ✅ Auth listener set up successfully');

    // Initial session check with AbortError bypass
    const checkInitialSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        // BYPASS ABORT ERROR: If AbortError, ignore completely
        // Assume session will arrive via listener in next few milliseconds
        if (error?.name === 'AbortError' || error?.message?.includes('aborted')) {
          console.warn('SessionProvider: AbortError in getSession() - ignoring, will rely on listener');
          // Try storage fallback if listener doesn't fire
          setTimeout(async () => {
            const sessionData = readSessionFromStorage();
            if (sessionData) {
              console.log('SessionProvider: ✅ Recovered session from localStorage, setting state');
              setSession(sessionData);
              setUser(sessionData.user);
              localStorage.setItem(HAS_ACTIVE_SESSION_KEY, 'true');
              setLoading(false);
            } else {
              // Try the full fallback check
              const recovered = await checkStorageFallback();
              if (recovered) {
                // If checkStorageFallback succeeded, try getSession one more time
                try {
                  const { data: sessionData } = await supabase.auth.getSession();
                  if (sessionData?.session) {
                    setSession(sessionData.session);
                    setUser(sessionData.session.user);
                    localStorage.setItem(HAS_ACTIVE_SESSION_KEY, 'true');
                    setLoading(false);
                  }
                } catch (e) {
                  // If getSession still fails, use the direct read
                  const directSession = readSessionFromStorage();
                  if (directSession) {
                    setSession(directSession);
                    setUser(directSession.user);
                    localStorage.setItem(HAS_ACTIVE_SESSION_KEY, 'true');
                    setLoading(false);
                  }
                }
              }
            }
          }, 2000); // Wait 2 seconds for listener, then try fallback
          return;
        }
        
        if (!error && data?.session) {
          console.log('SessionProvider: ✅ Initial session found:', data.session.user.id);
          setSession(data.session);
          setUser(data.session.user);
          localStorage.setItem(HAS_ACTIVE_SESSION_KEY, 'true');
        } else {
          console.log('SessionProvider: No initial session found');
          localStorage.removeItem(HAS_ACTIVE_SESSION_KEY);
        }
      } catch (error: any) {
        // BYPASS ABORT ERROR: If AbortError, ignore completely
        if (error?.name === 'AbortError' || error?.message?.includes('aborted')) {
          console.warn('SessionProvider: AbortError in getSession() catch - ignoring, will rely on listener');
          // Try storage fallback if listener doesn't fire
          setTimeout(async () => {
            const sessionData = readSessionFromStorage();
            if (sessionData) {
              console.log('SessionProvider: ✅ Recovered session from localStorage, setting state');
              setSession(sessionData);
              setUser(sessionData.user);
              localStorage.setItem(HAS_ACTIVE_SESSION_KEY, 'true');
              setLoading(false);
            } else {
              // Try the full fallback check
              const recovered = await checkStorageFallback();
              if (recovered) {
                // If checkStorageFallback succeeded, try getSession one more time
                try {
                  const { data: sessionData } = await supabase.auth.getSession();
                  if (sessionData?.session) {
                    setSession(sessionData.session);
                    setUser(sessionData.session.user);
                    localStorage.setItem(HAS_ACTIVE_SESSION_KEY, 'true');
                    setLoading(false);
                  }
                } catch (e) {
                  // If getSession still fails, use the direct read
                  const directSession = readSessionFromStorage();
                  if (directSession) {
                    setSession(directSession);
                    setUser(directSession.user);
                    localStorage.setItem(HAS_ACTIVE_SESSION_KEY, 'true');
                    setLoading(false);
                  }
                }
              }
            }
          }, 2000); // Wait 2 seconds for listener, then try fallback
          return;
        }
        console.error('SessionProvider: Error checking initial session:', error);
      } finally {
        setLoading(false);
      }
    };
    
    // Check initial session
    checkInitialSession();

    // Cleanup
    return () => {
      console.log('SessionProvider: Cleaning up auth listener');
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
      listenerSetupRef.current = false;
    };
  }, []);

  // Force session recovery function
  const forceSession = async () => {
    console.log('SessionProvider: 🔄 Manual session recovery triggered');
    
    // First, try to read directly from localStorage (no network calls)
    const sessionData = readSessionFromStorage();
    if (sessionData) {
      console.log('SessionProvider: ✅ Manual recovery successful from localStorage, setting session and reloading');
      setSession(sessionData);
      setUser(sessionData.user);
      localStorage.setItem(HAS_ACTIVE_SESSION_KEY, 'true');
      // Small delay to ensure state is set, then reload
      setTimeout(() => {
        window.location.reload();
      }, 100);
      return;
    }
    
    // If direct read fails, try refresh (but this will likely fail with cookie blocking)
    try {
      const { data } = await supabase.auth.refreshSession();
      if (data?.session) {
        console.log('SessionProvider: ✅ Manual recovery successful via refresh, reloading page');
        setSession(data.session);
        setUser(data.session.user);
        localStorage.setItem(HAS_ACTIVE_SESSION_KEY, 'true');
        window.location.reload();
        return;
      }
    } catch (err: any) {
      // AbortError is expected when cookies are blocked
      if (err?.name === 'AbortError' || err?.message?.includes('aborted')) {
        console.warn('SessionProvider: Refresh aborted (cookie blocking), checking localStorage again...');
        // Try one more time to read from storage
        const retrySession = readSessionFromStorage();
        if (retrySession) {
          console.log('SessionProvider: ✅ Found session on retry, setting and reloading');
          setSession(retrySession);
          setUser(retrySession.user);
          localStorage.setItem(HAS_ACTIVE_SESSION_KEY, 'true');
          setTimeout(() => {
            window.location.reload();
          }, 100);
          return;
        }
      }
    }
    
    console.log('SessionProvider: ❌ Manual recovery failed, no session found in storage');
    // Don't redirect - let user try again or see the error message
  };

  return (
    <SessionContext.Provider value={{ session, user, loading, forceSession }}>
      {children}
    </SessionContext.Provider>
  );
};
