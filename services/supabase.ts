
import { createClient } from '@supabase/supabase-js';
import { UserProfile, AiDifficulty } from '../types';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || (process.env as any).REACT_APP_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || (process.env as any).REACT_APP_SUPABASE_ANON_KEY;

const GUEST_STORAGE_KEY = 'thirteen_stats';

export const DEFAULT_AVATARS = ['😀', '😊', '😃', '😄', '😎'];
export const PREMIUM_AVATARS = [
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', 
  '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦄',
  '😤', '🤪', '🫠', '🤓', '🙂‍↔️', '🤭', '😩', '😭', '🫨', '🫡'
];

export const AVATAR_NAMES: Record<string, string> = {
  '😀': 'The Enthusiast', '😊': 'The Optimist', '😃': 'The High Roller', '😄': 'The Grinner', '☺️': 'The Gentle Soul',
  '😎': 'The Specialist',
  '👤': 'Unknown Agent', '🐶': 'Alpha Canine', '🐱': 'Shadow Feline', '🐭': 'Royal Rodent', '🐹': 'Golden Hamster',
  '🐰': 'Swift Hare', '🦊': 'Crimson Fox', '🐻': 'Iron Bear', '🐼': 'Zen Panda', '🐨': 'Silver Koala',
  '🐯': 'Imperial Tiger', '🦁': 'Sun Lion', '🐮': 'Bovine Commander', '🐷': 'Fortune Swine', '🐸': 'Jade Frog',
  '🐵': 'Agile Simian', '🐔': 'Dawn Herald', '🐧': 'Frost Walker', '🐦': 'Sky Sentinel', '🐤': 'Hatchling Elite',
  '🦄': 'Mythic Horn', '😤': 'Stoic Might', '🤪': 'Chaos Spark', '🫠': 'Liquid Spirit', '🤓': 'Arcane Scholar',
  '🙂‍↔️': 'Denial Master', '🤭': 'Secret Agent', '😩': 'Weary Knight', '😭': 'River of Tears', '🫨': 'Seismic Shock',
  '🫡': 'Loyal Vanguard'
};

export const getAvatarName = (emoji: string) => AVATAR_NAMES[emoji] || 'Elite Signature';

const DEFAULT_GUEST_PROFILE = {
  wins: 0,
  games_played: 0,
  coins: 500,
  xp: 0,
  unlocked_sleeves: ['BLUE', 'RED'],
  unlocked_avatars: [...DEFAULT_AVATARS],
  unlocked_boards: ['EMERALD', 'CLASSIC_GREEN', 'CYBER_BLUE', 'CRIMSON_VOID'],
  equipped_sleeve: 'RED',
  equipped_board: 'EMERALD',
  active_board: 'EMERALD',
  active_sleeve: 'RED',
  sfx_enabled: true,
  turbo_enabled: true,
  undo_count: 0,
  username: AVATAR_NAMES['😊'].toUpperCase(),
  avatar_url: '😎',
  finish_dist: [0, 0, 0, 0],
  total_chops: 0,
  total_cards_left_sum: 0,
  current_streak: 0,
  longest_streak: 0
};

export const calculateLevel = (xp: number) => {
  if (xp <= 0) return 1;
  return Math.floor(Math.pow(xp / 100, 1 / 1.5)) + 1;
};

export const getXpForLevel = (level: number) => {
  if (level <= 1) return 0;
  return Math.floor(100 * Math.pow(level - 1, 1.5));
};

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : new Proxy({} as any, {
      get: (target, prop) => {
        if (prop === 'auth') {
          return {
            getSession: async () => ({ data: { session: null }, error: null }),
            getUser: async () => ({ data: { user: null }, error: null }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } }, error: null }),
            signInWithOAuth: async () => ({ error: new Error("Credentials missing") }),
            signInWithPassword: async () => ({ error: new Error("Credentials missing") }),
            signUp: async () => ({ error: new Error("Credentials missing") }),
          };
        }
        return () => ({
          select: () => ({ 
            eq: () => ({ 
              single: async () => ({ data: null, error: null }),
              maybeSingle: async () => ({ data: null, error: null })
            }) 
          }),
          update: () => ({ eq: async () => ({ error: null }) }),
          upsert: async () => ({ error: null })
        });
      }
    });

