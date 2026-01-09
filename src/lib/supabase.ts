import { createClient } from '@supabase/supabase-js';

// Safely access environment variables
const getEnv = (key: string): string | undefined => {
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      return (import.meta as any).env[key];
    }
  } catch (e) {}
  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key];
    }
  } catch (e) {}
  return undefined;
};

export const supabaseUrl = getEnv('VITE_SUPABASE_URL') || "https://spaxxexmyiczdrbikdjp.supabase.co";
export const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

// SINGLETON SUPABASE CLIENT: Created once, outside React component tree
// This ensures the client is never re-initialized when the app re-renders
// Prevents AbortErrors from component re-renders breaking the auth state
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        flowType: 'implicit', // Use Implicit flow to bypass cookie blocking
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false // Disabled - we handle hash parsing manually
      }
    })
  : (() => {
      // Mock client for development when keys are missing
      const mockPromise = Promise.resolve({ data: null, error: null });
      const mockChain = {
        select: () => mockChain,
        eq: () => mockChain,
        maybeSingle: () => mockPromise,
        order: () => mockChain,
        limit: () => mockChain,
        update: () => mockChain,
        upsert: () => mockPromise,
        insert: () => mockChain,
        delete: () => mockChain,
      };
      return {
        auth: {
          getSession: async () => ({ data: { session: null }, error: null }),
          getUser: async () => ({ data: { user: null }, error: null }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } }, error: null }),
          signInWithOAuth: async () => ({ data: {}, error: null }),
          signInWithPassword: async () => ({ data: {}, error: null }),
          signUp: async () => ({ data: {}, error: null }),
          signOut: async () => ({ error: null }),
          refreshSession: async () => ({ data: { session: null }, error: null }),
          exchangeCodeForSession: async () => ({ data: { session: null }, error: null }),
        },
        from: () => mockChain,
      } as any;
    })();

// Log Supabase config to verify flow type
if (typeof window !== 'undefined' && supabaseUrl && supabaseAnonKey) {
  console.log('✅ Singleton Supabase client initialized');
  console.log('SUPABASE CONFIG: Flow Type:', (supabase as any).auth?.flowType || 'default');
}
