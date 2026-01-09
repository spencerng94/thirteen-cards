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

// Strict Mode Guard: Check if client already exists on window (from previous mount)
const isDevelopment = typeof window !== 'undefined' && (
  process.env.NODE_ENV === 'development' || 
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.MODE === 'development')
);

let supabaseClient: ReturnType<typeof createClient> | any;

if (isDevelopment && typeof window !== 'undefined' && (window as any).__SUPABASE_CLIENT__) {
  // Use existing client from window (Strict Mode remount)
  console.log('✅ Reusing existing Supabase client from window (Strict Mode guard)');
  supabaseClient = (window as any).__SUPABASE_CLIENT__;
} else {
  // Create new client
  supabaseClient = (supabaseUrl && supabaseAnonKey)
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
}

// Export the client
export const supabase = supabaseClient;

// Strict Mode Guard: Attach to window in development to ensure singleton across remounts
// Also expose supabaseUrl for manual token storage fallback
if (typeof window !== 'undefined') {
  if (isDevelopment && supabaseUrl && supabaseAnonKey) {
    if (!(window as any).__SUPABASE_CLIENT__) {
      (window as any).__SUPABASE_CLIENT__ = supabase;
      console.log('✅ Singleton Supabase client initialized and attached to window (Strict Mode guard)');
    }
  }
  
  // Expose supabaseUrl for manual token storage (Atomic Auth fallback)
  if (supabaseUrl) {
    (window as any).__SUPABASE_URL__ = supabaseUrl;
  }
  
  if (supabaseUrl && supabaseAnonKey) {
    console.log('SUPABASE CONFIG: Flow Type:', (supabase as any).auth?.flowType || 'default');
  }
} else if (supabaseUrl && supabaseAnonKey) {
  console.log('✅ Singleton Supabase client initialized');
  console.log('SUPABASE CONFIG: Flow Type:', (supabase as any).auth?.flowType || 'default');
}
