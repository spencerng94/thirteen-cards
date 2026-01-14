import { UserProfile, AiDifficulty, Emote, UserInventory } from '../types';
import { ITEM_REGISTRY } from '../constants/ItemRegistry';
import { getWeeklyChallenges } from '../constants/ChallengePool';
// Import singleton client and config from src/lib/supabase.ts
import { supabase, supabaseUrl, supabaseAnonKey } from '../src/lib/supabase';
// Import discriminator generation utility
import { generateDiscriminator } from '../utils/username';
import type { ErrorInfo } from 'react';

// Global fetch cache to prevent duplicate fetches across all components
// This singleton ensures data is only fetched once, even if multiple components request it
// NOTE: Using explicit type annotation to allow mutations for caching
type FetchCacheItem<T> = {
  promise: Promise<T> | null;
  data: T | null;
  timestamp: number;
  ttl: number;
};

type GlobalFetchCache = {
  emotes: FetchCacheItem<Emote[]>;
  finishers: FetchCacheItem<any[]>;
  chatPresets: FetchCacheItem<any[]>;
};

export const globalFetchCache: GlobalFetchCache = {
  emotes: {
    promise: null,
    data: null,
    timestamp: 0,
    ttl: 5 * 60 * 1000, // 5 minutes cache
  },
  finishers: {
    promise: null,
    data: null,
    timestamp: 0,
    ttl: 5 * 60 * 1000, // 5 minutes cache
  },
  chatPresets: {
    promise: null,
    data: null,
    timestamp: 0,
    ttl: 5 * 60 * 1000, // 5 minutes cache
  },
};

// Global fetch locks - prevent concurrent fetches even during rapid re-renders
// These are module-level (outside React) to persist across component unmounts
// CRITICAL: Prevents AbortError loops by ensuring only one fetch happens at a time
let isFetchingEmotes = false;
let isFetchingFinishers = false;
let isFetchingChatPresets = false;

// Safely access environment variables (used in debug/logging functions)
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

// Export supabaseProjectId (derived from supabaseUrl from src/lib/supabase.ts)
// Note: supabaseUrl and supabaseAnonKey are imported from centralized config above
export const supabaseProjectId = (() => {
  try {
    const hostname = new URL(supabaseUrl).hostname;
    return hostname.split('.')[0];
  } catch {
    return null;
  }
})();
const GUEST_STORAGE_KEY = 'thirteen_stats';
const GUEST_MIGRATION_KEY = 'thirteen_guest_migration';

export const EMOTE_FILE_MAP: Record<string, string> = {
  ':smile:': 'shiba_card.webp', ':blush:': 'blushing_card.webp', ':cool:': 'sunglasses_card.webp',
  ':annoyed:': 'annoyed_card.webp', ':heart_eyes:': 'seductive_card.webp', ':money_mouth_face:': 'chinese_card.webp',
  ':robot:': 'final_boss_card.webp', ':devil:': 'devil_card.webp', ':girly:': 'girly_card.webp',
};

export const getEmoteUrl = (trigger: string): string => {
  const fileName = EMOTE_FILE_MAP[trigger];
  if (!fileName) return '';
  return `${supabaseUrl}/storage/v1/object/public/emotes/${fileName}?v=3`;
};

export const DEFAULT_AVATARS = [':smile:', ':blush:', ':cool:', ':annoyed:'];
export const PREMIUM_AVATARS = [':heart_eyes:', ':money_mouth_face:', ':robot:', ':devil:', ':girly:'];

export const AVATAR_NAMES: Record<string, string> = {
  ':smile:': 'Loyal Shiba', ':blush:': 'Bashful Card', ':cool:': 'Neon Shades', ':annoyed:': 'The Critic',
  ':heart_eyes:': 'Seductive Dealer', ':money_mouth_face:': 'Dynasty Wealth', ':robot:': 'Final Boss',
  ':devil:': 'Hell Raiser', ':girly:': 'The Princess'
};

export const getAvatarName = (trigger: string, remoteEmotes?: Emote[]) => {
  if (AVATAR_NAMES[trigger]) return AVATAR_NAMES[trigger];
  return remoteEmotes?.find(e => e.trigger_code === trigger)?.name || 'Elite Signature';
};

// RE-EXPORT SINGLETON CLIENT: The singleton is imported above and re-exported here for backward compatibility
// This ensures there's only ONE supabase client instance in the entire app
export { supabase };

// ============================================================================
// GLOBAL AUTH LISTENER - Runs outside React lifecycle to catch OAuth redirects
// ============================================================================
// This listener processes auth state changes BEFORE React components mount,
// preventing the session from being lost when the App component restarts.

const GLOBAL_SESSION_KEY = 'thirteen_global_session';
const GLOBAL_AUTH_CHECKED_KEY = 'thirteen_global_auth_checked';
const GLOBAL_HAS_SESSION_KEY = 'thirteen_global_has_session';

// Singleton flag to ensure hash is only processed once
let isProcessingAuth = false;
let globalAuthListenerSetup = false;

// Global session storage (outside React state)
export const globalAuthState = {
  session: null as any,
  authChecked: false,
  hasSession: false,
  getSession: () => {
    try {
      const stored = localStorage.getItem(GLOBAL_SESSION_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },
  setSession: (session: any) => {
    globalAuthState.session = session;
    if (session) {
      localStorage.setItem(GLOBAL_SESSION_KEY, JSON.stringify(session));
      localStorage.setItem(GLOBAL_HAS_SESSION_KEY, 'true');
    } else {
      localStorage.removeItem(GLOBAL_SESSION_KEY);
      localStorage.removeItem(GLOBAL_HAS_SESSION_KEY);
    }
  },
  setAuthChecked: (checked: boolean) => {
    globalAuthState.authChecked = checked;
    localStorage.setItem(GLOBAL_AUTH_CHECKED_KEY, checked ? 'true' : 'false');
  },
  setHasSession: (has: boolean) => {
    globalAuthState.hasSession = has;
    localStorage.setItem(GLOBAL_HAS_SESSION_KEY, has ? 'true' : 'false');
  },
  clear: () => {
    globalAuthState.session = null;
    globalAuthState.authChecked = false;
    globalAuthState.hasSession = false;
    localStorage.removeItem(GLOBAL_SESSION_KEY);
    localStorage.removeItem(GLOBAL_AUTH_CHECKED_KEY);
    localStorage.removeItem(GLOBAL_HAS_SESSION_KEY);
  }
};

export const persistSupabaseAuthTokenBruteforce = (
  accessToken: string,
  refreshToken: string | null,
  expiresIn: string | null,
  tokenType: string
) => {
  if (!supabaseProjectId) {
    console.warn('GLOBAL: Brute force storage skipped - missing project id');
    return;
  }

  try {
    const expiresInSeconds = Number(expiresIn) || 3600;
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const storageKey = `sb-${supabaseProjectId}-auth-token`;
    const payload = {
      currentSession: {
        access_token: accessToken,
        refresh_token: refreshToken || '',
        expires_in: expiresInSeconds,
        expires_at: expiresAt,
        token_type: tokenType,
        provider_token: accessToken,
        provider_refresh_token: refreshToken || null,
        user: null
      },
      expires_at: expiresAt
    };
    localStorage.setItem(storageKey, JSON.stringify(payload));
  } catch (storageError) {
    console.warn('GLOBAL: Failed to brute force store Supabase token:', storageError);
  }
};

// Initialize from localStorage on module load
if (typeof window !== 'undefined') {
  const storedSession = globalAuthState.getSession();
  if (storedSession) {
    globalAuthState.session = storedSession;
    globalAuthState.hasSession = true;
  }
  globalAuthState.authChecked = localStorage.getItem(GLOBAL_AUTH_CHECKED_KEY) === 'true';
  globalAuthState.hasSession = localStorage.getItem(GLOBAL_HAS_SESSION_KEY) === 'true';
}

// Helper to sanitize URL for logging (removes sensitive tokens)
const sanitizeUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    // Remove access_token, refresh_token, and code from hash
    const hash = urlObj.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      if (params.has('access_token')) {
        params.set('access_token', '[REDACTED]');
      }
      if (params.has('refresh_token')) {
        params.set('refresh_token', '[REDACTED]');
      }
      if (params.has('code')) {
        params.set('code', '[REDACTED]');
      }
      urlObj.hash = params.toString();
    }
    // Remove code from search params
    const searchParams = urlObj.searchParams;
    if (searchParams.has('code')) {
      searchParams.set('code', '[REDACTED]');
    }
    urlObj.search = searchParams.toString();
    return urlObj.toString();
  } catch {
    // Fallback: just replace tokens in string
    return url
      .replace(/access_token=[^&]*/g, 'access_token=[REDACTED]')
      .replace(/refresh_token=[^&]*/g, 'refresh_token=[REDACTED]')
      .replace(/code=[^&]*/g, 'code=[REDACTED]');
  }
};

// SIMPLIFIED OAuth handling: Let Supabase automatically detect and process the hash
// With detectSessionInUrl: true, Supabase will handle the OAuth redirect automatically
const waitForSupabaseSession = async (maxWaitMs: number = 5000): Promise<boolean> => {
  const startTime = Date.now();
  const checkInterval = 200; // Check every 200ms
  
  while (Date.now() - startTime < maxWaitMs) {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.warn('GLOBAL: Error getting session:', error);
    } else if (data?.session) {
      globalAuthState.setSession(data.session);
      globalAuthState.setAuthChecked(true);
      globalAuthState.setHasSession(true);
      localStorage.setItem('thirteen_session_verified', 'true');
      return true;
    }
    
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }
  
  console.warn('GLOBAL: Timeout waiting for Supabase to process OAuth hash');
  return false;
};

// Set up global auth listener immediately (outside React)
if (typeof window !== 'undefined' && supabaseUrl && supabaseAnonKey && !globalAuthListenerSetup) {
  globalAuthListenerSetup = true;
  
  // Check for OAuth hash/code immediately
  const hash = window.location.hash;
  const search = window.location.search;
  const hasOAuthHash = hash.includes('access_token') || hash.includes('code=');
  const hasOAuthCode = search.includes('code=');
  
  if (hasOAuthHash || hasOAuthCode) {
    isProcessingAuth = true;
    
    // Let Supabase automatically process the hash (detectSessionInUrl: true handles this)
    // Just wait for the session to appear
    (async () => {
      const success = await waitForSupabaseSession(5000);
      if (success) {
        isProcessingAuth = false;
      } else {
        console.warn('GLOBAL: OAuth processing timeout - Will rely on onAuthStateChange event');
        // Don't set isProcessingAuth to false here - let onAuthStateChange handle it
      }
    })();
  }
  
  // Set up listener that runs outside React lifecycle
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
    // CRITICAL: Save session immediately to global state and localStorage
    if (event === 'SIGNED_IN' && session) {
      globalAuthState.setSession(session);
      globalAuthState.setAuthChecked(true);
      globalAuthState.setHasSession(true);
      isProcessingAuth = false;
    } else if (session) {
      // Other events with session
      globalAuthState.setSession(session);
      globalAuthState.setHasSession(true);
    } else if (event === 'SIGNED_OUT') {
      globalAuthState.clear();
      // Clear all Supabase auth tokens from localStorage
      if (supabaseProjectId) {
        const storageKey = `sb-${supabaseProjectId}-auth-token`;
        localStorage.removeItem(storageKey);
      }
      // Clear any other auth-related flags
      localStorage.removeItem('thirteen_session_verified');
      localStorage.removeItem('thirteen_manual_recovery');
    } else if (event === 'INITIAL_SESSION' && !session) {
      // If we're processing OAuth, don't set authChecked yet
      if (!isProcessingAuth) {
        globalAuthState.setAuthChecked(true);
        globalAuthState.setHasSession(false);
      }
    }
  });
  
  // Also check for existing session immediately (but don't block if processing OAuth)
  if (!isProcessingAuth) {
    supabase.auth.getSession().then(({ data, error }: { data: any; error: any }) => {
      if (!error && data?.session) {
        globalAuthState.setSession(data.session);
        globalAuthState.setAuthChecked(true);
        globalAuthState.setHasSession(true);
      } else {
        globalAuthState.setAuthChecked(true);
        globalAuthState.setHasSession(false);
      }
    });
  }
  
  // Keep subscription alive (don't unsubscribe)
  // This ensures the listener persists even if React components unmount
  // Store subscription in a way that prevents garbage collection
  (window as any).__thirteen_auth_subscription = subscription;
}

// Log Supabase connection status on initialization (only in development or if there's an issue)
if (typeof window !== 'undefined') {
  const hasKey = !!supabaseAnonKey;
  const hasUrl = !!supabaseUrl;
  if (!hasKey || !hasUrl) {
    console.warn('⚠️ Supabase configuration issue:', {
      hasUrl,
      hasKey,
      url: supabaseUrl || 'MISSING',
      keyLength: supabaseAnonKey ? supabaseAnonKey.length : 0,
      envCheck: {
        viteUrl: getEnv('VITE_SUPABASE_URL'),
        viteKey: getEnv('VITE_SUPABASE_ANON_KEY') ? 'SET' : 'MISSING'
      }
    });
  }
}

