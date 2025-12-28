
import { createClient } from '@supabase/supabase-js';
import { UserProfile, AiDifficulty, Emote } from '../types';

// Safely access environment variables to prevent runtime ReferenceErrors
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
  ':smile:': 'shiba_card.png',
  ':blush:': 'blushing_card.png',
  ':cool:': 'sunglasses_card.png',
  ':annoyed:': 'annoyed_card.png',
  ':heart_eyes:': 'seductive_card.png',
  ':money_mouth_face:': 'chinese_card.png',
  ':robot:': 'final_boss_card.png',
  ':devil:': 'devil_card.png',
  ':girly:': 'girly_card.png',
};

export const getEmoteUrl = (trigger: string): string => {
  const fileName = EMOTE_FILE_MAP[trigger];
  if (!fileName) return '';
  return `${supabaseUrl}/storage/v1/object/public/emotes/${fileName}?v=3`;
};

export const DEFAULT_AVATARS = [':smile:', ':blush:', ':cool:', ':annoyed:'];
export const PREMIUM_AVATARS = [':heart_eyes:', ':money_mouth_face:', ':robot:', ':devil:', ':girly:'];

export const AVATAR_NAMES: Record<string, string> = {
  ':smile:': 'Loyal Shiba',
  ':blush:': 'Bashful Card',
  ':cool:': 'Neon Shades',
  ':annoyed:': 'The Critic',
  ':heart_eyes:': 'Seductive Dealer',
  ':money_mouth_face:': 'Dynasty Wealth',
  ':robot:': 'Final Boss',
  ':devil:': 'Hell Raiser',
  ':girly:': 'The Princess'
};

export const getAvatarName = (trigger: string, remoteEmotes?: Emote[]) => {
  if (AVATAR_NAMES[trigger]) return AVATAR_NAMES[trigger];
  return remoteEmotes?.find(e => e.trigger_code === trigger)?.name || 'Elite Signature';
};

const createMockSupabase = () => {
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
  } catch (e) {
    return [];
  }
};

export const fetchGuestProfile = (): UserProfile => {
  const local = localStorage.getItem(GUEST_STORAGE_KEY);
  const data = local ? JSON.parse(local) : null;
  if (!data) return {
    id: 'guest',
    username: 'PLAYER',
    wins: 0,
    games_played: 0,
    currency: 500,
    coins: 500,
    xp: 0,
    level: 1,
    unlocked_sleeves: ['RED', 'BLUE'],
    unlocked_avatars: [...DEFAULT_AVATARS],
    unlocked_boards: ['EMERALD'],
    avatar_url: ':cool:',
    sfx_enabled: true,
    turbo_enabled: true,
    sleeve_effects_enabled: true,
    play_animations_enabled: true,
    turn_timer_setting: 0,
    undo_count: 0,
    finish_dist: [0,0,0,0],
    total_chops: 0,
    total_cards_left_sum: 0,
    current_streak: 0,
    longest_streak: 0
  } as UserProfile;
  return {
    ...data,
    turn_timer_setting: data.turn_timer_setting ?? 0
  } as UserProfile;
};

export const fetchProfile = async (userId: string, currentAvatar: string = ':cool:'): Promise<UserProfile | null> => {
  if (!supabaseAnonKey || userId === 'guest') return fetchGuestProfile();
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (!error && data) {
    return {
      ...data,
      turn_timer_setting: data.turn_timer_setting ?? 0
    } as UserProfile;
  }
  return null;
};

export const updateProfileAvatar = async (userId: string, avatar: string) => {
  if (!supabaseAnonKey || userId === 'guest') {
    const local = fetchGuestProfile();
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify({ ...local, avatar_url: avatar }));
    return;
  }
  await supabase.from('profiles').update({ avatar_url: avatar }).eq('id', userId);
};

export const updateProfileSettings = async (userId: string, updates: Partial<UserProfile>) => {
  if (!supabaseAnonKey || userId === 'guest') {
    const local = fetchGuestProfile();
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify({ ...local, ...updates }));
    return;
  }
  await supabase.from('profiles').update(updates).eq('id', userId);
};

