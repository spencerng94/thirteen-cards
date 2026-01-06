import { createClient } from '@supabase/supabase-js';
import { UserProfile, AiDifficulty, Emote, UserInventory } from '../types';
import { ITEM_REGISTRY } from '../constants/ItemRegistry';
import { getWeeklyChallenges } from '../constants/ChallengePool';

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

const supabaseUrl = getEnv('VITE_SUPABASE_URL') || "https://spaxxexmyiczdrbikdjp.supabase.co";
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');
const GUEST_STORAGE_KEY = 'thirteen_stats';

export const EMOTE_FILE_MAP: Record<string, string> = {
  ':smile:': 'shiba_card.png', ':blush:': 'blushing_card.png', ':cool:': 'sunglasses_card.png',
  ':annoyed:': 'annoyed_card.png', ':heart_eyes:': 'seductive_card.png', ':money_mouth_face:': 'chinese_card.png',
  ':robot:': 'final_boss_card.png', ':devil:': 'devil_card.png', ':girly:': 'girly_card.png',
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

const createMockSupabase = () => {
  const mockPromise = Promise.resolve({ data: null, error: null });
  const mockChain = {
    select: () => mockChain, eq: () => mockChain, maybeSingle: () => mockPromise,
    order: () => mockChain, limit: () => mockChain, update: () => mockChain,
    upsert: () => mockPromise, insert: () => mockChain, delete: () => mockChain,
    then: (onFullfilled: any) => mockPromise.then(onFullfilled),
    catch: (onRejected: any) => mockPromise.catch(onRejected),
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
    },
    from: () => mockChain,
  } as any;
};

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createMockSupabase();

export const fetchEmotes = async (forceRefresh = false): Promise<Emote[]> => {
  if (!supabaseAnonKey) {
    console.warn('No Supabase key, cannot fetch emotes');
    return [];
  }
  try {
    // Query all emotes - Supabase should return fresh data
    const { data, error } = await supabase
      .from('emotes')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) {
      console.error('Error fetching emotes:', error);
      return [];
    }
    
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
    const emotes: Emote[] = (data || []).map((e: any) => {
      const emoteName = e.name || '';
      const triggerCode = (e.shortcode || e.trigger_code || '').toLowerCase();
      
      // Check both name and trigger_code for premium pricing
      const premiumPriceByName = PREMIUM_EMOTE_PRICES[emoteName];
      const premiumPriceByTrigger = PREMIUM_TRIGGER_PRICES[triggerCode];
      const premiumPrice = premiumPriceByName !== undefined ? premiumPriceByName : premiumPriceByTrigger;
      
      const finalPrice = premiumPrice !== undefined ? premiumPrice : (e.price || 200);
      
      // Log premium pricing for debugging
      if (premiumPrice !== undefined) {
        console.log(`💰 Premium pricing for "${emoteName}" (${triggerCode}): ${finalPrice} gems`);
      }
      
      return {
        id: e.id,
        name: emoteName,
        file_path: e.file_path,
        trigger_code: e.shortcode || e.trigger_code || '', // Map shortcode to trigger_code
        fallback_emoji: e.fallback_emoji || '👤',
        price: finalPrice
      };
    });
    
    console.log(`✅ Fetched ${emotes.length} emotes from Supabase:`, emotes.map(e => ({ 
      name: e.name, 
      trigger: e.trigger_code, 
      file_path: e.file_path,
      price: e.price 
    })));
    
    return emotes;
  } catch (e) {
    console.error('Exception fetching emotes:', e);
    return [];
  }
};

const EVENT_TARGETS = { daily_play: 1, daily_win: 1, weekly_bombs: 3, weekly_play: 13, weekly_win: 13 };

/**
 * Generate a unique username with discriminator (Username#0000 format)
 * 
 * Note: Currently stores as a single string "DisplayName#0000" in the username column.
 * The system is designed to support separate username and discriminator columns in the future.
 * Use parseUsername() utility to extract display name and discriminator from the stored format.
 */
const generateUniqueUsername = async (baseUsername: string = 'AGENT'): Promise<string> => {
  if (!supabaseAnonKey) {
    // Fallback for offline mode - generate random discriminator
    const discriminator = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${baseUsername.toUpperCase()}#${discriminator}`;
  }

  // Try up to 100 times to find a unique discriminator
  for (let attempt = 0; attempt < 100; attempt++) {
    const discriminator = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const candidate = `${baseUsername.toUpperCase()}#${discriminator}`;
    
    // Check if this username already exists
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', candidate)
      .maybeSingle();
    
    if (error || !data) {
      // Username is available
      return candidate;
    }
  }
  
  // Fallback if all attempts fail (should be extremely rare)
  const timestamp = Date.now().toString().slice(-4);
  return `${baseUsername.toUpperCase()}#${timestamp}`;
};

