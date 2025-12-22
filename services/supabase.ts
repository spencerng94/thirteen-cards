
import { createClient } from '@supabase/supabase-js';
import { UserProfile, AiDifficulty } from '../types';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || (process.env as any).REACT_APP_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || (process.env as any).REACT_APP_SUPABASE_ANON_KEY;

const GUEST_STORAGE_KEY = 'thirteen_stats';

export const DEFAULT_AVATARS = ['😀', '😊', '😃', '😄', '☺️'];
export const PREMIUM_AVATARS = [
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', 
  '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦄',
  '😤', '🤪', '🫠', '🤓', '🙂‍↔️', '🤭', '😩', '😭', '🫨', '🫡'
];

export const AVATAR_NAMES: Record<string, string> = {
  // Defaults
  '😀': 'The Enthusiast',
  '😊': 'The Optimist',
  '😃': 'The High Roller',
  '😄': 'The Grinner',
  '☺️': 'The Gentle Soul',
  '👤': 'Unknown Agent',
  // Premium Animals
  '🐶': 'Alpha Canine',
  '🐱': 'Shadow Feline',
  '🐭': 'Royal Rodent',
  '🐹': 'Golden Hamster',
  '🐰': 'Swift Hare',
  '🦊': 'Crimson Fox',
  '🐻': 'Iron Bear',
  '🐼': 'Zen Panda',
  '🐨': 'Silver Koala',
  '🐯': 'Imperial Tiger',
  '🦁': 'Sun Lion',
  '🐮': 'Bovine Commander',
  '🐷': 'Fortune Swine',
  '🐸': 'Jade Frog',
  '🐵': 'Agile Simian',
  '🐔': 'Dawn Herald',
  '🐧': 'Frost Walker',
  '🐦': 'Sky Sentinel',
  '🐤': 'Hatchling Elite',
  '🦄': 'Mythic Horn',
  // Premium Expressions
  '😤': 'Stoic Might',
  '🤪': 'Chaos Spark',
  '🫠': 'Liquid Spirit',
  '🤓': 'Arcane Scholar',
  '🙂‍↔️': 'Denial Master',
  '🤭': 'Secret Agent',
  '😩': 'Weary Knight',
  '😭': 'River of Tears',
  '🫨': 'Seismic Shock',
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
  unlocked_boards: ['EMERALD', 'CYBER_BLUE', 'CRIMSON_VOID'],
  undo_count: 0,
  username: 'Guest Commander'
};

/**
 * Level Formula: L = (XP / 100)^(1/1.5) + 1
 * Level 1: 0 XP
 * Level 2: 100 XP
 * Level 3: 282 XP
 */
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
            onAuthStateChange: () => ({ 
              data: { subscription: { unsubscribe: () => {} } },
              error: null 
            }),
            signInWithOAuth: async () => ({ error: new Error("Credentials missing") }),
            signInWithPassword: async () => ({ error: new Error("Credentials missing") }),
            signUp: async () => ({ error: new Error("Credentials missing") }),
          };
        }
        return () => ({
          select: () => ({ 
            eq: () => ({ 
              single: async () => ({ data: null, error: null }) 
            }) 
          }),
          update: () => ({ 
            eq: async () => ({ error: null }) 
          }),
          upsert: () => ({
            eq: async () => ({ error: null })
          })
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
    coins: data.coins
  } as UserProfile;
};

export const fetchProfile = async (userId: string): Promise<UserProfile | null> => {
  if (!supabaseUrl) return fetchGuestProfile();
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error || !data) {
    const defaultProfile = {
      id: userId,
      coins: 500,
      xp: 0,
      wins: 0,
      games_played: 0,
      unlocked_sleeves: ['BLUE', 'RED'],
      unlocked_avatars: [...DEFAULT_AVATARS],
      unlocked_boards: ['EMERALD', 'CYBER_BLUE', 'CRIMSON_VOID'],
      undo_count: 0
    };
    await supabase.from('profiles').upsert(defaultProfile);
    return { ...defaultProfile, level: 1, username: 'Player', currency: 500, coins: 500 } as any;
  }
  
  return {
    ...data,
    level: calculateLevel(data.xp || 0),
    currency: data.coins
  } as UserProfile;
};