export const fetchEmotes = async (forceRefresh = false): Promise<Emote[]> => {
  if (!supabaseAnonKey) {
    console.warn('No Supabase key, cannot fetch emotes');
    return [];
  }
  
  // Global Cache: Return cached data if available and fresh (unless force refresh)
  const now = Date.now();
  if (!forceRefresh && globalFetchCache.emotes.data && (now - globalFetchCache.emotes.timestamp) < globalFetchCache.emotes.ttl) {
    return globalFetchCache.emotes.data;
  }
  
  // LOCKED FETCHER PATTERN: Prevent concurrent fetches
  // Exit if a fetch is already in progress - prevents AbortError loops
  if (isFetchingEmotes) {
    // Return existing promise if available, otherwise return cached data
    if (globalFetchCache.emotes.promise) {
      return globalFetchCache.emotes.promise;
    }
    // Return cached data even if stale, rather than starting new fetch
    return globalFetchCache.emotes.data || [];
  }
  
  // Global Cache: If a fetch is already in progress, return that promise instead of starting a new one
  if (globalFetchCache.emotes.promise) {
    return globalFetchCache.emotes.promise;
  }
  
  // LOCKED FETCHER: Set lock immediately to prevent concurrent requests
  isFetchingEmotes = true;
  
  // Create the fetch promise and store it in cache immediately
  const fetchPromise = (async () => {
    try {
      // NO ABORT SIGNAL: Query without any abort controller
      // Let Supabase handle the request normally, no cancellation on re-renders
      const { data, error } = await supabase
        .from('emotes')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) {
        console.error('Error fetching emotes:', error);
        // Return cached data on error if available, otherwise empty array
        return globalFetchCache.emotes.data || [];
      }
      
      // Process the successfully fetched data
      const fetchedData = data || [];
      
      // Premium emote pricing - override database prices for specific emotes
      // Match by exact name (case-sensitive) or by trigger_code for flexibility
      const PREMIUM_EMOTE_PRICES: Record<string, number> = {
        'Game Over': 650,
        'Doge Focus': 650,
        'Lunar New Year': 450,
        'The Mooner': 450,
        'Seductive': 450,
        'Seductive Dealer': 450
      };
      
      // Also map by trigger_code for additional safety
      const PREMIUM_TRIGGER_PRICES: Record<string, number> = {
        ':game_over:': 650,
        ':doge_focus:': 650,
        ':lunar_new_year:': 450,
        ':the_mooner:': 450,
        ':heart_eyes:': 450,
        ':seductive:': 450
      };
      
      // Map database fields to our Emote interface
      // Database uses 'shortcode', our code uses 'trigger_code'
      // Default price is 200 gems, but premium emotes have custom prices
      const emotes: Emote[] = (fetchedData || []).map((e: any) => {
        const emoteName = e.name || '';
        const triggerCode = (e.shortcode || e.trigger_code || '').toLowerCase();
        
        // Check both name and trigger_code for premium pricing
        const premiumPriceByName = PREMIUM_EMOTE_PRICES[emoteName];
        const premiumPriceByTrigger = PREMIUM_TRIGGER_PRICES[triggerCode];
        const premiumPrice = premiumPriceByName !== undefined ? premiumPriceByName : premiumPriceByTrigger;
        
        const finalPrice = premiumPrice !== undefined ? premiumPrice : (e.price || 200);
        
        // Log premium pricing for debugging
        if (premiumPrice !== undefined) {
        }
        
        // Normalize fallback emoji - ensure it's a valid string
        // The database migration will normalize old Apple emoji characters
        // This is just a safety check to ensure we always have a valid fallback
        const fallbackEmoji = (e.fallback_emoji || '👤').trim() || '👤';
        
        return {
          id: e.id,
          name: emoteName,
          file_path: e.file_path,
          trigger_code: e.shortcode || e.trigger_code || '', // Map shortcode to trigger_code
          fallback_emoji: fallbackEmoji,
          price: finalPrice
        };
      });
      
      // Store in global cache
      globalFetchCache.emotes.data = emotes;
      globalFetchCache.emotes.timestamp = Date.now();
      
      return emotes;
    } catch (err: any) {
      console.error('fetchEmotes: Exception during fetch:', err);
      // Return cached data on error if available, otherwise empty array
      return globalFetchCache.emotes.data || [];
    } finally {
      // UNLOCK: Always release the lock in finally block
      isFetchingEmotes = false;
      globalFetchCache.emotes.promise = null; // Clear promise after completion
    }
  })();
  
  // Store the promise in cache so other components can use it
  globalFetchCache.emotes.promise = fetchPromise;
  
  return fetchPromise;
};

const EVENT_TARGETS = { daily_play: 1, daily_win: 1, weekly_bombs: 3, weekly_play: 13, weekly_win: 13 };

/**
 * Generate a unique username with discriminator
 * Database now uses separate username and discriminator columns
 * Returns object with username and discriminator for database insertion
 */
interface UsernameWithDiscriminator {
  username: string; // Display name only (without discriminator)
  discriminator: string; // 4-digit string (1000-9999)
}

const generateUniqueUsername = async (baseUsername: string = 'AGENT'): Promise<UsernameWithDiscriminator> => {
  const cleanUsername = baseUsername.trim().toUpperCase().replace(/[^A-Z0-9\s]/g, '').substring(0, 20) || 'AGENT';
  
  if (!supabaseAnonKey) {
    // Fallback for offline mode - generate random discriminator (1000-9999)
    const discriminator = generateDiscriminator();
    return { username: cleanUsername, discriminator };
  }

  // Try up to 100 times to find a unique discriminator for this username
  for (let attempt = 0; attempt < 100; attempt++) {
    const discriminator = generateDiscriminator(); // 1000-9999 range
    
    // Check if this username+discriminator combination already exists
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', cleanUsername)
      .eq('discriminator', discriminator)
      .maybeSingle();
    
    if (error || !data) {
      // Username+discriminator combination is available
      return { username: cleanUsername, discriminator };
    }
  }
  
  // Fallback if all attempts fail (should be extremely rare)
  // Use timestamp-based discriminator (last 4 digits, ensuring 1000-9999 range)
  const timestampDiscriminator = (1000 + (Date.now() % 9000)).toString();
  return { username: cleanUsername, discriminator: timestampDiscriminator };
};

const getDefaultProfile = async (id: string, avatar: string = ':cool:', baseUsername: string = 'AGENT'): Promise<UserProfile> => {
  // Generate unique username and discriminator (database uses separate columns)
  const { username, discriminator } = await generateUniqueUsername(baseUsername);
  return {
    id, 
    username, // Display name only
    discriminator, // 4-digit discriminator (1000-9999)
    wins: 0, games_played: 0, currency: 500, coins: 500, gems: 0, xp: 0, level: 1,
    unlocked_sleeves: ['RED', 'BLUE'], unlocked_avatars: [...DEFAULT_AVATARS.filter(a => a !== ':smile:')], unlocked_boards: ['EMERALD'],
    unlocked_phrases: getDefaultChatPresetIds(), // Initialize with default quick chats
    avatar_url: avatar, sfx_enabled: true, turbo_enabled: true, sleeve_effects_enabled: true,
    play_animations_enabled: true, turn_timer_setting: 0, undo_count: 0, finish_dist: [0, 0, 0, 0],
    total_chops: 0, total_cards_left_sum: 0, current_streak: 0, longest_streak: 0,
    eula_accepted: false, // New users must accept EULA before playing
    inventory: { items: { XP_2X_10M: 1, GOLD_2X_10M: 1 }, active_boosters: {} },
    event_stats: {
      daily_games_played: 0, daily_wins: 0, weekly_games_played: 0, weekly_wins: 0,
      weekly_bombs_played: 0, weekly_chops_performed: 0, weekly_challenge_progress: {},
      total_hands_played: 0, new_player_login_days: 1, claimed_events: [], ready_to_claim: []
    }
  };
};

export const fetchGuestProfile = (): UserProfile => {
  const local = localStorage.getItem(GUEST_STORAGE_KEY);
  const data = local ? JSON.parse(local) : null;
  if (!data) {
    // For guest, use synchronous fallback - generate random discriminator (1000-9999)
    const discriminator = generateDiscriminator();
    const username = 'GUEST'; // Display name only, discriminator is separate
    return {
      id: 'guest', username, discriminator, wins: 0, games_played: 0, currency: 500, coins: 500, gems: 0, xp: 0, level: 1,
      unlocked_sleeves: ['RED', 'BLUE'], unlocked_avatars: [...DEFAULT_AVATARS.filter(a => a !== ':smile:')], unlocked_boards: ['EMERALD'],
      unlocked_phrases: getDefaultChatPresetIds(), // Initialize with default quick chats
      avatar_url: ':cool:', sfx_enabled: true, turbo_enabled: true, sleeve_effects_enabled: true,
      play_animations_enabled: true, turn_timer_setting: 0, undo_count: 0, finish_dist: [0, 0, 0, 0],
      total_chops: 0, total_cards_left_sum: 0, current_streak: 0, longest_streak: 0,
      inventory: { items: { XP_2X_10M: 1, GOLD_2X_10M: 1 }, active_boosters: {} },
      event_stats: {
        daily_games_played: 0, daily_wins: 0, weekly_games_played: 0, weekly_wins: 0,
        weekly_bombs_played: 0, weekly_chops_performed: 0, weekly_challenge_progress: {},
        total_hands_played: 0, new_player_login_days: 1, claimed_events: [], ready_to_claim: []
      }
    };
  }
  
  // Ensure inventory exists and has default items for guest users (only if inventory is empty)
  const profile = { ...data, gems: data.gems ?? 0, turn_timer_setting: data.turn_timer_setting ?? 0 } as UserProfile;
  
  // Ensure discriminator exists for guest profiles (generate if missing)
  if (!profile.discriminator || profile.discriminator === '' || !/^\d{4}$/.test(profile.discriminator)) {
    profile.discriminator = generateDiscriminator();
    // Save updated profile with discriminator
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(profile));
  }
  
  // Handle legacy guest profiles with username in "GUEST#1234" format
  if (profile.username && profile.username.includes('#') && profile.username.startsWith('GUEST#')) {
    const parts = profile.username.split('#');
    if (parts.length === 2 && /^\d{4}$/.test(parts[1])) {
      profile.username = 'GUEST';
      profile.discriminator = parts[1];
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(profile));
    }
  }
  
  if (!profile.inventory || !profile.inventory.items || Object.keys(profile.inventory.items).length === 0) {
    profile.inventory = { items: { XP_2X_10M: 1, GOLD_2X_10M: 1 }, active_boosters: profile.inventory?.active_boosters || {} };
  }
  
  // Ensure unlocked_phrases exists and includes default quick chats for legacy guest accounts
  if (!profile.unlocked_phrases || profile.unlocked_phrases.length === 0) {
    profile.unlocked_phrases = getDefaultChatPresetIds();
    // Save the updated profile back to localStorage
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(profile));
  } else {
    // Merge default IDs with existing ones (avoid duplicates)
    const defaultIds = getDefaultChatPresetIds();
    const existingIds = new Set(profile.unlocked_phrases);
    const missingDefaults = defaultIds.filter(id => !existingIds.has(id));
    if (missingDefaults.length > 0) {
      profile.unlocked_phrases = [...profile.unlocked_phrases, ...missingDefaults];
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(profile));
    }
  }
  
  return profile;
};

/**
 * Save guest progress (XP, Gems, Coins) to localStorage for migration
 * This is called whenever guest data changes (gems earned, XP gained, coins earned)
 */
export const saveGuestProgress = (data: { gems?: number; xp?: number; coins?: number }): void => {
  try {
    const current = localStorage.getItem(GUEST_MIGRATION_KEY);
    const existing = current ? JSON.parse(current) : { gems: 0, xp: 0, coins: 0 };
    
    // Merge with existing data (take maximum to preserve highest values)
    const merged = {
      gems: Math.max(existing.gems || 0, data.gems || 0),
      xp: Math.max(existing.xp || 0, data.xp || 0),
      coins: Math.max(existing.coins || 0, data.coins || 0),
    };
    
    localStorage.setItem(GUEST_MIGRATION_KEY, JSON.stringify(merged));
  } catch (error) {
    console.error('Failed to save guest progress:', error);
  }
};

/**
 * Get guest progress from localStorage
 */