const getDefaultProfile = async (id: string, avatar: string = ':cool:', baseUsername: string = 'AGENT'): Promise<UserProfile> => {
  const username = await generateUniqueUsername(baseUsername);
  return {
    id, username, wins: 0, games_played: 0, currency: 500, coins: 500, gems: 0, xp: 0, level: 1,
    unlocked_sleeves: ['RED', 'BLUE'], unlocked_avatars: [...DEFAULT_AVATARS.filter(a => a !== ':smile:')], unlocked_boards: ['EMERALD'],
    avatar_url: avatar, sfx_enabled: true, turbo_enabled: true, sleeve_effects_enabled: true,
    play_animations_enabled: true, turn_timer_setting: 0, undo_count: 0, finish_dist: [0, 0, 0, 0],
    total_chops: 0, total_cards_left_sum: 0, current_streak: 0, longest_streak: 0,
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
    // For guest, use synchronous fallback
    const discriminator = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const username = `GUEST#${discriminator}`;
    return {
      id: 'guest', username, wins: 0, games_played: 0, currency: 500, coins: 500, gems: 0, xp: 0, level: 1,
      unlocked_sleeves: ['RED', 'BLUE'], unlocked_avatars: [...DEFAULT_AVATARS.filter(a => a !== ':smile:')], unlocked_boards: ['EMERALD'],
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
  if (!profile.inventory || !profile.inventory.items || Object.keys(profile.inventory.items).length === 0) {
    profile.inventory = { items: { XP_2X_10M: 1, GOLD_2X_10M: 1 }, active_boosters: profile.inventory?.active_boosters || {} };
  }
  
  return profile;
};

export const fetchProfile = async (userId: string, currentAvatar: string = ':cool:', baseUsername?: string): Promise<UserProfile | null> => {
  if (!supabaseAnonKey || userId === 'guest') return fetchGuestProfile();
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) return null;
  if (data) return { ...data, gems: data.gems ?? 0, turn_timer_setting: data.turn_timer_setting ?? 0 } as UserProfile;
  // New user - generate username with discriminator from Google metadata
  // baseUsername should come from Google OAuth metadata (full_name, name, or display_name)
  const cleanBaseUsername = (baseUsername || 'AGENT').trim().toUpperCase().replace(/[^A-Z0-9\s]/g, '').substring(0, 20) || 'AGENT';
  const defaultProfile = await getDefaultProfile(userId, currentAvatar, cleanBaseUsername);
  // Save the new profile immediately for Google OAuth users
  await supabase.from('profiles').upsert(defaultProfile);
  return defaultProfile;
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
  if (!supabaseAnonKey || userId === 'guest') {
    const local = fetchGuestProfile();
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify({ ...local, ...updates }));
    return;
  }
  await supabase.from('profiles').upsert({ id: userId, ...updates });
};

export const buyItem = async (
  userId: string, 
  price: number, 
  itemName: string, 
  type: 'SLEEVE' | 'AVATAR' | 'BOARD' | 'ITEM', 
  isGuest: boolean = false,
  currency: 'GOLD' | 'GEMS' = 'GOLD'
) => {
  const profile = isGuest ? fetchGuestProfile() : await fetchProfile(userId);
  if (!profile) throw new Error("Profile not found");

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
export const claimAdReward = async (userId: string) => {
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
 * Reward user for watching a rewarded ad
 * This function can be called as an RPC in Supabase or directly
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
    if (ch.metric === 'bombs') increment = metadata.bombsInMatch;
    if (ch.metric === 'chops') increment = metadata.chopsInMatch;
    if (ch.metric === 'low_rank_win' && rank === 1 && metadata.lastCardRank <= 7) increment = 1;
    
    newChallengeProgress[ch.id] = (newChallengeProgress[ch.id] || 0) + increment;
  });

  const updatedStats: NonNullable<UserProfile['event_stats']> = {
    ...currentStats,
    daily_games_played: (currentStats.daily_games_played || 0) + 1,
    daily_wins: rank === 1 ? (currentStats.daily_wins || 0) + 1 : currentStats.daily_wins,
    weekly_games_played: (currentStats.weekly_games_played || 0) + 1,
    weekly_wins: rank === 1 ? (currentStats.weekly_wins || 0) + 1 : currentStats.weekly_wins,
    weekly_bombs_played: (currentStats.weekly_bombs_played || 0) + metadata.bombsInMatch,
    weekly_chops_performed: (currentStats.weekly_chops_performed || 0) + metadata.chopsInMatch,
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
    total_chops: (currentProfile.total_chops || 0) + metadata.chopsInMatch,
    event_stats: updatedStats,
    inventory: {
      ...currentProfile.inventory,
      active_boosters: updatedBoosters
    }
  };

  await updateProfileSettings(currentProfile.id, updates);
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
 * The Postgres trigger will enforce the 10-friend limit
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
      throw new Error('Friend limit reached (maximum 10 friends)');
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
  if (safeXp < XP_TABLE[XP_TABLE.length - 1]) {
    for (let i = XP_TABLE.length - 1; i >= 0; i--) if (safeXp >= XP_TABLE[i]) return i + 1;
  }
  let currentLevel = XP_TABLE.length;
  while (getXpForLevel(currentLevel + 1) <= safeXp && currentLevel < 500) currentLevel++;
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
  created_at?: string;
}

export const fetchFinishers = async (): Promise<Finisher[]> => {
  if (!supabaseAnonKey) {
    console.warn('No Supabase key, cannot fetch finishers');
    return [];
  }
  try {
    const { data, error } = await supabase
      .from('finishers')
      .select('*')
      .order('price', { ascending: true });
    
    if (error) {
      console.error('Error fetching finishers:', error);
      return [];
    }
    
    return (data || []) as Finisher[];
  } catch (e) {
    console.error('Exception fetching finishers:', e);
    return [];
  }
};

export const buyFinisher = async (userId: string, finisherId: string): Promise<boolean> => {
  if (!supabaseAnonKey || userId === 'guest') {
    console.warn('Cannot buy finisher: guest user or no Supabase key');
    return false;
  }
  
  try {
    // Get finisher details
    const { data: finisher, error: finisherError } = await supabase
      .from('finishers')
      .select('*')
      .eq('id', finisherId)
      .single();
    
    if (finisherError || !finisher) {
      console.error('Finisher not found:', finisherError);
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