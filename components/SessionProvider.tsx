import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../src/lib/supabase';

interface SessionContextType {
  session: any;
  user: any;
  loading: boolean;
  isProcessing: boolean; // Expose Atomic Auth processing state
  forceSession: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType>({
  session: null,
  user: null,
  loading: true,
  isProcessing: false,
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
  // Auth Lock: Prevent double-execution of getSession/setSession
  const isProcessingRef = useRef(false);
  // Expose processing state for UI (reactive)
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Guard: Only set up listener once
    if (listenerSetupRef.current) {
      return;
    }
    
    listenerSetupRef.current = true;
    console.log('SessionProvider: Setting up auth state change listener...');
    
    // Check for tokens in URL hash (Implicit flow) or query params (PKCE flow)
    // This handles cases where user lands on home page with tokens in hash or code in query
    const checkHashForTokens = async () => {
      const hash = window.location.hash.substring(1); // Remove #
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(hash);
      
      console.log('SessionProvider: Checking for tokens in hash/query:', {
        hasHash: !!hash,
        hasSearch: !!window.location.search
      });
      
      // Check for errors first
      const errorParam = hashParams.get('error') || searchParams.get('error');
      const errorDescription = hashParams.get('error_description') || searchParams.get('error_description');
      
      if (errorParam) {
        console.error('SessionProvider: OAuth error in hash/query:', errorParam, errorDescription);
        // Clean hash/query and continue
        window.history.replaceState(null, '', window.location.pathname);
        return;
      }
      
      // Check for PKCE code in query params
      const code = searchParams.get('code');
      if (code) {
        // Auth Lock: If already processing, skip
        if (isProcessingRef.current) {
          console.log('SessionProvider: Already processing auth, skipping PKCE code exchange');
          return;
        }
        
        isProcessingRef.current = true; // Acquire lock
        setIsProcessing(true); // Update reactive state
        console.log('SessionProvider: Found PKCE code in query, exchanging for session with Atomic Auth logic...');
        
        // Atomic Auth: Extract project ID for manual localStorage fallback
        const getProjectId = (): string | null => {
          try {
            const supabaseUrl = (window as any).__SUPABASE_URL__ || 
              (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) ||
              "https://spaxxexmyiczdrbikdjp.supabase.co";
            const hostname = new URL(supabaseUrl).hostname;
            return hostname.split('.')[0];
          } catch {
            return null;
          }
        };
        
        // Atomic Auth: Manual localStorage write function (fail-safe)
        const writeTokensToStorage = (accessToken: string, refreshToken: string) => {
          const projectId = getProjectId();
          if (!projectId) {
            console.error('SessionProvider: Cannot write tokens - project ID not found');
            return false;
          }
          
          try {
            const storageKey = `sb-${projectId}-auth-token`;
            const sessionData = {
              access_token: accessToken,
              refresh_token: refreshToken,
              expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
              token_type: 'bearer',
              user: {
                id: '', // Will be populated by Supabase on next load
                aud: 'authenticated',
                role: 'authenticated'
              }
            };
            
            localStorage.setItem(storageKey, JSON.stringify(sessionData));
            localStorage.setItem(HAS_ACTIVE_SESSION_KEY, 'true');
            console.log('SessionProvider: ✅ Tokens manually written to localStorage:', storageKey);
            return true;
          } catch (err) {
            console.error('SessionProvider: Error writing tokens to localStorage:', err);
            return false;
          }
        };
        
        // Atomic Auth: Wrap exchangeCodeForSession in setTimeout to move to end of event loop
        setTimeout(async () => {
          try {
            const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            
            if (!exchangeError && exchangeData?.session) {
              console.log('SessionProvider: ✅ PKCE exchange successful, user:', exchangeData.session.user.id);
              
              // Force State Update: Manually set state immediately (don't wait for listener)
              setSession(exchangeData.session);
              setUser(exchangeData.session.user);
              localStorage.setItem(HAS_ACTIVE_SESSION_KEY, 'true');
              setLoading(false);
              isProcessingRef.current = false; // Release lock
              setIsProcessing(false); // Update reactive state
              
              // Clean the code from URL
              window.history.replaceState(null, '', window.location.pathname);
              
              // Hard Navigation: Force entire React tree to re-initialize with authenticated user
              console.log('SessionProvider: 🔄 Forcing hard navigation to recognize authenticated user');
              setTimeout(() => {
                window.location.replace('/');
              }, 100); // Small delay to ensure state is set
            } else if (exchangeError) {
              // Check if it's an AbortError
              if (exchangeError.name === 'AbortError' || exchangeError.message?.includes('aborted') || exchangeError.message?.includes('signal is aborted')) {
                console.warn('SessionProvider: ⚠️ AbortError during exchangeCodeForSession, cannot use manual fallback (need tokens)');
                // For PKCE, we can't manually write tokens since we only have a code
                // The best we can do is retry or redirect
                console.log('SessionProvider: 🔄 Retrying PKCE exchange after AbortError...');
                isProcessingRef.current = false; // Release lock to allow retry
                setIsProcessing(false); // Update reactive state
                window.history.replaceState(null, '', window.location.pathname);
                // Redirect to trigger OAuth flow again
                setTimeout(() => {
                  window.location.href = '/';
                }, 1000);
              } else {
                console.error('SessionProvider: Error exchanging PKCE code:', exchangeError);
                isProcessingRef.current = false; // Release lock on error
                setIsProcessing(false); // Update reactive state
                window.history.replaceState(null, '', window.location.pathname);
              }
            }
          } catch (err: any) {
            // Check if it's an AbortError
            if (err?.name === 'AbortError' || err?.message?.includes('aborted') || err?.message?.includes('signal is aborted')) {
              console.warn('SessionProvider: ⚠️ AbortError exception during exchangeCodeForSession, cannot use manual fallback (need tokens)');
              // For PKCE, we can't manually write tokens since we only have a code
              isProcessingRef.current = false; // Release lock
              setIsProcessing(false); // Update reactive state
              window.history.replaceState(null, '', window.location.pathname);
              // Redirect to trigger OAuth flow again
              setTimeout(() => {
                window.location.href = '/';
              }, 1000);
            } else {
              console.error('SessionProvider: Exception exchanging PKCE code:', err);
              isProcessingRef.current = false; // Release lock on error
              setIsProcessing(false); // Update reactive state
              window.history.replaceState(null, '', window.location.pathname);
            }
          }
        }, 0); // Move to end of event loop
        
        return; // Exit early - PKCE handled
      }
      
      // Check for implicit flow tokens in hash
      if (!hash) return;
      
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      
      console.log('SessionProvider: Hash params:', {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken
      });
      
      if (accessToken) {
        // Auth Lock: If already processing, skip
        if (isProcessingRef.current) {
          console.log('SessionProvider: Already processing auth, skipping hash token processing');
          return;
        }
        
        isProcessingRef.current = true; // Acquire lock
        setIsProcessing(true); // Update reactive state
        console.log('SessionProvider: Found tokens in URL hash, setting session with Atomic Auth logic...');
        
        // Atomic Auth: Extract project ID for manual localStorage fallback
        const getProjectId = (): string | null => {
          try {
            const supabaseUrl = (window as any).__SUPABASE_URL__ || 
              (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) ||
              "https://spaxxexmyiczdrbikdjp.supabase.co";
            const hostname = new URL(supabaseUrl).hostname;
            return hostname.split('.')[0];
          } catch {
            return null;
          }
        };
        
        // Atomic Auth: Manual localStorage write function (fail-safe)
        const writeTokensToStorage = (accessToken: string, refreshToken: string) => {
          const projectId = getProjectId();
          if (!projectId) {
            console.error('SessionProvider: Cannot write tokens - project ID not found');
            return false;
          }
          
          try {
            const storageKey = `sb-${projectId}-auth-token`;
            const sessionData = {
              access_token: accessToken,
              refresh_token: refreshToken,
              expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
              token_type: 'bearer',
              user: {
                id: '', // Will be populated by Supabase on next load
                aud: 'authenticated',
                role: 'authenticated'
              }
            };
            
            localStorage.setItem(storageKey, JSON.stringify(sessionData));
            localStorage.setItem(HAS_ACTIVE_SESSION_KEY, 'true');
            console.log('SessionProvider: ✅ Tokens manually written to localStorage:', storageKey);
            return true;
          } catch (err) {
            console.error('SessionProvider: Error writing tokens to localStorage:', err);
            return false;
          }
        };
        
        // Atomic Auth: Wrap setSession in setTimeout to move to end of event loop
        // This prevents React's immediate re-render from killing the fetch
        setTimeout(async () => {
          try {
            // Atomic Auth: Explicit persistSession option and no external AbortController
            const { data: sessionData, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || ''
            }, {
              persistSession: true
            });
            
            if (!error && sessionData?.session) {
              console.log('SessionProvider: ✅ Session set from hash, user:', sessionData.session.user.id);
              
              // Force State Update: Manually set state immediately (don't wait for listener)
              setSession(sessionData.session);
              setUser(sessionData.session.user);
              localStorage.setItem(HAS_ACTIVE_SESSION_KEY, 'true');
              setLoading(false);
              isProcessingRef.current = false; // Release lock
              setIsProcessing(false); // Update reactive state
              
              // Clean the hash from URL
              window.history.replaceState(null, '', window.location.pathname);
              
              // Hard Navigation: Force entire React tree to re-initialize with authenticated user
              console.log('SessionProvider: 🔄 Forcing hard navigation to recognize authenticated user');
              setTimeout(() => {
                window.location.replace('/');
              }, 100); // Small delay to ensure state is set
            } else if (error) {
              // Check if it's an AbortError
              if (error.name === 'AbortError' || error.message?.includes('aborted') || error.message?.includes('signal is aborted')) {
                console.warn('SessionProvider: ⚠️ AbortError during setSession, using manual localStorage fallback');
                
                // Atomic Auth: Manual Extraction Fail-safe
                if (writeTokensToStorage(accessToken, refreshToken || '')) {
                  // Force hard refresh - Supabase will find token on next load
                  console.log('SessionProvider: 🔄 Forcing hard refresh to load session from localStorage');
                  window.history.replaceState(null, '', window.location.pathname);
                  window.location.href = '/';
                  return; // Don't release lock - page will reload
                } else {
                  console.error('SessionProvider: Failed to write tokens manually');
                  isProcessingRef.current = false; // Release lock
                  setIsProcessing(false); // Update reactive state
                  window.history.replaceState(null, '', window.location.pathname);
                }
              } else {
                console.error('SessionProvider: Error setting session from hash:', error);
                isProcessingRef.current = false; // Release lock on error
                setIsProcessing(false); // Update reactive state
                // Clean hash even on error
                window.history.replaceState(null, '', window.location.pathname);
              }
            }
          } catch (err: any) {
            // Check if it's an AbortError
            if (err?.name === 'AbortError' || err?.message?.includes('aborted') || err?.message?.includes('signal is aborted')) {
              console.warn('SessionProvider: ⚠️ AbortError exception during setSession, using manual localStorage fallback');
              
              // Atomic Auth: Manual Extraction Fail-safe
              if (writeTokensToStorage(accessToken, refreshToken || '')) {
                // Force hard refresh - Supabase will find token on next load
                console.log('SessionProvider: 🔄 Forcing hard refresh to load session from localStorage');
                window.history.replaceState(null, '', window.location.pathname);
                window.location.href = '/';
                return; // Don't release lock - page will reload
              } else {
                console.error('SessionProvider: Failed to write tokens manually');
                isProcessingRef.current = false; // Release lock
                setIsProcessing(false); // Update reactive state
                window.history.replaceState(null, '', window.location.pathname);
              }
            } else {
              console.error('SessionProvider: Exception setting session from hash:', err);
              isProcessingRef.current = false; // Release lock on error
              setIsProcessing(false); // Update reactive state
              // Clean hash even on error
              window.history.replaceState(null, '', window.location.pathname);
            }
          }
        }, 0); // Move to end of event loop
      }
    };
    
    // Check hash immediately (but only if not already processing)
    if (!isProcessingRef.current) {
      checkHashForTokens();
    }

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
          isProcessingRef.current = false; // Release lock
        }
      }
    );
    
    subscriptionRef.current = subscription;
    console.log('SessionProvider: ✅ Auth listener set up successfully');

    // Initial session check with AbortError bypass
    const checkInitialSession = async () => {
      // Auth Lock: If already processing, return immediately
      if (isProcessingRef.current) {
        console.log('SessionProvider: Already processing auth, skipping getSession()');
        return;
      }
      
      isProcessingRef.current = true; // Acquire lock
      
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
          isProcessingRef.current = false; // Release lock
        } else {
          console.log('SessionProvider: No initial session found');
          localStorage.removeItem(HAS_ACTIVE_SESSION_KEY);
          isProcessingRef.current = false; // Release lock
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
        isProcessingRef.current = false; // Release lock on error
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
    // Auth Lock: If already processing, return immediately
    if (isProcessingRef.current) {
      console.log('SessionProvider: Already processing auth, skipping forceSession');
      return;
    }
    
    isProcessingRef.current = true; // Acquire lock
    console.log('SessionProvider: 🔄 Manual session recovery triggered');
    
    // First, try to read directly from localStorage (no network calls)
    const sessionData = readSessionFromStorage();
    if (sessionData) {
      console.log('SessionProvider: ✅ Manual recovery successful from localStorage, setting session and reloading');
      setSession(sessionData);
      setUser(sessionData.user);
      localStorage.setItem(HAS_ACTIVE_SESSION_KEY, 'true');
      isProcessingRef.current = false; // Release lock
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
        isProcessingRef.current = false; // Release lock
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
          isProcessingRef.current = false; // Release lock
          setTimeout(() => {
            window.location.reload();
          }, 100);
          return;
        }
      }
    }
    
    isProcessingRef.current = false; // Release lock
    console.log('SessionProvider: ❌ Manual recovery failed, no session found in storage');
    // Don't redirect - let user try again or see the error message
  };

  return (
    <SessionContext.Provider value={{ session, user, loading, isProcessing, forceSession }}>
      {children}
    </SessionContext.Provider>
  );
};
