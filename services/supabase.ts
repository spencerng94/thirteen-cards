
import { createClient } from '@supabase/supabase-js';

/**
 * Robust initialization for Supabase.
 * Checks both Vite (import.meta.env) and Create React App (process.env) 
 * environment variable patterns.
 */
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || (process.env as any).REACT_APP_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || (process.env as any).REACT_APP_SUPABASE_ANON_KEY;

console.log("Supabase Connection Check:", { hasUrl: !!supabaseUrl, hasKey: !!supabaseAnonKey });

/**
 * To prevent "Uncaught Error: Supabase Environment Variables are missing!",
 * we initialize the client only if keys exist. Otherwise, we provide a 
 * Proxy-based mock that prevents crashes during Guest Mode play.
 */
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : new Proxy({} as any, {
      get: (target, prop) => {
        // Warning log when trying to use missing Supabase functionality
        console.warn(`Supabase ${String(prop)} called but credentials are missing. Check Vercel/Local env settings.`);
        
        if (prop === 'auth') {
          return {
            getSession: async () => ({ data: { session: null }, error: null }),
            onAuthStateChange: () => ({ 
              data: { subscription: { unsubscribe: () => {} } },
              error: null 
            }),
            signInWithOAuth: async () => ({ error: new Error("Credentials missing") }),
            signInWithPassword: async () => ({ error: new Error("Credentials missing") }),
            signUp: async () => ({ error: new Error("Credentials missing") }),
          };
        }
        if (prop === 'from') {
          return () => ({
            select: () => ({ 
              eq: () => ({ 
                single: async () => ({ data: null, error: null }) 
              }) 
            }),
            update: () => ({ 
              eq: async () => ({ error: null }) 
            }),
          });
        }
        return target[prop];
      }
    });

export interface UserProfile {
  id: string;
  username: string;
  avatar_url?: string;
  wins: number;
  currency: number;
}

/**
 * Record a game result for a logged-in user or guest.
 * Syncs to Supabase if authenticated and configured, otherwise persists to localStorage.
 */
export const recordGameResult = async (isWinner: boolean, isGuest: boolean, userId?: string) => {
  const currencyGained = isWinner ? 100 : 10;
  
  // If guest mode is active or Supabase is unconfigured, handle persistence locally
  if (isGuest || !supabaseUrl) {
    const localStats = JSON.parse(localStorage.getItem('thirteen_stats') || '{"wins":0, "currency":0}');
    if (isWinner) localStats.wins += 1;
    localStats.currency = (localStats.currency || 0) + currencyGained;
    localStorage.setItem('thirteen_stats', JSON.stringify(localStats));
    return localStats;
  }

  // If we have a user session and valid config, sync to the profiles table
  if (userId && supabaseUrl && supabaseAnonKey) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profile) {
        await supabase
          .from('profiles')
          .update({
            wins: isWinner ? (profile.wins || 0) + 1 : profile.wins,
            currency: (profile.currency || 0) + currencyGained
          })
          .eq('id', userId);
      }
    } catch (err) {
      console.warn('Supabase sync failed, results saved locally for this session.', err);
    }
  }
};