export const fetchGuestProfile = (): UserProfile => {
  const local = localStorage.getItem(GUEST_STORAGE_KEY);
  const data = local ? JSON.parse(local) : DEFAULT_GUEST_PROFILE;
  return {
    ...data,
    id: 'guest',
    level: calculateLevel(data.xp || 0),
    currency: data.coins,
    coins: data.coins,
    finish_dist: data.finish_dist || [0, 0, 0, 0],
    total_chops: data.total_chops || 0,
    total_cards_left_sum: data.total_cards_left_sum || 0,
    current_streak: data.current_streak || 0,
    longest_streak: data.longest_streak || 0
  } as UserProfile;
};

export const fetchProfile = async (userId: string, currentAvatar: string = '😎'): Promise<UserProfile | null> => {
  if (!supabaseUrl || !supabaseAnonKey) return fetchGuestProfile();
  
  const { data: authData } = await supabase.auth.getUser();
  const meta = authData.user?.user_metadata || {};
  const googleName = (meta.full_name || meta.name || AVATAR_NAMES['😎']).toUpperCase();
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    
    if (!error && data) {
      return {
        ...data,
        level: calculateLevel(data.xp || 0),
        currency: data.coins,
        coins: data.coins,
        username: data.username || googleName,
        active_board: data.active_board || data.equipped_board || 'EMERALD',
        active_sleeve: data.active_sleeve || data.equipped_sleeve || 'RED',
        sfx_enabled: data.sfx_enabled ?? true,
        turbo_enabled: data.turbo_enabled ?? true,
        finish_dist: data.finish_dist || [0, 0, 0, 0],
        total_chops: data.total_chops || 0,
        total_cards_left_sum: data.total_cards_left_sum || 0,
        current_streak: data.current_streak || 0,
        longest_streak: data.longest_streak || 0
      } as UserProfile;
    }

    if (error && error.code === '42P01') {
       console.warn("Supabase 'profiles' table not detected. Falling back to local storage for user:", userId);
       const local = fetchGuestProfile();
       return { ...local, id: userId, username: googleName };
    }

    const fallbackProfile = {
      id: userId,
      coins: 500,
      xp: 0,
      wins: 0,
      games_played: 0,
      unlocked_sleeves: ['BLUE', 'RED'],
      unlocked_avatars: [...DEFAULT_AVATARS],
      unlocked_boards: ['EMERALD', 'CLASSIC_GREEN', 'CYBER_BLUE', 'CRIMSON_VOID'],
      equipped_sleeve: 'RED',
      equipped_board: 'EMERALD',
      active_board: 'EMERALD',
      active_sleeve: 'RED',
      sfx_enabled: true,
      turbo_enabled: true,
      undo_count: 0,
      username: googleName,
      avatar_url: currentAvatar,
      finish_dist: [0, 0, 0, 0],
      total_chops: 0,
      total_cards_left_sum: 0,
      current_streak: 0,
      longest_streak: 0
    };

    if (userId && !error) {
       const { error: upsertError } = await supabase.from('profiles').upsert(fallbackProfile);
       if (upsertError) {
         console.warn("Upsert failed, using fallback memory state:", upsertError.message);
       }
    }
    
    return { 
        ...fallbackProfile, 
        level: 1, 
        currency: 500,
        username: fallbackProfile.username 
    } as any;
  } catch (err) {
    console.error("Critical error in fetchProfile:", err);
    return { 
        ...DEFAULT_GUEST_PROFILE, 
        id: userId, 
        username: googleName 
    } as any;
  }
};

export const updateProfileSettings = async (userId: string, updates: Partial<UserProfile>) => {
  const allowedUpdates: any = {};
  if (updates.active_board !== undefined) allowedUpdates.active_board = updates.active_board;
  if (updates.active_sleeve !== undefined) allowedUpdates.active_sleeve = updates.active_sleeve;
  if (updates.sfx_enabled !== undefined) allowedUpdates.sfx_enabled = updates.sfx_enabled;
  if (updates.turbo_enabled !== undefined) allowedUpdates.turbo_enabled = updates.turbo_enabled;

  if (!supabaseUrl || !userId || userId === 'guest') {
    const local = JSON.parse(localStorage.getItem(GUEST_STORAGE_KEY) || JSON.stringify(DEFAULT_GUEST_PROFILE));
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify({ ...local, ...allowedUpdates }));
    return;
  }
  await supabase.from('profiles').update(allowedUpdates).eq('id', userId);
};

