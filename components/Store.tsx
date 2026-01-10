import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardCoverStyle } from './Card';
import { UserProfile, BackgroundTheme, Emote, Card as CardType, Rank, Suit } from '../types';
import { buyItem, getAvatarName, fetchEmotes, updateProfileSettings, fetchFinishers, buyFinisher, buyFinisherPack, buyPack, equipFinisher, Finisher, processAdReward, fetchChatPresets, ChatPreset, purchasePhrase, incrementGems, processGemTransaction, claimAdRewardGems, fetchWeeklyRewardStatus } from '../services/supabase';
import { PREMIUM_BOARDS, BoardPreview, BoardSurface } from './UserHub';
import { audioService } from '../services/audio';
import { VisualEmote } from './VisualEmote';
import { ITEM_REGISTRY } from '../constants/ItemRegistry';
import { v4 as uuidv4 } from 'uuid';
import { FinisherPreview } from './FinisherPreview';
import { PurchaseSuccessModal } from './PurchaseSuccessModal';
import { AdRewardSuccessModal } from './AdRewardSuccessModal';
import { Toast } from './Toast';
import { adService, AdPlacement } from '../services/adService';
import { GemRain } from './GemRain';
import { ShibaSlamFinisher } from './ShibaSlamFinisher';
import { EtherealBladeFinisher } from './EtherealBladeFinisher';
import { SaltShakeFinisher } from './SaltShakeFinisher';
import { SanctumSnapFinisher } from './SanctumSnapFinisher';
import { SeductiveFinishFinisher } from './SeductiveFinishFinisher';
import { KissMyShibaFinisher } from './KissMyShibaFinisher';
import { ChatBubble } from './ChatBubble';

// Helper function to format time ago
const getTimeAgo = (date: Date): string => {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  
  return date.toLocaleDateString();
};

// Premium Finisher Icons
const ShibaSlamIcon: React.FC<{ className?: string; remoteEmotes?: Emote[] }> = ({ className = '', remoteEmotes = [] }) => (
  <VisualEmote trigger=":shiba:" remoteEmotes={remoteEmotes} size="xl" className={className} />
);

const EtherealBladeIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bladeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
        <stop offset="30%" stopColor="#E0E7FF" stopOpacity="1" />
        <stop offset="60%" stopColor="#C7D2FE" stopOpacity="1" />
        <stop offset="100%" stopColor="#A5B4FC" stopOpacity="1" />
      </linearGradient>
      <linearGradient id="bladeGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFD700" stopOpacity="1" />
        <stop offset="50%" stopColor="#FFA500" stopOpacity="1" />
        <stop offset="100%" stopColor="#FF8C00" stopOpacity="1" />
      </linearGradient>
      <radialGradient id="bladeGlow" cx="50%" cy="50%">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
        <stop offset="50%" stopColor="#E0E7FF" stopOpacity="0.6" />
        <stop offset="100%" stopColor="#A5B4FC" stopOpacity="0" />
      </radialGradient>
      <filter id="bladeGlowFilter">
        <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    {/* Ethereal Glow Background */}
    <circle cx="60" cy="60" r="55" fill="url(#bladeGlow)" opacity="0.5" />
    {/* Main Blade */}
    <g filter="url(#bladeGlowFilter)" transform="translate(60, 60) rotate(-45)">
      {/* Blade Edge */}
      <path d="M -25 -3 L 25 -3 L 20 0 L 25 3 L -25 3 Z" fill="url(#bladeGradient)" opacity="0.95" />
      {/* Blade Core - Glowing */}
      <path d="M -20 -1.5 L 20 -1.5 L 18 0 L 20 1.5 L -20 1.5 Z" fill="#FFFFFF" opacity="0.8" />
      {/* Hilt */}
      <rect x="-30" y="-4" width="8" height="8" rx="1" fill="url(#bladeGold)" />
      <rect x="-32" y="-2" width="4" height="4" rx="0.5" fill="#FFD700" />
    </g>
    {/* Slash Trails - Ethereal */}
    <g opacity="0.7">
      <path d="M 20 30 Q 40 50, 60 70" stroke="url(#bladeGradient)" strokeWidth="2" fill="none" opacity="0.6">
        <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2s" repeatCount="indefinite" />
      </path>
      <path d="M 100 30 Q 80 50, 60 70" stroke="url(#bladeGradient)" strokeWidth="2" fill="none" opacity="0.5">
        <animate attributeName="opacity" values="0.5;0.1;0.5" dur="2.2s" repeatCount="indefinite" />
      </path>
    </g>
    {/* Floating Light Particles */}
    <circle cx="30" cy="30" r="1.5" fill="#FFFFFF" opacity="0.8">
      <animate attributeName="opacity" values="0.8;0.2;0.8" dur="1.5s" repeatCount="indefinite" />
    </circle>
    <circle cx="90" cy="30" r="1.5" fill="#E0E7FF" opacity="0.8">
      <animate attributeName="opacity" values="0.8;0.2;0.8" dur="1.7s" repeatCount="indefinite" />
    </circle>
    <circle cx="30" cy="90" r="1.5" fill="#C7D2FE" opacity="0.8">
      <animate attributeName="opacity" values="0.8;0.2;0.8" dur="1.9s" repeatCount="indefinite" />
    </circle>
    <circle cx="90" cy="90" r="1.5" fill="#FFFFFF" opacity="0.8">
      <animate attributeName="opacity" values="0.8;0.2;0.8" dur="1.6s" repeatCount="indefinite" />
    </circle>
  </svg>
);

/* Added missing SLEEVES and category constants for external import */
export const SUPER_PRESTIGE_SLEEVE_IDS: CardCoverStyle[] = ['WITS_END', 'DIVINE_ROYAL', 'EMPERORS_HUBRIS', 'ROYAL_CROSS'];
export const SOVEREIGN_IDS: CardCoverStyle[] = ['SOVEREIGN_SPADE', 'SOVEREIGN_CLUB', 'SOVEREIGN_DIAMOND', 'SOVEREIGN_HEART'];

export const SLEEVES: { id: string; name: string; style: CardCoverStyle; price: number; currency: 'GOLD' | 'GEMS' }[] = [
  // Free/Gold Sleeves (sorted by price)
  { id: 'BLUE', name: 'Standard Blue', style: 'BLUE', price: 0, currency: 'GOLD' },
  { id: 'RED', name: 'Standard Red', style: 'RED', price: 0, currency: 'GOLD' },
  { id: 'PATTERN', name: 'Classic Pattern', style: 'PATTERN', price: 2000, currency: 'GOLD' },
  { id: 'CHERRY_BLOSSOM_NOIR', name: 'Cherry Blossom Noir', style: 'CHERRY_BLOSSOM_NOIR', price: 3000, currency: 'GOLD' },
  { id: 'CRYSTAL_EMERALD', name: 'Crystal Emerald', style: 'CRYSTAL_EMERALD', price: 5000, currency: 'GOLD' },
  { id: 'NEON_CYBER', name: 'Neon Cyber', style: 'NEON_CYBER', price: 10000, currency: 'GOLD' },
  // Gem Sleeves - Mid-tier
  { id: 'VOID_ONYX', name: 'Void Onyx', style: 'VOID_ONYX', price: 350, currency: 'GEMS' },
  { id: 'DRAGON_SCALE', name: 'Dragon Scale', style: 'DRAGON_SCALE', price: 450, currency: 'GEMS' },
  // Gem Sleeves - High-tier
  { id: 'PIXEL_CITY_LIGHTS', name: 'Pixel City Lights', style: 'PIXEL_CITY_LIGHTS', price: 600, currency: 'GEMS' },
  { id: 'AMETHYST_ROYAL', name: 'Amethyst Royal', style: 'AMETHYST_ROYAL', price: 600, currency: 'GEMS' },
  { id: 'AETHER_VOID', name: 'Aether Void', style: 'AETHER_VOID', price: 800, currency: 'GEMS' },
  { id: 'WITS_END', name: "Wit's End", style: 'WITS_END', price: 800, currency: 'GEMS' },
  // Gem Sleeves - Luxury-tier
  { id: 'DIVINE_ROYAL', name: 'Divine Royal', style: 'DIVINE_ROYAL', price: 1000, currency: 'GEMS' },
  { id: 'EMPERORS_HUBRIS', name: "Emperor's Hubris", style: 'EMPERORS_HUBRIS', price: 1200, currency: 'GEMS' },
  { id: 'ROYAL_CROSS', name: 'Royal Cross', style: 'ROYAL_CROSS', price: 1500, currency: 'GEMS' },
];

// Deal Pack Structure
export interface DealPack {
  id: string;
  name: string;
  description: string;
  items: Array<{
    type: 'FINISHER' | 'EMOTE' | 'BOARD' | 'SLEEVE';
    id: string; // animation_key for finishers, trigger_code for emotes, id for boards/sleeves
  }>;
  originalPrice: number; // Sum of individual prices
  bundlePrice: number; // Discounted price
  discountPercent: number;
  discountLabel: string; // e.g., '30% OFF', '35% OFF'
}

export const DEAL_PACKS: DealPack[] = [
  {
    id: 'LUNAR_NEW_YEAR_PACK',
    name: 'Lunar New Year Pack',
    description: 'Celebrate the Year of the Dragon with this exclusive collection!',
    items: [
      { type: 'SLEEVE', id: 'DRAGON_SCALE' }, // dragons_fortune -> Dragon Scale sleeve
      { type: 'BOARD', id: 'GOLDEN_EMPEROR' }, // lucky_board -> Lucky Envelope
      { type: 'FINISHER', id: 'sanctum_snap' }
    ],
    originalPrice: 3000,
    bundlePrice: 2100,
    discountPercent: 30,
    discountLabel: '30% OFF'
  },
  {
    id: 'VALENTINE_PACK',
    name: 'Valentine Pack',
    description: 'The perfect romantic collection for your special someone!',
    items: [
      { type: 'EMOTE', id: ':heart_eyes:' }, // seductive_emote
      { type: 'BOARD', id: 'JUST_A_GIRL' }, // girl_board
      { type: 'FINISHER', id: 'seductive_finish' }
    ],
    originalPrice: 3500,
    bundlePrice: 2450,
    discountPercent: 30,
    discountLabel: '30% OFF'
  },
  {
    id: 'SHIBA_INU_PACK',
    name: 'Shiba Inu Pack',
    description: 'The ultimate Shiba collection - all the good boys in one pack!',
    items: [
      { type: 'EMOTE', id: ':shiba:' }, // shiba_emote
      { type: 'EMOTE', id: ':shiba_butt:' }, // shiba_butt_emote
      { type: 'FINISHER', id: 'shiba_slam' },
      { type: 'FINISHER', id: 'kiss_my_shiba' }
    ],
    originalPrice: 4500,
    bundlePrice: 2900,
    discountPercent: 35,
    discountLabel: '35% OFF'
  }
];

/**
 * Seed-based random number generator for consistent daily deals
 */
const seedRandom = (seed: string): number => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

/**
 * Get the Daily Deal sleeve for today
 * Returns the sleeve ID that's on sale today (30% off)
 */
export const getDailyDealSleeve = (): string | null => {
  const today = new Date().toISOString().slice(0, 10); // "2026-01-05"
  const gemSleeves = SLEEVES.filter(s => s.currency === 'GEMS');
  if (gemSleeves.length === 0) return null;
  
  const dealIndex = seedRandom(today) % gemSleeves.length;
  return gemSleeves[dealIndex].id;
};

/**
 * Get time remaining until next daily deal reset (24 hours from midnight)
 */
export const getDailyDealTimeRemaining = (): { hours: number; minutes: number; seconds: number } => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  const diff = tomorrow.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  return { hours, minutes, seconds };
};

/**
 * Premium Final Fantasy-Inspired Gold Coin
 */
const CoinIconSVG = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full">
    <defs>
      <radialGradient id="goldCoinGrad" cx="30%" cy="30%">
        <stop offset="0%" stopColor="#FFE082" />
        <stop offset="30%" stopColor="#FFC107" />
        <stop offset="60%" stopColor="#FF8F00" />
        <stop offset="100%" stopColor="#E65100" />
      </radialGradient>
      <linearGradient id="goldCoinBevel" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFF9C4" stopOpacity="0.8" />
        <stop offset="50%" stopColor="#FFC107" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#E65100" stopOpacity="0.2" />
      </linearGradient>
      <filter id="coinGlow">
        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      <pattern id="coinPattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
        <circle cx="10" cy="10" r="1" fill="#FFC107" opacity="0.3" />
      </pattern>
    </defs>
    {/* Outer rim with depth */}
    <circle cx="50" cy="50" r="48" fill="url(#goldCoinGrad)" stroke="#FF8F00" strokeWidth="2" filter="url(#coinGlow)" />
    <circle cx="50" cy="50" r="46" fill="none" stroke="#FFF9C4" strokeWidth="1" opacity="0.6" />
    
    {/* Inner coin body */}
    <circle cx="50" cy="50" r="42" fill="url(#goldCoinGrad)" />
    <circle cx="50" cy="50" r="42" fill="url(#coinPattern)" />
    
    {/* Bevel highlight */}
    <ellipse cx="50" cy="45" rx="38" ry="35" fill="url(#goldCoinBevel)" />
    
    {/* Ornate center design - XIII motif */}
    <g transform="translate(50, 50)">
      {/* Central circle */}
      <circle r="18" fill="#E65100" opacity="0.6" />
      <circle r="16" fill="none" stroke="#FFC107" strokeWidth="1.5" opacity="0.8" />
      
      {/* Roman numeral XIII */}
      <text x="0" y="8" textAnchor="middle" fontSize="20" fontWeight="900" fill="#FFF9C4" fontFamily="serif" opacity="0.9" style={{ textShadow: '0 0 4px rgba(0,0,0,0.5)' }}>
        XIII
      </text>
      
      {/* Decorative border pattern */}
      <circle r="20" fill="none" stroke="#FFC107" strokeWidth="1" opacity="0.5" strokeDasharray="2,2" />
      <circle r="24" fill="none" stroke="#FF8F00" strokeWidth="1" opacity="0.4" />
    </g>
    
    {/* Edge highlights for 3D effect */}
    <path d="M 10 50 A 40 40 0 0 1 50 10" fill="none" stroke="#FFF9C4" strokeWidth="1.5" opacity="0.7" />
    <path d="M 90 50 A 40 40 0 0 1 50 90" fill="none" stroke="#E65100" strokeWidth="1.5" opacity="0.5" />
  </svg>
);

/**
 * Premium Final Fantasy-Inspired Gem Crystal
 */
const GemIconSVG = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full">
    <defs>
      <linearGradient id="gemGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFB3E6" />
        <stop offset="30%" stopColor="#FF66CC" />
        <stop offset="60%" stopColor="#FF1493" />
        <stop offset="100%" stopColor="#8B008B" />
      </linearGradient>
      <linearGradient id="gemGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFB3E6" stopOpacity="0.9" />
        <stop offset="50%" stopColor="#FF1493" stopOpacity="0.7" />
        <stop offset="100%" stopColor="#8B008B" stopOpacity="0.5" />
      </linearGradient>
      <linearGradient id="gemHighlight" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
        <stop offset="100%" stopColor="#FFB3E6" stopOpacity="0.3" />
      </linearGradient>
      <filter id="gemGlow">
        <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      <filter id="gemInnerGlow">
        <feGaussianBlur stdDeviation="1.5" result="blur"/>
        <feFlood floodColor="#FFB3E6" floodOpacity="0.4" result="glowColor"/>
        <feComposite in="glowColor" in2="blur" operator="in" result="glow"/>
        <feMerge>
          <feMergeNode in="glow"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    
    {/* Main gem body - faceted diamond */}
    <path d="M50 8 L75 28 L75 58 L50 78 L25 58 L25 28 Z" fill="url(#gemGrad1)" filter="url(#gemGlow)" stroke="#FFB3E6" strokeWidth="1.5" opacity="0.9" />
    
    {/* Top facet highlight */}
    <path d="M50 8 L75 28 L50 28 Z" fill="url(#gemHighlight)" opacity="0.7" />
    
    {/* Left facet */}
    <path d="M50 8 L25 28 L25 58 L50 38 Z" fill="url(#gemGrad2)" opacity="0.8" />
    
    {/* Right facet */}
    <path d="M50 8 L75 28 L75 58 L50 38 Z" fill="url(#gemGrad2)" opacity="0.6" />
    
    {/* Bottom facets */}
    <path d="M25 58 L50 78 L50 58 Z" fill="url(#gemGrad2)" opacity="0.7" />
    <path d="M75 58 L50 78 L50 58 Z" fill="url(#gemGrad2)" opacity="0.5" />
    
    {/* Inner crystal core */}
    <ellipse cx="50" cy="43" rx="20" ry="25" fill="url(#gemHighlight)" opacity="0.4" filter="url(#gemInnerGlow)" />
    
    {/* Facet lines for depth */}
    <path d="M50 8 L50 78 M25 28 L75 28 M25 58 L75 58" stroke="#FFB3E6" strokeWidth="0.8" opacity="0.4" />
    <path d="M50 8 L25 28 M50 8 L75 28 M25 58 L50 78 M75 58 L50 78" stroke="#FFFFFF" strokeWidth="0.6" opacity="0.5" />
    
    {/* Sparkle effects */}
    <circle cx="50" cy="20" r="2" fill="#FFFFFF" opacity="0.9" />
    <circle cx="65" cy="35" r="1.5" fill="#FFFFFF" opacity="0.8" />
    <circle cx="35" cy="35" r="1.5" fill="#FFFFFF" opacity="0.8" />
    <circle cx="50" cy="65" r="1.5" fill="#FFB3E6" opacity="0.7" />
  </svg>
);

