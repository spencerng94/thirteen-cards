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

export const fetchEmotes = async (): Promise<Emote[]> => {
  if (!supabaseAnonKey) return [];
  try {
    const { data, error } = await supabase.from('emotes').select('*');
    if (error) return [];
    return data as Emote[];
  } catch (e) { return []; }
};

const EVENT_TARGETS = { daily_play: 1, daily_win: 1, weekly_bombs: 3, weekly_play: 13, weekly_win: 13 };

const getDefaultProfile = (id: string, avatar: string = ':cool:', username: string = 'AGENT'): UserProfile => ({
  id, username, wins: 0, games_played: 0, currency: 500, coins: 500, gems: 0, xp: 0, level: 1,
  unlocked_sleeves: ['RED', 'BLUE'], unlocked_avatars: [...DEFAULT_AVATARS], unlocked_boards: ['EMERALD'],
  avatar_url: avatar, sfx_enabled: true, turbo_enabled: true, sleeve_effects_enabled: true,
  play_animations_enabled: true, turn_timer_setting: 0, undo_count: 0, finish_dist: [0, 0, 0, 0],
  total_chops: 0, total_cards_left_sum: 0, current_streak: 0, longest_streak: 0,
  inventory: { items: {}, active_boosters: {} },
  event_stats: {
    daily_games_played: 0, daily_wins: 0, weekly_games_played: 0, weekly_wins: 0,
    weekly_bombs_played: 0, weekly_chops_performed: 0, weekly_challenge_progress: {},
    total_hands_played: 0, new_player_login_days: 1, claimed_events: [], ready_to_claim: []
  }
});

export const fetchGuestProfile = (): UserProfile => {
  const local = localStorage.getItem(GUEST_STORAGE_KEY);
  const data = local ? JSON.parse(local) : null;
  if (!data) return getDefaultProfile('guest');
  return { ...data, gems: data.gems ?? 0, turn_timer_setting: data.turn_timer_setting ?? 0 } as UserProfile;
};

export const fetchProfile = async (userId: string, currentAvatar: string = ':cool:'): Promise<UserProfile | null> => {
  if (!supabaseAnonKey || userId === 'guest') return fetchGuestProfile();
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) return null;
  if (data) return { ...data, gems: data.gems ?? 0, turn_timer_setting: data.turn_timer_setting ?? 0 } as UserProfile;
  return getDefaultProfile(userId, currentAvatar);
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
  if (currency === 'GEMS') updates.gems = (profile.gems || 0) - price;
  else updates.coins = (profile.coins || 0) - price;

  if (type === 'SLEEVE') updates.unlocked_sleeves = Array.from(new Set([...(profile.unlocked_sleeves || []), itemName]));
  if (type === 'AVATAR') updates.unlocked_avatars = Array.from(new Set([...(profile.unlocked_avatars || []), itemName]));
  if (type === 'BOARD') updates.unlocked_boards = Array.from(new Set([...(profile.unlocked_boards || []), itemName]));
  
  if (type === 'ITEM') {
    const inv = profile.inventory || { items: {}, active_boosters: {} };
    inv.items[itemName] = (inv.items[itemName] || 0) + 1;
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
  if (itemDef?.type !== 'BOOSTER' || !itemDef.boosterType || !itemDef.durationMs) return;
  const inv = profile.inventory || { items: {}, active_boosters: {} };
  const currentQty = inv.items[itemId] || 0;
  if (currentQty <= 0) return;
  const updates: Partial<UserProfile> = {
    inventory: { ...inv, items: { ...inv.items, [itemId]: currentQty - 1 }, active_boosters: { ...inv.active_boosters, [itemDef.boosterType]: Date.now() + itemDef.durationMs } }
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

/* Added helper to check for completed event milestones */
const checkEventMilestones = (stats: NonNullable<UserProfile['event_stats']>): string[] => {
  const ready: string[] = [];
  if (stats.daily_games_played >= 1) ready.push('daily_play');
  if (stats.daily_wins >= 1) ready.push('daily_win');
  if ((stats.weekly_bombs_played || 0) >= 3) ready.push('weekly_bombs');
  if ((stats.weekly_games_played || 0) >= 13) ready.push('weekly_play');
  if ((stats.weekly_wins || 0) >= 13) ready.push('weekly_win');
  return ready;
};

export const recordGameResult = async (rank: number, isBot: boolean, difficulty: AiDifficulty, isGuest: boolean, currentProfile: UserProfile | null, metadata: { chopsInMatch: number, bombsInMatch: number, lastCardRank: number }) => {
  if (!currentProfile) return { xpGained: 10, coinsGained: 25, newTotalXp: 10, xpBonusApplied: false };

  // Base rewards (No-Loss Economy)
  let xpGained = rank === 1 ? 40 : rank === 2 ? 25 : 10; 
  let coinsGained = rank === 1 ? 150 : rank === 2 ? 75 : 25;

  const now = Date.now();
  const activeBoosters = currentProfile.inventory?.active_boosters || {};
  let xpBonusApplied = false;
  if (activeBoosters['XP'] && now < activeBoosters['XP']) { xpGained *= 2; xpBonusApplied = true; }
  if (activeBoosters['GOLD'] && now < activeBoosters['GOLD']) { coinsGained *= 2; }
  
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
  };

  /* Fixed: Correctly checking for event milestones using updated helper */
  updatedStats.ready_to_claim = [
    ...checkEventMilestones(updatedStats),
    ...weeklyChallenges.filter(ch => (newChallengeProgress[ch.id] || 0) >= ch.target).map(ch => ch.id)
  ];

  const updates: Partial<UserProfile> = { 
    xp: newXp, level: calculateLevel(newXp), coins: newCoins,
    games_played: currentProfile.games_played + 1,
    wins: rank === 1 ? currentProfile.wins + 1 : currentProfile.wins,
    total_chops: (currentProfile.total_chops || 0) + metadata.chopsInMatch,
    event_stats: updatedStats
  };

  await updateProfileSettings(currentProfile.id, updates);
  return { xpGained, coinsGained, newTotalXp: newXp, xpBonusApplied, updatedStats };
};

const XP_TABLE = [0, 30, 75, 135, 210, 310, 435, 585, 760, 960, 1210, 1510, 1860, 2260, 2760];
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