export const getGuestProgress = (): { gems: number; xp: number; coins: number } | null => {
  try {
    const data = localStorage.getItem(GUEST_MIGRATION_KEY);
    if (!data) return null;
    const parsed = JSON.parse(data);
    // Only return if at least one value is non-zero
    if ((parsed.gems || 0) > 0 || (parsed.xp || 0) > 0 || (parsed.coins || 0) > 0) {
      return {
        gems: parsed.gems || 0,
        xp: parsed.xp || 0,
        coins: parsed.coins || 0,
      };
    }
    return null;
  } catch (error) {
    console.error('Failed to get guest progress:', error);
    return null;
  }
};

/**
 * Clear guest migration data from localStorage
 */
export const clearGuestProgress = (): void => {
  try {
    localStorage.removeItem(GUEST_MIGRATION_KEY);
  } catch (error) {
    console.error('Failed to clear guest progress:', error);
  }
};

/**
 * Migrate guest data to permanent account
 * Calls Supabase RPC function that checks if account is new (created in last 5 minutes)
 * @param isSignup - true if this is a new signup (SIGNED_UP), false if signing into existing account (SIGNED_IN)
 */
export const migrateGuestData = async (
  userId: string,
  gems: number,
  xp: number,
  coins: number,
  isSignup: boolean = false
): Promise<{ 
  success: boolean; 
  error?: string;
  migratedGems?: number;
  bonusGems?: number;
  migratedXp?: number;
  migratedCoins?: number;
  newGemBalance?: number;
}> => {
  if (!supabaseAnonKey) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const { data, error } = await supabase.rpc('migrate_guest_data', {
      user_id: userId,
      guest_gems: gems,
      guest_xp: xp,
      guest_coins: coins,
      is_signup: isSignup,
    });

    if (error) {
      console.error('Migration error:', error);
      return { success: false, error: error.message };
    }

    // Handle JSON response from updated function
    if (typeof data === 'object' && data !== null) {
      if (data.success === false) {
        return { 
          success: false, 
          error: data.error || 'Migration failed' 
        };
      }
      
      // Return success with breakdown data
      return {
        success: true,
        migratedGems: data.migrated_gems || 0,
        bonusGems: data.bonus_gems || 0,
        migratedXp: data.migrated_xp || 0,
        migratedCoins: data.migrated_coins || 0,
        newGemBalance: data.new_gem_balance || 0,
      };
    }

    // Fallback for old boolean response (shouldn't happen with updated function)
    if (data === false) {
      return { 
        success: false, 
        error: 'Account is not new. Migration only allowed for accounts created in the last 5 minutes.' 
      };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Migration exception:', error);
    return { success: false, error: error.message || 'Migration failed' };
  }
};

export const fetchProfile = async (userId: string, currentAvatar: string = ':cool:', baseUsername?: string): Promise<UserProfile | null> => {
  if (!supabaseAnonKey || userId === 'guest') return fetchGuestProfile();
  
  // Validation: Log UUID for debugging
  // Note: This should only log ONCE per session due to hard lock in App.tsx
  
  // REMOVE ABORTCONTROLLER: No AbortController, no signal, no cleanup
  // In production, Ghost Session causes session fluctuations which trigger abort signals before database responds
  // We want this request to complete even if the component re-renders
  // Supabase internally may use AbortController, but we don't pass any signal - let it complete naturally
  try {
    // Select all columns - database uses 'username' (single source of truth) and 'gems' (not gem_count)
    // This ensures we use the correct columns and prevents "Render Storm" from column mismatches
    // NO ABORT SIGNAL: Query without any abort controller or signal property
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      
    if (error) {
      // Check if it's an AbortError - handle gracefully without throwing (don't block profile load)
      const isAbortError = error.name === 'AbortError' || error.message?.includes('aborted') || error.message?.includes('signal is aborted');
      
      if (isAbortError) {
        // REMOVE ABORTCONTROLLER: Silently handle AbortError - don't throw, just log
        // In production, Ghost Session causes this - we want to retry on next stable render
        console.warn(`⚠️ fetchProfile: Profile fetch was aborted for UUID: ${userId} (likely due to session fluctuation). Will retry on next render.`);
        // Return null to allow caller to handle gracefully - don't block the app
        return null;
      }
    
      console.error('❌ fetchProfile: Error fetching existing profile:', {
        userId,
        errorCode: error.code,
        errorMessage: error.message,
        errorDetails: error.details,
        errorHint: error.hint
      });
    
      // If it's a permission error (RLS blocking), log it but don't try to create a new profile
      if (error.code === '42501' || error.message?.includes('permission') || error.message?.includes('policy')) {
        console.error('🔴 fetchProfile: RLS policy blocking SELECT for existing user!');
        console.error('This means the RLS policy "Users can view their own profile" is not working correctly.');
        console.error('The user should be able to SELECT their own profile. Check RLS policies in Supabase.');
        // Return null so the caller can handle it, but don't try to create a new profile
        return null;
      }
      
      // For network errors or other errors, throw so caller can show retry button
      // Don't return null here - we want to distinguish between 404 and network errors
      const networkError = new Error(error.message || 'Network error fetching profile');
      (networkError as any).isNetworkError = true;
      (networkError as any).supabaseError = error;
      throw networkError;
    }
    // maybeSingle() returns null data (not an error) when no rows are found (404 case)
    // Check for 404 explicitly: if data is null and no error, it's a 404
    if (!data && !error) {
      // Return a special marker to indicate 404 - caller will handle creating new profile
      const notFoundError = new Error('PROFILE_NOT_FOUND_404');
      (notFoundError as any).isNotFound = true;
      throw notFoundError;
    }
    
  if (data) {
      // Ensure we use 'gems' column (not 'gem_count') and 'username' + 'discriminator' (separate columns)
      // Database uses separate 'username' and 'discriminator' columns
      // Handle legacy profiles that might have username in "Name#0000" format
      let username = data.username || '';
      let discriminator = data.discriminator || '';
      
      // Check if username contains discriminator (legacy format: "Name#1234")
      if (username && username.includes('#') && (!discriminator || discriminator === '')) {
        const parts = username.split('#');
        if (parts.length === 2 && /^\d{4}$/.test(parts[1])) {
          // Legacy format detected - extract username and discriminator
          username = parts[0];
          discriminator = parts[1];
          // Update profile in database to separate columns (async, don't await)
          updateProfileSettings(userId, { username, discriminator }).catch(err => 
            console.warn('Failed to update legacy username format:', err)
          );
        }
      }
      
      // If discriminator is still missing or invalid, generate one
      if (!discriminator || discriminator === '' || !/^\d{4}$/.test(discriminator)) {
        discriminator = generateDiscriminator();
        // Update profile in database with new discriminator (async, don't await)
        updateProfileSettings(userId, { discriminator }).catch(err => 
          console.warn('Failed to update discriminator:', err)
        );
      }
      
      const profile = { 
        ...data, 
        gems: data.gems ?? 0, // Use 'gems' column, not 'gem_count'
        coins: data.coins ?? 0, // Explicitly map coins column
        currency: data.currency ?? data.coins ?? 500, // Map currency (legacy field, fallback to coins)
        username: username, // Display name only (without discriminator)
        discriminator: discriminator, // 4-digit discriminator (1000-9999)
        turn_timer_setting: data.turn_timer_setting ?? 0 
      } as UserProfile;
      
      // Debug: Log the profile data to verify gems/coins are correctly mapped
    // Normalize level for legacy users: ensure level matches calculated level based on XP
    const calculatedLevel = calculateLevel(profile.xp || 0);
    if (profile.level !== calculatedLevel) {
      // Update level in database if it's out of sync (for legacy users)
      // Only update if the difference is significant to avoid unnecessary writes
      profile.level = calculatedLevel;
      // Silently update in background (don't await to avoid blocking)
      updateProfileSettings(userId, { level: calculatedLevel }).catch(err => 
        console.warn('Failed to sync legacy user level:', err)
      );
    }
    
    // Ensure unlocked_phrases exists and includes default quick chats for legacy accounts
    const defaultIds = getDefaultChatPresetIds();
    // Normalize unlocked_phrases - handle null, undefined, or non-array values
    const currentPhrases = (profile.unlocked_phrases && Array.isArray(profile.unlocked_phrases)) 
      ? profile.unlocked_phrases 
      : [];
    
    // Check if any default IDs are missing
    const existingIds = new Set(currentPhrases);
    const missingDefaults = defaultIds.filter(id => !existingIds.has(id));
    
    if (missingDefaults.length > 0 || currentPhrases.length === 0) {
      // Add missing defaults or initialize if empty
      const updatedPhrases = currentPhrases.length === 0 
        ? defaultIds 
        : [...currentPhrases, ...missingDefaults];
      
      // Set in profile immediately so user sees it right away
      profile.unlocked_phrases = updatedPhrases;
      
      // Update database synchronously to ensure it's saved
      try {
        await updateProfileSettings(userId, { unlocked_phrases: updatedPhrases });
      } catch (err) {
        console.warn('Failed to update legacy user unlocked_phrases:', err);
        // Profile already has the phrases set, so user can still use them
      }
    } else {
      // Ensure profile has the phrases array set (in case it was null/undefined)
      profile.unlocked_phrases = currentPhrases;
    }
    
    return profile;
  }
    
    // No profile found (404) - maybeSingle() returns null data when no rows found
    // This is a new user, create profile
    
    // Get user email from auth session to save in profile
    let userEmail: string | undefined;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      userEmail = user?.email || undefined;
      if (userEmail) {
      } else {
        console.warn('🔵 fetchProfile: No email found in auth session for user:', userId);
      }
    } catch (emailError) {
      console.warn('🔵 fetchProfile: Error getting email from auth session:', emailError);
      // Continue without email - it will be backfilled by migration
    }
  
  // New user - generate username with discriminator from Google metadata
  // baseUsername should come from Google OAuth metadata (full_name, name, or display_name)
  const cleanBaseUsername = (baseUsername || 'AGENT').trim().toUpperCase().replace(/[^A-Z0-9\s]/g, '').substring(0, 20) || 'AGENT';
  const defaultProfile = await getDefaultProfile(userId, currentAvatar, cleanBaseUsername);
  // Save the new profile immediately for Google OAuth users
  // Attempt to upsert new user profile
  const { data: upsertData, error: upsertError } = await supabase.from('profiles').upsert(defaultProfile, {
    onConflict: 'id'
  });
  
  if (upsertError) {
    // Log detailed error information
    console.error('❌❌❌ ERROR saving new user profile ❌❌❌');
    console.error('==========================================');
    console.error('Error Code:', upsertError.code || 'N/A');
    console.error('Error Message:', upsertError.message || 'N/A');
    console.error('Error Details:', upsertError.details || 'N/A');
    console.error('Error Hint:', upsertError.hint || 'N/A');
    console.error('Full Error Object:', upsertError);
    console.error('User ID:', userId);
    console.error('Profile Username:', defaultProfile.username);
    console.error('Profile Keys:', Object.keys(defaultProfile));
    console.error('Profile Data (first 500 chars):', JSON.stringify(defaultProfile, null, 2).substring(0, 500));
    console.error('==========================================');
    
    // Provide more helpful error message
    let errorMsg = `Database error saving new user: ${upsertError.message || 'Unknown error'}`;
    if (upsertError.code === '42501') {
      errorMsg += ' (Permission denied - RLS policy blocking insert. Run the fix_profile_rls_policies.sql migration!)';
    } else if (upsertError.code === '23502') {
      errorMsg += ' (Missing required column - check database schema)';
    } else if (upsertError.code === '23505') {
      errorMsg += ' (Unique constraint violation)';
    } else if (upsertError.code) {
      errorMsg += ` (Error code: ${upsertError.code})`;
    }
    
    // Throw error so caller can handle it
    const error = new Error(errorMsg);
    (error as any).supabaseError = upsertError;
    throw error;
  }
  
  return defaultProfile;
  } catch (e: any) {
    // Re-throw network errors, abort errors, and 404 errors so caller can handle them
    if ((e as any).isNetworkError || (e as any).isAbortError || (e as any).isNotFound) {
      throw e;
    }
    // For other errors, log and return null
    console.error(`❌ Exception in fetchProfile for UUID: ${userId}:`, e);
    return null;
  }
};

export const updateProfileAvatar = async (userId: string, avatar: string) => {
  if (!supabaseAnonKey || userId === 'guest') {
    const local = fetchGuestProfile();
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify({ ...local, avatar_url: avatar }));
    return;
  }
  await supabase.from('profiles').upsert({ id: userId, avatar_url: avatar });
};