export const transferGuestData = async (userId: string) => {
  const guestData = localStorage.getItem(GUEST_STORAGE_KEY);
  if (!guestData || !supabaseUrl) return;

  const local = JSON.parse(guestData);
  const { data: existing } = await supabase.from('profiles').select('*').eq('id', userId).single();

  if (existing) {
    await supabase.from('profiles').update({
      wins: (existing.wins || 0) + (local.wins || 0),
      games_played: (existing.games_played || 0) + (local.games_played || 0),
      coins: (existing.coins || 0) + (local.coins || 0),
      xp: (existing.xp || 0) + (local.xp || 0),
      unlocked_sleeves: Array.from(new Set([...(existing.unlocked_sleeves || []), ...(local.unlocked_sleeves || [])])),
      unlocked_avatars: Array.from(new Set([...(existing.unlocked_avatars || DEFAULT_AVATARS), ...(local.unlocked_avatars || DEFAULT_AVATARS)])),
      unlocked_boards: Array.from(new Set([...(existing.unlocked_boards || ['EMERALD', 'CYBER_BLUE', 'CRIMSON_VOID']), ...(local.unlocked_boards || ['EMERALD', 'CYBER_BLUE', 'CRIMSON_VOID'])]))
    }).eq('id', userId);
  }
  
  localStorage.removeItem(GUEST_STORAGE_KEY);
};

export const buyItem = async (userId: string, price: number, itemName: string, type: 'SLEEVE' | 'POWERUP' | 'AVATAR' | 'BOARD', isGuest: boolean = false) => {
  if (isGuest) {
    const local = fetchGuestProfile();
    if (local.coins < price) throw new Error("Insufficient coins");
    
    const updates = { ...local, coins: local.coins - price };
    if (type === 'SLEEVE') {
      updates.unlocked_sleeves = Array.from(new Set([...local.unlocked_sleeves, itemName]));
    } else if (type === 'AVATAR') {
      updates.unlocked_avatars = Array.from(new Set([...local.unlocked_avatars, itemName]));
    } else if (type === 'BOARD') {
      updates.unlocked_boards = Array.from(new Set([...local.unlocked_boards, itemName]));
    } else if (type === 'POWERUP' && itemName === 'UNDO') {
      updates.undo_count = (local.undo_count || 0) + 1;
    }
    
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(updates));
    return true;
  }

  const profile = await fetchProfile(userId);
  if (!profile || profile.coins < price) throw new Error("Insufficient coins");

  const updates: any = {
    coins: profile.coins - price
  };

  if (type === 'SLEEVE') {
    updates.unlocked_sleeves = Array.from(new Set([...profile.unlocked_sleeves, itemName]));
  } else if (type === 'AVATAR') {
    updates.unlocked_avatars = Array.from(new Set([...(profile.unlocked_avatars || DEFAULT_AVATARS), itemName]));
  } else if (type === 'BOARD') {
    updates.unlocked_boards = Array.from(new Set([...(profile.unlocked_boards || ['EMERALD', 'CYBER_BLUE', 'CRIMSON_VOID']), itemName]));
  } else if (type === 'POWERUP' && itemName === 'UNDO') {
    updates.undo_count = (profile.undo_count || 0) + 1;
  }

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);

  if (error) throw error;
  return true;
};

export const recordGameResult = async (rank: number, isBot: boolean, difficulty: AiDifficulty, isGuest: boolean, userId?: string) => {
  const isWinner = rank === 1;
  const baseRankXp = rank === 1 ? 10 : rank === 2 ? 5 : rank === 3 ? 2 : 1;
  const diffMult = difficulty === 'HARD' ? 2 : difficulty === 'MEDIUM' ? 1.5 : 1;
  const modeMult = isBot ? 1 : 2;
  
  let xpGained = Math.floor(baseRankXp * diffMult * modeMult);
  const coinsGained = isWinner ? (isBot ? 50 : 100) : 10;
  
  let xpBonusApplied = false;

  if (isGuest || !supabaseUrl) {
    const localStats = JSON.parse(localStorage.getItem(GUEST_STORAGE_KEY) || JSON.stringify(DEFAULT_GUEST_PROFILE));
    if ((localStats.games_played || 0) < 5) {
      xpGained *= 2;
      xpBonusApplied = true;
    }
    if (isWinner) localStats.wins += 1;
    localStats.games_played = (localStats.games_played || 0) + 1;
    localStats.coins = (localStats.coins || 0) + coinsGained;
    localStats.xp = (localStats.xp || 0) + xpGained;
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(localStats));
    return { xpGained, coinsGained, newTotalXp: localStats.xp, xpBonusApplied };
  }

  if (userId) {
    const profile = await fetchProfile(userId);
    if (profile) {
      if ((profile.games_played || 0) < 5) {
        xpGained *= 2;
        xpBonusApplied = true;
      }
      const newXpValue = (profile.xp || 0) + xpGained;
      await supabase
        .from('profiles')
        .update({
          wins: isWinner ? (profile.wins || 0) + 1 : profile.wins,
          games_played: (profile.games_played || 0) + 1,
          coins: (profile.coins || 0) + coinsGained,
          xp: newXpValue
        })
        .eq('id', userId);
      return { xpGained, coinsGained, newTotalXp: newXpValue, xpBonusApplied };
    }
  }
  return { xpGained, coinsGained, newTotalXp: 0, xpBonusApplied: false };
};