export const updateActiveBoard = async (userId: string, boardKey: string) => {
  await updateProfileSettings(userId, { active_board: boardKey });
};

export const updateProfileAvatar = async (userId: string, avatar: string) => {
  if (!supabaseUrl || !userId || userId === 'guest') {
    const local = JSON.parse(localStorage.getItem(GUEST_STORAGE_KEY) || JSON.stringify(DEFAULT_GUEST_PROFILE));
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify({ ...local, avatar_url: avatar }));
    return;
  }
  await supabase.from('profiles').update({ avatar_url: avatar }).eq('id', userId);
};

export const updateProfileEquipped = async (userId: string, sleeve?: string, board?: string) => {
  const updates: any = {};
  if (sleeve) {
    updates.equipped_sleeve = sleeve;
    updates.active_sleeve = sleeve;
  }
  if (board) {
    updates.equipped_board = board;
    updates.active_board = board;
  }

  if (!supabaseUrl || !userId || userId === 'guest') {
    const local = JSON.parse(localStorage.getItem(GUEST_STORAGE_KEY) || JSON.stringify(DEFAULT_GUEST_PROFILE));
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify({ ...local, ...updates }));
    return;
  }
  await supabase.from('profiles').update(updates).eq('id', userId);
};

export const transferGuestData = async (userId: string) => {
  const guestData = localStorage.getItem(GUEST_STORAGE_KEY);
  if (!guestData || !supabaseUrl) return;
  try {
    const local = JSON.parse(guestData);
    const { data: existing, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();

    if (!error && existing) {
      const existingDist = existing.finish_dist || [0, 0, 0, 0];
      const localDist = local.finish_dist || [0, 0, 0, 0];
      
      await supabase.from('profiles').update({
        wins: (existing.wins || 0) + (local.wins || 0),
        games_played: (existing.games_played || 0) + (local.games_played || 0),
        coins: (existing.coins || 0) + (local.coins || 0),
        xp: (existing.xp || 0) + (local.xp || 0),
        avatar_url: existing.avatar_url || local.avatar_url || '😎',
        equipped_sleeve: existing.equipped_sleeve || local.equipped_sleeve || 'RED',
        equipped_board: existing.equipped_board || local.equipped_board || 'EMERALD',
        active_board: existing.active_board || local.active_board || existing.equipped_board || local.equipped_board || 'EMERALD',
        active_sleeve: existing.active_sleeve || local.active_sleeve || existing.equipped_sleeve || local.equipped_sleeve || 'RED',
        sfx_enabled: existing.sfx_enabled ?? local.sfx_enabled ?? true,
        turbo_enabled: existing.turbo_enabled ?? local.turbo_enabled ?? true,
        total_chops: (existing.total_chops || 0) + (local.total_chops || 0),
        total_cards_left_sum: (existing.total_cards_left_sum || 0) + (local.total_cards_left_sum || 0),
        finish_dist: existingDist.map((v: number, i: number) => v + localDist[i]),
        longest_streak: Math.max(existing.longest_streak || 0, local.longest_streak || 0)
      }).eq('id', userId);
      localStorage.removeItem(GUEST_STORAGE_KEY);
    }
  } catch (e) {}
};

export const buyItem = async (userId: string, price: number, itemName: string, type: 'SLEEVE' | 'POWERUP' | 'AVATAR' | 'BOARD', isGuest: boolean = false) => {
  if (isGuest || userId === 'guest') {
    const local = fetchGuestProfile();
    if (local.coins < price) throw new Error("Insufficient coins");
    const updates = { ...local, coins: local.coins - price };
    if (type === 'SLEEVE') updates.unlocked_sleeves = Array.from(new Set([...local.unlocked_sleeves, itemName]));
    else if (type === 'AVATAR') updates.unlocked_avatars = Array.from(new Set([...local.unlocked_avatars, itemName]));
    else if (type === 'BOARD') updates.unlocked_boards = Array.from(new Set([...local.unlocked_boards, itemName]));
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(updates));
    return true;
  }

  const profile = await fetchProfile(userId);
  if (!profile || profile.coins < price) throw new Error("Insufficient coins");

  const updates: any = { coins: profile.coins - price };
  if (type === 'SLEEVE') updates.unlocked_sleeves = Array.from(new Set([...profile.unlocked_sleeves, itemName]));
  else if (type === 'AVATAR') updates.unlocked_avatars = Array.from(new Set([...(profile.unlocked_avatars || DEFAULT_AVATARS), itemName]));
  else if (type === 'BOARD') updates.unlocked_boards = Array.from(new Set([...(profile.unlocked_boards || []), itemName]));

  const { error } = await supabase.from('profiles').update(updates).eq('id', userId);
  
  if (error && (error.status === 406 || error.code === '42P01')) {
      const local = fetchGuestProfile();
      const localUpdates = { ...local, coins: local.coins - price };
      if (type === 'SLEEVE') localUpdates.unlocked_sleeves = Array.from(new Set([...local.unlocked_sleeves, itemName]));
      else if (type === 'AVATAR') localUpdates.unlocked_avatars = Array.from(new Set([...local.unlocked_avatars, itemName]));
      else if (type === 'BOARD') localUpdates.unlocked_boards = Array.from(new Set([...local.unlocked_boards, itemName]));
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(localUpdates));
  } else if (error) {
      throw error;
  }
  
  return true;
};

