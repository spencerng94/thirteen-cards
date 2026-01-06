import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardCoverStyle } from './Card';
import { UserProfile, BackgroundTheme, Emote, Card as CardType, Rank, Suit } from '../types';
import { buyItem, getAvatarName, fetchEmotes, updateProfileSettings, fetchFinishers, buyFinisher, equipFinisher, Finisher, rewardUserForAd } from '../services/supabase';
import { PREMIUM_BOARDS, BoardPreview, BoardSurface } from './UserHub';
import { audioService } from '../services/audio';
import { VisualEmote } from './VisualEmote';
import { ITEM_REGISTRY } from '../constants/ItemRegistry';
import { v4 as uuidv4 } from 'uuid';
import { FinisherPreview } from './FinisherPreview';
import { PurchaseSuccessModal } from './PurchaseSuccessModal';
import { adService, AdPlacement } from '../services/adService';
import { GemRain } from './GemRain';

// Premium Finisher Icons
const ShibaSlamIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 120 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="shibaPawGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFD700" stopOpacity="1" />
        <stop offset="50%" stopColor="#FFA500" stopOpacity="1" />
        <stop offset="100%" stopColor="#FF6B00" stopOpacity="1" />
      </linearGradient>
      <radialGradient id="shibaImpactGlow" cx="50%" cy="50%">
        <stop offset="0%" stopColor="#FFD700" stopOpacity="0.8" />
        <stop offset="70%" stopColor="#FFA500" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#FF6B00" stopOpacity="0" />
      </radialGradient>
      <filter id="shibaGlow">
        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    {/* Impact Glow */}
    <circle cx="60" cy="60" r="50" fill="url(#shibaImpactGlow)" opacity="0.6" />
    {/* Shiba Paw - Main Shape */}
    <g filter="url(#shibaGlow)">
      {/* Paw Pads */}
      <ellipse cx="60" cy="75" rx="20" ry="15" fill="url(#shibaPawGradient)" />
      <ellipse cx="45" cy="50" rx="8" ry="8" fill="url(#shibaPawGradient)" />
      <ellipse cx="60" cy="45" rx="10" ry="10" fill="url(#shibaPawGradient)" />
      <ellipse cx="75" cy="50" rx="8" ry="8" fill="url(#shibaPawGradient)" />
      {/* Impact Lines */}
      <line x1="30" y1="60" x2="50" y2="60" stroke="#FFD700" strokeWidth="2" opacity="0.8" />
      <line x1="70" y1="60" x2="90" y2="60" stroke="#FFD700" strokeWidth="2" opacity="0.8" />
      <line x1="60" y1="30" x2="60" y2="50" stroke="#FFD700" strokeWidth="2" opacity="0.8" />
      <line x1="60" y1="70" x2="60" y2="90" stroke="#FFD700" strokeWidth="2" opacity="0.8" />
    </g>
    {/* Energy Particles */}
    <circle cx="40" cy="40" r="2" fill="#FFD700" opacity="0.9">
      <animate attributeName="opacity" values="0.9;0.3;0.9" dur="1.5s" repeatCount="indefinite" />
    </circle>
    <circle cx="80" cy="40" r="2" fill="#FFD700" opacity="0.9">
      <animate attributeName="opacity" values="0.9;0.3;0.9" dur="1.2s" repeatCount="indefinite" />
    </circle>
    <circle cx="40" cy="80" r="2" fill="#FFD700" opacity="0.9">
      <animate attributeName="opacity" values="0.9;0.3;0.9" dur="1.8s" repeatCount="indefinite" />
    </circle>
    <circle cx="80" cy="80" r="2" fill="#FFD700" opacity="0.9">
      <animate attributeName="opacity" values="0.9;0.3;0.9" dur="1.4s" repeatCount="indefinite" />
    </circle>
  </svg>
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
  return (
    <div className={`relative ${dim} flex items-center justify-center shrink-0 ${className}`}>
      <div className="w-full h-full relative z-10 transition-transform duration-300 hover:scale-125">
        {type === 'GOLD' ? <CoinIconSVG /> : <GemIconSVG />}
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

// Free Gems Card Component
const FreeGemsCard: React.FC<{ 
  profile: UserProfile | null; 
  onRefresh: () => void;
  onGemRain: () => void;
}> = ({ profile, onRefresh, onGemRain }) => {
  const [adState, setAdState] = useState<'idle' | 'loading' | 'playing' | 'rewarded' | 'error'>('idle');
  const placement: AdPlacement = 'shop';

  useEffect(() => {
    const unsubscribe = adService.onStateChange(placement, setAdState);
    return unsubscribe;
  }, [placement]);

  const isAvailable = adService.isAdAvailable(placement);
  const cooldownString = adService.getCooldownString(placement);

  const handleWatchAd = async () => {
    if (!isAvailable || adState !== 'idle' || !profile) return;

    try {
      await adService.showRewardedAd(placement, async (amount) => {
        const result = await rewardUserForAd(profile.id, amount);
        if (result.success) {
          audioService.playPurchase();
          onGemRain();
          onRefresh();
        }
      });
    } catch (error: any) {
      console.error('Ad error:', error);
    }
  };

  return (
    <div className="relative group bg-gradient-to-br from-pink-500/20 via-pink-600/15 to-purple-500/20 backdrop-blur-xl border-2 border-pink-500/30 rounded-2xl sm:rounded-3xl p-4 sm:p-5 overflow-hidden shadow-[0_0_40px_rgba(236,72,153,0.3)] hover:shadow-[0_0_60px_rgba(236,72,153,0.5)] transition-all duration-500">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
      <div className="relative z-10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-pink-500/40 to-purple-500/40 flex items-center justify-center shadow-lg">
            <CurrencyIcon type="GEMS" size="md" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white mb-1">Free Gems</h3>
            <p className="text-xs sm:text-sm text-white/70">Watch a video to earn 20 Gems</p>
          </div>
        </div>
        <button
          onClick={handleWatchAd}
          disabled={!isAvailable || adState !== 'idle'}
          className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold text-sm sm:text-base transition-all duration-300 min-h-[48px] touch-manipulation ${
            !isAvailable || adState !== 'idle'
              ? 'bg-white/10 border border-white/20 text-white/50 cursor-not-allowed'
              : 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg hover:scale-105 hover:shadow-xl'
          }`}
        >
          {adState === 'loading' ? 'Loading...' : 
           adState === 'playing' ? 'Playing...' : 
           !isAvailable ? cooldownString : 
           'Watch Video'}
        </button>
      </div>
    </div>
  );
};

export const Store: React.FC<{
  onClose: () => void; profile: UserProfile | null; onRefreshProfile: () => void;
  onEquipSleeve: (sleeve: CardCoverStyle) => void; currentSleeve: CardCoverStyle;
  playerAvatar: string; onEquipAvatar: (avatar: string) => void;
  currentTheme: BackgroundTheme; onEquipBoard: (theme: BackgroundTheme) => void;
  isGuest?: boolean; initialTab?: 'SLEEVES' | 'AVATARS' | 'BOARDS' | 'ITEMS' | 'FINISHERS';
  onOpenGemPacks?: () => void;
}> = ({ onClose, profile, onRefreshProfile, onEquipSleeve, currentSleeve, playerAvatar, onEquipAvatar, currentTheme, onEquipBoard, isGuest, initialTab = 'SLEEVES', onOpenGemPacks }) => {
  const [activeTab, setActiveTab] = useState<'SLEEVES' | 'AVATARS' | 'BOARDS' | 'ITEMS' | 'FINISHERS'>(initialTab as any);
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
    itemType: 'SLEEVES' | 'AVATARS' | 'BOARDS' | 'ITEMS' | 'FINISHERS';
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

  useEffect(() => { 
    // Fetch emotes when component mounts - force refresh to bypass cache
    const loadEmotes = async () => {
      if (typeof fetchEmotes === 'function') {
        try {
          // Force refresh to bypass any caching
          const emotes = await fetchEmotes(true);
          console.log(`🛍️ Store: Loaded ${emotes?.length || 0} emotes from Supabase`);
          if (emotes && emotes.length > 0) {
            console.log('📋 Emote triggers:', emotes.map(e => e.trigger_code));
            console.log('📋 Emote file paths:', emotes.map(e => e.file_path));
          }
          setRemoteEmotes(emotes || []);
        } catch (err) {
          console.error('❌ Error fetching emotes in Store:', err);
          setRemoteEmotes([]);
        }
      }
    };
    
    // Fetch finishers
    const loadFinishers = async () => {
      if (typeof fetchFinishers === 'function') {
        try {
          const finishersData = await fetchFinishers();
          console.log(`⚔️ Store: Loaded ${finishersData?.length || 0} finishers from Supabase`);
          setFinishers(finishersData || []);
        } catch (err) {
          console.error('❌ Error fetching finishers in Store:', err);
          setFinishers([]);
        }
      }
    };
    
    loadEmotes();
    loadFinishers();
  }, []);

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
      
      if (!hasEnough && currency === 'GEMS') {
        // Show ad prompt popup
        setShowAdPrompt(true);
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
        // Show success modal for equip action
        setSuccessModalData({
          itemName: pendingPurchase.name,
          itemType: pendingPurchase.type === 'SLEEVE' ? 'SLEEVES' : 
                    pendingPurchase.type === 'AVATAR' ? 'AVATARS' :
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
      if (pendingPurchase.type === 'FINISHER') {
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
      } else {
        await buyItem(profile.id, finalPrice, pendingPurchase.id, pendingPurchase.type, !!isGuest, pendingPurchase.currency);
        audioService.playPurchase();
        
        // Show success modal with item details
        setSuccessModalData({
          itemName: pendingPurchase.name,
          itemType: pendingPurchase.type === 'SLEEVE' ? 'SLEEVES' : 
                    pendingPurchase.type === 'AVATAR' ? 'AVATARS' :
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

  const renderFinisherCard = (finisher: Finisher, uniqueKey: string) => {
    const unlocked = profile?.unlocked_finishers?.includes(finisher.animation_key) || false;
    const isEquipped = profile?.equipped_finisher === finisher.animation_key;

    return (
      <div 
        key={uniqueKey}
        onClick={() => {
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
        className="relative group bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-white/[0.08] border-2 border-white/20 rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-col items-center transition-all duration-500 hover:border-yellow-500/40 hover:bg-gradient-to-br hover:from-white/[0.12] hover:via-white/[0.06] hover:to-white/[0.12] hover:shadow-[0_0_40px_rgba(251,191,36,0.2)] cursor-pointer h-full overflow-hidden"
      >
        {/* Premium Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-transparent to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.05)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="absolute -inset-10 bg-gradient-to-br from-yellow-500/10 via-transparent to-pink-500/10 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
        
        <div className="relative z-10 flex flex-col items-center gap-2 sm:gap-3 mb-3 sm:mb-4 w-full">
          {/* Finisher Icon/Preview */}
          <div className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl flex items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.8)] border-2 group-hover:scale-110 transition-all duration-500 overflow-hidden ${
            finisher.animation_key === 'shiba_slam' 
              ? 'bg-gradient-to-br from-amber-900/50 via-yellow-900/40 to-orange-900/50 border-amber-500/30 group-hover:border-amber-500/50 group-hover:shadow-[0_0_40px_rgba(251,191,36,0.6)]'
              : 'bg-gradient-to-br from-indigo-900/50 via-purple-900/40 to-blue-900/50 border-blue-400/30 group-hover:border-blue-400/50 group-hover:shadow-[0_0_40px_rgba(99,102,241,0.6)]'
          }`}>
            {/* Animated Background Glow */}
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
              finisher.animation_key === 'shiba_slam'
                ? 'bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.4)_0%,transparent_70%)]'
                : 'bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.4)_0%,transparent_70%)]'
            }`}></div>
            {/* Premium Border Glow */}
            <div className={`absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
              finisher.animation_key === 'shiba_slam'
                ? 'bg-gradient-to-br from-amber-500/20 via-yellow-500/10 to-transparent'
                : 'bg-gradient-to-br from-blue-500/20 via-indigo-500/10 to-transparent'
            }`}></div>
            {/* Custom Icon */}
            <div className="relative z-10 w-full h-full flex items-center justify-center">
              {finisher.animation_key === 'shiba_slam' ? (
                <ShibaSlamIcon className="w-full h-full p-3 sm:p-4" />
              ) : finisher.animation_key === 'ethereal_blade' ? (
                <EtherealBladeIcon className="w-full h-full p-3 sm:p-4" />
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
                      <ShibaSlamIcon className="w-full h-full p-4" />
                    ) : pendingPurchase.animation_key === 'ethereal_blade' ? (
                      <EtherealBladeIcon className="w-full h-full p-4" />
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
                  Test Drive
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

          {/* Premium Navigation Tabs - Single Row */}
          <div className="w-full overflow-x-auto scrollbar-none -mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6">
            <div className="flex items-center justify-center gap-1 sm:gap-1.5 md:gap-2.5 flex-nowrap min-w-max">
            {(['SLEEVES', 'AVATARS', 'BOARDS', 'ITEMS', 'FINISHERS'] as const).map(tab => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)} 
                className={`relative px-2 sm:px-3 md:px-4 lg:px-5 py-2 sm:py-2.5 md:py-3 rounded-lg sm:rounded-xl md:rounded-2xl text-[9px] sm:text-[10px] md:text-xs lg:text-sm font-bold uppercase tracking-wide transition-all duration-300 overflow-hidden group whitespace-nowrap touch-manipulation shrink-0 flex-shrink-0 ${
                  activeTab === tab 
                    ? 'bg-gradient-to-br from-yellow-500/40 via-yellow-600/35 to-yellow-500/40 text-white border-2 border-yellow-500/60 shadow-[0_0_30px_rgba(251,191,36,0.5)]' 
                    : 'bg-white/[0.08] text-white/60 hover:text-white/90 hover:bg-white/[0.12] border-2 border-white/15 hover:border-white/25'
                }`}
              >
                {activeTab === tab && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                )}
                <span className="relative z-10">{tab}</span>
              </button>
            ))}
            </div>
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

          <div className={`grid gap-3 sm:gap-4 md:gap-5 pb-8 auto-rows-fr ${
            density === 1 ? 'grid-cols-1' :
            density === 2 ? 'grid-cols-2' :
            'grid-cols-3'
          }`}>
            {useMemo(() => {
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
              else if (activeTab === 'AVATARS') {
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
                
                // Log specific emotes for debugging with full details
                const problematicNames = ['Game Over', 'Doge Focus', 'Lunar New Year', 'The Mooner'];
                problematicNames.forEach(name => {
                  const found = validEmotes.find(e => e.name === name);
                  if (found) {
                    const fullUrl = `https://spaxxexmyiczdrbikdjp.supabase.co/storage/v1/object/public/emotes/${found.file_path}?v=6`;
                    console.log(`✅ Store: Found "${name}" (${found.trigger_code})`, {
                      file_path: found.file_path,
                      fullUrl,
                      price: found.price
                    });
                  } else {
                    // Check if it exists in the original remoteEmotes but was filtered out
                    const inOriginal = remoteEmotes.find(e => e.name === name);
                    if (inOriginal) {
                      console.error(`❌ Store: "${name}" EXISTS in database but was FILTERED OUT!`, {
                        trigger_code: inOriginal.trigger_code,
                        file_path: inOriginal.file_path,
                        hasFilePath: inOriginal.file_path && typeof inOriginal.file_path === 'string' && inOriginal.file_path.trim() !== '',
                        fullEmoteData: inOriginal
                      });
                    } else {
                      console.error(`❌ Store: "${name}" NOT FOUND in database at all!`);
                    }
                  }
                });
                
                if (remoteEmotes.length > 0) {
                  // Check for duplicates (should be none after deduplication)
                  const duplicates = items.filter((item, index) => items.indexOf(item) !== index);
                  console.log(`🎭 AVATARS Tab: ${items.length} total avatars displayed (from ${emoteMap.size} unique emotes, ${validEmotes.length} with valid file_paths, ${workingEmotes.length} working)`);
                  console.log(`   - All valid triggers:`, items);
                  if (duplicates.length > 0) {
                    console.error(`❌ DUPLICATES FOUND:`, duplicates);
                  } else {
                    console.log(`✅ No duplicates found - all ${items.length} avatars are unique`);
                  }
                } else {
                  console.log(`⚠️ AVATARS: No remote emotes loaded (remoteEmotes.length: ${remoteEmotes?.length || 0})`);
                }
              }
              else if (activeTab === 'BOARDS') items = PREMIUM_BOARDS;
              else if (activeTab === 'FINISHERS') items = finishers;
              else items = storeItems;

              // Filter by owned status
              if (hideUnowned) {
                items = items.filter(item => {
                  if (activeTab === 'AVATARS') {
                    // For avatars, check if unlocked in profile
                    // All avatars come from database, so we check unlock status from profile
                    const isUnlocked = profile?.unlocked_avatars?.includes(item) || false;
                    // If hideUnowned is false, show all; if true, only show unlocked
                    return isUnlocked;
                  } else if (activeTab === 'BOARDS') {
                    const id = item.id || item;
                    return profile?.unlocked_boards.includes(id) || id === 'EMERALD';
                  } else if (activeTab === 'FINISHERS') {
                    const finisher = item as Finisher;
                    return profile?.unlocked_finishers?.includes(finisher.animation_key) || false;
                  } else if (activeTab === 'SLEEVES') {
                    return profile?.unlocked_sleeves?.includes(item.style) || item.style === 'STANDARD';
                  } else {
                    // For items, check if they're in inventory
                    return (profile?.inventory?.items?.[item.id] || 0) > 0;
                  }
                });
              }

              // Filter by deals (only for sleeves)
              if (showDealsOnly && activeTab === 'SLEEVES' && dailyDealSleeveId) {
                items = items.filter(item => {
                  const id = item.id || item.style;
                  const isUnlocked = profile?.unlocked_sleeves?.includes(item.style) || false;
                  // Show only the daily deal sleeve that is not unlocked
                  return id === dailyDealSleeveId && !isUnlocked;
                });
              }

              if (items.length === 0) {
                return <div className="col-span-full text-center text-white/50 py-8">No items available</div>;
              }
              
              // Final deduplication pass - ensure absolute uniqueness by value
              // For avatars, items are strings (trigger codes), so Set works perfectly
              const finalItems = activeTab === 'AVATARS' 
                ? Array.from(new Set(items as string[]))
                : items;
              
              if (finalItems.length !== items.length) {
                console.warn(`⚠️ Duplicates removed in final pass: ${items.length} -> ${finalItems.length}`);
                const removed = items.filter((item, idx) => items.indexOf(item) !== idx);
                console.warn(`   Removed:`, removed);
              }
              
              // Log what's being rendered with counts
              if (activeTab === 'AVATARS' && finalItems.length > 0) {
                const itemCounts = (finalItems as string[]).reduce((acc, item) => {
                  acc[item] = (acc[item] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>);
                const duplicates = Object.entries(itemCounts).filter(([_, count]) => count > 1);
                if (duplicates.length > 0) {
                  console.error(`❌ DUPLICATES IN FINAL ITEMS:`, duplicates);
                } else {
                  console.log(`✅ Final items are unique: ${finalItems.length} items`);
                }
              }
              
              return finalItems.map((item, idx) => {
                try {
                  // Use a unique key combining item and index to prevent React key collisions
                  const uniqueKey = activeTab === 'AVATARS' ? `avatar-${item}-${idx}` : 
                                   activeTab === 'BOARDS' ? `board-${item.id || item}-${idx}` :
                                   activeTab === 'ITEMS' ? `item-${item.id}-${idx}` :
                                   `sleeve-${item.id || item}-${idx}`;
                  
                  if (activeTab === 'AVATARS') return renderItemCard(item, true, false, false, uniqueKey);
                  if (activeTab === 'BOARDS') return renderItemCard(item, false, true, false, uniqueKey);
                  if (activeTab === 'ITEMS') return renderItemCard(item, false, false, true, uniqueKey);
                  if (activeTab === 'FINISHERS') return renderFinisherCard(item as Finisher, uniqueKey);
                  return renderItemCard(item, false, false, false, uniqueKey);
                } catch (error) {
                  console.error('Error rendering item:', item, error);
                  return null;
                }
              }).filter(Boolean);
            }, [activeTab, remoteEmotes, hideUnowned, showDealsOnly, dailyDealSleeveId, profile])}
          </div>
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
                    await adService.showRewardedAd(placement, async (amount) => {
                      const result = await rewardUserForAd(profile?.id || 'guest', amount);
                      if (result.success) {
                        audioService.playPurchase();
                        setShowGemRain(true);
                        onRefreshProfile();
                      }
                    });
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
    </div>
  );
};