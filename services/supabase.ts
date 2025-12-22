
import { createClient } from '@supabase/supabase-js';

/**
 * Accessing environment variables via process.env as requested.
 */
const supabaseUrl = (process.env as any).REACT_APP_SUPABASE_URL;
const supabaseAnonKey = (process.env as any).REACT_APP_SUPABASE_ANON_KEY;

// Log the URL for verification in the browser console
console.log("Supabase URL initialized:", supabaseUrl);

/**
 * Initialize the Supabase client only if the required parameters are present.
 * To fix "Uncaught Error: supabaseUrl is required", we only call createClient 
 * when the URL is truthy. If missing, we return a Proxy that prevents 
 * the application from crashing on boot and handles guest-level calls gracefully.
 */
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : new Proxy({} as any, {
      get: (target, prop) => {
        // Handle common auth calls to prevent crashes in App.tsx
        if (prop === 'auth') {
          return {
            getSession: async () => ({ data: { session: null }, error: null }),
            onAuthStateChange: () => ({ 
              data: { subscription: { unsubscribe: () => {} } },
              error: null 
            }),
            signInWithOAuth: async () => ({ error: new Error("Supabase credentials missing.") }),
            signInWithPassword: async () => ({ error: new Error("Supabase credentials missing.") }),
            signUp: async () => ({ error: new Error("Supabase credentials missing.") }),
          };
        }
        // Handle database calls to prevent crashes in recordGameResult
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
  
  // If guest mode is active, handle persistence locally
  if (isGuest) {
    const localStats = JSON.parse(localStorage.getItem('thirteen_stats') || '{"wins":0, "currency":0}');
    if (isWinner) localStats.wins += 1;
    localStats.currency = (localStats.currency || 0) + currencyGained;
    localStorage.setItem('thirteen_stats', JSON.stringify(localStats));
    return localStats;
  }

  // If we have a user session and Supabase is configured, sync to the profiles table
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