export const updateProfileSettings = async (userId: string, updates: Partial<UserProfile>) => {
  // SECURITY: Restrict which fields can be directly updated to prevent manipulation
  // Only allow safe fields to be updated directly
  const allowedFields = [
    'avatar_url', 'sfx_enabled', 'turbo_enabled', 'sleeve_effects_enabled',
    'play_animations_enabled', 'turn_timer_setting', 'active_sleeve', 'active_board',
    'equipped_finisher', 'unlocked_sleeves', 'unlocked_avatars', 'unlocked_boards',
    'unlocked_finishers', 'unlocked_phrases', 'inventory'
  ];
  
  // Filter updates to only include allowed fields
  const safeUpdates: Partial<UserProfile> = {};
  for (const key of allowedFields) {
    if (key in updates) {
      (safeUpdates as any)[key] = (updates as any)[key];
    }
  }
  
  // SECURITY: Block direct updates to sensitive fields like currency, XP, wins, etc.
  // These should only be updated through specific functions (buyItem, recordGameResult, etc.)
  // Note: event_stats is allowed to be updated (used by recordGameResult and buyItem)
  const blockedFields = ['coins', 'gems', 'currency', 'xp', 'level', 'wins', 'games_played', 
    'total_chops', 'current_streak', 'longest_streak', 'finish_dist', 'undo_count',
    'username', 'id'];
  for (const key of blockedFields) {
    if (key in updates) {
      console.warn(`Attempted to update blocked field: ${key}. This update was ignored.`);
      delete (safeUpdates as any)[key];
    }
  }
  
  // Allow event_stats to be updated (used by recordGameResult and buyItem)
  if ('event_stats' in updates) {
    (safeUpdates as any).event_stats = (updates as any).event_stats;
  }
  
  // PROFILE UPDATE SANITIZATION: Strip out protected/calculated fields (id, level, created_at) before calling .update()
  // These fields are protected or calculated by the database and cause 400 'Bad Request' errors if sent
  const { id, level, created_at, ...cleanData } = safeUpdates as any;
  
  if (!supabaseAnonKey || userId === 'guest') {
    const local = fetchGuestProfile();
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify({ ...local, ...cleanData }));
    return;
  }
  
  // PROFILE UPDATE SANITIZATION: Use .update() instead of .upsert() and use cleanData (without id, level, created_at)
  // This prevents 400 errors from protected fields that are calculated by the database
  // Use .update() with .eq('id', userId) to ensure we only update existing records
  const { error } = await supabase.from('profiles').update(cleanData).eq('id', userId);
  
  if (error) {
    console.error('Error updating profile settings:', error);
    // Don't throw - let the caller handle the error if needed
  }
};

export const buyItem = async (
  userId: string, 
  price: number, 
  itemName: string, 
  type: 'SLEEVE' | 'AVATAR' | 'BOARD' | 'ITEM', 
  isGuest: boolean = false,
  currency: 'GOLD' | 'GEMS' = 'GOLD'
) => {
  // SECURITY: Validate price is a positive number
  if (typeof price !== 'number' || price < 0 || !isFinite(price)) {
    throw new Error("Invalid price");
  }
  
  // SECURITY: Validate itemName is a non-empty string
  if (!itemName || typeof itemName !== 'string' || itemName.length > 100) {
    throw new Error("Invalid item name");
  }
  
  const profile = isGuest ? fetchGuestProfile() : await fetchProfile(userId);
  if (!profile) throw new Error("Profile not found");

  // SECURITY: Server-side price validation
  // For ITEM type, validate against ITEM_REGISTRY
  if (type === 'ITEM') {
    const itemDef = ITEM_REGISTRY[itemName];
    if (!itemDef) {
      throw new Error("Item not found in registry");
    }
    // Validate price matches registry (client should send correct price, but we verify)
    if (itemDef.price !== undefined && itemDef.price !== price) {
      throw new Error("Price mismatch - item price does not match registry");
    }
    // Validate currency matches registry
    if (itemDef.currency && itemDef.currency !== currency) {
      throw new Error("Currency mismatch");
    }
  }
  
  // Note: For SLEEVE, AVATAR, BOARD types, prices should be validated against server-side constants
  // This is a client-side call, so we rely on Supabase RLS policies for additional security
  // In production, consider moving purchase logic to a server-side API endpoint

  if (currency === 'GEMS') {
    if ((profile.gems || 0) < price) throw new Error("Insufficient gems");
  } else {
    if ((profile.coins || 0) < price) throw new Error("Insufficient coins");
  }

  const updates: Partial<UserProfile> = {};
  if (currency === 'GEMS') {
    updates.gems = (profile.gems || 0) - price;
    // Track gem purchase for new player event
    const currentStats = profile.event_stats || { daily_games_played: 0, daily_wins: 0, new_player_login_days: 0, claimed_events: [] };
    updates.event_stats = {
      ...currentStats,
      gems_purchased: (currentStats.gems_purchased || 0) + price,
      ready_to_claim: [
        ...checkEventMilestones({ ...currentStats, gems_purchased: (currentStats.gems_purchased || 0) + price }, 0, profile.last_daily_claim),
        ...(currentStats.ready_to_claim || [])
      ]
    };
  } else {
    // Deduct from coins (gold_balance) when currency is GOLD
    updates.coins = (profile.coins || 0) - price;
  }

  if (type === 'SLEEVE') updates.unlocked_sleeves = Array.from(new Set([...(profile.unlocked_sleeves || []), itemName]));
  if (type === 'AVATAR') updates.unlocked_avatars = Array.from(new Set([...(profile.unlocked_avatars || []), itemName]));
  if (type === 'BOARD') updates.unlocked_boards = Array.from(new Set([...(profile.unlocked_boards || []), itemName]));
  
  if (type === 'ITEM') {
    const inv = profile.inventory || { items: {}, active_boosters: {} };
    const itemDef = ITEM_REGISTRY[itemName];
    
    // Handle bundles
    if (itemName === 'BOOSTER_PACK_XP') {
      inv.items['XP_2X_30M'] = (inv.items['XP_2X_30M'] || 0) + 1;
      inv.items['XP_2X_10M'] = (inv.items['XP_2X_10M'] || 0) + 2;
    } else if (itemName === 'BOOSTER_PACK_GOLD') {
      inv.items['GOLD_2X_30M'] = (inv.items['GOLD_2X_30M'] || 0) + 1;
      inv.items['GOLD_2X_10M'] = (inv.items['GOLD_2X_10M'] || 0) + 2;
    } else {
      // Regular single item
      inv.items[itemName] = (inv.items[itemName] || 0) + 1;
    }
    updates.inventory = { ...inv };
  }

  await updateProfileSettings(userId, updates);
  return true;
};

export const grantItem = async (userId: string, itemId: string, quantity: number = 1) => {
  const profile = userId === 'guest' ? fetchGuestProfile() : await fetchProfile(userId);
  if (!profile) return;
  const itemDef = ITEM_REGISTRY[itemId];
  const updates: Partial<UserProfile> = {};
  if (itemDef?.type === 'COSMETIC' && itemDef.style) {
    updates.unlocked_sleeves = Array.from(new Set([...(profile.unlocked_sleeves || []), itemDef.style]));
  } else {
    const inv = profile.inventory || { items: {}, active_boosters: {} };
    const currentQty = inv.items[itemId] || 0;
    updates.inventory = { ...inv, items: { ...inv.items, [itemId]: currentQty + quantity } };
  }
  await updateProfileSettings(userId, updates);
};

export const activateBooster = async (userId: string, itemId: string) => {
  const profile = userId === 'guest' ? fetchGuestProfile() : await fetchProfile(userId);
  if (!profile) return;
  const itemDef = ITEM_REGISTRY[itemId];
  if (itemDef?.type !== 'BOOSTER' || !itemDef.boosterType) return;
  if (!itemDef.durationMs && !itemDef.gamesRemaining) return;
  
  const inv = profile.inventory || { items: {}, active_boosters: {} };
  const currentQty = inv.items[itemId] || 0;
  if (currentQty <= 0) return;
  
  // For game-based boosters, store negative number (e.g., -3 means 3 games remaining)
  // For time-based boosters, store expiration timestamp
  const boosterValue = itemDef.gamesRemaining 
    ? -itemDef.gamesRemaining 
    : Date.now() + (itemDef.durationMs || 0);
  
  const updates: Partial<UserProfile> = {
    inventory: { ...inv, items: { ...inv.items, [itemId]: currentQty - 1 }, active_boosters: { ...inv.active_boosters, [itemDef.boosterType]: boosterValue } }
  };
  await updateProfileSettings(userId, updates);
};

/**
 * Passive Revenue Service: Claim 250 Gold every 4 hours.
 */
export const claimPassiveRevenue = async (userId: string) => {
  const profile = userId === 'guest' ? fetchGuestProfile() : await fetchProfile(userId);
  if (!profile) return { success: false, reason: 'Profile missing' };
  
  const now = Date.now();
  const lastClaim = profile.last_ad_claim ? new Date(profile.last_ad_claim).getTime() : 0;
  const cooldown = 4 * 60 * 60 * 1000;

  if (now - lastClaim < cooldown) {
    return { success: false, reason: 'Cooldown active' };
  }

  const updates: Partial<UserProfile> = {
    coins: (profile.coins || 0) + 250,
    last_ad_claim: new Date(now).toISOString()
  };
  
  await updateProfileSettings(userId, updates);
  return { success: true };
};

/**
 * Securely claim ad reward (gems) using RPC function
 * This uses auth.uid() server-side to prevent spoofing
 * Includes 30-second cooldown to prevent botting
 * 
 * @returns Result with success status and new gem balance
 */
export const claimAdRewardGems = async (): Promise<{ 
  success: boolean; 
  newGemBalance?: number; 
  newCoinBalance?: number;
  weeklyGems?: number;
  rewardType?: 'gems' | 'coins';
  rewardAmount?: number;
  hitCap?: boolean;
  error?: string; 
  cooldownRemaining?: number 
}> => {
  try {
    // Check if we have a valid session first
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    
    // If no session or user is guest, handle as guest (ads are allowed for guests)
    if (!userId || userId === 'guest') {
      const guestProfile = fetchGuestProfile();
      const newGems = (guestProfile.gems || 0) + 20;
      guestProfile.gems = newGems;
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(guestProfile));
      // Save guest progress for migration
      saveGuestProgress({ gems: newGems });
      return { 
        success: true, 
        newGemBalance: newGems,
        weeklyGems: 20,
        rewardType: 'gems',
        rewardAmount: 20,
        hitCap: false
      };
    }
    
    // Call the secure RPC function (no parameters needed - uses auth.uid() server-side)
    const { data, error } = await supabase.rpc('claim_ad_reward');

    if (error) {
      console.error('claimAdRewardGems: RPC error:', error);
      
      // Handle missing RPC function or missing reward_tracking table gracefully
      if (error.code === '42883' || error.message?.includes('function') && error.message?.includes('does not exist')) {
        console.warn('claim_ad_reward RPC function does not exist. Falling back to simple gem increment. To enable full ad reward system, run migrations: create_reward_tracking_table.sql and update_claim_ad_reward_dual_currency.sql');
        
        // Fallback: Simple gem increment without weekly tracking
        const fallbackResult = await incrementGems(userId, 20);
        if (fallbackResult.success) {
          return {
            success: true,
            newGemBalance: fallbackResult.newGemBalance,
            weeklyGems: 20,
            rewardType: 'gems',
            rewardAmount: 20,
            hitCap: false
          };
        }
      }
      
      // Handle missing reward_tracking table error from RPC
      if (error.message?.includes('reward_tracking') || error.message?.includes('relation') && error.message?.includes('does not exist')) {
        console.warn('reward_tracking table does not exist. RPC function needs this table. Falling back to simple gem increment. Run migration: create_reward_tracking_table.sql');
        
        // Fallback: Simple gem increment without weekly tracking
        const fallbackResult = await incrementGems(userId, 20);
        if (fallbackResult.success) {
          return {
            success: true,
            newGemBalance: fallbackResult.newGemBalance,
            weeklyGems: 20,
            rewardType: 'gems',
            rewardAmount: 20,
            hitCap: false
          };
        }
      }
      
      return { 
        success: false, 
        error: error.message || 'Failed to claim ad reward' 
      };
    }

    if (!data) {
      console.error('claimAdRewardGems: No data returned from RPC');
      return { 
        success: false, 
        error: 'No data returned from claim_ad_reward' 
      };
    }
    

    // Handle cooldown error
    if (!data.success && data.error === 'Cooldown active') {
      return {
        success: false,
        error: data.error,
        cooldownRemaining: data.cooldown_remaining,
        newGemBalance: data.current_balance,
        weeklyGems: data.weekly_gem_total
      };
    }

    // Return success with new balance and reward info
    return {
      success: data.success || false,
      newGemBalance: data.new_balance,
      newCoinBalance: data.new_coin_balance,
      weeklyGems: data.weekly_gem_total,
      rewardType: data.reward_type,
      rewardAmount: data.reward_amount,
      hitCap: data.hit_cap || false,
      error: data.error
    };
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message || 'Unknown error occurred' 
    };
  }
};

/**
 * Fetch weekly reward status for the current user
 * Returns weekly_gem_total and last_reset_date
 * HANDLE MISSING TABLE: Wraps query in try/catch to handle missing reward_tracking table (PGRST205 error)
 */
