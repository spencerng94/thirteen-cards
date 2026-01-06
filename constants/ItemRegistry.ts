import { CardCoverStyle } from "../components/Card";

export type ItemType = 'BOOSTER' | 'VOUCHER' | 'COSMETIC';
export type Rarity = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC';

export interface RegistryItem {
  id: string;
  name: string;
  type: ItemType;
  rarity: Rarity;
  description: string;
  price?: number;
  currency?: 'GOLD' | 'GEMS';
  isEventExclusive?: boolean;
  style?: CardCoverStyle;
  durationMs?: number;
  gamesRemaining?: number; // For game-based boosters (instead of time-based)
  boosterType?: 'XP' | 'GOLD';
  multiplier?: number;
}

export const ITEM_REGISTRY: Record<string, RegistryItem> = {
  'XP_2X_30M': {
    id: 'XP_2X_30M',
    name: 'XP Overclock (L)',
    type: 'BOOSTER',
    rarity: 'RARE',
    description: 'Doubles all XP earned in matches for 30 minutes.',
    price: 500,
    currency: 'GOLD',
    durationMs: 30 * 60 * 1000,
    boosterType: 'XP',
    multiplier: 2
  },
  'GOLD_2X_30M': {
    id: 'GOLD_2X_30M',
    name: 'Midas Protocol (L)',
    type: 'BOOSTER',
    rarity: 'RARE',
    description: 'Doubles all Gold earned in matches for 30 minutes.',
    price: 500,
    currency: 'GOLD',
    durationMs: 30 * 60 * 1000,
    boosterType: 'GOLD',
    multiplier: 2
  },
  'XP_2X_10M': {
    id: 'XP_2X_10M',
    name: 'XP Injection (S)',
    type: 'BOOSTER',
    rarity: 'COMMON',
    description: 'Doubles all XP earned in your next 3 matches.',
    price: 200,
    currency: 'GOLD',
    gamesRemaining: 3,
    boosterType: 'XP',
    multiplier: 2
  },
  'GOLD_2X_10M': {
    id: 'GOLD_2X_10M',
    name: 'Gold Injection (S)',
    type: 'BOOSTER',
    rarity: 'COMMON',
    description: 'Doubles all Gold earned in matches for 10 minutes.',
    price: 200,
    currency: 'GOLD',
    durationMs: 10 * 60 * 1000,
    boosterType: 'GOLD',
    multiplier: 2
  },
  'GENERAL_10_OFF': {
    id: 'GENERAL_10_OFF',
    name: 'Trade Voucher',
    type: 'VOUCHER',
    rarity: 'COMMON',
    description: 'Grants 10% off your next Store purchase.',
    price: 150,
    currency: 'GOLD'
  },
  'BOOSTER_PACK_XP': {
    id: 'BOOSTER_PACK_XP',
    name: 'XP Booster Pack',
    type: 'BOOSTER',
    rarity: 'RARE',
    description: 'Contains 1x XP Overclock (L) and 2x XP Injection (S).',
    price: 800,
    currency: 'GOLD'
  },
  'BOOSTER_PACK_GOLD': {
    id: 'BOOSTER_PACK_GOLD',
    name: 'Gold Booster Pack',
    type: 'BOOSTER',
    rarity: 'RARE',
    description: 'Contains 1x Midas Protocol (L) and 2x Gold Injection (S).',
    price: 800,
    currency: 'GOLD'
  },
  'STREAK_PROTECTION': {
    id: 'STREAK_PROTECTION',
    name: 'Streak Shield',
    type: 'VOUCHER',
    rarity: 'EPIC',
    description: 'Protects your win streak from one loss. One-time use.',
    price: 300,
    currency: 'GOLD'
  },
  'DAILY_BONUS_MULTIPLIER': {
    id: 'DAILY_BONUS_MULTIPLIER',
    name: 'Daily Bonus Boost',
    type: 'BOOSTER',
    rarity: 'COMMON',
    description: 'Increases daily event rewards by 50% for today.',
    price: 250,
    currency: 'GOLD'
  },
  'SOVEREIGN_SPADE': {
    id: 'SOVEREIGN_SPADE',
    name: 'Sovereign Spade',
    type: 'COSMETIC',
    rarity: 'RARE',
    description: 'Exclusive seasonal spade sleeve.',
    isEventExclusive: true,
    style: 'SOVEREIGN_SPADE'
  },
  'SOVEREIGN_CLUB': {
    id: 'SOVEREIGN_CLUB',
    name: 'Sovereign Club',
    type: 'COSMETIC',
    rarity: 'EPIC',
    description: 'Exclusive seasonal club sleeve.',
    isEventExclusive: true,
    style: 'SOVEREIGN_CLUB'
  },
  'SOVEREIGN_DIAMOND': {
    id: 'SOVEREIGN_DIAMOND',
    name: 'Sovereign Diamond',
    type: 'COSMETIC',
    rarity: 'LEGENDARY',
    description: 'Exclusive seasonal diamond sleeve.',
    isEventExclusive: true,
    style: 'SOVEREIGN_DIAMOND'
  },
  'SOVEREIGN_HEART': {
    id: 'SOVEREIGN_HEART',
    name: 'Sovereign Heart',
    type: 'COSMETIC',
    rarity: 'MYTHIC',
    description: 'Exclusive seasonal heart sleeve.',
    isEventExclusive: true,
    style: 'SOVEREIGN_HEART'
  },
  'AMETHYST_ROYAL': {
    id: 'AMETHYST_ROYAL',
    name: 'Royal Amethyst',
    type: 'COSMETIC',
    rarity: 'RARE',
    description: 'Velvet silk with silver filigree.',
    price: 5000,
    currency: 'GOLD',
    style: 'AMETHYST_ROYAL'
  },
  'EMOTE_CHEST': {
    id: 'EMOTE_CHEST',
    name: 'Emote Chest',
    type: 'COSMETIC',
    rarity: 'EPIC',
    description: 'Contains a random exclusive emote. Event exclusive - cannot be purchased.',
    isEventExclusive: true
    // No price - not purchasable
  }
};