export const buyItem = async (userId: string, price: number, itemName: string, type: 'SLEEVE' | 'AVATAR' | 'BOARD', isGuest: boolean = false) => {
  const profile = isGuest ? fetchGuestProfile() : await fetchProfile(userId);
  if (!profile || profile.coins < price) throw new Error("Insufficient funds");
  
  const updates: any = { coins: profile.coins - price };
  if (type === 'SLEEVE') updates.unlocked_sleeves = [...profile.unlocked_sleeves, itemName];
  if (type === 'AVATAR') updates.unlocked_avatars = [...profile.unlocked_avatars, itemName];
  if (type === 'BOARD') updates.unlocked_boards = [...profile.unlocked_boards, itemName];

  if (isGuest || !supabaseAnonKey) {
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify({ ...profile, ...updates }));
    return true;
  }
  await supabase.from('profiles').update(updates).eq('id', userId);
  return true;
};

export const recordGameResult = async (rank: number, isBot: boolean, difficulty: AiDifficulty, isGuest: boolean, userId?: string, chopsInMatch: number = 0, cardsRemaining: number = 0) => {
  // Balanced rewards
  const xpGained = rank === 1 ? 25 : rank === 2 ? 15 : 10; 
  const coinsGained = rank === 1 ? 100 : rank === 2 ? 50 : 25;
  
  const profile = isGuest ? fetchGuestProfile() : await fetchProfile(userId!);
  if (profile) {
    const newXp = profile.xp + xpGained;
    const newLevel = calculateLevel(newXp);
    const updates = { 
      xp: newXp, 
      level: newLevel,
      coins: profile.coins + coinsGained,
      games_played: profile.games_played + 1,
      wins: rank === 1 ? profile.wins + 1 : profile.wins
    };
    await updateProfileSettings(userId || 'guest', updates);
    return { xpGained, coinsGained, newTotalXp: newXp, xpBonusApplied: false };
  }
  
  return { xpGained: 10, coinsGained: 50, newTotalXp: 10, xpBonusApplied: false };
};

/**
 * Robust leveling thresholds. 
 * Requirements strictly increase to ensure accurate progress bar rendering.
 */
const XP_TABLE = [
  0,      // L1
  30,     // L2 (+30)
  75,     // L3 (+45)
  135,    // L4 (+60)
  210,    // L5 (+75)
  310,    // L6 (+100)
  435,    // L7 (+125)
  585,    // L8 (+150)
  760,    // L9 (+175)
  960,    // L10 (+200)
  1210,   // L11 (+250)
  1510,   // L12 (+300)
  1860,   // L13 (+350)
  2260,   // L14 (+400)
  2760    // L15 (+500)
];

export const calculateLevel = (xp: number) => {
  const safeXp = Math.max(0, xp);
  
  // High performance level scan
  // Start by checking if it's within the static table
  if (safeXp < XP_TABLE[XP_TABLE.length - 1]) {
    for (let i = XP_TABLE.length - 1; i >= 0; i--) {
      if (safeXp >= XP_TABLE[i]) return i + 1;
    }
  }

  // Otherwise, procedurally check levels beyond the table
  let currentLevel = XP_TABLE.length;
  while (getXpForLevel(currentLevel + 1) <= safeXp && currentLevel < 500) {
    currentLevel++;
  }
  return currentLevel;
};

export const getXpForLevel = (level: number) => {
  const safeLevel = Math.max(1, level);
  if (safeLevel <= XP_TABLE.length) {
    return XP_TABLE[safeLevel - 1];
  }
  
  // Range 16 - 40: Steady climb
  if (safeLevel <= 40) {
    const baseLevel = XP_TABLE.length;
    const baseXP = XP_TABLE[XP_TABLE.length - 1];
    const levelDiff = safeLevel - baseLevel;
    // Base 500 jump per level, increasing by 50 per level gap
    return baseXP + (levelDiff * 500) + (levelDiff * (levelDiff - 1) * 25);
  }

  // Range 41+: "Much Slower" progression
  // Massive leap in XP required per level
  const xpAt40 = getXpForLevel(40);
  const post40Diff = safeLevel - 40;
  // 5000 XP per level after level 40
  return xpAt40 + (post40Diff * 5000);
};

export const transferGuestData = async (userId: string) => {};
export const updateActiveBoard = async (userId: string, boardKey: string) => {};
export const updateProfileEquipped = async (userId: string, sleeve?: string, board?: string) => {};