export const fetchWeeklyRewardStatus = async (userId: string): Promise<{
  weeklyGemTotal: number;
  isCapReached: boolean;
  lastResetDate: string | null;
}> => {
  // Always return an object (never null) to prevent UI crashes
  const defaultReturn = {
    weeklyGemTotal: 0,
    isCapReached: false,
    lastResetDate: new Date().toISOString()
  };

  if (!supabaseAnonKey || userId === 'guest') {
    return defaultReturn;
  }

  try {
    const { data, error } = await supabase
      .from('reward_tracking')
      .select('weekly_gem_total, last_reset_date')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      // HANDLE MISSING TABLE: Handle PGRST205 error (missing table) and other errors gracefully
      // Production database may be missing reward_tracking table - return defaults instead of throwing
      if (error.code === '42P01' || error.code === 'PGRST205' || 
          error.message?.includes('does not exist') || 
          error.message?.includes('relation') && error.message?.includes('reward_tracking') ||
          error.message?.includes('relation "reward_tracking" does not exist')) {
        console.warn('reward_tracking table does not exist (PGRST205). Returning defaults. To enable weekly reward tracking, run the migration: create_reward_tracking_table.sql');
        return defaultReturn;
      }
      console.error('Error fetching weekly reward status:', error);
      // For any other errors, return defaults to prevent UI breaking
      return defaultReturn;
    }

    if (!data) {
      // No record exists yet, return default with current date
      return defaultReturn;
    }

    return {
      weeklyGemTotal: data.weekly_gem_total || 0,
      isCapReached: (data.weekly_gem_total || 0) >= 500,
      lastResetDate: data.last_reset_date || new Date().toISOString()
    };
  } catch (error: any) {
    // HANDLE MISSING TABLE: Catch all exceptions (including PGRST205) and return defaults
    console.error('Exception fetching weekly reward status (likely missing table):', error);
    // Always return an object - never null or undefined to prevent UI crashes
    return defaultReturn;
  }
};

/**
 * Reward user for watching a rewarded ad
 * This function can be called as an RPC in Supabase or directly
 * @deprecated Use claimAdReward() instead for better security
 */
export const rewardUserForAd = async (userId: string, gemAmount: number = 20): Promise<{ success: boolean; newGemBalance?: number; error?: string }> => {
  if (!supabaseAnonKey || userId === 'guest') {
    // For guest users, update local storage
    const guestProfile = fetchGuestProfile();
    const newGems = (guestProfile.gems || 0) + gemAmount;
    guestProfile.gems = newGems;
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(guestProfile));
    return { success: true, newGemBalance: newGems };
  }

  try {
    // Try RPC function first (if it exists in Supabase)
    const { data: rpcData, error: rpcError } = await supabase.rpc('reward_user_for_ad', {
      user_id: userId,
      gem_amount: gemAmount
    });

    if (!rpcError && rpcData) {
      return { success: true, newGemBalance: rpcData.new_balance };
    }

    // Fallback: Direct update if RPC doesn't exist
    const { data: profileData, error: fetchError } = await supabase
      .from('profiles')
      .select('gems')
      .eq('id', userId)
      .single();

    if (fetchError || !profileData) {
      return { success: false, error: 'Failed to fetch profile' };
    }

    const newGems = (profileData.gems || 0) + gemAmount;
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ gems: newGems })
      .eq('id', userId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true, newGemBalance: newGems };
  } catch (error: any) {
    return { success: false, error: error.message || 'Unknown error' };
  }
};

/**
 * Process a gem transaction using the process_gem_transaction RPC function
 * This creates a transaction record and updates the user's gem balance
 * 
 * @param userId - The user's ID
 * @param amount - The gem amount (positive for additions, negative for deductions)
 * @param source - The source of the transaction ('ad_reward', 'iap_purchase', 'shop_buy', etc.)
 * @param itemId - Optional item ID for shop purchases
 * @returns Transaction result with success status and new balance
 */
export const processGemTransaction = async (
  userId: string,
  amount: number,
  source: 'ad_reward' | 'iap_purchase' | 'shop_buy' | string,
  itemId?: string
): Promise<{ success: boolean; newGemBalance?: number; error?: string }> => {
  // Block guest users from purchasing gems (iap_purchase, shop_buy), but allow ad rewards
  if (userId === 'guest' && source !== 'ad_reward') {
    return { 
      success: false, 
      error: 'Guest accounts cannot purchase gems. Please sign in to make purchases.' 
    };
  }
  
  // For guest users with ad_reward source, update local storage
  if (!supabaseAnonKey || userId === 'guest') {
    const guestProfile = fetchGuestProfile();
    const newGems = (guestProfile.gems || 0) + amount;
    if (newGems < 0) {
      return { success: false, error: 'Insufficient gems' };
    }
    guestProfile.gems = newGems;
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(guestProfile));
    return { success: true, newGemBalance: newGems };
  }

  try {
    // Call the process_gem_transaction RPC function
    const { data, error } = await supabase.rpc('process_gem_transaction', {
      user_id: userId,
      amount: amount,
      source: source,
      item_id: itemId || null
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: 'No data returned from transaction' };
    }

    return {
      success: data.success || false,
      newGemBalance: data.new_balance,
      error: data.error
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Unknown error occurred' };
  }
};

/**
 * Handle gem purchase with first-time 2x bonus support
 * Calls the handle_gem_purchase RPC function which applies the 2x bonus if eligible
 * 
 * @param userId - The user's ID
 * @param packId - The gem pack ID (e.g., 'gem_1', 'gem_2')
 * @param baseGems - The base number of gems in the pack (before bonus)
 * @param price - The price string (e.g., '$1.99')
 * @returns Object with success status, new gem balance, and whether bonus was applied
 */
export const handleGemPurchase = async (
  userId: string,
  packId: string,
  baseGems: number,
  price: string
): Promise<{ 
  success: boolean; 
  newGemBalance?: number; 
  bonusApplied?: boolean;
  first_purchase_eligible?: boolean;
  error?: string 
}> => {
  // Block guest users from purchasing gems
  if (!supabaseAnonKey || userId === 'guest') {
    return { 
      success: false, 
      error: 'Guest accounts cannot purchase gems. Please sign in to make purchases.' 
    };
  }

  try {
    // Call the handle_gem_purchase RPC function
    const { data, error } = await supabase.rpc('handle_gem_purchase', {
      user_id: userId,
      pack_id: packId,
      base_gems: baseGems,
      price: price
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: 'No data returned from purchase' };
    }

    return {
      success: data.success || false,
      newGemBalance: data.new_balance,
      bonusApplied: data.bonus_applied || false,
      first_purchase_eligible: data.first_purchase_eligible !== undefined ? data.first_purchase_eligible : true,
      error: data.error
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Unknown error occurred' };
  }
};

/**
 * Simple handleWatchAd function with mock 30-second delay
 * Simulates watching an ad, then increments gems by 25
 * 
 * @param userId - The user's ID
 * @param onComplete - Callback function when ad is completed successfully
 * @param onError - Optional error callback
 */
export const handleWatchAd = async (
  userId: string,
  onComplete?: (newBalance: number) => void,
  onError?: (error: string) => void
): Promise<void> => {
  try {
    // Simulate a 30-second ad delay
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    // After ad completes, process gem transaction with ad_reward source
    const result = await processGemTransaction(userId, 25, 'ad_reward');
    
    if (result.success && result.newGemBalance !== undefined) {
      if (onComplete) {
        onComplete(result.newGemBalance);
      }
    } else {
      const errorMsg = result.error || 'Failed to process ad reward';
      if (onError) {
        onError(errorMsg);
      } else {
        throw new Error(errorMsg);
      }
    }
  } catch (error: any) {
    const errorMsg = error.message || 'Unknown error occurred';
    if (onError) {
      onError(errorMsg);
    } else {
      throw error;
    }
  }
};

/**
 * Fetch gem transaction history for a user
 * 
 * @param userId - The user's ID
 * @param limit - Maximum number of transactions to fetch (default: 5)
 * @returns Array of gem transactions
 */
export interface GemTransaction {
  id: string;
  user_id: string;
  amount: number;
  source: string;
  item_id?: string | null;
  created_at: string;
}

export const fetchGemTransactions = async (
  userId: string,
  limit: number = 5
): Promise<GemTransaction[]> => {
  if (!supabaseAnonKey || userId === 'guest') {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('gem_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching gem transactions:', error);
      return [];
    }

    return (data || []) as GemTransaction[];
  } catch (error: any) {
    console.error('Exception fetching gem transactions:', error);
    return [];
  }
};

/**
 * Simple function to increment gems by a specific amount
 * Uses RPC function if available, otherwise direct update
 */
export const incrementGems = async (userId: string, gemAmount: number): Promise<{ success: boolean; newGemBalance?: number; error?: string }> => {
  if (!supabaseAnonKey || userId === 'guest') {
    // For guest users, update local storage
    const guestProfile = fetchGuestProfile();
    const newGems = (guestProfile.gems || 0) + gemAmount;
    guestProfile.gems = newGems;
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(guestProfile));
    return { success: true, newGemBalance: newGems };
  }

  try {
    // Try RPC function first (if it exists in Supabase)
    const { data: rpcData, error: rpcError } = await supabase.rpc('increment_gems', {
      user_id: userId,
      gem_amount: gemAmount
    });

    if (!rpcError && rpcData) {
      return { success: true, newGemBalance: rpcData.new_balance };
    }

    // Fallback: Direct update if RPC doesn't exist
    const { data: profileData, error: fetchError } = await supabase
      .from('profiles')
      .select('gems')
      .eq('id', userId)
      .single();

    if (fetchError || !profileData) {
      return { success: false, error: 'Failed to fetch profile' };
    }

    const newGems = (profileData.gems || 0) + gemAmount;
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ gems: newGems })
      .eq('id', userId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true, newGemBalance: newGems };
  } catch (error: any) {
    return { success: false, error: error.message || 'Unknown error' };
  }
};

/**
 * Process ad reward with weekly limit tracking (500 gems/week)
 * Returns success status, new balance, weekly progress, and reset timestamp
 */
export const processAdReward = async (
  userId: string, 
  gemAmount: number = 20
): Promise<{
  success: boolean;
  newGemBalance?: number;
  weeklyGems?: number;
  resetTimestamp?: string;
  error?: string;
}> => {
  if (!supabaseAnonKey || userId === 'guest') {
    // For guest users, simple tracking without weekly limits
    const guestProfile = fetchGuestProfile();
    const newGems = (guestProfile.gems || 0) + gemAmount;
    guestProfile.gems = newGems;
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(guestProfile));
    return { 
      success: true, 
      newGemBalance: newGems,
      weeklyGems: gemAmount,
      resetTimestamp: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };
  }

  try {
    const { data, error } = await supabase.rpc('process_ad_reward', {
      user_id: userId,
      gem_amount: gemAmount
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: 'No data returned' };
    }

    return {
      success: data.success,
      newGemBalance: data.new_balance,
      weeklyGems: data.weekly_gems,
      resetTimestamp: data.reset_timestamp,
      error: data.error
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Unknown error' };
  }
};

/* Added helper to check for completed event milestones */
const checkEventMilestones = (stats: NonNullable<UserProfile['event_stats']>, currentStreak: number = 0, lastDailyClaim?: string): string[] => {
  const ready: string[] = [];
  // Daily events
  // Check daily login - available if not claimed today
  const isDailyLoginClaimed = stats.claimed_events?.includes('daily_login');
  if (!isDailyLoginClaimed) {
    // Check if last_daily_claim is from today
    const canClaimDailyLogin = (() => {
      if (!lastDailyClaim) return true; // No previous claim, can claim
      const lastClaim = new Date(lastDailyClaim);
      const today = new Date();
      // If last claim was not today, they can claim (new day)
      // If last claim was today but not in claimed_events, they can claim
      return lastClaim.toDateString() !== today.toDateString();
    })();
    if (canClaimDailyLogin) {
      ready.push('daily_login');
    }
  }
  if (stats.daily_games_played >= 1) ready.push('daily_play');
  if (stats.daily_wins >= 1) ready.push('daily_win');
  if (stats.daily_games_played >= 3) ready.push('daily_play_3');
  if (stats.daily_wins >= 2) ready.push('daily_win_2');
  if (stats.daily_games_played >= 5) ready.push('daily_play_5');
  if (stats.daily_wins >= 3) ready.push('daily_win_3');
  // Weekly events
  if ((stats.weekly_games_played || 0) >= 10) ready.push('weekly_play');
  if ((stats.weekly_wins || 0) >= 7) ready.push('weekly_win');
  if ((stats.weekly_bombs_played || 0) >= 5) ready.push('weekly_bombs');
  if ((stats.weekly_chops_performed || 0) >= 5) ready.push('weekly_chops');
  if (currentStreak >= 3) ready.push('weekly_streak');
  if ((stats.total_hands_played || 0) >= 50) ready.push('weekly_hands');
  // New player events
  if ((stats.online_games_played || 0) >= 1) ready.push('new_player_online_game');
  if ((stats.gems_purchased || 0) > 0) ready.push('new_player_gem_purchase');
  return ready;
};