/* Unique Item Icons */
const XpBoosterIcon = () => (
  <svg viewBox="0 0 100 100" className="w-16 h-16">
    <defs>
      <linearGradient id="xpGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#60a5fa" />
        <stop offset="50%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#1e40af" />
      </linearGradient>
      <filter id="xpGlow">
        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <circle cx="50" cy="50" r="42" fill="url(#xpGrad)" stroke="white" strokeWidth="2" opacity="0.95" filter="url(#xpGlow)" />
    <path d="M35 35 L50 20 L65 35 M35 65 L50 50 L65 65" stroke="white" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="50" cy="50" r="35" fill="white" opacity="0.1" />
    <circle cx="50" cy="50" r="25" fill="none" stroke="white" strokeWidth="1.5" opacity="0.3" />
  </svg>
);

const GoldBoosterIcon = () => (
  <svg viewBox="0 0 100 100" className="w-16 h-16">
    <defs>
      <linearGradient id="goldBoostGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fde047" />
        <stop offset="50%" stopColor="#facc15" />
        <stop offset="100%" stopColor="#ca8a04" />
      </linearGradient>
      <filter id="goldGlow">
        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <circle cx="50" cy="50" r="42" fill="url(#goldBoostGrad)" stroke="white" strokeWidth="2" opacity="0.95" filter="url(#goldGlow)" />
    <text x="50" y="62" textAnchor="middle" fontSize="36" fontWeight="900" fill="white" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>$</text>
    <circle cx="50" cy="50" r="35" fill="white" opacity="0.1" />
    <path d="M25 25 L35 20 M75 25 L65 20 M25 75 L35 80 M75 75 L65 80" stroke="white" strokeWidth="2.5" opacity="0.4" strokeLinecap="round" />
  </svg>
);

const VoucherIcon = () => (
  <svg viewBox="0 0 100 100" className="w-16 h-16">
    <defs>
      <linearGradient id="voucherGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#34d399" />
        <stop offset="100%" stopColor="#059669" />
      </linearGradient>
      <pattern id="voucherPattern" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
        <circle cx="5" cy="5" r="1" fill="white" opacity="0.2" />
      </pattern>
    </defs>
    <rect x="12" y="20" width="76" height="60" rx="5" fill="url(#voucherGrad)" stroke="white" strokeWidth="2.5" opacity="0.95" />
    <rect x="12" y="20" width="76" height="60" rx="5" fill="url(#voucherPattern)" />
    <circle cx="12" cy="50" r="10" fill="black" opacity="0.5" />
    <circle cx="88" cy="50" r="10" fill="black" opacity="0.5" />
    <path d="M28 35 H72 M28 45 H60 M28 55 H50" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
    <text x="75" y="58" textAnchor="middle" fontSize="20" fontWeight="900" fill="white" opacity="0.9">%</text>
    <path d="M12 20 L12 50 M12 80 L12 50 M88 20 L88 50 M88 80 L88 50" stroke="white" strokeWidth="2" strokeDasharray="2,2" opacity="0.6" />
  </svg>
);

const UndoIcon = () => (
  <svg viewBox="0 0 100 100" className="w-16 h-16">
    <defs>
      <linearGradient id="undoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#a78bfa" />
        <stop offset="100%" stopColor="#6d28d9" />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="42" fill="url(#undoGrad)" stroke="white" strokeWidth="2" opacity="0.95" />
    <path d="M35 50 L25 40 L25 50 L35 60" stroke="white" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M25 50 Q35 50 45 50 Q55 50 65 50" stroke="white" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.8" />
    <circle cx="50" cy="50" r="30" fill="white" opacity="0.1" />
  </svg>
);

const CardPackIcon = () => (
  <svg viewBox="0 0 100 100" className="w-16 h-16">
    <defs>
      <linearGradient id="packGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f472b6" />
        <stop offset="100%" stopColor="#be185d" />
      </linearGradient>
    </defs>
    <rect x="20" y="30" width="60" height="45" rx="3" fill="url(#packGrad)" stroke="white" strokeWidth="2.5" opacity="0.95" />
    <rect x="25" y="35" width="50" height="35" rx="2" fill="white" opacity="0.2" />
    <path d="M30 45 L45 45 M30 52 L50 52 M30 59 L40 59" stroke="white" strokeWidth="2" opacity="0.6" />
    <path d="M20 30 L30 20 L80 20 L70 30" fill="url(#packGrad)" stroke="white" strokeWidth="2.5" opacity="0.95" />
    <circle cx="50" cy="52" r="8" fill="white" opacity="0.3" />
  </svg>
);

const StreakProtectionIcon = () => (
  <svg viewBox="0 0 100 100" className="w-16 h-16">
    <defs>
      <linearGradient id="streakGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fbbf24" />
        <stop offset="100%" stopColor="#d97706" />
      </linearGradient>
    </defs>
    <path d="M50 15 L70 30 L65 55 L50 75 L35 55 L30 30 Z" fill="url(#streakGrad)" stroke="white" strokeWidth="2.5" opacity="0.95" />
    <path d="M50 25 L60 35 L58 50 L50 60 L42 50 L40 35 Z" fill="white" opacity="0.3" />
    <circle cx="50" cy="45" r="8" fill="white" opacity="0.5" />
    <path d="M50 20 L50 30 M50 60 L50 70" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
  </svg>
);

const DailyBonusIcon = () => (
  <svg viewBox="0 0 100 100" className="w-16 h-16">
    <defs>
      <linearGradient id="dailyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#92400e" />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="42" fill="url(#dailyGrad)" stroke="white" strokeWidth="2.5" opacity="0.95" />
    <text x="50" y="58" textAnchor="middle" fontSize="32" fontWeight="900" fill="white" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>+</text>
    <circle cx="50" cy="50" r="35" fill="white" opacity="0.1" />
    <path d="M50 20 L52 30 L62 30 L54 36 L56 46 L50 40 L44 46 L46 36 L38 30 L48 30 Z" fill="white" opacity="0.4" />
  </svg>
);

const ComboHintIcon = () => (
  <svg viewBox="0 0 100 100" className="w-16 h-16">
    <defs>
      <linearGradient id="hintGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8b5cf6" />
        <stop offset="100%" stopColor="#5b21b6" />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="42" fill="url(#hintGrad)" stroke="white" strokeWidth="2.5" opacity="0.95" />
    <circle cx="50" cy="40" r="12" fill="white" opacity="0.9" />
    <path d="M50 55 L50 70 M45 65 L50 70 L55 65" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
    <circle cx="50" cy="50" r="35" fill="white" opacity="0.1" />
  </svg>
);

export const CurrencyIcon: React.FC<{ type: 'GOLD' | 'GEMS'; size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'; className?: string }> = ({ type, size = 'sm', className = "" }) => {
  const dim = size === 'xs' ? 'w-4 h-4' : size === 'sm' ? 'w-5 h-5' : size === 'lg' ? 'w-12 h-12' : size === 'xl' ? 'w-16 h-16' : 'w-8 h-8';
  
  // Safeguard: Ensure type is valid
  const iconType = (type === 'GOLD' || type === 'GEMS') ? type : 'GOLD';
  
  return (
    <div className={`relative ${dim} flex items-center justify-center shrink-0 ${className}`}>
      <div className="w-full h-full relative z-10 transition-transform duration-300 hover:scale-125">
        {iconType === 'GOLD' ? <CoinIconSVG /> : <GemIconSVG />}
      </div>
    </div>
  );
};

/* Added missing canAfford helper */
export const canAfford = (profile: UserProfile, price: number, currency: 'GOLD' | 'GEMS' = 'GOLD') => {
  if (currency === 'GEMS') return (profile.gems || 0) >= price;
  return profile.coins >= price;
};

/* Added missing SleeveArenaPreview component */
export const SleeveArenaPreview: React.FC<{ sleeveStyle: CardCoverStyle; themeId: BackgroundTheme; sleeveEffectsEnabled: boolean; onClose: () => void }> = ({ sleeveStyle, themeId, sleeveEffectsEnabled, onClose }) => {
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in" onClick={onClose}>
        <BoardSurface themeId={themeId} isMini />
        <div className="relative z-10 flex flex-col items-center gap-8" onClick={e => e.stopPropagation()}>
            <div className="relative group">
                <div className="absolute inset-[-40px] bg-yellow-500/10 blur-[80px] rounded-full animate-pulse"></div>
                <Card faceDown activeTurn={true} coverStyle={sleeveStyle} className="!w-48 !h-72 shadow-[0_40px_80px_rgba(0,0,0,0.8)]" disableEffects={!sleeveEffectsEnabled} />
            </div>
            <button onClick={onClose} className="px-12 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-black uppercase tracking-[0.3em] hover:bg-white/10 transition-all">Close Preview</button>
        </div>
    </div>
  );
};

