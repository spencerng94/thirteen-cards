import { createClient } from '@supabase/supabase-js';

// SESSION PURGE: Version check for auto-clearing stale localStorage
// When app version changes, clear all localStorage and sign out to prevent stale data issues
// This fixes stale localStorage issues in regular browsers (works in incognito, fails in regular)
export const APP_VERSION = '1.0.1';
const APP_VERSION_KEY = 'app_version';

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

// Check if we're in production build
const isProduction = typeof import.meta !== 'undefined' && (import.meta as any).env?.MODE === 'production';

// PRODUCTION BUILD: Require environment variables, no fallback URLs
// Development: Allow fallback for local testing (but warn)
const getSupabaseUrl = (): string => {
  const url = getEnv('VITE_SUPABASE_URL');
  if (!url) {
    if (isProduction) {
      console.error('PRODUCTION BUILD ERROR: VITE_SUPABASE_URL is required but not set!');
      throw new Error('VITE_SUPABASE_URL environment variable is required for production builds');
    } else {
      // Development fallback (warn but allow)
      console.warn('WARNING: VITE_SUPABASE_URL not set, using fallback URL. This should not happen in production.');
      return "https://spaxxexmyiczdrbikdjp.supabase.co";
    }
  }
  return url;
};

const getSupabaseAnonKey = (): string => {
  const key = getEnv('VITE_SUPABASE_ANON_KEY');
  if (!key) {
    if (isProduction) {
      console.error('PRODUCTION BUILD ERROR: VITE_SUPABASE_ANON_KEY is required but not set!');
      throw new Error('VITE_SUPABASE_ANON_KEY environment variable is required for production builds');
    } else {
      console.warn('WARNING: VITE_SUPABASE_ANON_KEY not set. Supabase features will not work.');
    }
  }
  return key || '';
};

export const supabaseUrl = getSupabaseUrl();
export const supabaseAnonKey = getSupabaseAnonKey();

// SESSION PURGE: Auto-clear localStorage if version doesn't match
// This runs BEFORE Supabase client is created to ensure clean state
const performVersionCheck = () => {
  if (typeof window === 'undefined') return; // Skip on server-side
  
  try {
    const storedVersion = localStorage.getItem(APP_VERSION_KEY);
    
    // VERSION CHECK: If version doesn't match, clear localStorage and sign out
    if (storedVersion && storedVersion !== APP_VERSION) {
      console.warn('═══════════════════════════════════════════════════════');
      console.warn(`🔄 SESSION PURGE: App version changed from ${storedVersion} to ${APP_VERSION}`);
      console.warn('🔄 Clearing stale localStorage and signing out...');
      console.warn('═══════════════════════════════════════════════════════');
      
      // AUTO-CLEAR: Clear all localStorage first (includes auth tokens)
      localStorage.clear();
      
      // Set new version after clearing (this will be the only item in localStorage after reload)
      localStorage.setItem(APP_VERSION_KEY, APP_VERSION);
      
      // Reload page to ensure clean state (Supabase client will be created fresh)
      window.location.reload();
      return true; // Indicates reload will happen
    }
    
    // Version matches - no action needed
    if (storedVersion === APP_VERSION) {
    } else {
      // First run - set version (no storedVersion means first time)
      localStorage.setItem(APP_VERSION_KEY, APP_VERSION);
    }
    return false; // No reload needed
  } catch (err) {
    console.error('SESSION PURGE: Error performing version check:', err);
    // Don't block app if version check fails - continue with normal initialization
    return false;
  }
};

// SESSION PURGE: Perform version check IMMEDIATELY when module loads (synchronously)
// This runs BEFORE Supabase client is created to ensure clean state
// If version mismatch, page will reload before client is created
let shouldSkipClientCreation = false;
if (typeof window !== 'undefined') {
  const willReload = performVersionCheck();
  // If version check triggers reload, don't create client (reload will happen)
  // Note: window.location.reload() in performVersionCheck will stop execution
  // But we set this flag as a safeguard
  shouldSkipClientCreation = willReload;
}

// SINGLETON SUPABASE CLIENT: Created once, outside React component tree
// This ensures the client is never re-initialized when the app re-renders
// Prevents AbortErrors from component re-renders breaking the auth state

// Strict Mode Guard: Check if client already exists on window (from previous mount)
const isDevelopment = typeof window !== 'undefined' && (
  process.env.NODE_ENV === 'development' || 
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.MODE === 'development')
);

let supabaseClient: ReturnType<typeof createClient> | any;

// SESSION PURGE: Only create client if version check passed (no reload needed)
if (shouldSkipClientCreation) {
  // Version check triggered reload - create minimal mock client
  // Page will reload and this module will run again with correct version
  supabaseClient = {} as any;
} else if (isDevelopment && typeof window !== 'undefined' && (window as any).__SUPABASE_CLIENT__) {
  // Use existing client from window (Strict Mode remount)
  supabaseClient = (window as any).__SUPABASE_CLIENT__;
} else {
  // Create new client (version check passed)
  supabaseClient = (supabaseUrl && supabaseAnonKey)
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          flowType: 'implicit', // Use Implicit flow to bypass cookie blocking
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true // Enable automatic session detection from URL
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
    }
  }
  
  // Expose supabaseUrl for manual token storage (Atomic Auth fallback)
  if (supabaseUrl) {
    (window as any).__SUPABASE_URL__ = supabaseUrl;
  }
  
  if (supabaseUrl && supabaseAnonKey) {
  }
} else if (supabaseUrl && supabaseAnonKey) {
}