export const recordGameResult = async (rank: number, isBot: boolean, difficulty: AiDifficulty, isGuest: boolean, currentProfile: UserProfile | null, metadata: { chopsInMatch: number, bombsInMatch: number, lastCardRank: number }) => {
  // SECURITY: Validate inputs
  if (typeof rank !== 'number' || rank < 1 || rank > 4 || !Number.isInteger(rank)) {
    console.error('Invalid rank provided to recordGameResult');
    return { xpGained: 10, coinsGained: 25, newTotalXp: currentProfile?.xp || 10, xpBonusApplied: false };
  }
  
  if (!metadata || typeof metadata !== 'object') {
    console.error('Invalid metadata provided to recordGameResult');
    return { xpGained: 10, coinsGained: 25, newTotalXp: currentProfile?.xp || 10, xpBonusApplied: false };
  }
  
  // SECURITY: Validate metadata values are reasonable
  const chopsInMatch = typeof metadata.chopsInMatch === 'number' && metadata.chopsInMatch >= 0 && metadata.chopsInMatch <= 100 ? metadata.chopsInMatch : 0;
  const bombsInMatch = typeof metadata.bombsInMatch === 'number' && metadata.bombsInMatch >= 0 && metadata.bombsInMatch <= 50 ? metadata.bombsInMatch : 0;
  const lastCardRank = typeof metadata.lastCardRank === 'number' && metadata.lastCardRank >= 3 && metadata.lastCardRank <= 15 ? metadata.lastCardRank : 0;
  
  // SECURITY: Note: For multiplayer games, rank should come from server, not client
  // This function is primarily for single-player games. For multiplayer, the server should
  // track ranks and call a server-side function to update profiles.
  
  if (!currentProfile) return { xpGained: 10, coinsGained: 25, newTotalXp: 10, xpBonusApplied: false };

  // Base rewards (No-Loss Economy)
  let xpGained = rank === 1 ? 40 : rank === 2 ? 25 : 10; 
  let coinsGained = rank === 1 ? 150 : rank === 2 ? 75 : 25;

  const now = Date.now();
  const activeBoosters = currentProfile.inventory?.active_boosters || {};
  const updatedBoosters = { ...activeBoosters };
  let xpBonusApplied = false;
  
  // Handle XP booster (can be game-based or time-based)
  if (activeBoosters['XP']) {
    const xpBoosterValue = activeBoosters['XP'];
    if (xpBoosterValue < 0) {
      // Game-based booster (negative = games remaining)
      const gamesRemaining = -xpBoosterValue;
      if (gamesRemaining > 0) {
        xpGained *= 2;
        xpBonusApplied = true;
        const newGamesRemaining = gamesRemaining - 1;
        if (newGamesRemaining > 0) {
          updatedBoosters['XP'] = -newGamesRemaining;
        } else {
          delete updatedBoosters['XP'];
        }
      }
    } else {
      // Time-based booster (positive = expiration timestamp)
      if (now < xpBoosterValue) {
        xpGained *= 2;
        xpBonusApplied = true;
      } else {
        delete updatedBoosters['XP'];
      }
    }
  }
  
  // Handle GOLD booster (time-based only for now)
  if (activeBoosters['GOLD']) {
    const goldBoosterValue = activeBoosters['GOLD'];
    if (goldBoosterValue < 0) {
      // Game-based booster
      const gamesRemaining = -goldBoosterValue;
      if (gamesRemaining > 0) {
        coinsGained *= 2;
        const newGamesRemaining = gamesRemaining - 1;
        if (newGamesRemaining > 0) {
          updatedBoosters['GOLD'] = -newGamesRemaining;
        } else {
          delete updatedBoosters['GOLD'];
        }
      }
    } else {
      // Time-based booster
      if (now < goldBoosterValue) {
        coinsGained *= 2;
      } else {
        delete updatedBoosters['GOLD'];
      }
    }
  }
  
  const newXp = currentProfile.xp + xpGained;
  const newCoins = currentProfile.coins + coinsGained;
  
  const currentStats = currentProfile.event_stats || {
    daily_games_played: 0, daily_wins: 0, weekly_games_played: 0, weekly_wins: 0,
    weekly_bombs_played: 0, weekly_chops_performed: 0, weekly_challenge_progress: {},
    total_hands_played: 0, new_player_login_days: 1, claimed_events: [], ready_to_claim: []
  };

  const weeklyChallenges = getWeeklyChallenges();
  const newChallengeProgress = { ...(currentStats.weekly_challenge_progress || {}) };

  weeklyChallenges.forEach(ch => {
    let increment = 0;
    if (ch.metric === 'games') increment = 1;
    if (ch.metric === 'wins' && rank === 1) increment = 1;
    if (ch.metric === 'bombs') increment = bombsInMatch;
    if (ch.metric === 'chops') increment = chopsInMatch;
    if (ch.metric === 'low_rank_win' && rank === 1 && lastCardRank <= 7) increment = 1;
    
    newChallengeProgress[ch.id] = (newChallengeProgress[ch.id] || 0) + increment;
  });

  const updatedStats: NonNullable<UserProfile['event_stats']> = {
    ...currentStats,
    daily_games_played: (currentStats.daily_games_played || 0) + 1,
    daily_wins: rank === 1 ? (currentStats.daily_wins || 0) + 1 : currentStats.daily_wins,
    weekly_games_played: (currentStats.weekly_games_played || 0) + 1,
    weekly_wins: rank === 1 ? (currentStats.weekly_wins || 0) + 1 : currentStats.weekly_wins,
    weekly_bombs_played: (currentStats.weekly_bombs_played || 0) + bombsInMatch,
    weekly_chops_performed: (currentStats.weekly_chops_performed || 0) + chopsInMatch,
    weekly_challenge_progress: newChallengeProgress,
    total_hands_played: (currentStats.total_hands_played || 0) + 1,
    online_games_played: !isBot ? (currentStats.online_games_played || 0) + 1 : (currentStats.online_games_played || 0),
  };

  /* Fixed: Correctly checking for event milestones using updated helper */
  updatedStats.ready_to_claim = [
    ...checkEventMilestones(updatedStats, currentProfile.current_streak || 0, currentProfile.last_daily_claim),
    ...weeklyChallenges.filter(ch => (newChallengeProgress[ch.id] || 0) >= ch.target).map(ch => ch.id)
  ];

  const updates: Partial<UserProfile> = { 
    xp: newXp, level: calculateLevel(newXp), coins: newCoins,
    games_played: currentProfile.games_played + 1,
    wins: rank === 1 ? currentProfile.wins + 1 : currentProfile.wins,
    total_chops: (currentProfile.total_chops || 0) + chopsInMatch,
    event_stats: updatedStats,
    inventory: {
      ...currentProfile.inventory,
      active_boosters: updatedBoosters
    }
  };

  // Direct database update for game results (bypasses updateProfileSettings security restrictions)
  if (!supabaseAnonKey || isGuest) {
    // For guest users, update local storage
    const local = fetchGuestProfile();
    const updatedLocal = { ...local, ...updates };
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(updatedLocal));
    // Save guest progress for migration
    saveGuestProgress({ 
      xp: updatedLocal.xp || 0, 
      coins: updatedLocal.coins || 0,
      gems: updatedLocal.gems || 0
    });
  } else {
    // Direct database update for authenticated users
    await supabase.from('profiles').upsert({ id: currentProfile.id, ...updates });
  }
  
  return { xpGained, coinsGained, newTotalXp: newXp, xpBonusApplied, updatedStats };
};

const XP_TABLE = [0, 30, 75, 135, 210, 310, 435, 585, 760, 960, 1210, 1510, 1860, 2260, 2760];

// ========== FRIENDS SYSTEM ==========

export interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  created_at: string;
  friend?: UserProfile; // Populated when fetching friends list
}

/**
 * Get all friends for a user
 */
export const getFriends = async (userId: string): Promise<Friendship[]> => {
  if (!supabaseAnonKey || userId === 'guest') return [];
  try {
    // First get the friendships
    const { data: friendships, error: friendshipsError } = await supabase
      .from('friendships')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (friendshipsError) throw friendshipsError;
    if (!friendships || friendships.length === 0) return [];
    
    // Then fetch the friend profiles
    const friendIds = friendships.map(f => f.friend_id);
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', friendIds);
    
    if (profilesError) throw profilesError;
    
    // Map friendships with their friend profiles
    const profileMap = new Map((profiles || []).map(p => [p.id, p]));
    return friendships.map((f: any) => {
      const friendProfile = profileMap.get(f.friend_id);
      return {
        ...f,
        friend: friendProfile ? { ...friendProfile, gems: friendProfile.gems ?? 0, turn_timer_setting: friendProfile.turn_timer_setting ?? 0 } as UserProfile : undefined
      };
    }) as Friendship[];
  } catch (e) {
    console.error('Error fetching friends:', e);
    return [];
  }
};

/**
 * Add a friend (creates bidirectional friendship)
 * The Postgres trigger will enforce the 20-friend limit
 */
export const addFriend = async (userId: string, friendId: string): Promise<boolean> => {
  if (!supabaseAnonKey || userId === 'guest' || friendId === 'guest') return false;
  if (userId === friendId) return false; // Can't friend yourself
  
  try {
    // Check if friendship already exists
    const { data: existing } = await supabase
      .from('friendships')
      .select('id')
      .eq('user_id', userId)
      .eq('friend_id', friendId)
      .maybeSingle();
    
    if (existing) return false; // Already friends
    
    // Insert friendship (trigger will create reverse relationship)
    const { error } = await supabase
      .from('friendships')
      .insert({
        user_id: userId,
        friend_id: friendId
      });
    
    if (error) throw error;
    return true;
  } catch (e: any) {
    console.error('Error adding friend:', e);
    // Check if error is due to friend limit
    if (e.message?.includes('friend limit') || e.code === 'P0001') {
      throw new Error('Friend limit reached (maximum 20 friends)');
    }
    throw e;
  }
};

/**
 * Remove a friend (removes bidirectional friendship)
 */
export const removeFriend = async (userId: string, friendId: string): Promise<boolean> => {
  if (!supabaseAnonKey || userId === 'guest' || friendId === 'guest') return false;
  
  try {
    // Delete both directions of the friendship
    const { error: error1 } = await supabase
      .from('friendships')
      .delete()
      .eq('user_id', userId)
      .eq('friend_id', friendId);
    
    const { error: error2 } = await supabase
      .from('friendships')
      .delete()
      .eq('user_id', friendId)
      .eq('friend_id', userId);
    
    if (error1 || error2) throw error1 || error2;
    return true;
  } catch (e) {
    console.error('Error removing friend:', e);
    return false;
  }
};

/**
 * Search for users by username
 * Supports both display name and full format (Name#0000)
 */
export const searchUsers = async (query: string, limit: number = 20): Promise<UserProfile[]> => {
  if (!supabaseAnonKey || !query.trim()) return [];
  
  try {
    // Check if query contains a discriminator (Name#0000 format)
    const hasDiscriminator = query.includes('#');
    
    let data;
    if (hasDiscriminator) {
      // Parse the username to handle case-insensitive search
      // Split into name and discriminator parts
      const parts = query.split('#');
      if (parts.length === 2) {
        const namePart = parts[0].trim();
        const discriminatorPart = parts[1].trim();
        
        // Use case-insensitive search with ilike for both parts
        // Search for usernames that match the pattern (case-insensitive)
        const { data: exactMatch, error: exactError } = await supabase
          .from('profiles')
          .select('*')
          .ilike('username', `${namePart}#${discriminatorPart}`)
          .limit(limit);
        
        if (exactError) throw exactError;
        data = exactMatch || [];
      } else {
        // Invalid format, return empty
        data = [];
      }
    } else {
      // Search by display name (username starts with query, case-insensitive)
      // Since username is stored as "Name#0000", we search for usernames that start with the query
      const { data: partialMatch, error: partialError } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', `${query}%`)
        .limit(limit);
      
      if (partialError) throw partialError;
      data = partialMatch || [];
    }
    
    return (data || []).map(p => ({ ...p, gems: p.gems ?? 0, turn_timer_setting: p.turn_timer_setting ?? 0 })) as UserProfile[];
  } catch (e) {
    console.error('Error searching users:', e);
    return [];
  }
};
export const calculateLevel = (xp: number) => {
  const safeXp = Math.max(0, xp);
  // Handle XP within the table (levels 1-15)
  if (safeXp <= XP_TABLE[XP_TABLE.length - 1]) {
    for (let i = XP_TABLE.length - 1; i >= 0; i--) {
      if (safeXp >= XP_TABLE[i]) return i + 1;
    }
  }
  // Handle XP beyond the table
  let currentLevel = XP_TABLE.length;
  while (getXpForLevel(currentLevel + 1) <= safeXp && currentLevel < 500) {
    currentLevel++;
  }
  return currentLevel;
};
export const getXpForLevel = (level: number) => {
  const safeLevel = Math.max(1, level);
  if (safeLevel <= XP_TABLE.length) return XP_TABLE[safeLevel - 1];
  if (safeLevel <= 40) {
    const baseLevel = XP_TABLE.length, baseXP = XP_TABLE[XP_TABLE.length - 1], diff = safeLevel - baseLevel;
    return baseXP + (diff * 500) + (diff * (diff - 1) * 25);
  }
  return getXpForLevel(40) + ((safeLevel - 40) * 5000);
};

