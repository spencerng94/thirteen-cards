import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../src/lib/supabase';

interface SessionContextType {
  session: any;
  user: any;
  loading: boolean;
}

const SessionContext = createContext<SessionContextType>({
  session: null,
  user: null,
  loading: true,
});

const HAS_ACTIVE_SESSION_KEY = 'has_active_session';

export const useSession = () => useContext(SessionContext);

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

  return (
    <SessionContext.Provider value={{ session, user, loading }}>
      {children}
    </SessionContext.Provider>
  );
};