export const recordGameResult = async (rank: number, isBot: boolean, difficulty: AiDifficulty, isGuest: boolean, userId?: string, chopsInMatch: number = 0, cardsRemaining: number = 0) => {
  const isWinner = rank === 1;
  const baseRankXp = rank === 1 ? 10 : rank === 2 ? 5 : rank === 3 ? 2 : 1;
  const diffMult = difficulty === 'HARD' ? 2 : difficulty === 'MEDIUM' ? 1.5 : 1;
  const modeMult = isBot ? 1 : 2;
  let xpGained = Math.floor(baseRankXp * diffMult * modeMult);
  const coinsGained = isWinner ? (isBot ? 50 : 100) : 10;
  let xpBonusApplied = false;

  const localStats = JSON.parse(localStorage.getItem(GUEST_STORAGE_KEY) || JSON.stringify(DEFAULT_GUEST_PROFILE));
  if ((localStats.games_played || 0) < 5) { xpGained *= 2; xpBonusApplied = true; }
  
  // Internal update logic for local stats
  if (isWinner) {
    localStats.wins += 1;
    localStats.current_streak = (localStats.current_streak || 0) + 1;
    localStats.longest_streak = Math.max(localStats.longest_streak || 0, localStats.current_streak);
  } else {
    localStats.current_streak = 0;
    localStats.total_cards_left_sum = (localStats.total_cards_left_sum || 0) + cardsRemaining;
  }

  localStats.games_played = (localStats.games_played || 0) + 1;
  localStats.coins = (localStats.coins || 0) + coinsGained;
  localStats.xp = (localStats.xp || 0) + xpGained;
  localStats.total_chops = (localStats.total_chops || 0) + chopsInMatch;
  
  const dist = localStats.finish_dist || [0, 0, 0, 0];
  dist[rank - 1] += 1;
  localStats.finish_dist = dist;

  localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(localStats));

  if (!isGuest && userId && userId !== 'guest' && supabaseUrl) {
    const profile = await fetchProfile(userId);
    if (profile) {
      const newXpValue = (profile.xp || 0) + xpGained;
      const newWinStreak = isWinner ? (profile.current_streak || 0) + 1 : 0;
      const newLongestStreak = Math.max(profile.longest_streak || 0, newWinStreak);
      const newDist = profile.finish_dist || [0, 0, 0, 0];
      newDist[rank - 1] += 1;

      const { error } = await supabase.from('profiles').update({ 
          wins: isWinner ? (profile.wins || 0) + 1 : profile.wins, 
          games_played: (profile.games_played || 0) + 1, 
          coins: (profile.coins || 0) + coinsGained, 
          xp: newXpValue,
          total_chops: (profile.total_chops || 0) + chopsInMatch,
          total_cards_left_sum: (profile.total_cards_left_sum || 0) + cardsRemaining,
          current_streak: newWinStreak,
          longest_streak: newLongestStreak,
          finish_dist: newDist
      }).eq('id', userId);
      
      if (error) {
          console.warn("DB record failed, stats preserved in local storage:", error.message);
      }
      return { xpGained, coinsGained, newTotalXp: newXpValue, xpBonusApplied };
    }
  }
  
  return { xpGained, coinsGained, newTotalXp: localStats.xp, xpBonusApplied };
};