export const transferGuestData = async (userId: string) => {};
export const updateActiveBoard = async (userId: string, boardKey: string) => {};
export const updateProfileEquipped = async (userId: string, sleeve?: string, board?: string) => {};

// Finisher Functions
export interface Finisher {
  id: string;
  name: string;
  animation_key: string;
  price: number;
  description?: string;
  created_at?: string;
}

export const fetchFinishers = async (): Promise<Finisher[]> => {
  if (!supabaseAnonKey) {
    console.warn('⚠️ No Supabase key, cannot fetch finishers. Check VITE_SUPABASE_ANON_KEY environment variable.');
    return [];
  }
  
  if (!supabaseUrl) {
    console.warn('⚠️ No Supabase URL, cannot fetch finishers. Check VITE_SUPABASE_URL environment variable.');
    return [];
  }
  
  // Global Cache: Return cached data if available and fresh
  const now = Date.now();
  if (globalFetchCache.finishers.data && (now - globalFetchCache.finishers.timestamp) < globalFetchCache.finishers.ttl) {
    return globalFetchCache.finishers.data as Finisher[];
  }
  
  // LOCKED FETCHER PATTERN: Prevent concurrent fetches
  // Exit if a fetch is already in progress - prevents AbortError loops
  if (isFetchingFinishers) {
    // Return existing promise if available, otherwise return cached data
    if (globalFetchCache.finishers.promise) {
      return globalFetchCache.finishers.promise as Promise<Finisher[]>;
    }
    // Return cached data even if stale, rather than starting new fetch
    return globalFetchCache.finishers.data as Finisher[] || [];
  }
  
  // Global Cache: If a fetch is already in progress, return that promise instead of starting a new one
  if (globalFetchCache.finishers.promise) {
    return globalFetchCache.finishers.promise as Promise<Finisher[]>;
  }
  
  // LOCKED FETCHER: Set lock immediately to prevent concurrent requests
  isFetchingFinishers = true;
  
  // Create the fetch promise and store it in cache immediately
  const fetchPromise = (async () => {
    try {
      
      // NO ABORT SIGNAL: Query without any abort controller
      // Let Supabase handle the request normally, no cancellation on re-renders
      const { data, error } = await supabase
        .from('finishers')
        .select('*')
        .order('price', { ascending: true });
      
      if (error) {
        console.error('❌ Error fetching finishers:', error);
        console.error('Error details:', { 
          message: error.message, 
          code: error.code, 
          details: error.details,
          hint: error.hint 
        });
        // Return cached data on error if available, otherwise empty array
        return globalFetchCache.finishers.data as Finisher[] || [];
      }
    
      if (!data || data.length === 0) {
        console.warn('⚠️ No finishers found in database. Make sure the finishers table has data.');
        return globalFetchCache.finishers.data as Finisher[] || [];
      }
      
      
      // Store in global cache
      globalFetchCache.finishers.data = data;
      globalFetchCache.finishers.timestamp = Date.now();
      
      return data as Finisher[];
    } catch (err: any) {
      console.error(`❌ fetchFinishers: Exception during fetch:`, err);
      console.error('Exception details:', { message: err?.message, stack: err?.stack });
      // Return cached data on error if available, otherwise empty array
      return globalFetchCache.finishers.data as Finisher[] || [];
    } finally {
      // UNLOCK: Always release the lock in finally block
      isFetchingFinishers = false;
      globalFetchCache.finishers.promise = null; // Clear promise after completion
    }
  })();
  
  // Store the promise in cache so other components can use it
  globalFetchCache.finishers.promise = fetchPromise as Promise<any[]>;
  
  return fetchPromise as Promise<Finisher[]>;
};

export const buyFinisher = async (userId: string, finisherId: string): Promise<boolean> => {
  // SECURITY: Validate finisherId
  if (!finisherId || typeof finisherId !== 'string' || finisherId.length > 100) {
    throw new Error("Invalid finisher ID");
  }
  
  if (!supabaseAnonKey || userId === 'guest') {
    console.warn('Cannot buy finisher: guest user or no Supabase key');
    return false;
  }
  
  try {
    // Get finisher details - SECURITY: Price comes from database, not client
    const { data: finisher, error: finisherError } = await supabase
      .from('finishers')
      .select('*')
      .eq('id', finisherId)
      .single();
    
    if (finisherError || !finisher) {
      console.error('Finisher not found:', finisherError);
      return false;
    }
    
    // SECURITY: Validate finisher price is valid
    if (typeof finisher.price !== 'number' || finisher.price < 0 || !isFinite(finisher.price)) {
      console.error('Invalid finisher price');
      return false;
    }
    
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('gems, unlocked_finishers')
      .eq('id', userId)
      .single();
    
    if (profileError || !profile) {
      console.error('Profile not found:', profileError);
      return false;
    }
    
    // Check if already owned
    const unlockedFinishers = profile.unlocked_finishers || [];
    if (unlockedFinishers.includes(finisher.animation_key)) {
      console.warn('Finisher already owned');
      return false;
    }
    
    // Check if user has enough gems
    if ((profile.gems || 0) < finisher.price) {
      console.warn('Insufficient gems');
      return false;
    }
    
    // Deduct gems and add finisher in a single transaction
    // SECURITY: Use price from database, not from client
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        gems: (profile.gems || 0) - finisher.price,
        unlocked_finishers: [...unlockedFinishers, finisher.animation_key]
      })
      .eq('id', userId);
    
    if (updateError) {
      console.error('Error purchasing finisher:', updateError);
      return false;
    }
    
    return true;
  } catch (e) {
    console.error('Exception purchasing finisher:', e);
    return false;
  }
};

export const buyFinisherPack = async (userId: string, finisherIds: string[], packPrice: number): Promise<boolean> => {
  if (!supabaseAnonKey || userId === 'guest') {
    console.warn('Cannot buy finisher pack: guest user or no Supabase key');
    return false;
  }
  
  try {
    // Get all finisher details
    const { data: finishersData, error: finishersError } = await supabase
      .from('finishers')
      .select('*')
      .in('id', finisherIds);
    
    if (finishersError || !finishersData || finishersData.length === 0) {
      console.error('Finishers not found:', finishersError);
      return false;
    }
    
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('gems, unlocked_finishers')
      .eq('id', userId)
      .single();
    
    if (profileError || !profile) {
      console.error('Profile not found:', profileError);
      return false;
    }
    
    // Check if user has enough gems
    if ((profile.gems || 0) < packPrice) {
      console.warn('Insufficient gems for pack');
      return false;
    }
    
    // Get animation keys for finishers
    const finisherAnimationKeys = finishersData.map(f => f.animation_key);
    
    // Filter out already owned finishers
    const unlockedFinishers = profile.unlocked_finishers || [];
    const newFinisherKeys = finisherAnimationKeys.filter(key => !unlockedFinishers.includes(key));
    
    if (newFinisherKeys.length === 0) {
      console.warn('All finishers in pack already owned');
      return false;
    }
    
    // Deduct pack price and add all finishers in a single transaction
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        gems: (profile.gems || 0) - packPrice,
        unlocked_finishers: [...unlockedFinishers, ...newFinisherKeys]
      })
      .eq('id', userId);
    
    if (updateError) {
      console.error('Error purchasing finisher pack:', updateError);
      return false;
    }
    
    return true;
  } catch (e) {
    console.error('Exception purchasing finisher pack:', e);
    return false;
  }
};

export const buyPack = async (
  userId: string, 
  items: Array<{ type: 'FINISHER' | 'EMOTE' | 'BOARD' | 'SLEEVE'; id: string }>,
  packPrice: number
): Promise<boolean> => {
  if (!supabaseAnonKey || userId === 'guest') {
    console.warn('Cannot buy pack: guest user or no Supabase key');
    return false;
  }
  
  try {
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('gems, unlocked_finishers, unlocked_avatars, unlocked_boards, unlocked_sleeves, unlocked_phrases')
      .eq('id', userId)
      .single();
    
    if (profileError || !profile) {
      console.error('Profile not found:', profileError);
      return false;
    }
    
    // Check if user has enough gems
    if ((profile.gems || 0) < packPrice) {
      console.warn('Insufficient gems for pack');
      return false;
    }
    
    // Build updates object
    const updates: any = {
      gems: (profile.gems || 0) - packPrice
    };
    
    // Collect items to unlock
    const unlockedFinishers = [...(profile.unlocked_finishers || [])];
    const unlockedAvatars = [...(profile.unlocked_avatars || [])];
    const unlockedBoards = [...(profile.unlocked_boards || [])];
    const unlockedSleeves = [...(profile.unlocked_sleeves || [])];
    const unlockedPhrases = [...(profile.unlocked_phrases || [])];
    
    for (const item of items) {
      if (item.type === 'FINISHER' && !unlockedFinishers.includes(item.id)) {
        unlockedFinishers.push(item.id);
      } else if (item.type === 'EMOTE' && !unlockedAvatars.includes(item.id)) {
        unlockedAvatars.push(item.id);
      } else if (item.type === 'BOARD' && !unlockedBoards.includes(item.id)) {
        unlockedBoards.push(item.id);
      } else if (item.type === 'SLEEVE' && !unlockedSleeves.includes(item.id)) {
        unlockedSleeves.push(item.id);
      }
    }
    
    // Also unlock any phrases associated with this bundle
    // Find the pack ID from the items (we need to pass bundle_id or find it)
    // For now, we'll fetch all chat presets and unlock those with matching bundle_id
    // This will be handled by checking if all pack items are owned after purchase
    
    updates.unlocked_finishers = unlockedFinishers;
    updates.unlocked_avatars = unlockedAvatars;
    updates.unlocked_boards = unlockedBoards;
    updates.unlocked_sleeves = unlockedSleeves;
    updates.unlocked_phrases = unlockedPhrases;
    
    // Apply all updates in a single transaction
    const { error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);
    
    if (updateError) {
      console.error('Error purchasing pack:', updateError);
      return false;
    }
    
    return true;
  } catch (e) {
    console.error('Exception purchasing pack:', e);
    return false;
  }
};

export const equipFinisher = async (userId: string, finisherAnimationKey: string): Promise<boolean> => {
  if (!supabaseAnonKey || userId === 'guest') {
    const local = fetchGuestProfile();
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify({ ...local, equipped_finisher: finisherAnimationKey }));
    return true;
  }
  
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ equipped_finisher: finisherAnimationKey })
      .eq('id', userId);
    
    if (error) {
      console.error('Error equipping finisher:', error);
      return false;
    }
    
    return true;
  } catch (e) {
    console.error('Exception equipping finisher:', e);
    return false;
  }
};

// Chat Presets Functions
export interface ChatPreset {
  id: string;
  phrase: string;
  style: 'standard' | 'gold' | 'neon' | 'wiggle';
  bundle_id?: string | null;
  price: number;
  created_at?: string;
}

// Default chat presets that are always available
const DEFAULT_CHAT_PRESETS: ChatPreset[] = [
  { id: 'default-1', phrase: 'Nice!', style: 'standard', price: 0 },
  { id: 'default-2', phrase: 'Good game', style: 'standard', price: 0 },
  { id: 'default-3', phrase: 'Well played', style: 'standard', price: 0 },
  { id: 'default-4', phrase: 'Oops', style: 'standard', price: 0 },
  { id: 'default-5', phrase: 'Close one!', style: 'standard', price: 0 },
  { id: 'default-6', phrase: 'GG', style: 'standard', price: 0 },
  { id: 'default-7', phrase: 'Lucky!', style: 'standard', price: 0 },
  { id: 'default-8', phrase: 'Unlucky', style: 'standard', price: 0 },
];

// Helper function to get default chat preset IDs
const getDefaultChatPresetIds = (): string[] => {
  return DEFAULT_CHAT_PRESETS.map(p => p.id);
};