/* Board Theme Preview Component - Shows full game board */
export const BoardThemePreview: React.FC<{
  themeId: BackgroundTheme;
  onClose: () => void;
}> = ({ themeId, onClose }) => {
  // Generate 13 unique cards for the fan display
  const previewCards = useMemo(() => {
    const cards: CardType[] = [];
    const suits = [Suit.Spades, Suit.Clubs, Suit.Diamonds, Suit.Hearts];
    const ranks = [Rank.Three, Rank.Four, Rank.Five, Rank.Six, Rank.Seven, Rank.Eight, Rank.Nine, Rank.Ten, Rank.Jack, Rank.Queen, Rank.King, Rank.Ace, Rank.Two];
    
    // Create a diverse set of 13 cards
    for (let i = 0; i < 13; i++) {
      cards.push({
        rank: ranks[i],
        suit: suits[i % 4],
        id: uuidv4()
      });
    }
    return cards;
  }, []);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in" onClick={onClose}>
      <BoardSurface themeId={themeId} />
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
        {/* Top-right close (X) button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 z-50 w-10 h-10 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white text-lg font-black hover:bg-white/10 hover:scale-105 transition-all"
        >
          ×
        </button>

        {/* Game board preview - shows the board as it would appear in game */}
        <div className="relative w-full max-w-6xl h-full max-h-[90vh] flex items-center justify-center">
          {/* Simulated game table layout - matches GameTable structure */}
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Center arena area - where cards would be played (matches GameTable) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="opacity-10 border-2 border-dashed border-white/40 rounded-[3rem] p-24 flex items-center justify-center">
                <div className="text-white text-base font-black uppercase tracking-[1em]">Arena</div>
              </div>
            </div>
            
            {/* 13 cards in a fan facing the player (bottom) */}
            <div className="absolute bottom-24 sm:bottom-32 left-1/2 -translate-x-1/2 flex items-end justify-center gap-1 pointer-events-none">
              {previewCards.map((card, index) => {
                const totalCards = 13;
                const centerIndex = Math.floor(totalCards / 2);
                const offset = index - centerIndex;
                const rotation = offset * 8; // degrees for fan
                const translateY = Math.abs(offset) * 3; // slight vertical offset
                const translateX = offset * 18; // horizontal spacing
                const zIndex = totalCards - Math.abs(offset); // center cards on top
                
                return (
                  <div
                    key={card.id}
                    className="absolute transition-all duration-300"
                    style={{
                      transform: `translateX(${translateX}px) translateY(${-translateY}px) rotate(${rotation}deg)`,
                      transformOrigin: 'center bottom',
                      left: '50%',
                      marginLeft: '-40px', // half card width
                      zIndex,
                    }}
                  >
                    <Card 
                      card={card} 
                      className="shadow-[0_8px_24px_rgba(0,0,0,0.8)]" 
                      coverStyle="BLUE"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Close button */}
        <button 
          onClick={onClose} 
          className="absolute bottom-8 px-12 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-black uppercase tracking-[0.3em] hover:bg-white/10 transition-all backdrop-blur-sm z-50"
        >
          Close Preview
        </button>
      </div>
    </div>
  );
};

/* Card Sleeve Preview Component with 3D arch effect */
export const CardSleevePreview: React.FC<{ 
  sleeveStyle: CardCoverStyle; 
  themeId: BackgroundTheme; 
  sleeveEffectsEnabled: boolean; 
  onClose: () => void 
}> = ({ sleeveStyle, themeId, sleeveEffectsEnabled, onClose }) => {
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const isMobile = viewportWidth < 640;
  const isTablet = viewportWidth >= 640 && viewportWidth < 1024;
  const spreadBase = isMobile ? 12 : isTablet ? 12 : 13; // degrees fan range (more aggressive)
  const translateBase = isMobile ? 14 : isTablet ? 18 : 22; // px between cards
  const overlap = isMobile ? -30 : isTablet ? -22 : -16; // stronger overlap on small screens to keep all 13 visible
  const arcLiftScale = isMobile ? 18 : isTablet ? 20 : 22; // vertical lift for U-curve
  const fanScale = isMobile ? 0.9 : isTablet ? 0.97 : 1; // slightly larger cards while fitting the spread

  // Generate 13 unique cards for face-up display
  const faceUpCards = useMemo(() => {
    const cards: CardType[] = [];
    const suits = [Suit.Spades, Suit.Clubs, Suit.Diamonds, Suit.Hearts];
    const ranks = [Rank.Three, Rank.Four, Rank.Five, Rank.Six, Rank.Seven, Rank.Eight, Rank.Nine, Rank.Ten, Rank.Jack, Rank.Queen, Rank.King, Rank.Ace, Rank.Two];
    
    // Create a diverse set of 13 cards
    for (let i = 0; i < 13; i++) {
      cards.push({
        rank: ranks[i],
        suit: suits[i % 4],
        id: uuidv4()
      });
    }
    return cards;
  }, []);

  // Generate 13 cards for face-down display (just IDs needed)
  const faceDownCards = useMemo(() => {
    return Array.from({ length: 13 }, () => uuidv4());
  }, []);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-in fade-in" onClick={onClose}>
      <BoardSurface themeId={themeId} isMini />
      <div className="relative z-10 w-full max-w-6xl h-full max-h-[90vh] flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
        {/* Top-right close (X) button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 z-50 w-10 h-10 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white text-lg font-black hover:bg-white/10 hover:scale-105 transition-all"
        >
          ×
        </button>

        {/* 3D Container with subtle perspective */}
        <div
          className="relative w-full h-full flex items-center justify-center"
          style={{ perspective: '2000px', perspectiveOrigin: 'center bottom' }}
        >
          {/* Face-up cards fan (bottom, like your in-game hand) */}
          <div
            className="absolute inset-x-0 bottom-8 flex items-end justify-center"
            style={{
              transformStyle: 'preserve-3d',
              transform: `rotateX(10deg) scale(${fanScale})`,
            }}
          >
            {faceUpCards.map((card, index) => {
              const totalCards = faceUpCards.length;
              const maxIndex = (totalCards - 1) / 2;
              const offset = index - maxIndex; // negative to positive

              const angle = (offset / maxIndex) * spreadBase; // soft fan angle
              const translateX = offset * translateBase;
              const arcLift = Math.abs(offset / maxIndex) * arcLiftScale; // gentle U-curve
              const zIndex = 100 + index;

              // Slight overlap via negative margin; scales fine across device sizes
              return (
                <div
                  key={card.id}
                  className="transition-transform duration-300"
                  style={{
                    transform: `translateX(${translateX}px) translateY(${arcLift}px) rotateZ(${angle}deg)`,
                    transformStyle: 'preserve-3d',
                    marginLeft: index === 0 ? 0 : overlap,
                    zIndex,
                  }}
                >
                  <Card
                    card={card}
                    coverStyle={sleeveStyle}
                    className="shadow-[0_10px_28px_rgba(0,0,0,0.75)]"
                  />
                </div>
              );
            })}
          </div>

          {/* Face-down sleeve fan (top, mirrored) */}
          <div
            className="absolute inset-x-0 top-8 flex items-start justify-center"
            style={{
              transformStyle: 'preserve-3d',
              transform: `rotateX(-10deg) scale(${fanScale})`,
            }}
          >
            {faceDownCards.map((cardId, index) => {
              const totalCards = faceDownCards.length;
              const maxIndex = (totalCards - 1) / 2;
              const offset = index - maxIndex;

              const angle = -(offset / maxIndex) * spreadBase; // mirror angle
              const translateX = offset * translateBase;
              const arcLift = Math.abs(offset / maxIndex) * arcLiftScale;
              const zIndex = 100 + index;

              return (
                <div
                  key={cardId}
                  className="transition-transform duration-300"
                  style={{
                    transform: `translateX(${translateX}px) translateY(-${arcLift}px) rotateZ(${angle}deg)`,
                    transformStyle: 'preserve-3d',
                    marginLeft: index === 0 ? 0 : overlap,
                    zIndex,
                  }}
                >
                  <Card
                    faceDown
                    activeTurn={true}
                    coverStyle={sleeveStyle}
                    className="shadow-[0_10px_28px_rgba(0,0,0,0.75)]"
                    disableEffects={!sleeveEffectsEnabled}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Close button */}
        <button 
          onClick={onClose} 
          className="absolute bottom-8 px-12 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-black uppercase tracking-[0.3em] hover:bg-white/10 transition-all backdrop-blur-sm z-50"
        >
          Close Preview
        </button>
        </div>
    </div>
  );
};

// Free Gems Card Component with Weekly Progress
const FreeGemsCard: React.FC<{ 
  profile: UserProfile | null; 
  onRefresh: () => void;
  onGemRain: () => void;
  remoteEmotes?: Emote[];
}> = ({ profile, onRefresh, onGemRain, remoteEmotes = [] }) => {
  const [adState, setAdState] = useState<'idle' | 'loading' | 'playing' | 'rewarded' | 'error'>('idle');
  const [weeklyGems, setWeeklyGems] = useState<number>(0);
  const [resetTimestamp, setResetTimestamp] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<string>('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [showWarningToast, setShowWarningToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [rewardAmount, setRewardAmount] = useState(20);
  const [rewardType, setRewardType] = useState<'gems' | 'coins'>('gems');
  const [buttonPulse, setButtonPulse] = useState(false);
  const [previousWeeklyGems, setPreviousWeeklyGems] = useState<number>(0);
  const placement: AdPlacement = 'shop';

  useEffect(() => {
    const unsubscribe = adService.onStateChange(placement, setAdState);
    return unsubscribe;
  }, [placement]);

  // Fetch weekly reward status from reward_tracking table
  useEffect(() => {
    if (profile && profile.id && profile.id !== 'guest') {
      fetchWeeklyRewardStatus(profile.id).then((status) => {
        if (status) {
          setWeeklyGems(status.weeklyGemTotal);
          setPreviousWeeklyGems(status.weeklyGemTotal);
          
          // Calculate reset timestamp (next Sunday at midnight UTC)
          if (status.lastResetDate) {
            const lastReset = new Date(status.lastResetDate);
            const nextSunday = new Date(lastReset);
            nextSunday.setDate(nextSunday.getDate() + 7);
            setResetTimestamp(nextSunday.toISOString());
          } else {
            // Calculate next Sunday at midnight UTC
            const now = new Date();
            const dayOfWeek = now.getUTCDay();
            const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
            const nextSunday = new Date(now);
            nextSunday.setUTCDate(now.getUTCDate() + daysUntilSunday);
            nextSunday.setUTCHours(0, 0, 0, 0);
            setResetTimestamp(nextSunday.toISOString());
          }
        }
      });
    }
  }, [profile]);

  // Update countdown timer
  useEffect(() => {
    if (!resetTimestamp) return;

    const updateCountdown = () => {
      const now = Date.now();
      const reset = new Date(resetTimestamp).getTime();
      const diff = reset - now;

      if (diff <= 0) {
        setCountdown('Resetting...');
        // Refresh profile to get updated weekly count
        onRefresh();
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) {
        setCountdown(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setCountdown(`${hours}h ${minutes}m`);
      } else {
        setCountdown(`${minutes}m ${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [resetTimestamp, onRefresh]);

  // Button pulse animation every 5 seconds
  useEffect(() => {
    if (weeklyGems >= 500) return; // Don't pulse if limit reached

    const pulseInterval = setInterval(() => {
      setButtonPulse(true);
      setTimeout(() => setButtonPulse(false), 500);
    }, 5000);

    return () => clearInterval(pulseInterval);
  }, [weeklyGems]);

  const isLimitReached = weeklyGems >= 500;
  const isAvailable = adService.isAdAvailable(placement);
  const isAdLoaded = adService.isLoaded();
  const cooldownString = adService.getCooldownString(placement);
  const progressPercent = Math.min((weeklyGems / 500) * 100, 100);

  const handleWatchAd = async () => {
    if (!isAvailable || adState !== 'idle' || !profile || !isAdLoaded) {
      console.warn('Store: Ad button clicked but not available. State:', { isAvailable, adState, hasProfile: !!profile, isAdLoaded });
      return;
    }

    try {
      console.log('Store: Starting to show ad, placement:', placement);
      const adShown = await adService.showRewardedAd(placement, async (amount) => {
        // Call secure RPC function that uses auth.uid() server-side
        console.log('Store: Reward callback triggered, amount:', amount);
        console.log('Store: About to call claimAdRewardGems...');
        try {
          // Add timeout to prevent hanging
          const result = await Promise.race([
            claimAdRewardGems(),
            new Promise<{ success: false; error: string }>((resolve) => 
              setTimeout(() => resolve({ success: false, error: 'Request timeout after 10 seconds' }), 10000)
            )
          ]);
          console.log('Store: claimAdRewardGems result:', result);
          console.log('Store: Result success:', result.success, 'Error:', result.error);
          
          if (result.success) {
          // Play success sound
          audioService.playPurchase();
          
          // Update weekly gem total
          if (result.weeklyGems !== undefined) {
            console.log('Store: Updating weekly gems from', previousWeeklyGems, 'to', result.weeklyGems);
            const wasUnderCap = previousWeeklyGems < 500;
            const nowAtCap = result.weeklyGems >= 500;
            
            setWeeklyGems(result.weeklyGems);
            setPreviousWeeklyGems(result.weeklyGems);
            
            // Show cap transition toast if user just hit the cap
            if (wasUnderCap && nowAtCap && result.hitCap) {
              setToastMessage('Gem Limit Reached - Earning Gold Now!');
              setToastType('success');
              setShowToast(true);
            }
          } else {
            console.warn('Store: No weeklyGems in result:', result);
          }
          
          // Handle reward display based on type
          if (result.rewardType === 'gems' && result.newGemBalance !== undefined) {
            console.log('Store: Showing gem reward modal, amount:', result.rewardAmount || 20);
            setRewardAmount(result.rewardAmount || 20);
            setRewardType('gems');
            setShowSuccessModal(true);
            onGemRain();
          } else if (result.rewardType === 'coins' && result.newCoinBalance !== undefined) {
            console.log('Store: Showing coin reward toast, amount:', result.rewardAmount || 50);
            setRewardAmount(result.rewardAmount || 50);
            setRewardType('coins');
            setToastMessage(`Gold secured! +${result.rewardAmount || 50} Coins`);
            setToastType('success');
            setShowToast(true);
          } else {
            console.warn('Store: No valid reward type in result:', result);
          }
          
          // Refresh profile to get updated balances
          console.log('Store: Calling onRefresh to update profile');
          onRefresh();
          
          // Set state to rewarded
          setAdState('rewarded');
          
          // Reset to idle after a moment
          setTimeout(() => {
            setAdState('idle');
          }, 2000);
        } else {
          // Handle cooldown or other errors
          console.error('Store: claimAdRewardGems failed:', result.error);
          if (result.error === 'Cooldown active' && result.cooldownRemaining) {
            setToastMessage(`Please wait ${result.cooldownRemaining}s before claiming again`);
          } else {
            setToastMessage(result.error || 'Failed to process reward');
          }
          setToastType('error');
          setShowToast(true);
          setAdState('error');
          setTimeout(() => {
            setAdState('idle');
          }, 1000);
        }
        } catch (rewardError: any) {
          console.error('Store: Error in reward callback:', rewardError);
          setToastMessage('Failed to process reward. Please try again.');
          setToastType('error');
          setShowToast(true);
          setAdState('error');
          setTimeout(() => {
            setAdState('idle');
          }, 1000);
        }
      }, () => {
        // Early close callback - user closed ad early
        console.log('Store: Ad closed early');
        setToastMessage('Watch the full video to claim your reward!');
        setToastType('error');
        setShowWarningToast(true);
        setAdState('idle');
      });
      
      console.log('Store: showRewardedAd returned:', adShown);
      if (!adShown) {
        console.warn('Store: Ad was not shown successfully');
        setToastMessage('No ads available right now. Take a boba break and try again later!');
        setToastType('error');
        setShowToast(true);
      }
    } catch (error: any) {
      console.error('Store: Ad error:', error);
      setToastMessage(error.message || 'Failed to process ad reward. Please try again.');
      setToastType('error');
      setShowToast(true);
      setAdState('error');
      setTimeout(() => {
        setAdState('idle');
      }, 1000);
    }
  };

  return (
    <>
      <div className="relative group bg-gradient-to-br from-pink-500/20 via-pink-600/15 to-purple-500/20 backdrop-blur-xl border-2 border-pink-500/30 rounded-2xl sm:rounded-3xl p-4 sm:p-5 overflow-hidden shadow-[0_0_40px_rgba(236,72,153,0.3)] hover:shadow-[0_0_60px_rgba(236,72,153,0.5)] transition-all duration-500">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
        
        <div className="relative z-10 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-pink-500/40 to-purple-500/40 flex items-center justify-center shadow-lg">
                {!isAdLoaded ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <CurrencyIcon type="GEMS" size="md" />
                )}
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white mb-1">Free Gems Allowance</h3>
                <p className="text-xs sm:text-sm text-white/70">
                  {!isAdLoaded ? 'Loading ad...' : 
                   isLimitReached ? 'Weekly gem limit reached - earning Gold now!' : 
                   'Watch a video to earn rewards'}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <button
                onClick={handleWatchAd}
                disabled={!isAvailable || adState !== 'idle' || !isAdLoaded}
                className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold text-sm sm:text-base transition-all duration-300 min-h-[48px] touch-manipulation ${
                  !isAvailable || adState !== 'idle' || !isAdLoaded
                    ? 'bg-white/10 border border-white/20 text-white/50 cursor-not-allowed'
                    : `bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg hover:scale-105 hover:shadow-xl ${
                        buttonPulse ? 'animate-pulse' : ''
                      }`
                }`}
              >
                {!isAdLoaded ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Loading...
                  </span>
                ) : adState === 'loading' ? 'Loading...' : 
                   adState === 'playing' ? 'Watching Ad...' : 
                   adState === 'rewarded' ? 'Rewarded!' :
                   !isAvailable ? cooldownString : 
                   isLimitReached ? 'Watch for 50 Coins' : 'Watch for 20 Gems'}
              </button>
              {isAvailable && adState === 'idle' && (
                <span className="text-[10px] sm:text-xs text-white/60 font-medium">
                  Weekly Gem Limit: {weeklyGems}/500
                </span>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-white/70 font-medium">
                {weeklyGems} / 500 gems this week
              </span>
              {resetTimestamp && (
                <span className="text-white/50">
                  Resets in: {countdown}
                </span>
              )}
            </div>
            <div className="relative h-3 sm:h-4 bg-white/10 rounded-full overflow-hidden">
              <div 
                className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
                  isLimitReached 
                    ? 'bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 shadow-[0_0_20px_rgba(251,191,36,0.6)]' 
                    : 'bg-gradient-to-r from-pink-500 to-purple-600'
                }`}
                style={{ width: `${progressPercent}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && rewardType === 'gems' && (
        <AdRewardSuccessModal
          gemAmount={rewardAmount}
          onClose={() => setShowSuccessModal(false)}
          remoteEmotes={remoteEmotes}
        />
      )}

      {/* Toast Notification */}
      {showToast && (
        <Toast
          message={toastMessage}
          onClose={() => setShowToast(false)}
          type={toastType}
        />
      )}

      {/* Warning Toast for Early Ad Closure */}
      {showWarningToast && (
        <Toast
          message="Watch the full video to claim your gems!"
          type="error"
          onClose={() => setShowWarningToast(false)}
        />
      )}

      {/* Shimmer Animation */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}} />
    </>
  );
};

// Pack Purchase Success Modal with Chaos Animation
interface PackPurchaseSuccessModalProps {
  packName: string;
  finisherKeys: string[];
  finishers: Finisher[];
  remoteEmotes: Emote[];
  onClose: () => void;
}

const PackPurchaseSuccessModal: React.FC<PackPurchaseSuccessModalProps> = ({
  packName,
  finisherKeys,
  finishers,
  remoteEmotes,
  onClose
}) => {
  const [phase, setPhase] = useState<'entrance' | 'chaos' | 'display'>('entrance');
  const [replayKeys, setReplayKeys] = useState<Record<string, number>>({});

  useEffect(() => {
    // Entrance animation
    const entranceTimer = setTimeout(() => setPhase('chaos'), 300);
    // Chaos phase lasts longer for all finishers to play
    const chaosTimer = setTimeout(() => setPhase('display'), 6000);
    
    // Auto-close after 8 seconds
    const autoCloseTimer = setTimeout(() => {
      onClose();
    }, 8000);

    return () => {
      clearTimeout(entranceTimer);
      clearTimeout(chaosTimer);
      clearTimeout(autoCloseTimer);
    };
  }, [onClose]);

  const renderFinisher = (key: string, index: number) => {
    const replayKey = replayKeys[key] || 0;
    const finisher = finishers.find(f => f.animation_key === key);

    // Position each finisher in different areas of the screen for chaos effect
    const positions = [
      { top: '10%', left: '10%', transform: 'scale(0.8)' },
      { top: '10%', right: '10%', transform: 'scale(0.8)' },
      { bottom: '20%', left: '50%', transform: 'translateX(-50%) scale(0.8)' },
    ];

    const position = positions[index % positions.length] || positions[0];

    if (key === 'shiba_slam') {
      return (
        <div key={`${key}-${replayKey}`} className="absolute" style={position}>
          <ShibaSlamFinisher
            onComplete={() => {}}
            isPreview={true}
            winnerName="GUEST"
          />
        </div>
      );
    } else if (key === 'ethereal_blade') {
      return (
        <div key={`${key}-${replayKey}`} className="absolute" style={position}>
          <EtherealBladeFinisher
            onComplete={() => {}}
            isPreview={true}
            winnerName="GUEST"
          />
        </div>
      );
    } else if (key === 'salt_shaker') {
      return (
        <div key={`${key}-${replayKey}`} className="absolute" style={position}>
          <SaltShakeFinisher
            onComplete={() => {}}
            isPreview={true}
            winnerName="GUEST"
          />
        </div>
      );
    } else if (key === 'sanctum_snap') {
      return (
        <div key={`${key}-${replayKey}`} className="absolute" style={position}>
          <SanctumSnapFinisher
            onComplete={() => {}}
            isPreview={true}
            winnerName="GUEST"
          />
        </div>
      );
    } else if (key === 'seductive_finish') {
      return (
        <div key={`${key}-${replayKey}`} className="absolute" style={position}>
          <SeductiveFinishFinisher
            onComplete={() => {}}
            isPreview={true}
            winnerName="GUEST"
          />
        </div>
      );
    } else if (key === 'kiss_my_shiba') {
      return (
        <div key={`${key}-${replayKey}`} className="absolute" style={position}>
          <KissMyShibaFinisher
            onComplete={() => {}}
            isPreview={true}
            winnerName="GUEST"
          />
        </div>
      );
    }
    return null;
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/90 backdrop-blur-sm transition-opacity duration-500"
        onClick={onClose}
      />

      {/* Chaos Finisher Animations - All playing at once */}
      {phase === 'chaos' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {finisherKeys.map((key, index) => renderFinisher(key, index))}
        </div>
      )}

      {/* Success Modal */}
      <div 
        className={`relative z-10 bg-gradient-to-br from-[#0a0a0a] via-[#050505] to-[#000000] border-2 border-pink-500/60 rounded-3xl sm:rounded-[3rem] p-6 sm:p-8 w-full max-w-2xl shadow-[0_0_150px_rgba(236,72,153,0.8)] overflow-hidden ${
          phase === 'entrance' 
            ? 'scale-0 opacity-0' 
            : phase === 'chaos'
            ? 'scale-105 opacity-100 animate-pulse'
            : 'scale-100 opacity-100'
        } transition-all duration-500`}
        onClick={e => e.stopPropagation()}
      >
        {/* Background Glow Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(236,72,153,0.3)_0%,transparent_70%)]"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 via-purple-500/20 to-pink-500/20"></div>
        
        {/* Animated Border Glow */}
        <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500 rounded-3xl sm:rounded-[3rem] opacity-60 blur-xl animate-pulse"></div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center gap-4 sm:gap-6">
          {/* Success Icon */}
          <div className={`relative ${
            phase === 'chaos' 
              ? 'scale-150 rotate-12' 
              : 'scale-100 rotate-0'
          } transition-all duration-500`}>
            <div className="absolute inset-0 bg-pink-500/40 blur-2xl rounded-full animate-pulse"></div>
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 bg-gradient-to-br from-pink-400 to-purple-600 rounded-full flex items-center justify-center border-4 border-pink-300 shadow-[0_0_60px_rgba(236,72,153,1)]">
              <svg 
                className="w-14 h-14 sm:w-16 sm:h-16 text-white" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={3} 
                  d="M5 13l4 4L19 7" 
                />
              </svg>
            </div>
          </div>

          {/* Success Message */}
          <div className="space-y-2">
            <h2 className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-pink-400 via-purple-400 to-pink-500 uppercase tracking-tight drop-shadow-[0_0_30px_rgba(236,72,153,0.8)]">
              Pack Unlocked!
            </h2>
            <p className="text-lg sm:text-xl text-white/80 font-semibold">
              {packName}
            </p>
            <p className="text-sm sm:text-base text-white/60 font-medium">
              All finishers are now in your collection!
            </p>
          </div>

          {/* Finisher Icons Grid */}
          <div className="flex gap-4 flex-wrap justify-center py-4">
            {finisherKeys.map(key => {
              const finisher = finishers.find(f => f.animation_key === key);
              return (
                <div
                  key={key}
                  className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center border-2 border-pink-500/50 bg-pink-500/10"
                >
                  {finisher?.animation_key === 'shiba_slam' ? (
                    <ShibaSlamIcon className="w-full h-full p-2" remoteEmotes={remoteEmotes} />
                  ) : finisher?.animation_key === 'ethereal_blade' ? (
                    <EtherealBladeIcon className="w-full h-full p-2" />
                  ) : finisher?.animation_key === 'seductive_finish' ? (
                    <VisualEmote trigger=":heart_eyes:" remoteEmotes={remoteEmotes} size="lg" />
                  ) : finisher?.animation_key === 'sanctum_snap' ? (
                    <VisualEmote trigger=":chinese:" remoteEmotes={remoteEmotes} size="lg" />
                  ) : finisher?.animation_key === 'kiss_my_shiba' ? (
                    <VisualEmote trigger=":shiba_butt:" remoteEmotes={remoteEmotes} size="lg" />
                  ) : (
                    <div className="text-3xl">⚔️</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="mt-2 px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold uppercase tracking-wide rounded-xl shadow-[0_0_30px_rgba(236,72,153,0.6)] hover:shadow-[0_0_40px_rgba(236,72,153,0.8)] transition-all duration-300 hover:scale-105"
          >
            Epic!
          </button>
        </div>
      </div>
    </div>
  );
};

export const Store: React.FC<{
  onClose: () => void; profile: UserProfile | null; onRefreshProfile: () => void;
  onEquipSleeve: (sleeve: CardCoverStyle) => void; currentSleeve: CardCoverStyle;
  playerAvatar: string; onEquipAvatar: (avatar: string) => void;
  currentTheme: BackgroundTheme; onEquipBoard: (theme: BackgroundTheme) => void;
  isGuest?: boolean; initialTab?: 'SLEEVES' | 'EMOTES' | 'BOARDS' | 'ITEMS' | 'FINISHERS' | 'DEALS' | 'QUICK_CHATS';
  onOpenGemPacks?: () => void;
}> = ({ onClose, profile, onRefreshProfile, onEquipSleeve, currentSleeve, playerAvatar, onEquipAvatar, currentTheme, onEquipBoard, isGuest, initialTab = 'SLEEVES', onOpenGemPacks }) => {
  // Inject premium finisher animations
  useEffect(() => {
    const styleId = 'premium-finisher-styles';
    if (!document.getElementById(styleId)) {
      const styleSheet = document.createElement('style');
      styleSheet.id = styleId;
      styleSheet.textContent = `
        @keyframes premium-shimmer {
          0% { transform: translateX(-100%) skewX(-15deg); }
          100% { transform: translateX(200%) skewX(-15deg); }
        }
        @keyframes premium-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
        }
        @keyframes premium-pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.05); }
        }
        @keyframes premium-border-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }
        @keyframes premium-badge-pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.1); }
        }
        @keyframes premium-glow {
          0%, 100% { opacity: 0.3; filter: brightness(1); }
          50% { opacity: 0.6; filter: brightness(1.2); }
        }
        @keyframes premium-icon-float {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-2px) scale(1.02); }
        }
        @keyframes premium-inner-shimmer-amber {
          0% { transform: translateX(-100%) skewX(-15deg); }
          100% { transform: translateX(200%) skewX(-15deg); }
        }
        @keyframes premium-inner-shimmer-pink {
          0% { transform: translateX(-100%) skewX(-15deg); }
          100% { transform: translateX(200%) skewX(-15deg); }
        }
        @keyframes premium-inner-shimmer-blue {
          0% { transform: translateX(-100%) skewX(-15deg); }
          100% { transform: translateX(200%) skewX(-15deg); }
        }
        .animate-premium-shimmer {
          animation: premium-shimmer 3s ease-in-out infinite;
        }
        .animate-premium-float {
          animation: premium-float 4s ease-in-out infinite;
        }
        .animate-premium-pulse {
          animation: premium-pulse 3s ease-in-out infinite;
        }
        .animate-premium-border-pulse {
          animation: premium-border-pulse 2s ease-in-out infinite;
        }
        .animate-premium-badge-pulse {
          animation: premium-badge-pulse 2s ease-in-out infinite;
        }
        .animate-premium-glow {
          animation: premium-glow 3s ease-in-out infinite;
        }
        .animate-premium-icon-float {
          animation: premium-icon-float 3s ease-in-out infinite;
        }
        .animate-premium-inner-shimmer-amber {
          animation: premium-inner-shimmer-amber 4s ease-in-out infinite;
        }
        .animate-premium-inner-shimmer-pink {
          animation: premium-inner-shimmer-pink 4s ease-in-out infinite;
        }
        .animate-premium-inner-shimmer-blue {
          animation: premium-inner-shimmer-blue 4s ease-in-out infinite;
        }
        @keyframes chat-wiggle {
          0%, 100% { transform: rotate(0deg) translateY(0px); }
          25% { transform: rotate(-2deg) translateY(-2px); }
          75% { transform: rotate(2deg) translateY(-2px); }
        }
        .animate-chat-wiggle {
          animation: chat-wiggle 2s ease-in-out infinite;
        }
        @keyframes chat-shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes chat-heartbeat {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        .chat-shimmer {
          background: linear-gradient(90deg, #eab308 0%, #f97316 50%, #eab308 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: chat-shimmer 2s linear infinite;
        }
        .chat-heartbeat {
          animation: chat-heartbeat 1.5s ease-in-out infinite;
        }
        .chat-wiggle {
          animation: chat-wiggle 0.1s infinite;
        }
      `;
      document.head.appendChild(styleSheet);
    }
  }, []);

  const [activeTab, setActiveTab] = useState<'SLEEVES' | 'EMOTES' | 'BOARDS' | 'ITEMS' | 'FINISHERS' | 'DEALS' | 'QUICK_CHATS'>(initialTab as any);
  const [chatPresets, setChatPresets] = useState<ChatPreset[]>([]);
  const [previewingChat, setPreviewingChat] = useState<ChatPreset | null>(null);
  const [pendingPurchase, setPendingPurchase] = useState<any>(null);
  const [applyVoucher, setApplyVoucher] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);
  const [remoteEmotes, setRemoteEmotes] = useState<Emote[]>([]);
  const [finishers, setFinishers] = useState<Finisher[]>([]);
  const [showSleevePreview, setShowSleevePreview] = useState(false);
  const [showBoardPreview, setShowBoardPreview] = useState(false);
  const [showFinisherPreview, setShowFinisherPreview] = useState(false);
  const [previewingFinisher, setPreviewingFinisher] = useState<Finisher | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successModalData, setSuccessModalData] = useState<{
    itemName: string;
    itemType: 'SLEEVES' | 'EMOTES' | 'BOARDS' | 'ITEMS' | 'FINISHERS' | 'QUICK_CHATS';
    price: number;
    currency: 'GOLD' | 'GEMS';
    style?: CardCoverStyle;
    themeId?: BackgroundTheme;
    avatarTrigger?: string;
  } | null>(null);
  const [density, setDensity] = useState<1 | 2 | 4>(2);
  const [hideUnowned, setHideUnowned] = useState(false);
  const [showDealsOnly, setShowDealsOnly] = useState(false);
  const [showGemRain, setShowGemRain] = useState(false);
  const [showAdPrompt, setShowAdPrompt] = useState(false);
  const [adState, setAdState] = useState<'idle' | 'loading' | 'playing' | 'rewarded' | 'error'>('idle');
  const [dailyDealSleeveId, setDailyDealSleeveId] = useState<string | null>(null);
  const [dealTimeRemaining, setDealTimeRemaining] = useState<{ hours: number; minutes: number; seconds: number }>({ hours: 0, minutes: 0, seconds: 0 });
  const [showUpsellModal, setShowUpsellModal] = useState<{ packName: string; packPrice: number; itemPrice: number; difference: number; finisherId: string } | null>(null);
  const [showPackSuccessModal, setShowPackSuccessModal] = useState<{ packName: string; finisherKeys: string[] } | null>(null);
  const [showPackPreview, setShowPackPreview] = useState<{ packId: string } | null>(null);

  useEffect(() => {
    const unsubscribe = adService.onStateChange('shop', setAdState);
    return unsubscribe;
  }, []);

  // Initialize Daily Deal
  useEffect(() => {
    const dealId = getDailyDealSleeve();
    setDailyDealSleeveId(dealId);
    
    // Update countdown timer every second
    const updateTimer = () => {
      setDealTimeRemaining(getDailyDealTimeRemaining());
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  // Reset deals filter when switching tabs
  useEffect(() => {
    if (activeTab !== 'SLEEVES') {
      setShowDealsOnly(false);
    }
  }, [activeTab]);

  // SECURITY: Refresh profile from database when Store opens to prevent fake gem balances
  useEffect(() => {
    if (profile && !isGuest) {
      onRefreshProfile();
    }
  }, []); // Run once when Store opens


  // Hard Lock: Prevent multiple simultaneous fetches during re-renders
  const isFetchingEmotesRef = useRef(false);
  const isFetchingFinishersRef = useRef(false);
  const isFetchingChatPresetsRef = useRef(false);
  const emotesFetchedRef = useRef(false);
  const finishersFetchedRef = useRef(false);
  const chatPresetsFetchedRef = useRef(false);

  useEffect(() => { 
    // HARD LOCK: Fetch emotes only once, prevent multiple simultaneous fetches
    if (!emotesFetchedRef.current && !isFetchingEmotesRef.current && typeof fetchEmotes === 'function') {
      isFetchingEmotesRef.current = true;
      console.log('🛍️ Store: Fetching emotes...');
      fetchEmotes(true)
        .then((emotes) => {
          console.log(`🛍️ Store: Loaded ${emotes?.length || 0} emotes from Supabase`);
          if (emotes && emotes.length > 0) {
            console.log('📋 Emote triggers:', emotes.map(e => e.trigger_code));
            console.log('📋 Emote file paths:', emotes.map(e => e.file_path));
          }
          setRemoteEmotes(emotes || []);
          emotesFetchedRef.current = true;
        })
        .catch((err: any) => {
          // Silently handle AbortError - will retry on next render if needed
          if (err?.name === 'AbortError' || err?.message?.includes('aborted')) {
            console.warn('Store: Emotes fetch aborted (will retry on next render)');
            emotesFetchedRef.current = false; // Allow retry
          } else {
            console.error('❌ Store: Error fetching emotes:', err);
            setRemoteEmotes([]);
          }
        })
        .finally(() => {
          isFetchingEmotesRef.current = false;
        });
    }
    
    // HARD LOCK: Fetch finishers only once, prevent multiple simultaneous fetches
    if (!finishersFetchedRef.current && !isFetchingFinishersRef.current && typeof fetchFinishers === 'function') {
      isFetchingFinishersRef.current = true;
      console.log('⚔️ Store: Fetching finishers...');
      fetchFinishers()
        .then((finishersData) => {
          console.log(`⚔️ Store: Loaded ${finishersData?.length || 0} finishers from Supabase`);
          setFinishers(finishersData || []);
          finishersFetchedRef.current = true;
        })
        .catch((err: any) => {
          // Silently handle AbortError - will retry on next render if needed
          if (err?.name === 'AbortError' || err?.message?.includes('aborted')) {
            console.warn('Store: Finishers fetch aborted (will retry on next render)');
            finishersFetchedRef.current = false; // Allow retry
          } else {
            console.error('❌ Store: Error fetching finishers:', err);
            setFinishers([]);
          }
        })
        .finally(() => {
          isFetchingFinishersRef.current = false;
        });
    }
    
    // HARD LOCK: Fetch chat presets only once, prevent multiple simultaneous fetches
    if (!chatPresetsFetchedRef.current && !isFetchingChatPresetsRef.current && typeof fetchChatPresets === 'function') {
      isFetchingChatPresetsRef.current = true;
      console.log('💬 Store: Fetching chat presets...');
      fetchChatPresets()
        .then((presets) => {
          console.log(`💬 Store: Loaded ${presets?.length || 0} chat presets from Supabase`);
          setChatPresets(presets || []);
          chatPresetsFetchedRef.current = true;
        })
        .catch((err: any) => {
          // Silently handle AbortError - will retry on next render if needed
          if (err?.name === 'AbortError' || err?.message?.includes('aborted')) {
            console.warn('Store: Chat presets fetch aborted (will retry on next render)');
            chatPresetsFetchedRef.current = false; // Allow retry
          } else {
            console.error('❌ Store: Error fetching chat presets:', err);
            setChatPresets([]);
          }
        })
        .finally(() => {
          isFetchingChatPresetsRef.current = false;
        });
    }
  }, []); // Only run once on mount

  const hasVoucher = useMemo(() => (profile?.inventory?.items['GENERAL_10_OFF'] || 0) > 0, [profile]);

  const executePurchase = async () => {
    if (!pendingPurchase || !profile || buying) return;
    
    // Check if user can afford the item
    if (!pendingPurchase.unlocked) {
      const finalPrice = applyVoucher && hasVoucher ? Math.floor(pendingPurchase.price * 0.9) : pendingPurchase.price;
      const currency = pendingPurchase.currency || 'GOLD';
      const hasEnough = currency === 'GEMS' 
        ? (profile.gems || 0) >= finalPrice
        : (profile.coins || 0) >= finalPrice;
      
      if (!hasEnough) {
        if (currency === 'GEMS') {
        // Show ad prompt popup
        setShowAdPrompt(true);
        }
        return;
      }
    }
    
    if (pendingPurchase.unlocked) {
        // Just equip if already unlocked
        if (pendingPurchase.type === 'SLEEVE') onEquipSleeve(pendingPurchase.style);
        else if (pendingPurchase.type === 'AVATAR') onEquipAvatar(pendingPurchase.id);
        else if (pendingPurchase.type === 'BOARD') onEquipBoard(pendingPurchase.id);
        else if (pendingPurchase.type === 'FINISHER' && pendingPurchase.animation_key) {
          await equipFinisher(profile.id, pendingPurchase.animation_key);
          onRefreshProfile();
        }
        else if (pendingPurchase.type === 'QUICK_CHAT') {
          // Quick chats don't need to be equipped, just unlocked
          onRefreshProfile();
        }
        // Show success modal for equip action
        setSuccessModalData({
          itemName: pendingPurchase.name,
          itemType: pendingPurchase.type === 'SLEEVE' ? 'SLEEVES' : 
                    pendingPurchase.type === 'AVATAR' ? 'EMOTES' :
                    pendingPurchase.type === 'BOARD' ? 'BOARDS' : 'FINISHERS',
          price: 0,
          currency: pendingPurchase.currency || 'GOLD',
          style: pendingPurchase.type === 'SLEEVE' ? pendingPurchase.style : undefined,
          themeId: pendingPurchase.type === 'BOARD' ? pendingPurchase.id as BackgroundTheme : undefined,
          avatarTrigger: pendingPurchase.type === 'AVATAR' ? pendingPurchase.id : undefined,
        });
        setPendingPurchase(null);
        setShowSuccessModal(true);
        return;
    }

    const originalPrice = pendingPurchase.price;
    const finalPrice = applyVoucher ? Math.floor(originalPrice * 0.9) : originalPrice;
    
    setBuying(pendingPurchase.id);
    try {
      if (applyVoucher) {
        const inv = profile.inventory || { items: {}, active_boosters: {} };
        const updates: Partial<UserProfile> = {
          inventory: { ...inv, items: { ...inv.items, 'GENERAL_10_OFF': inv.items['GENERAL_10_OFF'] - 1 } }
        };
        await updateProfileSettings(profile.id, updates);
      }
      if (pendingPurchase.type === 'PACK') {
        // For Gem Bundles: Use increment_gems to add gems directly
        // Map bundle prices to gem amounts (100, 550, or 1200 gems)
        const gemAmountMap: Record<number, number> = {
          100: 100,
          550: 550,
          1200: 1200
        };
        
        // Check if this is a gem bundle purchase (simple gem addition)
        const gemAmount = gemAmountMap[finalPrice];
        
        if (gemAmount) {
          // This is a gem bundle - process gem transaction with iap_purchase source
          const result = await processGemTransaction(profile.id, gemAmount, 'iap_purchase');
          
          if (result.success && result.newGemBalance !== undefined) {
            audioService.playPurchase();
            
            // Show success toast
            setToastMessage(`Successfully added ${gemAmount} gems!`);
            setShowToast(true);
            
            // Refresh profile immediately to update gem counter in header
            // This ensures the gem count is fetched fresh from database
            await onRefreshProfile();
            
            setPendingPurchase(null);
            setShowSuccessModal(false);
          } else {
            console.error('Failed to add gems:', result.error);
            setToastMessage(result.error || 'Failed to add gems');
            setShowToast(true);
          }
        } else {
          // Regular pack purchase (unlocks items) - use buyPack function
          const packItems = pendingPurchase.items || [];
          const success = await buyPack(profile.id, packItems, finalPrice);
          
          if (success) {
            audioService.playPurchase();
            
            // Also unlock phrases associated with this bundle
            const packId = pendingPurchase.packId;
            if (packId) {
              const bundlePhrases = chatPresets.filter(p => p.bundle_id === packId);
              if (bundlePhrases.length > 0) {
                const unlockedPhrases = [...(profile.unlocked_phrases || [])];
                bundlePhrases.forEach(phrase => {
                  if (!unlockedPhrases.includes(phrase.id)) {
                    unlockedPhrases.push(phrase.id);
                  }
                });
                await updateProfileSettings(profile.id, { unlocked_phrases: unlockedPhrases });
              }
            }
            
            // Show premium pack success modal with chaos animation
            const finisherKeys = packItems
              .filter(item => item.type === 'FINISHER' && !isItemOwned(item))
              .map(item => item.id);
            
            setShowPackSuccessModal({
              packName: pendingPurchase.name,
              finisherKeys: finisherKeys
            });
            setPendingPurchase(null);
            onRefreshProfile();
          } else {
            console.error('Failed to purchase pack');
          }
        }
      } else if (pendingPurchase.type === 'FINISHER') {
        const success = await buyFinisher(profile.id, pendingPurchase.id);
        if (success) {
          audioService.playPurchase();
          // Show success modal
          setSuccessModalData({
            itemName: pendingPurchase.name,
            itemType: 'FINISHERS',
            price: finalPrice,
            currency: pendingPurchase.currency || 'GEMS',
          });
          setPendingPurchase(null);
          setShowSuccessModal(true);
          onRefreshProfile();
        } else {
          console.error('Failed to purchase finisher');
        }
      } else if (pendingPurchase.type === 'QUICK_CHAT') {
        // First process the gem transaction (negative amount for deduction)
        const transactionResult = await processGemTransaction(
          profile.id,
          -finalPrice, // Negative amount for deduction
          'shop_buy',
          pendingPurchase.id // item_id
        );
        
        if (!transactionResult.success) {
          throw new Error(transactionResult.error || 'Failed to process transaction');
        }
        
        // Then unlock the phrase
        const success = await purchasePhrase(profile.id, pendingPurchase.id);
        if (success) {
          audioService.playPurchase();
          // Show success modal
          setSuccessModalData({
            itemName: pendingPurchase.name,
            itemType: 'QUICK_CHATS',
            price: finalPrice,
            currency: pendingPurchase.currency || 'GEMS',
          });
          setPendingPurchase(null);
          setShowSuccessModal(true);
          onRefreshProfile();
        } else {
          console.error('Failed to purchase phrase');
          throw new Error('Failed to unlock phrase');
        }
      } else {
        await buyItem(profile.id, finalPrice, pendingPurchase.id, pendingPurchase.type, !!isGuest, pendingPurchase.currency);
        audioService.playPurchase();
        
        // Show success modal with item details
        setSuccessModalData({
          itemName: pendingPurchase.name,
          itemType: pendingPurchase.type === 'SLEEVE' ? 'SLEEVES' : 
                    pendingPurchase.type === 'AVATAR' ? 'EMOTES' :
                    pendingPurchase.type === 'BOARD' ? 'BOARDS' : 'ITEMS',
          price: finalPrice,
          currency: pendingPurchase.currency || 'GOLD',
          style: pendingPurchase.type === 'SLEEVE' ? pendingPurchase.style : undefined,
          themeId: pendingPurchase.type === 'BOARD' ? pendingPurchase.id as BackgroundTheme : undefined,
          avatarTrigger: pendingPurchase.type === 'AVATAR' ? pendingPurchase.id : undefined,
        });
        setPendingPurchase(null);
        setShowSuccessModal(true);
        onRefreshProfile();
      }
    } catch (err) { console.error(err); } finally { setBuying(null); }
  };

  const getItemIcon = (id: string, type: string) => {
    if (id.includes('XP')) return <XpBoosterIcon />;
    if (id.includes('GOLD')) return <GoldBoosterIcon />;
    if (type === 'VOUCHER' || id.includes('OFF')) return <VoucherIcon />;
    if (id.includes('UNDO')) return <UndoIcon />;
    if (id.includes('PACK') || id.includes('BOOSTER_PACK')) return <CardPackIcon />;
    if (id.includes('STREAK')) return <StreakProtectionIcon />;
    if (id.includes('DAILY') || id.includes('BONUS')) return <DailyBonusIcon />;
    if (id.includes('COMBO') || id.includes('HINT')) return <ComboHintIcon />;
    return <span className="text-4xl">📦</span>;
  };

  // Helper function to check if an item is owned
  const isItemOwned = (item: { type: 'FINISHER' | 'EMOTE' | 'BOARD' | 'SLEEVE'; id: string }): boolean => {
    if (item.type === 'FINISHER') {
      return profile?.unlocked_finishers?.includes(item.id) || false;
    } else if (item.type === 'EMOTE') {
      return profile?.unlocked_avatars?.includes(item.id) || false;
    } else if (item.type === 'BOARD') {
      return profile?.unlocked_boards?.includes(item.id) || false;
    } else if (item.type === 'SLEEVE') {
      return profile?.unlocked_sleeves?.includes(item.id) || false;
    }
    return false;
  };

  // Helper function to check if a pack is fully owned
  const isPackOwned = (pack: DealPack): boolean => {
    return pack.items.every(item => isItemOwned(item));
  };

  const renderFinisherCard = (finisher: Finisher, uniqueKey: string) => {
    const unlocked = profile?.unlocked_finishers?.includes(finisher.animation_key) || false;
    const isEquipped = profile?.equipped_finisher === finisher.animation_key;

    // Check if this finisher is part of a pack
    const pack = DEAL_PACKS.find(p => p.items.some(item => item.type === 'FINISHER' && item.id === finisher.animation_key));
    const packOwned = pack ? isPackOwned(pack) : false;
    const packPrice = pack ? pack.bundlePrice : 0;
    const difference = pack && !packOwned ? packPrice - finisher.price : 0;

    return (
      <div 
        key={uniqueKey}
        onClick={() => {
          // Show upsell if finisher is part of a pack, not owned, and pack is not fully owned
          if (pack && !unlocked && !packOwned && difference > 0) {
            setShowUpsellModal({
              packName: pack.name,
              packPrice: packPrice,
              itemPrice: finisher.price,
              difference: difference,
              finisherId: finisher.id
            });
            return;
          }
          
          setPendingPurchase({ 
            id: finisher.id,
            name: finisher.name,
            description: `A legendary cinematic finisher that plays when you win a match. Feel the main character energy.`,
            price: finisher.price,
            currency: 'GEMS',
            type: 'FINISHER',
            animation_key: finisher.animation_key,
            unlocked,
            equipped: isEquipped
          });
        }} 
        className="relative group bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-white/[0.08] border-2 border-white/20 rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col items-center transition-all duration-500 hover:border-yellow-500/60 hover:bg-gradient-to-br hover:from-white/[0.15] hover:via-white/[0.08] hover:to-white/[0.15] hover:shadow-[0_0_60px_rgba(251,191,36,0.4)] cursor-pointer h-full overflow-hidden animate-premium-float"
      >
        {/* Premium Shimmer Effect - Always visible but subtle */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl sm:rounded-3xl">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-premium-shimmer"></div>
        </div>
        
        {/* Premium Background Effects - Enhanced */}
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/8 via-transparent to-pink-500/8 opacity-60 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.08)_0%,transparent_70%)] opacity-40 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="absolute -inset-10 bg-gradient-to-br from-yellow-500/15 via-transparent to-pink-500/15 blur-3xl rounded-full opacity-30 group-hover:opacity-100 transition-opacity duration-700 animate-premium-pulse"></div>
        
        {/* Premium Border Glow - Pulsing */}
        <div className="absolute -inset-0.5 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-yellow-500/20 via-pink-500/20 to-yellow-500/20 opacity-40 group-hover:opacity-80 transition-opacity duration-500 blur-sm animate-premium-border-pulse"></div>
        
        {/* Premium Badge Indicator */}
        <div className="absolute top-2 right-2 z-20 opacity-70 group-hover:opacity-100 transition-opacity duration-300">
          <div className="relative">
            <div className="absolute inset-0 bg-yellow-500/40 blur-md rounded-full animate-premium-badge-pulse"></div>
            <div className="relative px-2 py-0.5 bg-gradient-to-r from-yellow-500/30 to-pink-500/30 border border-yellow-400/50 rounded-full backdrop-blur-sm">
              <span className="text-[8px] font-black text-yellow-300 uppercase tracking-wider">Premium</span>
            </div>
          </div>
        </div>
        
        <div className="relative z-10 flex flex-col items-center gap-2 sm:gap-3 mb-3 sm:mb-4 w-full">
          {/* Finisher Icon/Preview - Enhanced Premium */}
          <div className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl flex items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.8)] border-2 group-hover:scale-110 transition-all duration-500 overflow-hidden animate-premium-icon-float ${
            finisher.animation_key === 'shiba_slam' 
              ? 'bg-gradient-to-br from-amber-900/50 via-yellow-900/40 to-orange-900/50 border-amber-500/40 group-hover:border-amber-500/70 group-hover:shadow-[0_0_60px_rgba(251,191,36,0.8)]'
              : finisher.animation_key === 'kiss_my_shiba'
              ? 'bg-gradient-to-br from-pink-900/50 via-rose-900/40 to-fuchsia-900/50 border-pink-500/40 group-hover:border-pink-500/70 group-hover:shadow-[0_0_60px_rgba(255,182,193,0.8)]'
              : 'bg-gradient-to-br from-indigo-900/50 via-purple-900/40 to-blue-900/50 border-blue-400/40 group-hover:border-blue-400/70 group-hover:shadow-[0_0_60px_rgba(99,102,241,0.8)]'
          }`}>
            {/* Animated Background Glow - Always visible but subtle */}
            <div className={`absolute inset-0 opacity-30 group-hover:opacity-100 transition-opacity duration-500 animate-premium-glow ${
              finisher.animation_key === 'shiba_slam'
                ? 'bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.5)_0%,transparent_70%)]'
                : finisher.animation_key === 'kiss_my_shiba'
                ? 'bg-[radial-gradient(circle_at_center,rgba(255,182,193,0.5)_0%,transparent_70%)]'
                : 'bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.5)_0%,transparent_70%)]'
            }`}></div>
            {/* Premium Border Glow - Enhanced */}
            <div className={`absolute inset-0 rounded-3xl opacity-40 group-hover:opacity-100 transition-opacity duration-500 ${
              finisher.animation_key === 'shiba_slam'
                ? 'bg-gradient-to-br from-amber-500/30 via-yellow-500/15 to-transparent'
                : finisher.animation_key === 'kiss_my_shiba'
                ? 'bg-gradient-to-br from-pink-500/30 via-rose-500/15 to-transparent'
                : 'bg-gradient-to-br from-blue-500/30 via-indigo-500/15 to-transparent'
            }`}></div>
            {/* Inner Shimmer */}
            <div className="absolute inset-0 rounded-3xl overflow-hidden">
              <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ${
                finisher.animation_key === 'shiba_slam' ? 'animate-premium-inner-shimmer-amber' :
                finisher.animation_key === 'kiss_my_shiba' ? 'animate-premium-inner-shimmer-pink' :
                'animate-premium-inner-shimmer-blue'
              }`}></div>
            </div>
            {/* Custom Icon */}
            <div className="relative z-10 w-full h-full flex items-center justify-center">
              {finisher.animation_key === 'shiba_slam' ? (
                <ShibaSlamIcon className="w-full h-full p-3 sm:p-4" remoteEmotes={remoteEmotes} />
              ) : finisher.animation_key === 'ethereal_blade' ? (
                <EtherealBladeIcon className="w-full h-full p-3 sm:p-4" />
              ) : finisher.animation_key === 'sanctum_snap' ? (
                <VisualEmote trigger=":chinese:" remoteEmotes={remoteEmotes} size="xl" />
              ) : finisher.animation_key === 'seductive_finish' ? (
                <VisualEmote trigger=":heart_eyes:" remoteEmotes={remoteEmotes} size="xl" />
              ) : finisher.animation_key === 'kiss_my_shiba' ? (
                <VisualEmote trigger=":shiba_butt:" remoteEmotes={remoteEmotes} size="xl" />
              ) : (
                <div className="text-5xl sm:text-6xl">⚔️</div>
              )}
            </div>
          </div>
          
          <div className="flex flex-col items-center text-center px-2">
            <span className="text-xs sm:text-sm font-bold text-white/90 uppercase tracking-wide drop-shadow-md">
              {finisher.name}
            </span>
            <span className="text-[9px] sm:text-[10px] text-white/50 uppercase mt-1 font-medium line-clamp-2 leading-tight">
              Legendary Finisher
            </span>
          </div>

          {/* Price/Status */}
          {!unlocked ? (
            <div className="flex items-center gap-1.5 mt-auto">
              <CurrencyIcon type="GEMS" size="xs" />
              <span className="text-sm sm:text-base font-bold text-pink-300">{finisher.price}</span>
            </div>
          ) : (
            <div className="mt-auto">
              {isEquipped ? (
                <div className="px-3 py-1.5 bg-gradient-to-r from-emerald-500/30 to-emerald-600/20 border border-emerald-500/50 rounded-lg text-emerald-300 text-xs font-bold uppercase">
                  Equipped
                </div>
              ) : (
                <div className="px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white/60 text-xs font-bold uppercase">
                  Owned
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Check if phrase is unlocked (either directly or via bundle)
  const isPhraseUnlocked = (phraseId: string, bundleId?: string | null): boolean => {
    if (!profile) return false;
    const unlockedPhrases = profile.unlocked_phrases || [];
    if (unlockedPhrases.includes(phraseId)) return true;
    
    // Check if phrase is in an owned bundle
    if (bundleId) {
      const pack = DEAL_PACKS.find(p => p.id === bundleId);
      if (pack) {
        // Check if all items in the pack are owned
        const allOwned = pack.items.every(item => {
          if (item.type === 'SLEEVE') return profile.unlocked_sleeves?.includes(item.id);
          if (item.type === 'AVATAR') return profile.unlocked_avatars?.includes(item.id);
          if (item.type === 'BOARD') return profile.unlocked_boards?.includes(item.id);
          if (item.type === 'FINISHER') return profile.unlocked_finishers?.includes(item.id);
          if (item.type === 'EMOTE') return profile.unlocked_emotes?.includes(item.id);
          return false;
        });
        return allOwned;
      }
    }
    return false;
  };

  const renderQuickChatCard = (preset: ChatPreset, uniqueKey: string) => {
    const unlocked = isPhraseUnlocked(preset.id, preset.bundle_id);
    const isWiggle = preset.style === 'wiggle';
    
    // Get badge info based on price
    const getBadgeInfo = () => {
      if (preset.price === 100) return { type: 'bronze', label: '100', color: 'from-amber-700 to-amber-900', borderColor: 'border-amber-600/50' };
      if (preset.price === 300) return { type: 'silver', label: '300', color: 'from-gray-400 to-gray-600', borderColor: 'border-gray-400/50' };
      if (preset.price === 500) return { type: 'gold', label: '500', color: 'from-yellow-400 to-yellow-600', borderColor: 'border-yellow-400/50' };
      return { type: 'standard', label: `${preset.price}`, color: 'from-white/20 to-white/10', borderColor: 'border-white/20' };
    };
    
    const badgeInfo = getBadgeInfo();
    
    // Get bundle name if applicable
    const bundleName = preset.bundle_id ? DEAL_PACKS.find(p => p.id === preset.bundle_id)?.name : null;

    return (
      <div 
        key={uniqueKey}
        onClick={() => {
          if (unlocked) return;
          setPendingPurchase({ 
            id: preset.id,
            name: preset.phrase,
            description: `A quick chat phrase with ${preset.style} styling. ${bundleName ? `Included in ${bundleName}.` : ''}`,
            price: preset.price,
            currency: 'GEMS',
            type: 'QUICK_CHAT',
            phrase: preset.phrase,
            style: preset.style,
            unlocked,
            bundle_id: preset.bundle_id
          });
        }}
        onMouseEnter={() => setPreviewingChat(preset)}
        onMouseLeave={() => setPreviewingChat(null)}
        className={`relative group bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-white/[0.08] border-2 border-white/20 rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col items-center transition-all duration-500 hover:border-yellow-500/60 hover:bg-gradient-to-br hover:from-white/[0.15] hover:via-white/[0.08] hover:to-white/[0.15] hover:shadow-[0_0_60px_rgba(251,191,36,0.4)] cursor-pointer h-full overflow-hidden ${isWiggle ? 'animate-chat-wiggle' : ''}`}
      >
        {/* Premium Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/8 via-transparent to-pink-500/8 opacity-60 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.08)_0%,transparent_70%)] opacity-40 group-hover:opacity-100 transition-opacity duration-500"></div>
        
        {/* Preview Chat Bubble - Shows on hover/click - Fixed position for better visibility */}
        {previewingChat?.id === preset.id && (
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[600] pointer-events-none max-w-[90vw] px-4">
            <div className="max-w-full">
              <ChatBubble
                text={preset.phrase}
                style={preset.style}
                position="bottom"
                isVisible={true}
              />
            </div>
          </div>
        )}
        
        <div className="relative z-10 flex flex-col items-center gap-3 w-full">
          {/* Chat Preview Card */}
          <div className={`relative w-full min-h-[80px] sm:min-h-[96px] rounded-2xl flex items-center justify-center border-2 transition-all duration-500 overflow-hidden p-2 ${
            preset.style === 'gold' 
              ? 'bg-gradient-to-br from-yellow-900/50 via-amber-900/40 to-yellow-900/50 border-yellow-500/30 group-hover:border-yellow-500/60'
              : preset.style === 'neon'
              ? 'bg-gradient-to-br from-pink-900/50 via-purple-900/40 to-pink-900/50 border-pink-500/30 group-hover:border-pink-500/60'
              : preset.style === 'wiggle'
              ? 'bg-gradient-to-br from-orange-900/50 via-amber-900/40 to-orange-900/50 border-orange-500/30 group-hover:border-orange-500/60'
              : 'bg-gradient-to-br from-gray-900/50 via-gray-800/40 to-gray-900/50 border-gray-500/30 group-hover:border-gray-500/60'
          }`}>
            {/* Chat Bubble Preview */}
            <div className="w-full px-3 py-2 rounded-xl bg-white/95 border-2 border-white/50 shadow-lg max-w-full">
              <p className={`text-xs sm:text-sm font-bold text-center break-words line-clamp-3 ${
                preset.style === 'gold' ? 'chat-shimmer' :
                preset.style === 'neon' ? 'text-pink-400 chat-heartbeat' :
                preset.style === 'wiggle' ? 'text-orange-600 chat-wiggle' :
                'text-black'
              }`}
              style={{
                fontFamily: preset.style === 'wiggle' ? "'Comic Sans MS', 'Fredoka One', cursive" : undefined,
                textShadow: preset.style === 'neon' ? '0 0 8px #ff00ff, 0 0 12px #ff00ff' : undefined,
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
                hyphens: 'auto',
              }}>
                {preset.phrase}
              </p>
            </div>
          </div>
          
          {/* Phrase Text */}
          <div className="flex flex-col items-center text-center px-2">
            <span className="text-xs sm:text-sm font-bold text-white/90 uppercase tracking-wide drop-shadow-md line-clamp-2">
              {preset.phrase}
            </span>
            {bundleName && (
              <span className="text-[9px] sm:text-[10px] text-yellow-400/70 uppercase mt-1 font-medium line-clamp-1">
                In {bundleName}
              </span>
            )}
          </div>

          {/* Price Badge / Status */}
          {!unlocked ? (
            <div className="flex flex-col items-center gap-1.5 mt-auto">
              <div className={`px-2 py-1 rounded-lg bg-gradient-to-r ${badgeInfo.color} border ${badgeInfo.borderColor} shadow-lg`}>
                <div className="flex items-center gap-1">
                  <CurrencyIcon type="GEMS" size="xs" />
                  <span className="text-xs sm:text-sm font-bold text-white">{badgeInfo.label}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-auto">
              <div className="px-3 py-1.5 bg-gradient-to-r from-emerald-500/30 to-emerald-600/20 border border-emerald-500/50 rounded-lg text-emerald-300 text-xs font-bold uppercase flex items-center gap-1">
                <span>✓</span>
                <span>OWNED</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderItemCard = (item: any, isAvatar = false, isBoard = false, isItem = false, uniqueKey?: string) => {
    const id = isAvatar ? item : item.id;
    
    let unlocked = false;
    if (isAvatar) unlocked = profile?.unlocked_avatars?.includes(item) || false;
    else if (isBoard) unlocked = profile?.unlocked_boards.includes(id) || id === 'EMERALD';
    else if (isItem) unlocked = false;
    else unlocked = profile?.unlocked_sleeves.includes(id);

    // For avatars, check if it's a remote emote with custom price
    const remoteEmote = isAvatar ? remoteEmotes.find(e => e.trigger_code === item) : null;
    const basePrice = isAvatar ? (remoteEmote?.price || 200) : item.price;
    // Currency: Avatars always use GEMS, boards and sleeves use item.currency or default to GOLD
    // This ensures database-sourced items with currency='GOLD' display the gold icon and deduct from coins
    const currency = isAvatar ? 'GEMS' : (isBoard ? (item.currency || 'GOLD') : (item.currency || 'GOLD'));
    
    // Check if this is the Daily Deal (only for gem-priced sleeves)
    const isDailyDeal = !isAvatar && !isBoard && !isItem && dailyDealSleeveId === id && currency === 'GEMS' && !unlocked;
    const discountPercent = 30;
    const finalPrice = isDailyDeal ? Math.floor(basePrice * (1 - discountPercent / 100)) : basePrice;
    
    const isEquipped = isAvatar ? playerAvatar === item : isBoard ? currentTheme === item.id : !isItem && currentSleeve === item.style;
    const isExclusive = (typeof item === 'object' && item?.isEventExclusive) || ITEM_REGISTRY[id]?.isEventExclusive;

    // For avatars, check if it's a remote emote (should always show)
    const isRemoteEmote = isAvatar && remoteEmotes.some(e => e.trigger_code === item);

    if (isExclusive && !unlocked && !isRemoteEmote) return null;

    return (
      <div 
        key={uniqueKey || id}
        onClick={() => {
          const remoteEmote = isAvatar ? remoteEmotes.find(e => e.trigger_code === id) : null;
          setPendingPurchase({ 
          id, 
          name: isAvatar ? getAvatarName(id, remoteEmotes) : item.name, 
            description: isAvatar 
              ? (remoteEmote?.name ? `${remoteEmote.name} - A high-fidelity elite avatar signature.` : 'A high-fidelity elite avatar signature.')
              : (item.description || ITEM_REGISTRY[id]?.description || 'A signature XIII cosmetic upgrade.'),
          price: finalPrice, // Use discounted price if daily deal
          originalPrice: isDailyDeal ? basePrice : undefined, // Store original for display
          currency, 
          type: isAvatar ? 'AVATAR' : isBoard ? 'BOARD' : isItem ? 'ITEM' : 'SLEEVE', 
          style: item.style,
          unlocked,
          equipped: isEquipped,
          isDailyDeal
          });
        }} 
        className="relative group bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-white/[0.08] border-2 border-white/20 rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col items-center transition-all duration-500 hover:border-yellow-500/40 hover:bg-gradient-to-br hover:from-white/[0.12] hover:via-white/[0.06] hover:to-white/[0.12] hover:shadow-[0_0_40px_rgba(251,191,36,0.2)] cursor-pointer h-full overflow-hidden"
      >
        {/* Premium Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-transparent to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.05)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="absolute -inset-10 bg-gradient-to-br from-yellow-500/10 via-transparent to-pink-500/10 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
        
        <div className="relative z-10 flex flex-col items-center gap-2 sm:gap-3 mb-3 sm:mb-4 w-full">
          {isAvatar ? (
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center group/avatar">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/20 via-transparent to-pink-500/20 rounded-3xl blur-xl opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-500"></div>
              <VisualEmote trigger={item} remoteEmotes={remoteEmotes} size="lg" />
            </div>
          ) : isBoard ? (
            <div className="relative w-full group/board">
              <div className="absolute -inset-2 bg-gradient-to-br from-yellow-500/20 via-transparent to-pink-500/20 rounded-3xl blur-xl opacity-0 group-hover/board:opacity-100 transition-opacity duration-500"></div>
              <div className="relative w-full h-[140px] sm:h-[160px] md:h-[180px]">
                <BoardPreview themeId={item.id} unlocked={unlocked} active={isEquipped} hideActiveMarker className="w-full h-full" />
              </div>
            </div>
          ) : isItem ? (
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 bg-gradient-to-br from-black/60 to-black/40 rounded-3xl flex items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.6)] border-2 border-white/10 group-hover:scale-110 group-hover:border-white/20 transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-3xl"></div>
              <div className="relative z-10">{getItemIcon(id, item.type)}</div>
            </div>
          ) : (
            <div className="relative group/card">
              <div className="absolute -inset-2 bg-gradient-to-br from-yellow-500/20 via-transparent to-pink-500/20 rounded-2xl blur-xl opacity-0 group-hover/card:opacity-100 transition-opacity duration-500"></div>
              <Card faceDown coverStyle={item.style} className="!w-24 !h-36 sm:!w-28 sm:!h-40 shadow-[0_8px_32px_rgba(0,0,0,0.8)] group-hover:scale-110 transition-transform duration-500" />
            </div>
          )}
          
          <div className="flex flex-col items-center text-center px-2">
            <span className="text-xs sm:text-sm font-bold text-white/90 uppercase tracking-wide drop-shadow-md">
              {isAvatar ? getAvatarName(item, remoteEmotes) : item.name}
            </span>
            {isItem && (
              <span className="text-[9px] sm:text-[10px] text-white/50 uppercase mt-1 font-medium line-clamp-2 leading-tight">
                {item.description}
              </span>
            )}
          </div>
        </div>

        <button className={`relative z-10 w-full py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-2 mt-auto transition-all duration-300 overflow-hidden group/btn ${
          unlocked 
            ? isEquipped
              ? 'bg-gradient-to-br from-emerald-600/30 to-emerald-700/30 text-emerald-300 border-2 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
              : 'bg-gradient-to-br from-emerald-600/30 to-emerald-700/30 text-emerald-300 border-2 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]'
            : 'bg-gradient-to-br from-yellow-500 via-yellow-600 to-yellow-500 text-black border-2 border-yellow-400/50 shadow-[0_0_25px_rgba(251,191,36,0.4)] hover:shadow-[0_0_35px_rgba(251,191,36,0.6)]'
        }`}>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000"></div>
          {isEquipped ? (
            <span className="relative z-10">EQUIPPED</span>
          ) : unlocked ? (
            <span className="relative z-10">EQUIP</span>
          ) : (
            <div className="relative z-10 flex flex-col items-center gap-1">
              {isDailyDeal ? (
                <>
                  <div className="flex items-center gap-1">
                    <span className="text-white font-bold text-sm sm:text-base">{finalPrice}</span>
                    <CurrencyIcon type={currency} size="sm" />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-white/40 line-through text-xs">{basePrice}</span>
                    <span className="text-white text-[9px] font-bold">-{discountPercent}%</span>
                  </div>
                  <div className="text-[8px] text-white/90 font-medium mt-0.5">
                    Ends in {dealTimeRemaining.hours}h {dealTimeRemaining.minutes}m
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-1">
                  <span className="relative z-10">{finalPrice}</span>
                  <CurrencyIcon type={currency} size="sm" className="relative z-10" />
                </div>
              )}
            </div>
          )}
        </button>
      </div>
    );
  };

  const storeItems = useMemo(() => {
    return Object.values(ITEM_REGISTRY).filter(item => !item.isEventExclusive && item.type !== 'COSMETIC');
  }, []);

  // Memoize items list for all tabs (must be called unconditionally to avoid hook order issues)
  const tabItems = useMemo(() => {
    if (activeTab === 'DEALS') return []; // DEALS tab has its own rendering
    
    let items: any[] = [];
    if (activeTab === 'SLEEVES') {
      // Sort sleeves: Free/Gold items first (by price), then Gem items (by price)
      items = [...SLEEVES].sort((a, b) => {
        // First, sort by currency: GOLD first, then GEMS
        if (a.currency !== b.currency) {
          return a.currency === 'GOLD' ? -1 : 1;
        }
        // Within same currency, sort by price
        return a.price - b.price;
      });
    }
    else if (activeTab === 'EMOTES') {
      // ONLY use remote emotes from Supabase database - no hardcoded data
      // First, deduplicate by trigger_code - keep the one with a valid file_path
      const emoteMap = new Map<string, Emote>();
      
      if (Array.isArray(remoteEmotes) && remoteEmotes.length > 0) {
        remoteEmotes.forEach(emote => {
          if (!emote || !emote.trigger_code || typeof emote.trigger_code !== 'string') return;
          if (emote.trigger_code === ':smile:') return; // Exclude Loyal Shiba
          
          const existing = emoteMap.get(emote.trigger_code);
          const hasValidPath = emote.file_path && typeof emote.file_path === 'string' && emote.file_path.trim() !== '';
          
          // If we already have this trigger_code, prefer the one with a valid file_path
          if (existing) {
            const existingHasPath = existing.file_path && typeof existing.file_path === 'string' && existing.file_path.trim() !== '';
            if (hasValidPath && !existingHasPath) {
              // Replace with the one that has a file_path
              emoteMap.set(emote.trigger_code, emote);
              console.log(`🔄 Store: Replacing duplicate "${emote.name}" (${emote.trigger_code}) - keeping version with file_path`);
            } else if (!hasValidPath && existingHasPath) {
              // Keep the existing one with file_path
              return;
            } else {
              // Both have or both don't have file_path - keep first one, but log if it's a problematic emote
              if (['Game Over', 'Doge Focus', 'Lunar New Year', 'The Mooner'].includes(emote.name)) {
                console.warn(`⚠️ Store: Duplicate "${emote.name}" (${emote.trigger_code}) - keeping first occurrence`);
              }
              return;
            }
          } else {
            emoteMap.set(emote.trigger_code, emote);
          }
        });
      }
      
      // Filter to only include emotes with valid file_paths
      const validEmotes = Array.from(emoteMap.values()).filter(emote => {
        const hasValidPath = emote.file_path && typeof emote.file_path === 'string' && emote.file_path.trim() !== '';
        if (!hasValidPath) {
          console.warn(`⚠️ Store: Excluding emote "${emote.name}" (${emote.trigger_code}) - no file_path`);
          // Log specific problematic emotes
          if (['Game Over', 'Doge Focus', 'Lunar New Year', 'The Mooner'].includes(emote.name)) {
            console.error(`❌ CRITICAL: Premium emote "${emote.name}" (${emote.trigger_code}) has no file_path!`, emote);
          }
          return false;
        }
        return true;
      });
      
      // Filter out problematic emotes that fail to load (400 errors)
      const problematicTriggers = [':doge_focus:', ':game_over:', ':lunar_new_year:', ':the_mooner:'];
      const workingEmotes = validEmotes.filter(emote => {
        const isProblematic = problematicTriggers.includes(emote.trigger_code.toLowerCase());
        if (isProblematic) {
          console.warn(`⚠️ Store: Excluding emote "${emote.name}" (${emote.trigger_code}) - image fails to load (400 error)`);
        }
        return !isProblematic;
      });
      
      // Map to trigger codes
      items = workingEmotes.map(emote => emote.trigger_code);
    }
    else if (activeTab === 'BOARDS') items = PREMIUM_BOARDS;
    else if (activeTab === 'FINISHERS') items = finishers;
    else if (activeTab === 'QUICK_CHATS') items = chatPresets;
    else items = storeItems;

    // Filter by owned status
    if (hideUnowned) {
      items = items.filter(item => {
        if (activeTab === 'EMOTES') {
          const isUnlocked = profile?.unlocked_avatars?.includes(item) || false;
          return isUnlocked;
        } else if (activeTab === 'BOARDS') {
          const id = item.id || item;
          return profile?.unlocked_boards.includes(id) || id === 'EMERALD';
        } else if (activeTab === 'FINISHERS') {
          const finisher = item as Finisher;
          return profile?.unlocked_finishers?.includes(finisher.animation_key) || false;
        } else if (activeTab === 'QUICK_CHATS') {
          const preset = item as ChatPreset;
          return isPhraseUnlocked(preset.id, preset.bundle_id);
        } else if (activeTab === 'SLEEVES') {
          return profile?.unlocked_sleeves?.includes(item.style) || item.style === 'STANDARD';
        } else {
          return (profile?.inventory?.items?.[item.id] || 0) > 0;
        }
      });
    }

    // Filter by deals (only for sleeves)
    if (showDealsOnly && activeTab === 'SLEEVES' && dailyDealSleeveId) {
      items = items.filter(item => {
        const id = item.id || item.style;
        const isUnlocked = profile?.unlocked_sleeves?.includes(item.style) || false;
        return id === dailyDealSleeveId && !isUnlocked;
      });
    }
    
    // Final deduplication pass
    const finalItems = activeTab === 'EMOTES' 
      ? Array.from(new Set(items as string[]))
      : items;
    
    return finalItems;
  }, [activeTab, remoteEmotes, hideUnowned, showDealsOnly, dailyDealSleeveId, profile, finishers, storeItems]);

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-in fade-in" onClick={onClose}>
      {showSleevePreview && pendingPurchase?.type === 'SLEEVE' && (
        <CardSleevePreview 
          sleeveStyle={pendingPurchase.style} 
          themeId={currentTheme} 
          sleeveEffectsEnabled={profile?.sleeve_effects_enabled ?? true}
          onClose={() => setShowSleevePreview(false)}
        />
      )}
      {showBoardPreview && pendingPurchase?.type === 'BOARD' && (
        <BoardThemePreview 
          themeId={pendingPurchase.id as BackgroundTheme}
          onClose={() => setShowBoardPreview(false)}
        />
      )}
      {showFinisherPreview && previewingFinisher && (
        <FinisherPreview
          finisherKey={previewingFinisher.animation_key}
          finisherName={previewingFinisher.name}
          onClose={() => {
            setShowFinisherPreview(false);
            setPreviewingFinisher(null);
          }}
        />
      )}
      {showSuccessModal && successModalData && (
        <PurchaseSuccessModal
          itemName={successModalData.itemName}
          itemType={successModalData.itemType}
          price={successModalData.price}
          currency={successModalData.currency}
          style={successModalData.style}
          themeId={successModalData.themeId}
          avatarTrigger={successModalData.avatarTrigger}
          remoteEmotes={remoteEmotes}
          onClose={() => {
            setShowSuccessModal(false);
            setSuccessModalData(null);
          }}
        />
      )}
      {pendingPurchase && profile && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/90 backdrop-blur-3xl p-4 sm:p-6 animate-in fade-in duration-300" onClick={() => setPendingPurchase(null)}>
          <div className="relative bg-gradient-to-br from-[#0a0a0a] via-[#050505] to-[#000000] border-2 border-white/20 w-full max-w-md rounded-3xl sm:rounded-[3rem] p-6 sm:p-8 flex flex-col items-center text-center shadow-[0_0_100px_rgba(0,0,0,1)] relative overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Minimal Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(251,191,36,0.05)_0%,transparent_70%)]"></div>
            
            {/* Header - Simplified */}
            <div className="relative z-10 mb-5">
              <h3 className="text-2xl sm:text-3xl font-bold uppercase text-white mb-1.5 tracking-tight">
                {pendingPurchase.unlocked ? 'ASSET PROFILE' : 'SECURE ASSET'}
            </h3>
              <p className="text-xs sm:text-sm text-white/50 uppercase tracking-wide">
                {pendingPurchase.unlocked ? 'Configure elite signature' : `Unlock ${pendingPurchase.name}`}
            </p>
            </div>
            
            {/* Visual Preview - Cleaner */}
            <div className="relative w-full aspect-[4/3] bg-black/40 rounded-2xl sm:rounded-3xl border border-white/10 flex items-center justify-center mb-5 overflow-hidden">
              <div className="relative z-10 flex items-center justify-center w-full h-full">
                {pendingPurchase.type === 'SLEEVE' ? (
                  <Card faceDown activeTurn={true} coverStyle={pendingPurchase.style} className="!w-28 !h-40 sm:!w-32 sm:!h-48 shadow-[0_20px_60px_rgba(0,0,0,0.9)]" />
                ) : pendingPurchase.type === 'BOARD' ? (
                  <div className="absolute inset-0 w-full h-full">
                    <BoardSurface themeId={pendingPurchase.id as BackgroundTheme} isMini />
                  </div>
                ) : pendingPurchase.type === 'AVATAR' ? (
                  <div className="w-32 h-32 sm:w-40 sm:h-40 flex items-center justify-center">
                    <VisualEmote trigger={pendingPurchase.id} remoteEmotes={remoteEmotes} size="xl" />
                  </div>
                ) : pendingPurchase.type === 'FINISHER' ? (
                  <div className="w-32 h-32 sm:w-40 sm:h-40 flex items-center justify-center">
                    {pendingPurchase.animation_key === 'shiba_slam' ? (
                      <ShibaSlamIcon className="w-full h-full p-4" remoteEmotes={remoteEmotes} />
                    ) : pendingPurchase.animation_key === 'ethereal_blade' ? (
                      <EtherealBladeIcon className="w-full h-full p-4" />
                    ) : pendingPurchase.animation_key === 'sanctum_snap' ? (
                      <VisualEmote trigger=":chinese:" remoteEmotes={remoteEmotes} size="xl" />
                    ) : pendingPurchase.animation_key === 'seductive_finish' ? (
                      <VisualEmote trigger=":heart_eyes:" remoteEmotes={remoteEmotes} size="xl" />
                    ) : pendingPurchase.animation_key === 'kiss_my_shiba' ? (
                      <VisualEmote trigger=":shiba_butt:" remoteEmotes={remoteEmotes} size="xl" />
                    ) : (
                      <div className="text-6xl">⚔️</div>
                    )}
                  </div>
                ) : (
                  <div className="w-24 h-24 sm:w-32 sm:h-32 flex items-center justify-center">
                    {getItemIcon(pendingPurchase.id, pendingPurchase.type)}
                  </div>
                )}
              </div>
              {/* Preview buttons - inline with preview */}
              {pendingPurchase.type === 'SLEEVE' && (
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowSleevePreview(true); }}
                  className="absolute bottom-2 right-2 z-20 px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-[10px] sm:text-xs font-medium uppercase tracking-wide text-white hover:bg-white/20 transition-all backdrop-blur-sm"
                >
                  Preview
                </button>
              )}
              {pendingPurchase.type === 'BOARD' && (
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowBoardPreview(true); }}
                  className="absolute bottom-2 right-2 z-20 px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-[10px] sm:text-xs font-medium uppercase tracking-wide text-white hover:bg-white/20 transition-all backdrop-blur-sm"
                >
                  Preview
                </button>
              )}
              {pendingPurchase.type === 'FINISHER' && (
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    const finisher = finishers.find(f => f.id === pendingPurchase.id);
                    if (finisher) {
                      setPreviewingFinisher(finisher);
                      setShowFinisherPreview(true);
                    }
                  }}
                  className="absolute bottom-2 right-2 z-20 px-3 py-1.5 rounded-lg bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/40 text-[10px] sm:text-xs font-medium uppercase tracking-wide text-yellow-300 hover:bg-gradient-to-r hover:from-yellow-500/30 hover:to-amber-500/30 hover:border-yellow-500/60 transition-all backdrop-blur-sm shadow-[0_0_15px_rgba(251,191,36,0.3)]"
                >
                  Preview
                </button>
              )}
            </div>

            {/* Description - Minimal */}
            <p className="text-xs sm:text-sm text-white/60 mb-5 px-2">
                {pendingPurchase.description}
              </p>
            
            {/* Price - Simplified */}
            {!pendingPurchase.unlocked && (
              <div className="relative z-10 w-full flex flex-col items-center gap-2 mb-4">
                {pendingPurchase.isDailyDeal && pendingPurchase.originalPrice ? (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="text-white/40 line-through text-xl sm:text-2xl font-bold">
                        {pendingPurchase.originalPrice}
                      </div>
                      <div className="text-3xl sm:text-4xl font-bold text-white">
                        {applyVoucher ? Math.floor(pendingPurchase.price * 0.9) : pendingPurchase.price}
                      </div>
                      <CurrencyIcon type={pendingPurchase.currency} size="sm" />
                    </div>
                    <div className="text-xs text-white/90 font-medium">
                      Daily Deal - 30% OFF • Ends in {dealTimeRemaining.hours}h {dealTimeRemaining.minutes}m
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className={`text-2xl sm:text-3xl font-bold ${applyVoucher ? 'text-white/30 line-through' : 'text-white'}`}>
                      {pendingPurchase.price}
                    </div>
                    {applyVoucher && (
                      <div className="text-3xl sm:text-4xl font-bold text-white">
                        {Math.floor(pendingPurchase.price * 0.9)}
                      </div>
                    )}
                    <CurrencyIcon type={pendingPurchase.currency} size="sm" />
                  </div>
                )}
              </div>
            )}

            {/* Voucher - Compact */}
            {hasVoucher && !pendingPurchase.unlocked && (
              <button 
                onClick={() => setApplyVoucher(!applyVoucher)}
                className={`relative z-10 w-full mb-4 p-3 rounded-xl border transition-all flex items-center justify-between backdrop-blur-sm ${
                  applyVoucher 
                    ? 'bg-emerald-500/20 border-emerald-500/50' 
                    : 'bg-white/5 border-white/20 hover:border-white/30'
                }`}
              >
                <span className="text-xs font-medium text-white/70">Apply 10% Discount</span>
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                  applyVoucher ? 'border-emerald-500 bg-emerald-500' : 'border-white/30'
                }`}>
                  {applyVoucher && <span className="text-[10px] text-white">✓</span>}
                </div>
              </button>
            )}

            {/* Action Buttons - Clean */}
            <div className="relative z-10 grid grid-cols-2 gap-3 w-full">
              <button 
                onClick={() => setPendingPurchase(null)} 
                className="py-3 rounded-xl bg-white/5 border border-white/10 text-sm font-medium uppercase tracking-wide text-white/70 hover:text-white hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={executePurchase} 
                disabled={pendingPurchase.equipped || buying === pendingPurchase.id} 
                className={`py-3 rounded-xl text-sm font-bold uppercase tracking-wide transition-all ${
                  pendingPurchase.equipped 
                    ? 'bg-white/5 text-white/20 cursor-not-allowed border border-white/10' 
                    : 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-black border border-yellow-400/50 shadow-[0_0_20px_rgba(251,191,36,0.4)] hover:shadow-[0_0_30px_rgba(251,191,36,0.6)]'
                }`}
              >
                {pendingPurchase.equipped ? 'EQUIPPED' : pendingPurchase.unlocked ? 'EQUIP' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="relative bg-gradient-to-br from-[#0a0a0a] via-[#050505] to-[#000000] border-2 border-white/20 w-full max-w-6xl max-h-[95vh] rounded-[4rem] overflow-hidden shadow-[0_0_150px_rgba(0,0,0,1)] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Premium Ambient Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.08)_0%,transparent_70%)] pointer-events-none"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(236,72,153,0.05)_0%,transparent_70%)] pointer-events-none"></div>
        
        {/* Premium Header with Currency - Mobile First */}
        <div className="relative px-5 sm:px-6 md:px-8 lg:px-10 pt-5 sm:pt-6 md:pt-8 lg:pt-10 pb-4 sm:pb-6 border-b border-white/20 bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-transparent backdrop-blur-xl">
          {/* Close Button - Top Right with spacing */}
          <button 
            onClick={onClose} 
            className="absolute top-5 right-5 sm:top-6 sm:right-6 md:top-8 md:right-8 z-50 group w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-white/[0.08] hover:bg-white/[0.12] border-2 border-white/20 hover:border-white/30 text-white/70 hover:text-white transition-all active:scale-95 shadow-lg backdrop-blur-sm flex items-center justify-center touch-manipulation"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="flex flex-col gap-4 mb-4 sm:mb-6 pr-14 sm:pr-16 md:pr-20">
            {/* Premium Currency Display - Always Visible */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-yellow-500/30 via-yellow-600/20 to-yellow-500/30 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative bg-gradient-to-br from-yellow-500/20 via-yellow-600/15 to-yellow-500/20 backdrop-blur-2xl border-2 border-yellow-500/30 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 flex items-center gap-2 shadow-[0_8px_30px_rgba(234,179,8,0.3)]">
                  <CurrencyIcon type="GOLD" size="sm" className="!w-4 !h-4 sm:!w-5 sm:!h-5" />
                  <span className="text-sm sm:text-base font-bold text-yellow-300 font-mono drop-shadow-[0_0_10px_rgba(234,179,8,0.5)] whitespace-nowrap">
                    {profile?.coins.toLocaleString() || 0}
                  </span>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onOpenGemPacks) {
                    onOpenGemPacks();
                    onClose(); // Close the shop when opening gem packs
                  }
                }}
                className="relative group cursor-pointer"
              >
                <div className="absolute -inset-1 bg-gradient-to-r from-pink-500/30 via-pink-600/20 to-pink-500/30 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative bg-gradient-to-br from-pink-500/20 via-pink-600/15 to-pink-500/20 backdrop-blur-2xl border-2 border-pink-500/30 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 flex items-center gap-2 shadow-[0_8px_30px_rgba(236,72,153,0.3)] transition-transform duration-300 group-hover:scale-105">
                  <CurrencyIcon type="GEMS" size="sm" className="!w-4 !h-4 sm:!w-5 sm:!h-5" />
                  <span className="text-sm sm:text-base font-bold text-pink-300 font-mono drop-shadow-[0_0_10px_rgba(236,72,153,0.5)] whitespace-nowrap">
                    {(profile?.gems || 0).toLocaleString()}
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Premium Title Section - Mobile Optimized */}
          <div className="flex flex-col items-center mb-6 sm:mb-8 px-2">
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-400 via-yellow-300 to-yellow-500 uppercase tracking-tight italic font-serif mb-2 sm:mb-3 drop-shadow-[0_4px_30px_rgba(251,191,36,0.5)] px-2">
              XIII SHOP
            </h2>
            <p className="text-xs sm:text-sm md:text-base font-semibold text-white/60 uppercase tracking-wider text-center px-2">
              Purchase items to customize your experience
            </p>
        </div>

          {/* Premium Navigation Tabs - Wraps on Mobile, Single Row on Desktop */}
          <div className="w-full px-2 sm:px-4 md:px-6">
            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-2.5 flex-wrap sm:flex-nowrap justify-center">
            {(['SLEEVES', 'EMOTES', 'BOARDS', 'ITEMS', 'FINISHERS', 'QUICK_CHATS'] as const).map(tab => {
              const displayName = tab.replace(/_/g, ' ');
              return (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)} 
                className={`relative px-2.5 sm:px-3 md:px-4 lg:px-5 py-2 sm:py-2.5 md:py-3 rounded-lg sm:rounded-xl md:rounded-2xl text-[9px] sm:text-[10px] md:text-xs lg:text-sm font-bold uppercase tracking-wide transition-all duration-300 overflow-hidden group whitespace-nowrap touch-manipulation flex-shrink-0 ${
                  activeTab === tab 
                    ? 'bg-gradient-to-br from-yellow-500/40 via-yellow-600/35 to-yellow-500/40 text-white border-2 border-yellow-500/60 shadow-[0_0_30px_rgba(251,191,36,0.5)]' 
                    : 'bg-white/[0.08] text-white/60 hover:text-white/90 hover:bg-white/[0.12] border-2 border-white/15 hover:border-white/25'
                }`}
              >
                {activeTab === tab && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                )}
                <span className="relative z-10">{displayName}</span>
              </button>
            )})}
            </div>
          </div>

          {/* DEALS Button - Stylistically Distinct Row */}
          <div className="w-full flex items-center justify-center mt-3 sm:mt-4 px-3 sm:px-4 md:px-6">
            <button
              onClick={() => setActiveTab('DEALS')}
              className={`relative px-6 sm:px-8 md:px-10 lg:px-12 py-3 sm:py-3.5 md:py-4 rounded-xl sm:rounded-2xl md:rounded-3xl text-sm sm:text-base md:text-lg lg:text-xl font-black uppercase tracking-wider transition-all duration-500 overflow-hidden group touch-manipulation ${
                activeTab === 'DEALS'
                  ? 'bg-gradient-to-br from-pink-500/60 via-purple-500/50 to-pink-500/60 text-white border-2 border-pink-400/80 shadow-[0_0_50px_rgba(236,72,153,0.7)] scale-105'
                  : 'bg-gradient-to-br from-pink-500/40 via-purple-500/30 to-pink-500/40 text-white border-2 border-pink-400/60 shadow-[0_0_40px_rgba(236,72,153,0.5)] hover:scale-105 hover:shadow-[0_0_60px_rgba(236,72,153,0.8)]'
              }`}
            >
              {/* Animated Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              {/* Pulsing Glow */}
              <div className="absolute -inset-2 bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500 rounded-xl sm:rounded-2xl md:rounded-3xl opacity-50 blur-xl animate-pulse"></div>
              {/* Additional Outer Glow */}
              <div className="absolute -inset-4 bg-gradient-to-r from-pink-400/30 via-purple-400/30 to-pink-400/30 rounded-xl sm:rounded-2xl md:rounded-3xl opacity-0 group-hover:opacity-100 blur-2xl transition-opacity duration-500"></div>
              <span className="relative z-10 flex items-center gap-2">
                <span>🔥</span>
                <span>DEALS</span>
                <span>🔥</span>
              </span>
            </button>
          </div>
        </div>

        {/* Premium Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 lg:p-10 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
          {/* Free Gems Card - Top of Shop */}
          <div className="mb-4 sm:mb-6">
            <FreeGemsCard 
              profile={profile} 
              onRefresh={onRefreshProfile}
              onGemRain={() => setShowGemRain(true)}
              remoteEmotes={remoteEmotes}
            />
          </div>

          {/* Controls Bar - Single Row */}
          <div className="flex items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-5 px-1">
            {/* View Density Options - Same as CUSTOMIZE tab (1, 4, 9 tiles) */}
            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-full border border-white/10">
              {([1, 2, 4] as const).map((d) => (
                <button 
                  key={d} 
                  onClick={() => setDensity(d)} 
                  className={`w-9 h-9 flex items-center justify-center rounded-full transition-all duration-300 ${
                    density === d 
                      ? 'bg-gradient-to-br from-yellow-500/30 to-yellow-600/20 text-white shadow-[0_0_15px_rgba(234,179,8,0.4)]' 
                      : 'text-white/30 hover:text-white/60 hover:bg-white/5'
                  }`}
                  title={d === 1 ? '1 tile' : d === 2 ? '4 tiles' : '9 tiles'}
                >
                  {d === 1 ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="3" y="3" width="18" height="18" rx="2" fillOpacity="0.4" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  ) : d === 2 ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="3" y="3" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1" />
                      <rect x="13" y="3" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1" />
                      <rect x="3" y="13" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1" />
                      <rect x="13" y="13" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="2" y="2" width="4" height="4" rx="0.5" />
                      <rect x="10" y="2" width="4" height="4" rx="0.5" />
                      <rect x="18" y="2" width="4" height="4" rx="0.5" />
                      <rect x="2" y="10" width="4" height="4" rx="0.5" />
                      <rect x="10" y="10" width="4" height="4" rx="0.5" />
                      <rect x="18" y="10" width="4" height="4" rx="0.5" />
                      <rect x="2" y="18" width="4" height="4" rx="0.5" />
                      <rect x="10" y="18" width="4" height="4" rx="0.5" />
                      <rect x="18" y="18" width="4" height="4" rx="0.5" />
                    </svg>
                  )}
                </button>
              ))}
            </div>

            {/* Deals Filter Checkbox - Only show if deal is available for current tab */}
            {activeTab === 'SLEEVES' && dailyDealSleeveId && (
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <span className="text-xs sm:text-sm font-medium text-white/70 uppercase tracking-wide whitespace-nowrap">Deals</span>
                <button
                  onClick={() => setShowDealsOnly(!showDealsOnly)}
                  className={`relative w-11 h-6 sm:w-12 sm:h-6 rounded-full transition-all duration-300 touch-manipulation ${
                    showDealsOnly
                      ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 shadow-[0_0_15px_rgba(251,191,36,0.4)]'
                      : 'bg-white/10 border-2 border-white/20'
                  }`}
                  role="switch"
                  aria-checked={showDealsOnly}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-300 flex items-center justify-center ${
                    showDealsOnly ? 'translate-x-5' : 'translate-x-0'
                  }`}>
                    {showDealsOnly && (
                      <svg className="w-3 h-3 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                </button>
              </div>
            )}

            {/* OWNED Toggle Switch - Same Row */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <span className="text-xs sm:text-sm font-medium text-white/70 uppercase tracking-wide whitespace-nowrap">Owned</span>
              <button
                onClick={() => setHideUnowned(!hideUnowned)}
                className={`relative w-11 h-6 sm:w-12 sm:h-6 rounded-full transition-all duration-300 touch-manipulation ${
                  hideUnowned
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                    : 'bg-white/10 border-2 border-white/20'
                }`}
                role="switch"
                aria-checked={hideUnowned}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-300 flex items-center justify-center ${
                  hideUnowned ? 'translate-x-5' : 'translate-x-0'
                }`}>
                  {hideUnowned && (
                    <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
              </button>
            </div>
          </div>

          {activeTab === 'DEALS' ? (
            <div className="grid gap-6 sm:gap-8 md:gap-10 pb-8 grid-cols-1 lg:grid-cols-2">
              {DEAL_PACKS.map(pack => {
                // Check if user already owns all items in pack
                const allOwned = isPackOwned(pack);

                return (
                  <div
                    key={pack.id}
                    onClick={() => {
                      if (!allOwned) {
                        setShowPackPreview({ packId: pack.id });
                      }
                    }}
                    className={`relative group bg-gradient-to-br from-[#1a0a1f] via-[#0f0515] to-[#1a0a1f] border-2 rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden transition-all duration-500 ${
                      allOwned 
                        ? 'border-emerald-500/40 cursor-default' 
                        : 'border-pink-500/50 hover:border-pink-400/70 hover:shadow-[0_0_60px_rgba(236,72,153,0.4)] cursor-pointer hover:scale-[1.02]'
                    }`}
                  >
                    {/* Animated Background Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(236,72,153,0.15)_0%,transparent_60%)]"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(168,85,247,0.1)_0%,transparent_60%)]"></div>
                    
                    {/* Animated Border Glow */}
                    <div className="absolute -inset-[2px] bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500 rounded-[2rem] sm:rounded-[2.5rem] opacity-0 group-hover:opacity-30 blur-xl transition-opacity duration-700"></div>
                    <div className="absolute -inset-[1px] bg-gradient-to-r from-pink-400/20 via-purple-400/20 to-pink-400/20 rounded-[2rem] sm:rounded-[2.5rem] opacity-0 group-hover:opacity-100 blur-sm transition-opacity duration-500"></div>

                    {/* Discount Badge - More Prominent */}
                    <div className="absolute top-4 right-4 z-30">
                      <div className="relative">
                        <div className="absolute inset-0 bg-yellow-400 blur-lg opacity-60 animate-pulse"></div>
                        <div className="relative bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 text-black font-black text-sm sm:text-base px-4 sm:px-5 py-2 sm:py-2.5 transform rotate-12 shadow-[0_4px_20px_rgba(234,179,8,0.6)] border-2 border-yellow-300/50">
                          <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent rounded"></div>
                          <span className="relative z-10">{pack.discountLabel}</span>
                        </div>
                      </div>
                    </div>

                    <div className="relative z-10 p-6 sm:p-8 md:p-10 flex flex-col h-full">
                      {/* Header Section */}
                      <div className="flex flex-col gap-3 mb-6">
                        <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-purple-300 to-pink-300 uppercase tracking-tight leading-tight">
                          {pack.name}
                        </h3>
                        <p className="text-sm sm:text-base text-white/70 font-medium leading-relaxed">
                          {pack.description}
                        </p>
                      </div>

                      {/* Pack Items - Larger, Better Layout */}
                      <div className={`grid gap-4 sm:gap-5 mb-6 ${
                        pack.items.length === 2 ? 'grid-cols-2' :
                        pack.items.length === 3 ? 'grid-cols-3' :
                        'grid-cols-2 sm:grid-cols-4'
                      }`}>
                        {pack.items.map((item, idx) => {
                          const isOwned = isItemOwned(item);
                          const itemName = item.type === 'FINISHER' 
                            ? finishers.find(f => f.animation_key === item.id)?.name || item.id
                            : item.type === 'EMOTE'
                            ? remoteEmotes.find(e => e.trigger_code === item.id)?.name || item.id
                            : item.type === 'BOARD'
                            ? PREMIUM_BOARDS.find(b => b.id === item.id)?.name || item.id
                            : item.type === 'SLEEVE'
                            ? SLEEVES.find(s => s.id === item.id)?.name || item.id
                            : item.id;

                          return (
                            <div
                              key={`${item.type}-${item.id}-${idx}`}
                              className="relative flex flex-col items-center gap-2 group/item"
                            >
                              <div className={`relative w-full aspect-square rounded-2xl sm:rounded-3xl flex items-center justify-center border-2 transition-all duration-300 overflow-hidden ${
                                isOwned 
                                  ? 'border-emerald-500/60 bg-emerald-500/15 shadow-[0_0_20px_rgba(16,185,129,0.3)]' 
                                  : 'border-pink-500/40 bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-pink-500/10 group-hover/item:border-pink-400/60 group-hover/item:bg-gradient-to-br group-hover/item:from-pink-500/20 group-hover/item:via-purple-500/20 group-hover/item:to-pink-500/20 group-hover/item:shadow-[0_0_30px_rgba(236,72,153,0.4)] group-hover/item:scale-105'
                              }`}>
                                {/* Item Glow Effect */}
                                <div className={`absolute inset-0 bg-gradient-to-br ${
                                  isOwned 
                                    ? 'from-emerald-500/20 to-transparent' 
                                    : 'from-pink-500/20 via-purple-500/20 to-transparent opacity-0 group-hover/item:opacity-100'
                                } transition-opacity duration-300`}></div>
                                
                                {/* Item Content */}
                                <div className="relative z-10 w-full h-full flex items-center justify-center p-3 sm:p-4">
                                  {item.type === 'FINISHER' ? (
                                    (() => {
                                      if (item.id === 'shiba_slam') {
                                        return <ShibaSlamIcon className="w-full h-full" remoteEmotes={remoteEmotes} />;
                                      } else if (item.id === 'ethereal_blade') {
                                        return <EtherealBladeIcon className="w-full h-full" />;
                                      } else if (item.id === 'seductive_finish') {
                                        return <VisualEmote trigger=":heart_eyes:" remoteEmotes={remoteEmotes} size="xl" />;
                                      } else if (item.id === 'sanctum_snap') {
                                        return <VisualEmote trigger=":chinese:" remoteEmotes={remoteEmotes} size="xl" />;
                                      } else if (item.id === 'kiss_my_shiba') {
                                        return <VisualEmote trigger=":shiba_butt:" remoteEmotes={remoteEmotes} size="xl" />;
                  } else {
                                        return <div className="text-4xl sm:text-5xl">⚔️</div>;
                                      }
                                    })()
                                  ) : item.type === 'EMOTE' ? (
                                    <VisualEmote trigger={item.id} remoteEmotes={remoteEmotes} size="xl" />
                                  ) : item.type === 'BOARD' ? (
                                    <div className="w-full h-full rounded-xl overflow-hidden">
                                      <BoardPreview themeId={item.id as BackgroundTheme} unlocked={isOwned} active={false} hideActiveMarker className="w-full h-full" />
                                    </div>
                                  ) : item.type === 'SLEEVE' ? (
                                    <Card faceDown coverStyle={item.id as CardCoverStyle} className="!w-full !h-full rounded-xl shadow-lg" />
                                  ) : (
                                    <div className="text-4xl sm:text-5xl">❓</div>
                                  )}
                                </div>

                                {/* Owned Badge */}
                                {isOwned && (
                                  <div className="absolute top-2 right-2 w-6 h-6 sm:w-7 sm:h-7 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg border-2 border-emerald-300 z-20">
                                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                )}

                                {/* Item Type Badge */}
                                <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded-md border border-white/20">
                                  <span className="text-[9px] sm:text-[10px] font-bold text-white/80 uppercase tracking-wider">
                                    {item.type === 'FINISHER' ? 'FIN' : item.type === 'EMOTE' ? 'EMO' : item.type === 'BOARD' ? 'BRD' : 'SLV'}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Item Name */}
                              <span className="text-[10px] sm:text-xs font-bold text-white/70 text-center leading-tight line-clamp-2 max-w-full px-1">
                                {itemName}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Pricing Section - More Prominent */}
                      <div className="mt-auto pt-6 border-t border-white/10">
                        <div className="flex flex-col gap-4">
                          {/* Price Display */}
                          <div className="flex items-baseline justify-center gap-4">
                            <div className="flex items-center gap-2">
                              <span className="text-xl sm:text-2xl text-white/30 line-through font-semibold">
                                {pack.originalPrice.toLocaleString()}
                              </span>
                              <CurrencyIcon type="GEMS" size="sm" />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-4xl sm:text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-purple-300 to-pink-300 drop-shadow-[0_0_20px_rgba(236,72,153,0.6)]">
                                {pack.bundlePrice.toLocaleString()}
                              </span>
                              <CurrencyIcon type="GEMS" size="lg" />
                            </div>
                          </div>

                          {/* Savings Badge */}
                          <div className="flex justify-center">
                            <div className="px-4 py-1.5 bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-400/30 rounded-full">
                              <span className="text-xs sm:text-sm font-bold text-pink-300">
                                Save {(pack.originalPrice - pack.bundlePrice).toLocaleString()} Gems
                              </span>
                            </div>
                          </div>

                          {/* Action Button */}
                          {allOwned ? (
                            <div className="px-6 py-4 bg-emerald-500/20 border-2 border-emerald-500/50 rounded-2xl text-emerald-300 text-sm sm:text-base font-bold uppercase text-center shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                              Pack Owned
                            </div>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!allOwned) {
                                  setShowPackPreview({ packId: pack.id });
                                }
                              }}
                              className="relative w-full px-6 py-4 sm:py-5 bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500 text-white font-black text-base sm:text-lg uppercase tracking-wide rounded-2xl shadow-[0_0_30px_rgba(236,72,153,0.5)] hover:shadow-[0_0_40px_rgba(236,72,153,0.7)] transition-all duration-300 hover:scale-105 overflow-hidden group/btn"
                            >
                              {/* Button Shine Effect */}
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000"></div>
                              <span className="relative z-10 flex items-center justify-center gap-2">
                                <span>See Pack</span>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
          <div className={`grid gap-3 sm:gap-4 md:gap-5 pb-8 auto-rows-fr ${
            density === 1 ? 'grid-cols-1' :
            density === 2 ? 'grid-cols-2' :
            'grid-cols-3'
          }`}>
            {tabItems.length === 0 ? (
              <div className="col-span-full text-center text-white/50 py-8">No items available</div>
            ) : (
              tabItems.map((item, idx) => {
                try {
                  const uniqueKey = activeTab === 'EMOTES' ? `emote-${item}-${idx}` : 
                                   activeTab === 'BOARDS' ? `board-${item.id || item}-${idx}` :
                                   activeTab === 'ITEMS' ? `item-${item.id}-${idx}` :
                                   activeTab === 'FINISHERS' ? `finisher-${(item as Finisher).id}-${idx}` :
                                   activeTab === 'QUICK_CHATS' ? `chat-${(item as ChatPreset).id}-${idx}` :
                                   `sleeve-${item.id || item}-${idx}`;
                  
                  if (activeTab === 'EMOTES') return renderItemCard(item, true, false, false, uniqueKey);
                  if (activeTab === 'BOARDS') return renderItemCard(item, false, true, false, uniqueKey);
                  if (activeTab === 'ITEMS') return renderItemCard(item, false, false, true, uniqueKey);
                  if (activeTab === 'FINISHERS') return renderFinisherCard(item as Finisher, uniqueKey);
                  if (activeTab === 'QUICK_CHATS') return renderQuickChatCard(item as ChatPreset, uniqueKey);
                  return renderItemCard(item, false, false, false, uniqueKey);
                } catch (error) {
                  console.error('Error rendering item:', item, error);
                  return null;
                }
              }).filter(Boolean)
            )}
          </div>
          )}
        </div>
      </div>

      {/* Ad Prompt Modal - When user can't afford item */}
      {showAdPrompt && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowAdPrompt(false)}>
          <div className="relative bg-gradient-to-br from-white/10 via-white/5 to-white/10 backdrop-blur-xl border-2 border-white/20 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-2xl font-bold text-white mb-4 text-center">Need More Gems?</h3>
            <p className="text-white/70 text-center mb-6">Watch a quick video to earn 20 Gems!</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={async () => {
                  setShowAdPrompt(false);
                  const placement: AdPlacement = 'shop';
                  try {
                    await adService.showRewardedAd(
                      placement,
                      async (amount) => {
                        // SECURITY: Only called when onUserEarnedReward fires
                        const result = await processAdReward(profile?.id || 'guest', amount);
                        if (result.success) {
                          audioService.playPurchase();
                          setShowGemRain(true);
                          onRefreshProfile();
                        }
                      },
                      () => {
                        // Early close callback - show warning toast
                        // Note: This toast would need to be added to the parent component
                        console.warn('Ad closed early');
                      }
                    );
                  } catch (error: any) {
                    console.error('Ad error:', error);
                  }
                }}
                disabled={!adService.isAdAvailable('shop') || adState !== 'idle'}
                className="w-full py-4 px-6 bg-gradient-to-r from-pink-500 to-pink-600 text-white font-bold rounded-xl shadow-lg hover:scale-105 transition-transform duration-200 min-h-[56px] touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {adState === 'loading' ? 'Loading...' : adState === 'playing' ? 'Playing...' : 'Watch Video (+20 Gems)'}
              </button>
              <button
                onClick={() => setShowAdPrompt(false)}
                className="w-full py-3 px-6 bg-white/5 border border-white/20 text-white/70 hover:text-white rounded-xl transition-all min-h-[48px] touch-manipulation"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gem Rain Effect */}
      {showGemRain && (
        <GemRain 
          gemCount={20} 
          onComplete={() => setShowGemRain(false)} 
        />
      )}

      {/* Upsell Modal */}
      {showUpsellModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowUpsellModal(null)}>
          <div className="relative bg-gradient-to-br from-white/10 via-white/5 to-white/10 backdrop-blur-xl border-2 border-pink-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-2xl font-bold text-white mb-2 text-center">Wait!</h3>
            <p className="text-white/80 text-center mb-6 text-lg">
              Get the full <span className="font-bold text-pink-300">{showUpsellModal.packName}</span> for only{' '}
              <span className="font-bold text-yellow-300">{showUpsellModal.difference.toLocaleString()} Gems</span> more!
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  const pack = DEAL_PACKS.find(p => p.name === showUpsellModal.packName);
                  if (pack) {
                    setShowPackPreview({ packId: pack.id });
                    setShowUpsellModal(null);
                  }
                }}
                className="w-full py-4 px-6 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold rounded-xl shadow-lg hover:from-pink-600 hover:to-purple-600 transition-all duration-300 hover:scale-105 min-h-[56px] touch-manipulation"
              >
                See the Pack
              </button>
              <button
                onClick={() => {
                  const finisher = finishers.find(f => f.id === showUpsellModal.finisherId);
                  if (finisher) {
                    setPendingPurchase({
                      id: finisher.id,
                      name: finisher.name,
                      description: `A legendary cinematic finisher that plays when you win a match. Feel the main character energy.`,
                      price: finisher.price,
                      currency: 'GEMS',
                      type: 'FINISHER',
                      animation_key: finisher.animation_key,
                      unlocked: false,
                      equipped: false
                    });
                    setShowUpsellModal(null);
                  }
                }}
                className="w-full py-3 px-6 bg-white/5 border border-white/20 text-white/70 hover:text-white rounded-xl transition-all min-h-[48px] touch-manipulation"
              >
                Just This Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pack Preview Modal */}
      {showPackPreview && (() => {
        const pack = DEAL_PACKS.find(p => p.id === showPackPreview.packId);
        if (!pack) return null;
        
        const allOwned = isPackOwned(pack);

        return (
          <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4" onClick={() => setShowPackPreview(null)}>
            <div className="relative bg-gradient-to-br from-white/10 via-white/5 to-white/10 backdrop-blur-xl border-2 border-pink-500/40 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setShowPackPreview(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="flex flex-col gap-6">
                {/* Header */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-3xl font-black text-white uppercase tracking-wide">{pack.name}</h3>
                    {/* Discount Badge */}
                    <div className="relative">
                      <div className="absolute inset-0 bg-yellow-400 blur-md opacity-50"></div>
                      <div className="relative bg-gradient-to-br from-yellow-400 to-yellow-500 text-black font-black text-sm px-4 py-1.5 transform rotate-12 shadow-lg">
                        {pack.discountLabel}
                      </div>
                    </div>
                  </div>
                  <p className="text-white/70">{pack.description}</p>
                </div>

                {/* Pack Items Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {pack.items.map((item, idx) => {
                    const isOwned = isItemOwned(item);
                    return (
                      <div
                        key={`${item.type}-${item.id}-${idx}`}
                        className={`relative rounded-2xl p-4 border-2 flex flex-col items-center gap-2 ${
                          isOwned 
                            ? 'border-emerald-500/50 bg-emerald-500/10' 
                            : 'border-white/20 bg-white/5'
                        }`}
                      >
                        {/* Category Badge - Top Left */}
                        <div className="absolute top-2 left-2 z-10">
                          <div className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider ${
                            item.type === 'FINISHER' 
                              ? 'bg-gradient-to-r from-purple-500/80 to-pink-500/80 text-white border border-purple-400/50'
                              : item.type === 'EMOTE'
                              ? 'bg-gradient-to-r from-yellow-500/80 to-orange-500/80 text-white border border-yellow-400/50'
                              : item.type === 'BOARD'
                              ? 'bg-gradient-to-r from-blue-500/80 to-cyan-500/80 text-white border border-blue-400/50'
                              : item.type === 'SLEEVE'
                              ? 'bg-gradient-to-r from-green-500/80 to-emerald-500/80 text-white border border-green-400/50'
                              : item.type === 'QUICK_CHAT'
                              ? 'bg-gradient-to-r from-pink-500/80 to-rose-500/80 text-white border border-pink-400/50'
                              : 'bg-white/20 text-white/80 border border-white/30'
                          }`}>
                            {item.type === 'EMOTE' ? 'EMOTE' : item.type === 'QUICK_CHAT' ? 'CHAT' : item.type}
                          </div>
                        </div>
                        
                        <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl flex items-center justify-center">
                          {item.type === 'FINISHER' ? (
                            (() => {
                              if (item.id === 'shiba_slam') {
                                return <ShibaSlamIcon className="w-full h-full p-2" remoteEmotes={remoteEmotes} />;
                              } else if (item.id === 'ethereal_blade') {
                                return <EtherealBladeIcon className="w-full h-full p-2" />;
                              } else if (item.id === 'seductive_finish') {
                                return <VisualEmote trigger=":heart_eyes:" remoteEmotes={remoteEmotes} size="lg" />;
                              } else if (item.id === 'sanctum_snap') {
                                return <VisualEmote trigger=":chinese:" remoteEmotes={remoteEmotes} size="lg" />;
                              } else if (item.id === 'kiss_my_shiba') {
                                return <VisualEmote trigger=":shiba_butt:" remoteEmotes={remoteEmotes} size="lg" />;
                              } else {
                                const finisher = finishers.find(f => f.animation_key === item.id);
                                return <div className="text-3xl">⚔️</div>;
                              }
                            })()
                          ) : item.type === 'EMOTE' ? (
                            <VisualEmote trigger={item.id} remoteEmotes={remoteEmotes} size="lg" />
                          ) : item.type === 'BOARD' ? (
                            <div className="w-full h-full">
                              <BoardPreview themeId={item.id as BackgroundTheme} unlocked={isOwned} active={false} hideActiveMarker className="w-full h-full rounded-xl" />
                            </div>
                          ) : item.type === 'SLEEVE' ? (
                            <Card faceDown coverStyle={item.id as CardCoverStyle} className="!w-full !h-full rounded-xl" />
                          ) : item.type === 'QUICK_CHAT' ? (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-500/20 to-rose-500/20 rounded-xl border border-pink-400/30">
                              <div className="text-2xl sm:text-3xl">💬</div>
                            </div>
                          ) : (
                            <div className="text-3xl">❓</div>
                          )}
                          {isOwned && (
                            <div className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <span className="text-xs font-bold text-white/80 text-center">
                          {item.type === 'FINISHER' 
                            ? finishers.find(f => f.animation_key === item.id)?.name || item.id
                            : item.type === 'EMOTE'
                            ? remoteEmotes.find(e => e.trigger_code === item.id)?.name || item.id
                            : item.type === 'BOARD'
                            ? PREMIUM_BOARDS.find(b => b.id === item.id)?.name || item.id
                            : item.type === 'SLEEVE'
                            ? SLEEVES.find(s => s.id === item.id)?.name || item.id
                            : item.type === 'QUICK_CHAT'
                            ? chatPresets.find(p => p.id === item.id)?.phrase || item.id
                            : item.id
                          }
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Pricing */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xl text-white/40 line-through">
                        {pack.originalPrice.toLocaleString()}
                      </span>
                      <CurrencyIcon type="GEMS" size="sm" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-3xl font-black text-pink-300">
                        {pack.bundlePrice.toLocaleString()}
                      </span>
                      <CurrencyIcon type="GEMS" size="md" />
                    </div>
                  </div>
                  
                  {allOwned ? (
                    <div className="px-4 py-3 bg-emerald-500/20 border border-emerald-500/50 rounded-xl text-emerald-300 text-sm font-bold uppercase text-center">
                      Pack Owned
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setPendingPurchase({
                          id: pack.id,
                          name: pack.name,
                          description: pack.description,
                          price: pack.bundlePrice,
                          originalPrice: pack.originalPrice,
                          currency: 'GEMS',
                          type: 'PACK',
                          items: pack.items,
                          discountPercent: pack.discountPercent,
                          packId: pack.id
                        });
                        setShowPackPreview(null);
                      }}
                      className="w-full px-6 py-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold rounded-xl hover:from-pink-600 hover:to-purple-600 transition-all duration-300 hover:scale-105 shadow-lg text-lg"
                    >
                      Buy Pack
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Pack Success Modal with Chaos Animation */}
      {showPackSuccessModal && (
        <PackPurchaseSuccessModal
          packName={showPackSuccessModal.packName}
          finisherKeys={showPackSuccessModal.finisherKeys}
          finishers={finishers}
          remoteEmotes={remoteEmotes}
          onClose={() => setShowPackSuccessModal(null)}
        />
      )}
    </div>
  );
};