export const fetchChatPresets = async (): Promise<ChatPreset[]> => {
  // Always include default presets
  const defaultPresets = [...DEFAULT_CHAT_PRESETS];
  
  if (!supabaseAnonKey) {
    console.warn('No Supabase key, returning default chat presets only');
    return defaultPresets;
  }
  
  // Global Cache: Return cached data if available and fresh
  const now = Date.now();
  if (globalFetchCache.chatPresets.data && (now - globalFetchCache.chatPresets.timestamp) < globalFetchCache.chatPresets.ttl) {
    return globalFetchCache.chatPresets.data as ChatPreset[];
  }
  
  // LOCKED FETCHER PATTERN: Prevent concurrent fetches
  // Exit if a fetch is already in progress - prevents AbortError loops
  if (isFetchingChatPresets) {
    // Return existing promise if available, otherwise return cached data or defaults
    if (globalFetchCache.chatPresets.promise) {
      return globalFetchCache.chatPresets.promise as Promise<ChatPreset[]>;
    }
    // Return cached data even if stale, otherwise defaults
    return globalFetchCache.chatPresets.data as ChatPreset[] || defaultPresets;
  }
  
  // Global Cache: If a fetch is already in progress, return that promise instead of starting a new one
  if (globalFetchCache.chatPresets.promise) {
    return globalFetchCache.chatPresets.promise as Promise<ChatPreset[]>;
  }
  
  // LOCKED FETCHER: Set lock immediately to prevent concurrent requests
  isFetchingChatPresets = true;
  
  // Create the fetch promise and store it in cache immediately
  const fetchPromise = (async () => {
    try {
      // NO ABORT SIGNAL: Query without any abort controller
      // Let Supabase handle the request normally, no cancellation on re-renders
      const { data, error } = await supabase
        .from('chat_presets')
        .select('*')
        .order('price', { ascending: true });
      
      if (error) {
        console.error('Error fetching chat presets:', error);
        // Return cached data or defaults on error
        return globalFetchCache.chatPresets.data as ChatPreset[] || defaultPresets;
      }
      
      // Process the successfully fetched data
      const fetchedData = data || [];
      
      const dbPresets = (fetchedData || []).map((p: any) => ({
        id: p.id,
        phrase: p.phrase,
        style: p.style || 'standard',
        bundle_id: p.bundle_id || null,
        price: p.price || 100,
        created_at: p.created_at
      })) as ChatPreset[];
      
      // Combine default presets with database presets
      // Deduplicate by phrase text (case-insensitive) to avoid duplicate phrases
      const seenPhrases = new Set<string>();
      const uniquePresets: ChatPreset[] = [];
      
      // First, add default presets (they take priority)
      defaultPresets.forEach(p => {
        const phraseKey = p.phrase.toLowerCase().trim();
        if (!seenPhrases.has(phraseKey)) {
          seenPhrases.add(phraseKey);
          uniquePresets.push(p);
        }
      });
      
      // Then, add database presets (skip if phrase already exists)
      dbPresets.forEach(p => {
        const phraseKey = p.phrase.toLowerCase().trim();
        if (!seenPhrases.has(phraseKey)) {
          seenPhrases.add(phraseKey);
          uniquePresets.push(p);
        }
      });
      
      
      // Store in global cache
      globalFetchCache.chatPresets.data = uniquePresets;
      globalFetchCache.chatPresets.timestamp = Date.now();
      
      return uniquePresets;
    } catch (err: any) {
      console.error('fetchChatPresets: Exception during fetch:', err);
      // Return cached data or defaults on error
      return globalFetchCache.chatPresets.data as ChatPreset[] || defaultPresets;
    } finally {
      // UNLOCK: Always release the lock in finally block
      isFetchingChatPresets = false;
      globalFetchCache.chatPresets.promise = null; // Clear promise after completion
    }
  })();
  
  // Store the promise in cache so other components can use it
  globalFetchCache.chatPresets.promise = fetchPromise as Promise<any[]>;
  
  return fetchPromise as Promise<ChatPreset[]>;
};

export const purchasePhrase = async (userId: string, phraseId: string): Promise<boolean> => {
  // SECURITY: Validate phraseId
  if (!phraseId || typeof phraseId !== 'string' || phraseId.length > 100) {
    throw new Error("Invalid phrase ID");
  }
  
  if (!supabaseAnonKey || userId === 'guest') {
    console.warn('Cannot buy phrase: guest user or no Supabase key');
    return false;
  }
  
  try {
    // Get phrase details
    const { data: phrase, error: phraseError } = await supabase
      .from('chat_presets')
      .select('*')
      .eq('id', phraseId)
      .single();
    
    if (phraseError || !phrase) {
      console.error('Phrase not found:', phraseError);
      return false;
    }
    
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('gems, unlocked_phrases')
      .eq('id', userId)
      .single();
    
    if (profileError || !profile) {
      console.error('Profile not found:', profileError);
      return false;
    }
    
    // Check if already owned
    const unlockedPhrases = profile.unlocked_phrases || [];
    if (unlockedPhrases.includes(phraseId)) {
      console.warn('Phrase already owned');
      return false;
    }
    
    // Check if user has enough gems
    if ((profile.gems || 0) < phrase.price) {
      console.warn('Insufficient gems');
      return false;
    }
    
    // Deduct gems and add phrase in a single transaction
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        gems: (profile.gems || 0) - phrase.price,
        unlocked_phrases: [...unlockedPhrases, phraseId]
      })
      .eq('id', userId);
    
    if (updateError) {
      console.error('Error purchasing phrase:', updateError);
      return false;
    }
    
    return true;
  } catch (e) {
    console.error('Exception purchasing phrase:', e);
    return false;
  }
};

// ========== FEEDBACK SYSTEM ==========

export interface PlayerFeedback {
  id?: string;
  user_id: string;
  category: 'Bug' | 'Suggestion' | 'Balance' | 'Compliment';
  message: string;
  game_version: string;
  was_finisher_tilting?: boolean;
  created_at?: string;
}

/**
 * Submit player feedback
 */
export const submitFeedback = async (
  userId: string,
  category: 'Bug' | 'Suggestion' | 'Balance' | 'Compliment',
  message: string,
  gameVersion: string = '1.0.0'
): Promise<{ success: boolean; error?: string }> => {
  if (!supabaseAnonKey) {
    console.warn('No Supabase key, cannot submit feedback');
    return { success: false, error: 'No database connection' };
  }

  // SECURITY: Validate inputs
  if (!userId || typeof userId !== 'string' || userId.length > 100) {
    return { success: false, error: 'Invalid user ID' };
  }

  if (!['Bug', 'Suggestion', 'Balance', 'Compliment'].includes(category)) {
    return { success: false, error: 'Invalid category' };
  }

  if (!message || typeof message !== 'string' || message.trim().length === 0 || message.length > 1000) {
    return { success: false, error: 'Invalid message' };
  }

  try {
    const { error } = await supabase
      .from('player_feedback')
      .insert({
        user_id: userId,
        category,
        message: message.trim(),
        game_version: gameVersion,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error submitting feedback:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (e: any) {
    console.error('Exception submitting feedback:', e);
    return { success: false, error: e.message || 'Unknown error' };
  }
};

/**
 * Submit support ticket (with reference ID)
 */
export const submitSupportTicket = async (
  userId: string,
  category: 'Bug' | 'Feedback' | 'Billing',
  message: string,
  gameVersion: string = '1.0.0'
): Promise<{ success: boolean; referenceId?: string; error?: string }> => {
  if (!supabaseAnonKey) {
    console.warn('No Supabase key, cannot submit support ticket');
    return { success: false, error: 'No database connection' };
  }

  // SECURITY: Validate inputs
  if (!userId || typeof userId !== 'string' || userId.length > 100) {
    return { success: false, error: 'Invalid user ID' };
  }

  // Map Support category to Feedback category (database accepts: Bug, Suggestion, Balance, Compliment)
  // Bug -> Bug, Feedback -> Suggestion, Billing -> Balance (for billing/balance issues)
  const feedbackCategory = 
    category === 'Bug' ? 'Bug' : 
    category === 'Feedback' ? 'Suggestion' : 
    'Balance'; // Billing maps to Balance

  if (!['Bug', 'Feedback', 'Billing'].includes(category)) {
    return { success: false, error: 'Invalid category' };
  }

  if (!message || typeof message !== 'string' || message.trim().length === 0 || message.length > 2000) {
    return { success: false, error: 'Invalid message' };
  }

  try {
    const { data, error } = await supabase
      .from('player_feedback')
      .insert({
        user_id: userId,
        category: feedbackCategory,
        message: message.trim(),
        game_version: gameVersion,
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error submitting support ticket:', error);
      return { success: false, error: error.message };
    }

    // Return the UUID as reference ID
    const referenceId = data?.id || null;
    return { success: true, referenceId: referenceId || undefined };
  } catch (e: any) {
    console.error('Exception submitting support ticket:', e);
    return { success: false, error: e.message || 'Unknown error' };
  }
};

/**
 * Submit vibe check feedback (post-match)
 */
export const submitVibeCheck = async (
  userId: string,
  isHappy: boolean,
  wasFinisherTilting?: boolean,
  gameVersion: string = '1.0.0'
): Promise<{ success: boolean; error?: string }> => {
  if (!supabaseAnonKey) {
    console.warn('No Supabase key, cannot submit vibe check');
    return { success: false, error: 'No database connection' };
  }

  // SECURITY: Validate inputs
  if (!userId || typeof userId !== 'string' || userId.length > 100) {
    return { success: false, error: 'Invalid user ID' };
  }

  try {
    const { error } = await supabase
      .from('player_feedback')
      .insert({
        user_id: userId,
        category: isHappy ? 'Compliment' : 'Balance',
        message: isHappy ? 'Match vibe: Happy' : 'Match vibe: Salty',
        game_version: gameVersion,
        was_finisher_tilting: wasFinisherTilting !== undefined ? wasFinisherTilting : null,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error submitting vibe check:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (e: any) {
    console.error('Exception submitting vibe check:', e);
    return { success: false, error: e.message || 'Unknown error' };
  }
};

/**
 * Log client-side errors to Supabase for production monitoring
 * 
 * This function is 'fire-and-forget' - it will not block the UI or throw errors
 * if the logging request fails. It captures error details, stack traces, browser
 * information, and the current URL for debugging purposes.
 * 
 * @param error - The error object (Error instance or any error-like object)
 * @param errorInfo - Optional React ErrorInfo object containing component stack
 * @param userId - Optional user ID (will be fetched from session if not provided)
 */
export const logErrorToSupabase = async (
  error: Error | unknown,
  errorInfo?: ErrorInfo | null,
  userId?: string | null
): Promise<void> => {
  // Fire-and-forget: Don't block or throw errors
  try {
    // Get error message and stack trace
    let errorMessage = 'Unknown error';
    let stackTrace: string | null = null;
    
    if (error instanceof Error) {
      errorMessage = error.message || error.toString();
      stackTrace = error.stack || null;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else {
      errorMessage = String(error);
    }

    // Get component stack from React ErrorInfo if available
    const componentStack = errorInfo?.componentStack || null;

    // Get current URL
    const url = typeof window !== 'undefined' ? window.location.href : null;

    // Get browser/user agent information
    const browserInfo = typeof navigator !== 'undefined' 
      ? navigator.userAgent || 'Unknown browser'
      : 'Unknown browser';

    // Get user ID from session if not provided
    let finalUserId: string | null = userId || null;
    if (!finalUserId && typeof window !== 'undefined') {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        finalUserId = session?.user?.id || null;
      } catch (e) {
        // Ignore session fetch errors - continue with null userId
        console.warn('Error fetching session for error logging:', e);
      }
    }

    // Only proceed if we have Supabase configuration
    if (!supabaseAnonKey || !supabaseUrl) {
      console.warn('Supabase not configured, skipping error log');
      return;
    }

    // Insert error into database (non-blocking, fire-and-forget)
    // Note: This async operation is intentionally not awaited - it runs in the background
    supabase
      .from('client_errors')
      .insert({
        user_id: finalUserId,
        error_message: errorMessage.substring(0, 5000), // Limit message length
        stack_trace: stackTrace ? stackTrace.substring(0, 10000) : null, // Limit stack trace length
        component_stack: componentStack ? componentStack.substring(0, 10000) : null, // Limit component stack length
        browser_info: browserInfo.substring(0, 500), // Limit browser info length
        url: url ? url.substring(0, 1000) : null, // Limit URL length
        created_at: new Date().toISOString()
      })
      .then(({ error: insertError }) => {
        if (insertError) {
          // Log to console but don't throw - this is fire-and-forget
          console.warn('Failed to log error to Supabase (non-blocking):', insertError);
        } else {
        }
      })
      .catch((e) => {
        // Silently catch any errors - this is fire-and-forget
        console.warn('Exception while logging error to Supabase (non-blocking):', e);
      });

  } catch (e) {
    // Catch any errors in the logging function itself - don't throw
    // This ensures the logging function never interferes with app functionality
    console.warn('Exception in logErrorToSupabase (non-blocking):', e);
  }
};