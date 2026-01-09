import React, { useState, useMemo, useEffect } from 'react';
import { UserProfile, BackgroundTheme, AiDifficulty, Emote, HubTab } from '../types';
import { calculateLevel, getXpForLevel, DEFAULT_AVATARS, PREMIUM_AVATARS, buyItem, getAvatarName, updateProfileAvatar, fetchEmotes } from '../services/supabase';
import { CardCoverStyle, Card } from './Card';
import { audioService } from '../services/audio';
import { VisualEmote } from './VisualEmote';
import { LevelRewards } from './LevelRewards';
import { InventoryGrid } from './InventoryGrid';
import { CopyUsername } from './CopyUsername';
import { CurrencyIcon } from './Store';
import { DeleteAccountButton } from './DeleteAccountButton';

export interface ThemeConfig {
  id: string;
  name: string;
  price: number;
  currency?: 'GOLD' | 'GEMS';
  base: string;
  colors: string;
  texture?: boolean;
  technoGrid?: boolean;
  cityLights?: boolean;
  lotusForest?: boolean;
  yuletide?: boolean;
  highRoller?: boolean;
  prestige?: boolean;
  emperor?: boolean;
  goldFlux?: boolean;
  zenPond?: boolean;
  obsidianMadness?: boolean;
  crystalTokyo?: boolean;
  lasVegas?: boolean;
  shiba?: boolean;
  justAGirl?: boolean;
  spotlight?: string;
  tier: 'BASIC' | 'PREMIUM';
  isCityLightsPixel?: boolean;
}

export const PREMIUM_BOARDS: ThemeConfig[] = [
  // BASIC - Free or Gold
  { id: 'CLASSIC_GREEN', name: 'Classic Imperial', tier: 'BASIC', price: 0, currency: 'GOLD', base: 'bg-[#0a2e1c]', colors: 'from-green-600/20 via-transparent to-black', texture: false },
  { id: 'EMERALD', name: 'Emerald Felt', tier: 'BASIC', price: 0, currency: 'GOLD', base: 'bg-[#064e3b]', colors: 'from-emerald-400/40 via-emerald-600/20 to-[#022c22]', texture: true },
  { id: 'CYBER_BLUE', name: 'Cobalt Felt', tier: 'BASIC', price: 500, currency: 'GOLD', base: 'bg-[#1e3a8a]', colors: 'from-blue-400/40 via-blue-600/20 to-[#172554]', texture: true },
  { id: 'CRIMSON_VOID', name: 'Baccarat Ruby', tier: 'BASIC', price: 1000, currency: 'GOLD', base: 'bg-[#7f1d1d]', colors: 'from-rose-400/40 via-rose-700/20 to-[#450a0a]', texture: true, spotlight: 'rgba(251, 113, 133, 0.25)' },
  
  // PREMIUM - 800 Gems (Onyx Space to Sanctum Oblivion)
  { id: 'CYBERPUNK_NEON', name: 'Onyx Space', tier: 'PREMIUM', price: 800, currency: 'GEMS', base: 'bg-[#000000]', colors: 'from-[#0a0a1a]/50 via-[#050510]/30 to-black', technoGrid: false, cityLights: false, spotlight: 'rgba(147, 51, 234, 0.12)' },
  { id: 'OBSIDIAN_MADNESS', name: 'Obsidian Madness', tier: 'PREMIUM', price: 800, currency: 'GEMS', base: 'bg-[#000000]', colors: 'from-[#1a0000]/60 via-[#0a0000]/40 to-black', obsidianMadness: true, spotlight: 'rgba(139, 0, 0, 0.15)' },
  { id: 'CHRISTMAS_YULETIDE', name: 'Midnight Yuletide', tier: 'PREMIUM', price: 800, currency: 'GEMS', base: 'bg-[#010b13]', colors: 'from-blue-900/30 via-[#010b13] to-black', yuletide: true, spotlight: 'rgba(191, 219, 254, 0.2)' },
  
  // PREMIUM - 1200 Gems
  { id: 'SHIBA', name: 'High Roller', tier: 'PREMIUM', price: 1200, currency: 'GEMS', base: 'bg-[#0a1f0a]', colors: 'from-emerald-900/40 via-[#0a1f0a]/60 to-black', shiba: true, spotlight: 'rgba(251, 191, 36, 0.25)' },
  { id: 'JUST_A_GIRL', name: "I'm Just a Girl", tier: 'PREMIUM', price: 1200, currency: 'GEMS', base: 'bg-[#fff1f2]', colors: 'from-pink-200/50 via-white to-pink-100/30', justAGirl: true, spotlight: 'rgba(251, 182, 206, 0.25)' },
  { id: 'LAS_VEGAS', name: 'Las Vegas Strip', tier: 'PREMIUM', price: 1200, currency: 'GEMS', base: 'bg-[#000000]', colors: 'from-[#0a0a0a]/60 via-[#050505]/40 to-black', lasVegas: true, spotlight: 'rgba(251, 191, 36, 0.2)' },
  
  // PREMIUM - 1300 Gems
  { id: 'GOLD_FLUX', name: 'Gold Flux', tier: 'PREMIUM', price: 1300, currency: 'GEMS', base: 'bg-[#000000]', colors: 'from-amber-950/70 via-yellow-950/50 to-[#000000]', goldFlux: true, spotlight: 'rgba(255, 215, 0, 0.4)' },
  { id: 'HIGH_ROLLER', name: 'Sanctum Oblivion', tier: 'PREMIUM', price: 1300, currency: 'GEMS', base: 'bg-[#0a0a1a]', colors: 'from-slate-900/60 via-indigo-950/40 to-[#000000]', highRoller: true, spotlight: 'rgba(192, 132, 252, 0.3)' },
  
  // PREMIUM - 1500 Gems
  { id: 'LOTUS_FOREST', name: 'Lotus Deal', tier: 'PREMIUM', price: 1500, currency: 'GEMS', base: 'bg-[#0a1f14]', colors: 'from-emerald-900/40 via-teal-900/30 to-[#0a1f14]', lotusForest: true, spotlight: 'rgba(182, 227, 143, 0.25)' },
  { id: 'GOLDEN_EMPEROR', name: 'Lucky Envelope', tier: 'PREMIUM', price: 1500, currency: 'GEMS', base: 'bg-[#1a0000]', colors: 'from-red-900/50 via-[#4a0000]/40 to-[#0a0000]', prestige: true, spotlight: 'rgba(251, 191, 36, 0.25)' },
  { id: 'ZEN_POND', name: 'Zen Pond', tier: 'PREMIUM', price: 1500, currency: 'GEMS', base: 'bg-[#000000]', colors: 'from-indigo-950/60 via-purple-950/40 to-[#000000]', zenPond: true, spotlight: 'rgba(192, 132, 252, 0.25)' }
];

const HeartIcon = ({ color }: { color: string }) => (
  <svg viewBox="0 0 24 24" fill={color} className="w-full h-full drop-shadow-sm">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </svg>
);

const BowIcon = ({ color }: { color: string }) => (
  <svg viewBox="0 0 24 24" fill={color} className="w-full h-full drop-shadow-sm">
    <path d="M12 10.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5zM21 8c-1.1 0-2.07.45-2.76 1.17-.69-.72-1.66-1.17-2.76-1.17-2.21 0-4 1.79-4 4s1.79 4 4 4c1.1 0 2.07-.45 2.76-1.17.69.72 1.66 1.17 2.76 1.17 2.21 0 4-1.79 4-4s-1.79-4-4-4zm-12.5 0c-1.1 0-2.07.45-2.76 1.17-.69-.72-1.66-1.17-2.76-1.17-2.21 0-4 1.79-4 4s1.79 4 4 4c1.1 0 2.07-.45 2.76-1.17.69.72 1.66 1.17 2.76 1.17 2.21 0 4-1.79 4-4s-1.79-4-4-4z" />
  </svg>
);

const SparkleIcon = ({ color }: { color: string }) => (
  <svg viewBox="0 0 24 24" fill={color} className="w-full h-full drop-shadow-sm">
    <path d="M12 2l2.4 7.2L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" />
  </svg>
);

const JustAGirlEngine: React.FC<{ isMini?: boolean }> = ({ isMini }) => {
  // Sailor Moon style stars - magical, girly
  const stars = useMemo(() => Array.from({ length: isMini ? 15 : 40 }).map((_, i) => ({
    id: `star-${i}`,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 15 + Math.random() * 25,
    rotation: Math.random() * 360,
    delay: Math.random() * -20,
    speed: 8 + Math.random() * 15,
    glow: 0.5 + Math.random() * 0.5
  })), [isMini]);

  // Sparkles - magical transformation vibes
  const sparkles = useMemo(() => Array.from({ length: isMini ? 20 : 50 }).map((_, i) => ({
    id: `sparkle-${i}`,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 3 + Math.random() * 6,
    delay: Math.random() * -25,
    speed: 10 + Math.random() * 20,
    rotation: Math.random() * 360
  })), [isMini]);

  // Ribbons - sassy, girly
  const ribbons = useMemo(() => Array.from({ length: isMini ? 4 : 10 }).map((_, i) => ({
    id: `ribbon-${i}`,
    x: Math.random() * 100,
    y: Math.random() * 100,
    length: 40 + Math.random() * 60,
    width: 8 + Math.random() * 12,
    angle: Math.random() * 360,
    delay: Math.random() * -15,
    speed: 12 + Math.random() * 20
  })), [isMini]);

  // Hearts - girly, cute
  const hearts = useMemo(() => Array.from({ length: isMini ? 8 : 20 }).map((_, i) => ({
    id: `heart-${i}`,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 20 + Math.random() * 30,
    delay: Math.random() * -18,
    speed: 6 + Math.random() * 12,
    glow: 0.6 + Math.random() * 0.4
  })), [isMini]);

  // Moon crescents - Sailor Moon vibes
  const moons = useMemo(() => Array.from({ length: isMini ? 3 : 8 }).map((_, i) => ({
    id: `moon-${i}`,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 30 + Math.random() * 40,
    rotation: Math.random() * 360,
    delay: Math.random() * -12,
    pulseSpeed: 4 + Math.random() * 6
  })), [isMini]);

  // Bows - sassy, girly
  const bows = useMemo(() => Array.from({ length: isMini ? 6 : 15 }).map((_, i) => ({
    id: `bow-${i}`,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 25 + Math.random() * 35,
    rotation: Math.random() * 360,
    delay: Math.random() * -20,
    speed: 8 + Math.random() * 16
  })), [isMini]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden bg-[#fff1f2]">
      {/* Soft pink and white base - girly, light */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#fff1f2] via-white to-[#fce7f3]"></div>
      
      {/* Magical radial glows - Sailor Moon transformation vibes */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[140%]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(251,182,206,0.3)_0%,rgba(244,114,182,0.15)_30%,rgba(255,255,255,0.1)_60%,transparent_100%)] animate-[pulse_6s_ease-in-out_infinite]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.4)_0%,rgba(251,182,206,0.2)_40%,transparent_70%)] animate-[pulse_9s_ease-in-out_infinite]"></div>
      </div>

      {/* Sailor Moon style stars - magical, girly */}
      {stars.map(star => (
        <div
          key={star.id}
          className="absolute animate-[star-spin_linear_infinite]"
          style={{ 
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            animationDuration: `${star.speed}s`,
            animationDelay: `${star.delay}s`,
            transform: 'translate(-50%, -50%)',
            clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
            background: `linear-gradient(135deg, rgba(251,182,206,${star.glow}) 0%, rgba(244,114,182,${star.glow * 0.8}) 50%, rgba(251,182,206,${star.glow}) 100%)`,
            filter: `drop-shadow(0 0 ${star.size * 0.3}px rgba(251,182,206,${star.glow}))`,
            border: `2px solid rgba(255,255,255,${star.glow * 0.6})`
          }}
        />
      ))}

      {/* Sparkles - magical transformation */}
      {sparkles.map(sparkle => (
        <div
          key={sparkle.id}
          className="absolute animate-[sparkle-twinkle_linear_infinite]"
          style={{
            left: `${sparkle.x}%`,
            top: `${sparkle.y}%`,
            width: `${sparkle.size}px`,
            height: `${sparkle.size}px`,
            animationDuration: `${sparkle.speed}s`,
            animationDelay: `${sparkle.delay}s`,
            transform: 'translate(-50%, -50%)',
            background: `radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(251,182,206,0.6) 50%, transparent 100%)`,
            borderRadius: '50%',
            filter: 'blur(0.5px)',
            boxShadow: `0 0 ${sparkle.size * 2}px rgba(255,255,255,0.8), 0 0 ${sparkle.size * 4}px rgba(251,182,206,0.6)`
          }}
        />
      ))}

      {/* Ribbons - sassy, flowing */}
      {ribbons.map(ribbon => (
        <div
          key={ribbon.id}
          className="absolute animate-[ribbon-flow_linear_infinite]"
          style={{
            left: `${ribbon.x}%`,
            top: `${ribbon.y}%`,
            width: `${ribbon.length}px`,
            height: `${ribbon.width}px`,
            animationDuration: `${ribbon.speed}s`,
            animationDelay: `${ribbon.delay}s`,
            transform: `translate(-50%, -50%) rotate(${ribbon.angle}deg)`,
            background: `linear-gradient(90deg, rgba(251,182,206,0.8) 0%, rgba(244,114,182,0.9) 50%, rgba(251,182,206,0.8) 100%)`,
            borderRadius: `${ribbon.width / 2}px`,
            filter: 'blur(1px)',
            boxShadow: `0 0 ${ribbon.width * 2}px rgba(251,182,206,0.6)`,
            clipPath: 'polygon(0% 0%, 20% 0%, 25% 50%, 20% 100%, 0% 100%, 80% 100%, 85% 50%, 80% 0%, 100% 0%, 100% 100%, 0% 100%)'
          }}
        />
      ))}

      {/* Hearts - girly, cute */}
      {hearts.map(heart => (
        <div
          key={heart.id}
          className="absolute animate-[heart-float_linear_infinite]"
          style={{
            left: `${heart.x}%`,
            top: `${heart.y}%`,
            width: `${heart.size}px`,
            height: `${heart.size}px`,
            animationDuration: `${heart.speed}s`,
            animationDelay: `${heart.delay}s`,
            transform: 'translate(-50%, -50%)',
            fontSize: `${heart.size * 0.8}px`,
            color: `rgba(251,182,206,${heart.glow})`,
            filter: `drop-shadow(0 0 ${heart.size * 0.2}px rgba(251,182,206,${heart.glow}))`,
            textShadow: `0 0 ${heart.size * 0.3}px rgba(244,114,182,${heart.glow * 0.8})`
          }}
        >
          ♥
        </div>
      ))}

      {/* Moon crescents - Sailor Moon vibes */}
      {moons.map(moon => (
        <div 
          key={moon.id}
          className="absolute animate-[moon-pulse_linear_infinite]"
          style={{
            left: `${moon.x}%`,
            top: `${moon.y}%`,
            width: `${moon.size}px`,
            height: `${moon.size}px`,
            animationDuration: `${moon.pulseSpeed}s`,
            animationDelay: `${moon.delay}s`,
            transform: `translate(-50%, -50%) rotate(${moon.rotation}deg)`,
            background: `radial-gradient(ellipse at 30% 50%, rgba(255,255,255,0.9) 0%, rgba(251,182,206,0.6) 40%, transparent 70%)`,
            borderRadius: '50%',
            border: `3px solid rgba(251,182,206,0.8)`,
            boxShadow: `inset -${moon.size * 0.3}px 0 0 rgba(255,255,255,0.3), 0 0 ${moon.size * 0.4}px rgba(251,182,206,0.6)`
          }}
        />
      ))}

      {/* Bows - sassy, girly */}
      {bows.map(bow => (
        <div
          key={bow.id}
          className="absolute animate-[bow-twirl_linear_infinite]"
          style={{
            left: `${bow.x}%`,
            top: `${bow.y}%`,
            width: `${bow.size}px`,
            height: `${bow.size}px`,
            animationDuration: `${bow.speed}s`,
            animationDelay: `${bow.delay}s`,
            transform: `translate(-50%, -50%) rotate(${bow.rotation}deg)`,
            fontSize: `${bow.size * 0.7}px`,
            color: 'rgba(244,114,182,0.9)',
            filter: 'drop-shadow(0 0 8px rgba(251,182,206,0.8))',
            textShadow: '0 0 12px rgba(244,114,182,0.6)'
          }}
        >
          🎀
        </div>
      ))}

      {/* Soft texture overlay - girly, elegant */}
      <div className="absolute inset-0 opacity-[0.08] bg-[url('https://www.transparenttextures.com/patterns/cream-pixels.png')] mix-blend-overlay"></div>

      {/* Glass-like surface reflections - premium depth */}
      <div className="absolute inset-0 opacity-[0.25]">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/[0.3] via-transparent to-transparent"></div>
        <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-gradient-to-tl from-white/[0.2] via-transparent to-transparent"></div>
      </div>

      {/* Rotating magical spotlight - Sailor Moon transformation */}
      {!isMini && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[90%] animate-[magic-spotlight_18s_linear_infinite]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.4)_0%,rgba(251,182,206,0.3)_40%,rgba(244,114,182,0.2)_60%,transparent_80%)]"></div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes star-spin {
          0% { transform: translate(-50%, -50%) rotate(0deg) scale(1); opacity: 0.5; }
          50% { transform: translate(-50%, -50%) rotate(180deg) scale(1.1); opacity: 1; }
          100% { transform: translate(-50%, -50%) rotate(360deg) scale(1); opacity: 0.5; }
        }
        @keyframes sparkle-twinkle {
          0%, 100% { transform: translate(-50%, -50%) scale(0.8) rotate(0deg); opacity: 0.4; }
          25% { transform: translate(-50%, -50%) scale(1.2) rotate(90deg); opacity: 1; }
          50% { transform: translate(-50%, -50%) scale(1) rotate(180deg); opacity: 0.8; }
          75% { transform: translate(-50%, -50%) scale(1.1) rotate(270deg); opacity: 1; }
        }
        @keyframes ribbon-flow {
          0% { transform: translate(-50%, -50%) rotate(0deg) translateX(0px); opacity: 0.6; }
          50% { transform: translate(-50%, -50%) rotate(180deg) translateX(20px); opacity: 0.9; }
          100% { transform: translate(-50%, -50%) rotate(360deg) translateX(0px); opacity: 0.6; }
        }
        @keyframes heart-float {
          0%, 100% { transform: translate(-50%, -50%) translateY(0px) scale(1); opacity: 0.5; }
          50% { transform: translate(-50%, -50%) translateY(-15px) scale(1.1); opacity: 1; }
        }
        @keyframes moon-pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1) rotate(0deg); opacity: 0.6; }
          50% { transform: translate(-50%, -50%) scale(1.15) rotate(10deg); opacity: 0.9; }
        }
        @keyframes bow-twirl {
          0% { transform: translate(-50%, -50%) rotate(0deg) scale(1); opacity: 0.6; }
          50% { transform: translate(-50%, -50%) rotate(180deg) scale(1.1); opacity: 1; }
          100% { transform: translate(-50%, -50%) rotate(360deg) scale(1); opacity: 0.6; }
        }
        @keyframes magic-spotlight {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg); }
        }
      `}} />
    </div>
  );
};

const ShibaEngine: React.FC<{ isMini?: boolean }> = ({ isMini }) => {
  // Gold chips - money, luxury, Vegas
  const chips = useMemo(() => Array.from({ length: isMini ? 8 : 20 }).map((_, i) => ({
    id: `chip-${i}`,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 25 + Math.random() * 35,
    rotation: Math.random() * 360,
    delay: Math.random() * -15,
    pulseSpeed: 3 + Math.random() * 5,
    value: ['$', '$$', '$$$', '$$$$'][Math.floor(Math.random() * 4)]
  })), [isMini]);

  // Lucky symbols - clover, dollar signs, stars
  const luckySymbols = useMemo(() => Array.from({ length: isMini ? 6 : 15 }).map((_, i) => ({
    id: `symbol-${i}`,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 20 + Math.random() * 30,
    delay: Math.random() * -20,
    speed: 8 + Math.random() * 15,
    type: i % 3 === 0 ? 'clover' : i % 3 === 1 ? 'dollar' : 'star'
  })), [isMini]);

  // Green felt texture elements - natural, premium
  const feltPatterns = useMemo(() => Array.from({ length: isMini ? 4 : 10 }).map((_, i) => ({
    id: `felt-${i}`,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 40 + Math.random() * 60,
    delay: Math.random() * -10,
    pulseSpeed: 4 + Math.random() * 6
  })), [isMini]);

  // Gold light rays - expensive, premium
  const lightRays = useMemo(() => Array.from({ length: isMini ? 3 : 8 }).map((_, i) => ({
    id: `ray-${i}`,
    angle: Math.random() * 360,
    delay: Math.random() * -12,
    speed: 15 + Math.random() * 25,
    intensity: 0.3 + Math.random() * 0.4
  })), [isMini]);

  // Floating gold particles - luxury, money
  const goldParticles = useMemo(() => Array.from({ length: isMini ? 20 : 50 }).map((_, i) => ({
    id: `gold-${i}`,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 2 + Math.random() * 4,
    delay: Math.random() * -25,
    speed: 12 + Math.random() * 20,
    glow: 0.4 + Math.random() * 0.6
  })), [isMini]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden bg-[#0a1f0a]">
      {/* Rich green felt base - natural, premium */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a1f0a] via-[#0d2e0d] to-[#051405]"></div>
      
      {/* Sophisticated radial glows - green and gold */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[130%] h-[130%]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.25)_0%,rgba(251,191,36,0.15)_30%,rgba(0,0,0,0.6)_60%,transparent_100%)] animate-[pulse_8s_ease-in-out_infinite]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(251,191,36,0.2)_0%,rgba(16,185,129,0.1)_40%,transparent_70%)] animate-[pulse_12s_ease-in-out_infinite]"></div>
      </div>

      {/* Green felt texture patterns - natural, premium */}
      {feltPatterns.map(felt => (
        <div
          key={felt.id}
          className="absolute animate-[felt-pulse_linear_infinite] opacity-[0.08]"
          style={{ 
            left: `${felt.x}%`,
            top: `${felt.y}%`,
            width: `${felt.size}px`,
            height: `${felt.size}px`,
            animationDuration: `${felt.pulseSpeed}s`,
            animationDelay: `${felt.delay}s`,
            transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(circle, rgba(16,185,129,0.3) 0%, transparent 70%)',
            filter: 'blur(8px)'
          }}
        />
      ))}

      {/* Gold chips - money, luxury, Vegas */}
      {chips.map(chip => (
        <div
          key={chip.id}
          className="absolute animate-[chip-float_linear_infinite]"
          style={{
            left: `${chip.x}%`,
            top: `${chip.y}%`,
            width: `${chip.size}px`,
            height: `${chip.size}px`,
            animationDuration: `${chip.pulseSpeed}s`,
            animationDelay: `${chip.delay}s`,
            transform: `translate(-50%, -50%) rotate(${chip.rotation}deg)`,
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(251,191,36,0.9) 0%, rgba(217,119,6,0.8) 50%, rgba(180,83,9,0.9) 100%)`,
            border: '3px solid rgba(251,191,36,0.6)',
            boxShadow: `0 0 ${chip.size * 0.3}px rgba(251,191,36,0.6), inset 0 0 ${chip.size * 0.2}px rgba(255,255,255,0.3)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: `${chip.size * 0.3}px`,
            fontWeight: '900',
            color: 'rgba(0,0,0,0.8)',
            textShadow: '0 1px 2px rgba(255,255,255,0.5)'
          }}
        >
          {chip.value}
        </div>
      ))}

      {/* Lucky symbols - clover, dollar, star */}
      {luckySymbols.map(symbol => {
        let symbolContent = '';
        let symbolColor = '';
        if (symbol.type === 'clover') {
          symbolContent = '♣';
          symbolColor = 'rgba(16,185,129,0.8)';
        } else if (symbol.type === 'dollar') {
          symbolContent = '$';
          symbolColor = 'rgba(251,191,36,0.9)';
        } else {
          symbolContent = '★';
          symbolColor = 'rgba(251,191,36,0.9)';
        }

        return (
          <div
            key={symbol.id}
            className="absolute animate-[symbol-drift_linear_infinite]"
            style={{
              left: `${symbol.x}%`,
              top: `${symbol.y}%`,
              width: `${symbol.size}px`,
              height: `${symbol.size}px`,
              animationDuration: `${symbol.speed}s`,
              animationDelay: `${symbol.delay}s`,
              transform: 'translate(-50%, -50%)',
              fontSize: `${symbol.size * 0.6}px`,
              color: symbolColor,
              filter: 'drop-shadow(0 0 8px currentColor)',
              textShadow: `0 0 ${symbol.size * 0.3}px ${symbolColor}`
            }}
          >
            {symbolContent}
          </div>
        );
      })}

      {/* Gold light rays - expensive, premium */}
      {!isMini && lightRays.map(ray => (
        <div
          key={ray.id}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[1px] animate-[ray-sweep_linear_infinite] origin-center"
          style={{
            animationDuration: `${ray.speed}s`,
            animationDelay: `${ray.delay}s`,
            transform: `translate(-50%, -50%) rotate(${ray.angle}deg)`,
            background: `linear-gradient(to right, transparent 0%, rgba(251,191,36,${ray.intensity}) 20%, rgba(251,191,36,${ray.intensity * 1.2}) 50%, rgba(251,191,36,${ray.intensity}) 80%, transparent 100%)`,
            filter: 'blur(2px)',
            boxShadow: `0 0 ${ray.intensity * 20}px rgba(251,191,36,${ray.intensity})`
          }}
        />
      ))}

      {/* Floating gold particles - luxury, money */}
      {goldParticles.map(particle => (
        <div
          key={particle.id}
          className="absolute animate-[gold-drift_linear_infinite] rounded-full"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            animationDuration: `${particle.speed}s`,
            animationDelay: `${particle.delay}s`,
            transform: 'translate(-50%, -50%)',
            background: `radial-gradient(circle, rgba(251,191,36,${particle.glow}) 0%, rgba(217,119,6,${particle.glow * 0.6}) 50%, transparent 100%)`,
            filter: 'blur(1px)',
            boxShadow: `0 0 ${particle.size * 4}px rgba(251,191,36,${particle.glow * 0.8})`
          }}
        />
      ))}

      {/* Premium felt texture overlay - natural, distinct */}
      <div className="absolute inset-0 opacity-[0.15] bg-[url('https://www.transparenttextures.com/patterns/fabric-of-squares.png')] mix-blend-overlay"></div>

      {/* Glass-like surface reflections - premium depth */}
      <div className="absolute inset-0 opacity-[0.2]">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/[0.12] via-transparent to-transparent"></div>
        <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-gradient-to-tl from-white/[0.1] via-transparent to-transparent"></div>
      </div>

      {/* Rotating spotlight - dramatic, premium */}
      {!isMini && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] h-[85%] animate-[spotlight-rotate_20s_linear_infinite]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(251,191,36,0.3)_0%,rgba(16,185,129,0.2)_40%,transparent_70%)]"></div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes chip-float {
          0%, 100% { transform: translate(-50%, -50%) rotate(0deg) scale(1); opacity: 0.7; }
          50% { transform: translate(-50%, -50%) rotate(10deg) scale(1.05); opacity: 1; }
        }
        @keyframes symbol-drift {
          0% { transform: translate(-50%, -50%) translate(0, 0) rotate(0deg); opacity: 0.4; }
          25% { opacity: 0.9; }
          50% { transform: translate(-50%, -50%) translate(25px, 25px) rotate(180deg); opacity: 0.7; }
          75% { opacity: 0.9; }
          100% { transform: translate(-50%, -50%) translate(0, 0) rotate(360deg); opacity: 0.4; }
        }
        @keyframes felt-pulse {
          0%, 100% { opacity: 0.05; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.12; transform: translate(-50%, -50%) scale(1.1); }
        }
        @keyframes ray-sweep {
          0% { transform: translate(-50%, -50%) rotate(0deg); opacity: 0; }
          10% { opacity: 0.8; }
          90% { opacity: 0.8; }
          100% { transform: translate(-50%, -50%) rotate(360deg); opacity: 0; }
        }
        @keyframes gold-drift {
          0% { transform: translate(-50%, -50%) translate(0, 0) rotate(0deg); opacity: 0.3; }
          25% { opacity: 0.9; }
          50% { transform: translate(-50%, -50%) translate(30px, 30px) rotate(180deg); opacity: 0.6; }
          75% { opacity: 0.9; }
          100% { transform: translate(-50%, -50%) translate(0, 0) rotate(360deg); opacity: 0.3; }
        }
        @keyframes spotlight-rotate {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg); }
        }
      `}} />
    </div>
  );
};

const LasVegasEngine: React.FC<{ isMini?: boolean }> = ({ isMini }) => {
  // Vegas Strip buildings - skyline from high-rise view
  const buildings = useMemo(() => Array.from({ length: isMini ? 5 : 12 }).map((_, i) => ({
    id: `building-${i}`,
    x: Math.random() * 100,
    height: 15 + Math.random() * 35,
    width: 4 + Math.random() * 10,
    delay: Math.random() * -15,
    flashSpeed: 1 + Math.random() * 2,
    glowIntensity: 0.4 + Math.random() * 0.5,
    color: ['rgba(251,191,36,0.8)', 'rgba(239,68,68,0.8)', 'rgba(34,211,238,0.8)', 'rgba(236,72,153,0.8)', 'rgba(139,92,246,0.8)'][Math.floor(Math.random() * 5)]
  })), [isMini]);

  // Neon signs - flashing casino signs
  const neonSigns = useMemo(() => Array.from({ length: isMini ? 6 : 15 }).map((_, i) => ({
    id: `sign-${i}`,
    x: Math.random() * 100,
    y: 60 + Math.random() * 30, // Lower on screen (buildings)
    size: 20 + Math.random() * 40,
    delay: Math.random() * -10,
    flashSpeed: 0.5 + Math.random() * 1.5,
    color: ['rgba(251,191,36,1)', 'rgba(239,68,68,1)', 'rgba(34,211,238,1)', 'rgba(236,72,153,1)', 'rgba(139,92,246,1)', 'rgba(255,255,255,1)'][Math.floor(Math.random() * 6)]
  })), [isMini]);

  // Traffic lights - car headlights and tail lights
  const trafficLights = useMemo(() => Array.from({ length: isMini ? 20 : 50 }).map((_, i) => ({
    id: `traffic-${i}`,
    x: Math.random() * 100,
    y: 75 + Math.random() * 20, // Road level
    size: 2 + Math.random() * 4,
    delay: Math.random() * -20,
    speed: 5 + Math.random() * 15,
    direction: Math.random() > 0.5 ? 1 : -1,
    color: Math.random() > 0.5 ? 'rgba(251,191,36,0.9)' : 'rgba(239,68,68,0.9)' // Headlights (yellow) or tail lights (red)
  })), [isMini]);

  // Flashing lights - casino marquees
  const flashingLights = useMemo(() => Array.from({ length: isMini ? 15 : 40 }).map((_, i) => ({
    id: `flash-${i}`,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 3 + Math.random() * 6,
    delay: Math.random() * -8,
    flashSpeed: 0.3 + Math.random() * 0.7,
    color: ['rgba(251,191,36,1)', 'rgba(239,68,68,1)', 'rgba(34,211,238,1)', 'rgba(236,72,153,1)', 'rgba(255,255,255,1)'][Math.floor(Math.random() * 5)]
  })), [isMini]);

  // The Sphere - prominent, high-def
  const spherePosition = { x: 20, y: 40, size: isMini ? 60 : 120 };

  // Building windows - individual lit windows for high-rise perspective
  const buildingWindows = useMemo(() => {
    const windows: Array<{ id: string; buildingId: string; x: number; y: number; size: number; delay: number; flashSpeed: number; color: string }> = [];
    buildings.forEach(building => {
      const windowCount = Math.floor(building.height / 8);
      for (let i = 0; i < windowCount; i++) {
        windows.push({
          id: `window-${building.id}-${i}`,
          buildingId: building.id,
          x: building.x + Math.random() * (building.width / 2),
          y: 100 - building.height + (i * (building.height / windowCount)) + Math.random() * 3,
          size: 1.5 + Math.random() * 2,
          delay: Math.random() * -10,
          flashSpeed: 2 + Math.random() * 4,
          color: Math.random() > 0.7 ? building.color : 'rgba(251,191,36,0.8)'
        });
      }
    });
    return windows;
  }, [buildings]);

  // Distant city lights - horizon lights
  const distantLights = useMemo(() => Array.from({ length: isMini ? 30 : 80 }).map((_, i) => ({
    id: `distant-${i}`,
    x: Math.random() * 100,
    y: 20 + Math.random() * 30, // Upper area (distant)
    size: 1 + Math.random() * 2,
    delay: Math.random() * -15,
    twinkleSpeed: 3 + Math.random() * 5,
    color: ['rgba(251,191,36,0.6)', 'rgba(239,68,68,0.6)', 'rgba(34,211,238,0.6)', 'rgba(255,255,255,0.5)'][Math.floor(Math.random() * 4)]
  })), [isMini]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden bg-black">
      {/* Dark night sky base */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#000000] via-[#0a0a0a] to-[#000000]"></div>
      
      {/* Atmospheric glow from city lights - Vegas at night - enhanced depth */}
      <div className="absolute bottom-0 left-0 right-0 h-[60%] bg-gradient-to-t from-[#1a0a0a]/70 via-[#0a0a0a]/40 to-transparent"></div>
      <div className="absolute bottom-0 left-0 right-0 h-[50%] bg-gradient-to-t from-yellow-500/25 via-red-500/15 to-transparent"></div>
      <div className="absolute bottom-0 left-0 right-0 h-[45%] bg-gradient-to-t from-cyan-500/20 via-magenta-500/15 to-transparent"></div>
      <div className="absolute bottom-0 left-0 right-0 h-[30%] bg-gradient-to-t from-white/10 via-transparent to-transparent"></div>

      {/* Distant city lights - horizon twinkling */}
      {distantLights.map(light => (
        <div
          key={light.id}
          className="absolute animate-[light-twinkle_linear_infinite] rounded-full"
          style={{ 
            left: `${light.x}%`,
            top: `${light.y}%`,
            width: `${light.size}px`,
            height: `${light.size}px`,
            animationDuration: `${light.twinkleSpeed}s`,
            animationDelay: `${light.delay}s`,
            transform: 'translate(-50%, -50%)',
            background: `radial-gradient(circle, ${light.color} 0%, transparent 70%)`,
            filter: 'blur(0.5px)',
            boxShadow: `0 0 ${light.size * 3}px ${light.color}`
          }}
        />
      ))}

      {/* Vegas Strip buildings - skyline perspective with depth layers */}
      {!isMini && buildings.map((building, index) => {
        const isNear = index < buildings.length / 2;
        const depth = isNear ? 1 : 0.7;
        return (
          <div key={building.id}>
            {/* Building structure */}
            <div
              className="absolute bottom-0 animate-[building-glow_linear_infinite]"
              style={{
                left: `${building.x}%`,
                height: `${building.height}%`,
                width: `${building.width}px`,
                animationDuration: `${building.flashSpeed * 2}s`,
                animationDelay: `${building.delay}s`,
                background: `linear-gradient(to top, ${building.color} 0%, rgba(0,0,0,0.9) 50%, transparent 100%)`,
                clipPath: 'polygon(0% 100%, 20% 90%, 40% 95%, 60% 85%, 80% 92%, 100% 100%)',
                filter: `blur(${isNear ? '0.5px' : '1.5px'})`,
                boxShadow: `0 0 ${building.width * 4 * depth}px ${building.color}, inset 0 0 ${building.width * 2 * depth}px ${building.color}`,
                opacity: depth
              }}
            />
            {/* Building outline for depth */}
            <div
              className="absolute bottom-0"
              style={{
                left: `${building.x}%`,
                height: `${building.height}%`,
                width: `${building.width}px`,
                background: `linear-gradient(to right, ${building.color.replace('0.8)', '0.2)')} 0%, transparent 50%, ${building.color.replace('0.8)', '0.2)')} 100%)`,
                clipPath: 'polygon(0% 100%, 20% 90%, 40% 95%, 60% 85%, 80% 92%, 100% 100%)',
                filter: `blur(${isNear ? '0px' : '2px'})`,
                opacity: 0.3 * depth
              }}
            />
          </div>
        );
      })}

      {/* Building windows - individual lit windows */}
      {!isMini && buildingWindows.map(window => (
        <div
          key={window.id}
          className="absolute animate-[window-flicker_linear_infinite]"
          style={{
            left: `${window.x}%`,
            top: `${window.y}%`,
            width: `${window.size}px`,
            height: `${window.size * 1.2}px`,
            animationDuration: `${window.flashSpeed}s`,
            animationDelay: `${window.delay}s`,
            transform: 'translate(-50%, -50%)',
            background: `linear-gradient(135deg, ${window.color} 0%, ${window.color.replace('0.8)', '0.4)')} 100%)`,
            borderRadius: '1px',
            boxShadow: `0 0 ${window.size * 2}px ${window.color}, inset 0 0 ${window.size * 0.5}px rgba(255,255,255,0.3)`
          }}
        />
      ))}

      {/* The Sphere - high-def, prominent */}
      {!isMini && (
        <div
          className="absolute animate-[sphere-pulse_linear_infinite]"
          style={{
            left: `${spherePosition.x}%`,
            top: `${spherePosition.y}%`,
            width: `${spherePosition.size}px`,
            height: `${spherePosition.size}px`,
            transform: 'translate(-50%, -50%)',
            borderRadius: '50%',
            background: `radial-gradient(ellipse at 30% 30%, rgba(34,211,238,0.9) 0%, rgba(59,130,246,0.8) 20%, rgba(139,92,246,0.7) 40%, rgba(0,0,0,0.9) 70%, transparent 100%)`,
            border: '3px solid rgba(34,211,238,0.6)',
            boxShadow: `
              inset -${spherePosition.size * 0.2}px -${spherePosition.size * 0.2}px 0 rgba(255,255,255,0.2),
              0 0 ${spherePosition.size * 0.5}px rgba(34,211,238,0.8),
              0 0 ${spherePosition.size}px rgba(59,130,246,0.6),
              0 0 ${spherePosition.size * 1.5}px rgba(139,92,246,0.4)
            `,
            filter: 'blur(0.5px)'
          }}
        >
          {/* Sphere LED pattern */}
          <div
            className="absolute inset-0 rounded-full opacity-60"
            style={{
              backgroundImage: `
                radial-gradient(circle at 20% 20%, rgba(34,211,238,0.8) 0%, transparent 15%),
                radial-gradient(circle at 60% 30%, rgba(59,130,246,0.7) 0%, transparent 12%),
                radial-gradient(circle at 40% 60%, rgba(139,92,246,0.6) 0%, transparent 10%),
                radial-gradient(circle at 80% 70%, rgba(236,72,153,0.5) 0%, transparent 8%)
              `,
              mixBlendMode: 'screen'
            }}
          />
        </div>
      )}

      {/* Neon signs - flashing casino signs */}
      {neonSigns.map(sign => (
        <div
          key={sign.id}
          className="absolute animate-[sign-flash_linear_infinite]"
          style={{
            left: `${sign.x}%`,
            top: `${sign.y}%`,
            width: `${sign.size}px`,
            height: `${sign.size * 0.6}px`,
            animationDuration: `${sign.flashSpeed}s`,
            animationDelay: `${sign.delay}s`,
            transform: 'translate(-50%, -50%)',
            background: `linear-gradient(135deg, ${sign.color} 0%, ${sign.color.replace('1)', '0.6)')} 100%)`,
            borderRadius: '4px',
            filter: `blur(1px) drop-shadow(0 0 ${sign.size * 0.3}px ${sign.color})`,
            boxShadow: `
              0 0 ${sign.size * 0.5}px ${sign.color},
              0 0 ${sign.size}px ${sign.color},
              inset 0 0 ${sign.size * 0.2}px rgba(255,255,255,0.3)
            `
          }}
        />
      ))}

      {/* Traffic lights - moving car lights */}
      {trafficLights.map(light => (
        <div
          key={light.id}
          className="absolute animate-[traffic-move_linear_infinite] rounded-full"
          style={{
            left: `${light.x}%`,
            top: `${light.y}%`,
            width: `${light.size}px`,
            height: `${light.size}px`,
            animationDuration: `${light.speed}s`,
            animationDelay: `${light.delay}s`,
            transform: 'translate(-50%, -50%)',
            background: `radial-gradient(circle, ${light.color} 0%, transparent 70%)`,
            filter: 'blur(1px)',
            boxShadow: `0 0 ${light.size * 3}px ${light.color}, 0 0 ${light.size * 6}px ${light.color}`,
            '--direction': `${light.direction}`
          } as any}
        />
      ))}

      {/* Flashing lights - casino marquees */}
      {flashingLights.map(light => (
        <div
          key={light.id}
          className="absolute animate-[light-flash_linear_infinite] rounded-full"
          style={{
            left: `${light.x}%`,
            top: `${light.y}%`,
            width: `${light.size}px`,
            height: `${light.size}px`,
            animationDuration: `${light.flashSpeed}s`,
            animationDelay: `${light.delay}s`,
            transform: 'translate(-50%, -50%)',
            background: `radial-gradient(circle, ${light.color} 0%, transparent 70%)`,
            filter: 'blur(0.5px)',
            boxShadow: `0 0 ${light.size * 4}px ${light.color}`
          }}
        />
      ))}

      {/* Neon light streaks - premium effect */}
      {!isMini && Array.from({ length: 8 }).map((_, i) => (
        <div
          key={`streak-${i}`}
          className="absolute top-0 bottom-0 w-[2px] animate-[streak-sweep_linear_infinite]"
          style={{
            left: `${10 + i * 12}%`,
            animationDuration: `${3 + Math.random() * 2}s`,
            animationDelay: `${Math.random() * -2}s`,
            background: `linear-gradient(to bottom, transparent 0%, rgba(251,191,36,0.6) 20%, rgba(239,68,68,0.6) 50%, rgba(34,211,238,0.6) 80%, transparent 100%)`,
            filter: 'blur(1px)',
            boxShadow: '0 0 10px rgba(251,191,36,0.5)'
          }}
        />
      ))}

      {/* Atmospheric haze - depth from high-rise perspective */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/50"></div>
      <div className="absolute bottom-0 left-0 right-0 h-[30%] bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>

      {/* Glass window reflection effect - looking through high-rise window */}
      {!isMini && (
        <div className="absolute inset-0 opacity-[0.2] pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/[0.15] via-transparent to-transparent"></div>
          <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-white/[0.1] via-transparent to-transparent"></div>
          {/* Subtle window frame reflection */}
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
          <div className="absolute top-0 left-0 w-[2px] h-full bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>
        </div>
      )}

      {/* Additional depth layers - more city lights in mid-distance */}
      {!isMini && Array.from({ length: 25 }).map((_, i) => (
        <div
          key={`mid-light-${i}`}
          className="absolute rounded-full animate-[mid-light-twinkle_linear_infinite]"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${40 + Math.random() * 25}%`,
            width: `${1.5 + Math.random() * 2.5}px`,
            height: `${1.5 + Math.random() * 2.5}px`,
            animationDuration: `${4 + Math.random() * 4}s`,
            animationDelay: `${Math.random() * -10}s`,
            background: `radial-gradient(circle, rgba(251,191,36,${0.4 + Math.random() * 0.4}) 0%, transparent 70%)`,
            filter: 'blur(0.5px)',
            boxShadow: `0 0 ${3 + Math.random() * 4}px rgba(251,191,36,0.6)`
          }}
        />
      ))}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes building-glow {
          0%, 100% { opacity: 0.6; filter: blur(1px); }
          50% { opacity: 1; filter: blur(0.5px); }
        }
        @keyframes sphere-pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.9; }
          50% { transform: translate(-50%, -50%) scale(1.05); opacity: 1; }
        }
        @keyframes sign-flash {
          0%, 100% { opacity: 0.4; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
        }
        @keyframes traffic-move {
          0% { transform: translate(-50%, -50%) translateX(0px); opacity: 0.6; }
          50% { opacity: 1; }
          100% { transform: translate(-50%, -50%) translateX(calc(var(--direction, 1) * 200px)); opacity: 0.6; }
        }
        @keyframes light-flash {
          0%, 100% { opacity: 0.3; transform: translate(-50%, -50%) scale(0.8); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
        }
        @keyframes streak-sweep {
          0% { transform: translateY(-100%); opacity: 0; }
          10% { opacity: 0.8; }
          90% { opacity: 0.8; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
        @keyframes window-flicker {
          0%, 100% { opacity: 0.6; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
        }
        @keyframes light-twinkle {
          0%, 100% { opacity: 0.3; transform: translate(-50%, -50%) scale(0.9); }
          50% { opacity: 0.9; transform: translate(-50%, -50%) scale(1.1); }
        }
        @keyframes mid-light-twinkle {
          0%, 100% { opacity: 0.4; transform: translate(-50%, -50%) scale(0.8); }
          50% { opacity: 0.8; transform: translate(-50%, -50%) scale(1.2); }
        }
      `}} />
    </div>
  );
};

const CastleOblivionEngine: React.FC<{ isMini?: boolean }> = ({ isMini }) => {
  // Ethereal particles - cryptic, mystical
  const etherealParticles = useMemo(() => Array.from({ length: isMini ? 40 : 100 }).map((_, i) => ({
    id: `particle-${i}`,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 2 + Math.random() * 5,
    delay: Math.random() * -40,
    duration: 20 + Math.random() * 30,
    glow: 0.4 + Math.random() * 0.5,
    zDepth: Math.floor(Math.random() * 2000),
    speed: 6 + Math.random() * 12
  })), [isMini]);

  // Floating castle platforms - ethereal architecture
  const castlePlatforms = useMemo(() => Array.from({ length: isMini ? 3 : 8 }).map((_, i) => ({
    id: `platform-${i}`,
    x: 10 + (i * 12) + Math.random() * 8,
    y: 30 + Math.random() * 40,
    width: 60 + Math.random() * 80,
    height: 8 + Math.random() * 12,
    delay: Math.random() * -10,
    floatSpeed: 8 + Math.random() * 6,
    opacity: 0.15 + Math.random() * 0.2,
    zDepth: Math.floor(Math.random() * 1500)
  })), [isMini]);

  // Castle pillars - architectural elements
  const castlePillars = useMemo(() => Array.from({ length: isMini ? 2 : 6 }).map((_, i) => ({
    id: `pillar-${i}`,
    x: 15 + (i * 15) + Math.random() * 5,
    height: 40 + Math.random() * 30,
    width: 12 + Math.random() * 8,
    delay: Math.random() * -8,
    glow: 0.2 + Math.random() * 0.3
  })), [isMini]);

  // Crystalline shards - ethereal, beautiful
  const crystalShards = useMemo(() => Array.from({ length: isMini ? 15 : 40 }).map((_, i) => ({
    id: `crystal-${i}`,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 20 + Math.random() * 50,
    delay: Math.random() * -30,
    duration: 25 + Math.random() * 35,
    rotSpeed: 20 + Math.random() * 25,
    opacity: 0.2 + Math.random() * 0.3,
    zDepth: Math.floor(Math.random() * 1800)
  })), [isMini]);

  // Light rays - divine, ethereal
  const lightRays = useMemo(() => Array.from({ length: isMini ? 4 : 12 }).map((_, i) => ({
    id: `ray-${i}`,
    angle: (i * 30) + Math.random() * 15,
    delay: Math.random() * -15,
    speed: 25 + Math.random() * 25,
    intensity: 0.3 + Math.random() * 0.4,
    length: 150 + Math.random() * 100
  })), [isMini]);

  // Floating XIII symbols - cryptic, prestige (reduced)
  const xiiiSymbols = useMemo(() => Array.from({ length: isMini ? 2 : 4 }).map((_, i) => ({
    id: `xiii-${i}`,
    x: Math.random() * 100,
    delay: Math.random() * -50,
    duration: 35 + Math.random() * 45,
    size: 30 + Math.random() * 50,
    rotSpeed: 50 + Math.random() * 40,
    opacity: 0.1 + Math.random() * 0.2,
    sway: (Math.random() - 0.5) * 200,
    zDepth: Math.floor(Math.random() * 1500)
  })), [isMini]);

  // Spiral staircase - Castle Oblivion iconic element
  const spiralStaircase = useMemo(() => ({
    x: 50,
    y: 50,
    size: isMini ? 120 : 300,
    rotation: 0,
    steps: 13
  }), [isMini]);

  // Light vs Darkness particles - black and white motif
  const lightDarkParticles = useMemo(() => Array.from({ length: isMini ? 30 : 80 }).map((_, i) => ({
    id: `lightdark-${i}`,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 2 + Math.random() * 5,
    delay: Math.random() * -40,
    duration: 18 + Math.random() * 25,
    isLight: i % 2 === 0,
    glow: 0.4 + Math.random() * 0.5,
    zDepth: Math.floor(Math.random() * 2000)
  })), [isMini]);

  // Ornate patterns - Final Fantasy prestige
  const ornatePatterns = useMemo(() => Array.from({ length: isMini ? 2 : 6 }).map((_, i) => ({
    id: `pattern-${i}`,
    x: i % 2 === 0 ? 8 : 92,
    y: 20 + Math.floor(i / 2) * 30,
    size: 70 + Math.random() * 50,
    delay: Math.random() * -10,
    pulseSpeed: 6 + Math.random() * 4,
    rotation: Math.random() * 360
  })), [isMini]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden bg-[#0a0a1a] perspective-[4000px]">
      {/* Deep ethereal base - Castle Oblivion atmosphere */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a2e] via-[#0f0f1a] to-[#000000]"></div>
      
      {/* Premium atmospheric layers - light vs darkness */}
      <div className="absolute inset-0">
        {/* Light side */}
        <div className="absolute top-0 left-0 w-1/2 h-full">
          <div className="absolute inset-0 bg-gradient-to-r from-white/25 via-slate-100/20 to-transparent"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%]">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.4)_0%,rgba(192,132,252,0.3)_30%,rgba(147,51,234,0.2)_60%,transparent_100%)] animate-[castle-light-pulse_12s_ease-in-out_infinite] mix-blend-screen"></div>
        </div>
        </div>
        {/* Darkness side */}
        <div className="absolute top-0 right-0 w-1/2 h-full">
          <div className="absolute inset-0 bg-gradient-to-l from-black/50 via-gray-900/40 to-transparent"></div>
          <div className="absolute top-1/2 right-1/2 translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%]">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.7)_0%,rgba(17,24,39,0.6)_30%,rgba(31,41,55,0.5)_60%,transparent_100%)] animate-[castle-dark-pulse_15s_ease-in-out_infinite]"></div>
          </div>
        </div>
        {/* Dividing line - light vs darkness */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[2px] h-full bg-gradient-to-b from-white/70 via-purple-300/50 to-black/70"></div>
      </div>

      {/* Spiral Staircase - Castle Oblivion iconic */}
      {!isMini && (
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-[staircase-rotate_30s_linear_infinite] transform-style-3d"
          style={{
            width: `${spiralStaircase.size}px`,
            height: `${spiralStaircase.size}px`,
            transform: 'translate(-50%, -50%) translateZ(0)'
          }}
        >
          {Array.from({ length: spiralStaircase.steps }).map((_, i) => {
            const angle = (i / spiralStaircase.steps) * 360;
            const radius = spiralStaircase.size * 0.3;
            const x = Math.cos((angle * Math.PI) / 180) * radius;
            const stepHeight = spiralStaircase.size / spiralStaircase.steps;
            const stepY = (i / spiralStaircase.steps) * spiralStaircase.size - spiralStaircase.size / 2;
            
            return (
              <div
                key={`step-${i}`}
                className="absolute transform-style-3d"
                style={{
                  left: '50%',
                  top: '50%',
                  width: `${spiralStaircase.size * 0.15}px`,
                  height: `${stepHeight}px`,
                  transform: `translate(-50%, -50%) translateX(${x}px) translateY(${stepY}px) rotateZ(${angle}deg) rotateY(20deg)`,
                  background: `
                    linear-gradient(135deg,
                      rgba(255,255,255,0.9) 0%,
                      rgba(250,232,255,0.8) 25%,
                      rgba(192,132,252,0.7) 50%,
                      rgba(147,51,234,0.6) 75%,
                      rgba(99,102,241,0.5) 100%
                    )
                  `,
                  boxShadow: `
                    inset 0 0 10px rgba(255,255,255,0.5),
                    0 0 ${stepHeight * 0.3}px rgba(192,132,252,0.8),
                    0 0 ${stepHeight * 0.5}px rgba(147,51,234,0.6),
                    inset -2px 0 4px rgba(0,0,0,0.3),
                    inset 2px 0 4px rgba(255,255,255,0.2)
                  `,
                  filter: 'drop-shadow(0 0 5px rgba(192,132,252,0.6))',
                  clipPath: 'polygon(0% 0%, 100% 0%, 90% 100%, 10% 100%)'
                }}
              >
                {/* Step highlight */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%)`,
                    mixBlendMode: 'screen'
                  }}
                />
              </div>
            );
          })}
          {/* Central column */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: `${spiralStaircase.size * 0.08}px`,
              height: `${spiralStaircase.size}px`,
              background: `
                linear-gradient(to bottom,
                  rgba(255,255,255,0.8) 0%,
                  rgba(192,132,252,0.7) 30%,
                  rgba(147,51,234,0.6) 60%,
                  rgba(99,102,241,0.5) 100%
                )
              `,
              boxShadow: `
                inset 0 0 20px rgba(255,255,255,0.4),
                0 0 ${spiralStaircase.size * 0.1}px rgba(192,132,252,0.6)
              `,
              filter: 'blur(1px)'
            }}
          />
        </div>
      )}

      {/* Castle pillars - architectural prestige */}
      {castlePillars.map(pillar => (
        <div key={pillar.id} className="transform-style-3d">
          <div
            className="absolute bottom-0 animate-[pillar-glow_linear_infinite]"
            style={{
              left: `${pillar.x}%`,
              height: `${pillar.height}%`,
              width: `${pillar.width}px`,
              animationDuration: '8s',
              animationDelay: `${pillar.delay}s`,
              transform: 'translateX(-50%) translateZ(0)',
              background: `
                linear-gradient(to top,
                  rgba(192,132,252,${pillar.glow * 0.6}) 0%,
                  rgba(147,51,234,${pillar.glow * 0.5}) 30%,
                  rgba(99,102,241,${pillar.glow * 0.4}) 60%,
                  rgba(67,56,202,${pillar.glow * 0.3}) 100%
                )
              `,
              boxShadow: `
                inset 0 0 ${pillar.width * 2}px rgba(192,132,252,${pillar.glow * 0.4}),
                0 0 ${pillar.width * 0.5}px rgba(192,132,252,${pillar.glow * 0.6}),
                inset -2px 0 4px rgba(0,0,0,0.3),
                inset 2px 0 4px rgba(255,255,255,0.1)
              `,
              filter: 'blur(0.5px) drop-shadow(0 0 3px rgba(192,132,252,0.5))',
              clipPath: 'polygon(10% 0%, 90% 0%, 95% 100%, 5% 100%)'
            }}
          >
            {/* Pillar details */}
            <div
              className="absolute inset-0"
              style={{
                background: `repeating-linear-gradient(
                  90deg,
                  transparent 0%,
                  transparent 40%,
                  rgba(255,255,255,0.1) 50%,
                  transparent 60%,
                  transparent 100%
                )`,
                backgroundSize: `${pillar.width * 0.3}px 100%`
              }}
            />
          </div>
        </div>
      ))}

      {/* Floating castle platforms - ethereal architecture */}
      {castlePlatforms.map(platform => (
        <div 
          key={platform.id}
          className="absolute animate-[platform-float_linear_infinite] transform-style-3d"
          style={{ 
            left: `${platform.x}%`,
            top: `${platform.y}%`,
            width: `${platform.width}px`,
            height: `${platform.height}px`,
            animationDuration: `${platform.floatSpeed}s`,
            animationDelay: `${platform.delay}s`,
            transform: 'translate(-50%, -50%) translateZ(0)',
            opacity: platform.opacity,
            '--z': `${platform.zDepth}px`
          } as any}
        >
          <div
            className="relative"
            style={{
              width: '100%',
              height: '100%',
              background: `
                linear-gradient(90deg,
                  rgba(192,132,252,${platform.opacity * 0.8}) 0%,
                  rgba(147,51,234,${platform.opacity * 0.9}) 20%,
                  rgba(99,102,241,${platform.opacity * 0.95}) 50%,
                  rgba(147,51,234,${platform.opacity * 0.9}) 80%,
                  rgba(192,132,252,${platform.opacity * 0.8}) 100%
                )
              `,
              boxShadow: `
                inset 0 0 ${platform.height * 2}px rgba(192,132,252,${platform.opacity * 0.6}),
                0 0 ${platform.height * 0.5}px rgba(192,132,252,${platform.opacity * 0.8}),
                inset 0 -2px 4px rgba(0,0,0,0.3),
                inset 0 2px 4px rgba(255,255,255,0.2)
              `,
              filter: 'blur(1px) drop-shadow(0 0 5px rgba(192,132,252,0.6))',
              borderRadius: `${platform.height / 2}px`
            }}
          >
            {/* Platform highlight */}
            <div
              className="absolute inset-0"
            style={{ 
                background: `linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 50%)`,
                borderRadius: `${platform.height / 2}px`,
                mixBlendMode: 'screen'
              }}
            />
          </div>
        </div>
      ))}

      {/* Light rays - divine, ethereal */}
      {lightRays.map(ray => (
        <div
          key={ray.id}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-[ray-sweep-castle_linear_infinite] origin-center transform-style-3d"
          style={{
            width: `${ray.length}px`,
            height: '2px',
            animationDuration: `${ray.speed}s`,
            animationDelay: `${ray.delay}s`,
            transform: `translate(-50%, -50%) rotate(${ray.angle}deg) translateZ(0)`,
            background: `linear-gradient(to right, 
              transparent 0%, 
              rgba(255,255,255,${ray.intensity * 0.3}) 10%,
              rgba(192,132,252,${ray.intensity}) 30%,
              rgba(147,51,234,${ray.intensity * 1.2}) 50%,
              rgba(192,132,252,${ray.intensity}) 70%,
              rgba(255,255,255,${ray.intensity * 0.3}) 90%,
              transparent 100%
            )`,
            filter: 'blur(1px)',
            boxShadow: `0 0 ${ray.intensity * 30}px rgba(192,132,252,${ray.intensity * 0.8})`
          }}
        />
      ))}

      {/* Crystalline shards - ethereal, beautiful */}
      {crystalShards.map(shard => (
        <div
          key={shard.id}
          className="absolute animate-[crystal-drift-castle_linear_infinite] transform-style-3d"
          style={{
            left: `${shard.x}%`,
            top: '-100px',
            animationDuration: `${shard.duration}s`,
            animationDelay: `${shard.delay}s`,
            opacity: shard.opacity,
            '--z': `${shard.zDepth}px`
          } as any}
        >
          <div
            className="relative animate-[crystal-rotate-castle_linear_infinite]"
            style={{
              animationDuration: `${shard.rotSpeed}s`,
              width: `${shard.size}px`,
              height: `${shard.size}px`,
              transform: 'translate3d(0, 0, var(--z))'
            } as any}
          >
            <div
              className="relative flex items-center justify-center"
              style={{
                width: '100%',
                height: '100%',
                background: `
                  linear-gradient(135deg,
                    rgba(255,255,255,0.95) 0%,
                    rgba(250,232,255,0.9) 20%,
                    rgba(192,132,252,0.85) 40%,
                    rgba(147,51,234,0.8) 60%,
                    rgba(99,102,241,0.75) 80%,
                    rgba(67,56,202,0.7) 100%
                  )
                `,
                clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                filter: 'blur(0.5px)',
                boxShadow: `
                  inset 0 0 15px rgba(255,255,255,0.6),
                  0 0 ${shard.size * 0.4}px rgba(192,132,252,0.9),
                  0 0 ${shard.size * 0.6}px rgba(147,51,234,0.7),
                  0 0 ${shard.size * 0.8}px rgba(99,102,241,0.5)
                `
              }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(135deg, rgba(255,255,255,0.5) 0%, transparent 50%)`,
                  mixBlendMode: 'screen'
                }}
              />
            </div>
          </div>
        </div>
      ))}

      {/* Floating XIII symbols - cryptic, prestige (reduced) */}
      {xiiiSymbols.map(symbol => (
        <div
          key={symbol.id}
          className="absolute animate-[xiii-drift-castle_linear_infinite] transform-style-3d"
          style={{
            left: `${symbol.x}%`,
            top: '-150px',
            animationDuration: `${symbol.duration}s`,
            animationDelay: `${symbol.delay}s`,
            opacity: symbol.opacity,
            '--sway': `${symbol.sway}px`,
            '--z': `${symbol.zDepth}px`
          } as any}
        >
          <div
            className="relative animate-[xiii-rotate-castle_linear_infinite]"
            style={{
              animationDuration: `${symbol.rotSpeed}s`,
              fontSize: `${symbol.size}px`,
              transform: 'translate3d(0, 0, var(--z))'
            } as any}
          >
            <div className="font-serif font-black italic text-transparent bg-clip-text bg-gradient-to-br from-white via-purple-200 to-indigo-400 drop-shadow-[0_0_25px_rgba(192,132,252,0.9)]">
              XIII
        </div>
          </div>
        </div>
      ))}

      {/* Light vs Darkness particles - black and white motif */}
      {lightDarkParticles.map(particle => (
        <div
          key={particle.id}
          className="absolute animate-[lightdark-drift-castle_linear_infinite] rounded-full transform-style-3d"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            animationDuration: `${particle.duration}s`,
            animationDelay: `${particle.delay}s`,
            transform: 'translate(-50%, -50%) translateZ(0)',
            background: particle.isLight
              ? `radial-gradient(circle, rgba(255,255,255,${particle.glow}) 0%, rgba(250,232,255,${particle.glow * 0.9}) 40%, rgba(192,132,252,${particle.glow * 0.6}) 70%, transparent 100%)`
              : `radial-gradient(circle, rgba(0,0,0,${particle.glow}) 0%, rgba(17,24,39,${particle.glow * 0.9}) 40%, rgba(31,41,55,${particle.glow * 0.6}) 70%, transparent 100%)`,
            filter: 'blur(1px)',
            boxShadow: particle.isLight
              ? `0 0 ${particle.size * 8}px rgba(255,255,255,${particle.glow * 0.9}), 0 0 ${particle.size * 12}px rgba(192,132,252,${particle.glow * 0.7})`
              : `0 0 ${particle.size * 8}px rgba(0,0,0,${particle.glow * 0.9}), 0 0 ${particle.size * 12}px rgba(31,41,55,${particle.glow * 0.7})`,
            opacity: particle.glow
          }}
        />
      ))}

      {/* Ethereal particles - mystical, cryptic */}
      {etherealParticles.map(particle => (
        <div
          key={particle.id}
          className="absolute animate-[particle-drift-castle_linear_infinite] rounded-full transform-style-3d"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            animationDuration: `${particle.duration}s`,
            animationDelay: `${particle.delay}s`,
            transform: 'translate(-50%, -50%) translateZ(0)',
            background: `
              radial-gradient(circle, 
                rgba(255,255,255,${particle.glow}) 0%, 
                rgba(250,232,255,${particle.glow * 0.9}) 20%,
                rgba(192,132,252,${particle.glow * 0.8}) 40%,
                rgba(147,51,234,${particle.glow * 0.6}) 60%,
                rgba(99,102,241,${particle.glow * 0.4}) 80%,
                transparent 100%
              )
            `,
            filter: 'blur(1px)',
            boxShadow: `
              0 0 ${particle.size * 8}px rgba(255,255,255,${particle.glow * 0.9}),
              0 0 ${particle.size * 12}px rgba(192,132,252,${particle.glow * 0.7}),
              0 0 ${particle.size * 16}px rgba(147,51,234,${particle.glow * 0.5})
            `,
            opacity: particle.glow
          }}
        />
      ))}

      {/* Ornate patterns - Final Fantasy prestige */}
      {ornatePatterns.map(pattern => (
        <div
          key={pattern.id}
          className="absolute animate-[pattern-pulse-castle_linear_infinite] transform-style-3d"
          style={{
            left: `${pattern.x}%`,
            top: `${pattern.y}%`,
            width: `${pattern.size}px`,
            height: `${pattern.size}px`,
            animationDuration: `${pattern.pulseSpeed}s`,
            animationDelay: `${pattern.delay}s`,
            transform: 'translate(-50%, -50%) translateZ(0)',
            opacity: 0.15
          }}
        >
          <svg width="100%" height="100%" viewBox="0 0 100 100" className="drop-shadow-2xl">
            <defs>
              <linearGradient id={`pattern-castle-${pattern.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="30%" stopColor="#c084fc" />
                <stop offset="60%" stopColor="#9333ea" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>
            {/* Ornate castle pattern */}
            <path
              d="M50 5 L60 20 L50 35 L40 20 Z M50 65 L60 80 L50 95 L40 80 Z M5 50 L20 60 L35 50 L20 40 Z M65 50 L80 60 L95 50 L80 40 Z"
              fill="none"
              stroke={`url(#pattern-castle-${pattern.id})`}
              strokeWidth="2"
              opacity="0.7"
            />
            <circle cx="50" cy="50" r="40" fill="none" stroke={`url(#pattern-castle-${pattern.id})`} strokeWidth="1.5" opacity="0.5" />
          </svg>
        </div>
      ))}

      {/* Premium glass-like reflections */}
      <div className="absolute inset-0 opacity-[0.12] mix-blend-screen">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-purple-300/[0.2] via-indigo-300/[0.15] to-transparent"></div>
        <div className="absolute top-1/4 right-0 w-1/2 h-1/2 bg-gradient-to-bl from-white/[0.15] via-transparent to-transparent"></div>
      </div>

      {/* Subtle energy waves - ethereal */}
      <div className="absolute inset-0 opacity-[0.08]">
        <div className="absolute top-0 left-[-50%] w-[200%] h-full bg-[linear-gradient(90deg,transparent_0%,rgba(192,132,252,0.2)_50%,transparent_100%)] animate-[energy-wave-castle_12s_linear_infinite] mix-blend-screen"></div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .transform-style-3d { transform-style: preserve-3d; }
        @keyframes castle-light-pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        @keyframes castle-dark-pulse {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        @keyframes staircase-rotate {
          from { transform: translate(-50%, -50%) translateZ(0) rotateZ(0deg); }
          to { transform: translate(-50%, -50%) translateZ(0) rotateZ(360deg); }
        }
        @keyframes lightdark-drift-castle {
          0%, 100% { transform: translate(-50%, -50%) translateZ(0) translate(0, 0); opacity: 0.3; }
          25% { opacity: 0.9; }
          50% { transform: translate(-50%, -50%) translateZ(0) translate(35px, 35px); opacity: 1; }
          75% { opacity: 0.9; }
        }
        @keyframes pillar-glow {
          0%, 100% { opacity: 0.8; filter: brightness(1); }
          50% { opacity: 1; filter: brightness(1.2); }
        }
        @keyframes platform-float {
          0%, 100% { transform: translate(-50%, -50%) translateZ(0) translateY(0px); opacity: 0.8; }
          50% { transform: translate(-50%, -50%) translateZ(0) translateY(-8px); opacity: 1; }
        }
        @keyframes ray-sweep-castle {
          0% { transform: translate(-50%, -50%) rotate(0deg) translateZ(0); opacity: 0.5; }
          50% { opacity: 1; }
          100% { transform: translate(-50%, -50%) rotate(360deg) translateZ(0); opacity: 0.5; }
        }
        @keyframes crystal-drift-castle {
          0% { transform: translate3d(0, 0, var(--z)); opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { transform: translate3d(0, 150vh, var(--z)); opacity: 0; }
        }
        @keyframes crystal-rotate-castle {
          from { transform: rotate3d(0.7, 0.7, 0.3, 0deg); }
          to { transform: rotate3d(0.7, 0.7, 0.3, 360deg); }
        }
        @keyframes xiii-drift-castle {
          0% { transform: translate3d(0, 0, var(--z)); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translate3d(var(--sway), 150vh, var(--z)); opacity: 0; }
        }
        @keyframes xiii-rotate-castle {
          from { transform: rotate3d(0.5, 1, 0.3, 0deg); }
          to { transform: rotate3d(0.5, 1, 0.3, 360deg); }
        }
        @keyframes particle-drift-castle {
          0%, 100% { transform: translate(-50%, -50%) translateZ(0) translate(0, 0); opacity: 0.3; }
          25% { opacity: 0.9; }
          50% { transform: translate(-50%, -50%) translateZ(0) translate(35px, 35px); opacity: 1; }
          75% { opacity: 0.9; }
        }
        @keyframes pattern-pulse-castle {
          0%, 100% { transform: translate(-50%, -50%) translateZ(0) scale(1); opacity: 0.1; filter: brightness(1); }
          50% { transform: translate(-50%, -50%) translateZ(0) scale(1.12); opacity: 0.2; filter: brightness(1.3); }
        }
        @keyframes energy-wave-castle {
          0% { transform: translateX(0); }
          100% { transform: translateX(50%); }
        }
      `}} />
    </div>
  );
};

const TokyoEngine: React.FC<{ isMini?: boolean }> = ({ isMini }) => {
  // Crystal structures - geometric, glass-like, premium
  const crystals = useMemo(() => Array.from({ length: isMini ? 8 : 20 }).map((_, i) => ({
    id: `crystal-${i}`,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 30 + Math.random() * 60,
    rotation: Math.random() * 360,
    delay: Math.random() * -15,
    pulseSpeed: 4 + Math.random() * 6,
    sides: 6 + Math.floor(Math.random() * 4) // 6-9 sides for variety
  })), [isMini]);

  // Futuristic cityscape silhouettes - elegant, dark
  const buildings = useMemo(() => Array.from({ length: isMini ? 3 : 8 }).map((_, i) => ({
    id: `building-${i}`,
    x: Math.random() * 100,
    height: 20 + Math.random() * 40,
    width: 3 + Math.random() * 8,
    delay: Math.random() * -20,
    pulseSpeed: 3 + Math.random() * 4,
    glowIntensity: 0.3 + Math.random() * 0.4
  })), [isMini]);

  // Premium light particles - elegant, flowing
  const lightParticles = useMemo(() => Array.from({ length: isMini ? 25 : 60 }).map((_, i) => ({
    id: `light-${i}`,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 1.5 + Math.random() * 3,
    delay: Math.random() * -25,
    speed: 10 + Math.random() * 20,
    color: i % 4 === 0 ? 'rgba(147, 51, 234, 0.6)' : i % 4 === 1 ? 'rgba(34, 211, 238, 0.6)' : i % 4 === 2 ? 'rgba(236, 72, 153, 0.6)' : 'rgba(255, 255, 255, 0.4)'
  })), [isMini]);

  // Grid lines - sophisticated, premium
  const gridLines = useMemo(() => Array.from({ length: isMini ? 6 : 15 }).map((_, i) => ({
    id: `grid-${i}`,
    x: (i * 100) / (isMini ? 6 : 15),
    delay: Math.random() * -10,
    pulseSpeed: 3 + Math.random() * 4
  })), [isMini]);

  // Energy streams - flowing, elegant
  const energyStreams = useMemo(() => Array.from({ length: isMini ? 2 : 5 }).map((_, i) => ({
    id: `stream-${i}`,
    x: Math.random() * 100,
    delay: Math.random() * -12,
    speed: 25 + Math.random() * 35,
    width: 1.5 + Math.random() * 3
  })), [isMini]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden bg-black">
      {/* Deep onyx base with subtle gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#000000] via-[#050510] to-[#000000]"></div>
      
      {/* Sophisticated radial glows - premium lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[140%]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(147,51,234,0.2)_0%,rgba(34,211,238,0.1)_30%,rgba(0,0,0,0.7)_60%,transparent_100%)] animate-[pulse_10s_ease-in-out_infinite]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(236,72,153,0.15)_0%,transparent_50%)] animate-[pulse_14s_ease-in-out_infinite]"></div>
      </div>

      {/* Futuristic cityscape silhouettes - elegant, dark */}
      {!isMini && buildings.map(building => (
        <div
          key={building.id}
          className="absolute bottom-0 animate-[building-pulse_linear_infinite]"
          style={{ 
            left: `${building.x}%`,
            height: `${building.height}%`,
            width: `${building.width}px`,
            animationDuration: `${building.pulseSpeed}s`,
            animationDelay: `${building.delay}s`,
            background: `linear-gradient(to top, rgba(147,51,234,${building.glowIntensity}) 0%, rgba(34,211,238,${building.glowIntensity * 0.6}) 50%, transparent 100%)`,
            clipPath: 'polygon(0% 100%, 20% 80%, 40% 90%, 60% 70%, 80% 85%, 100% 100%)',
            filter: 'blur(1px)',
            boxShadow: `0 0 ${building.width * 3}px rgba(147,51,234,${building.glowIntensity * 0.5})`
          }}
        />
      ))}

      {/* Crystal structures - geometric, glass-like, premium */}
      {crystals.map(crystal => {
        const polygonPoints = Array.from({ length: crystal.sides }, (_, i) => {
          const angle = (i * 360) / crystal.sides;
          const rad = (angle * Math.PI) / 180;
          const x = 50 + 40 * Math.cos(rad);
          const y = 50 + 40 * Math.sin(rad);
          return `${x}% ${y}%`;
        }).join(', ');

        return (
          <div
            key={crystal.id}
            className="absolute animate-[crystal-pulse_linear_infinite]"
          style={{ 
              left: `${crystal.x}%`,
              top: `${crystal.y}%`,
              width: `${crystal.size}px`,
              height: `${crystal.size}px`,
              animationDuration: `${crystal.pulseSpeed}s`,
              animationDelay: `${crystal.delay}s`,
              transform: 'translate(-50%, -50%)',
              clipPath: `polygon(${polygonPoints})`,
              background: `linear-gradient(${crystal.rotation}deg, rgba(147,51,234,0.15) 0%, rgba(34,211,238,0.1) 50%, rgba(236,72,153,0.15) 100%)`,
              border: '1px solid rgba(147,51,234,0.3)',
              filter: 'blur(0.5px)',
              boxShadow: `0 0 ${crystal.size * 0.5}px rgba(147,51,234,0.4), inset 0 0 ${crystal.size * 0.3}px rgba(34,211,238,0.2)`
            }}
          />
        );
      })}

      {/* Premium light particles - elegant, flowing */}
      {lightParticles.map(particle => (
        <div
          key={particle.id}
          className="absolute animate-[particle-drift_linear_infinite] rounded-full"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            animationDuration: `${particle.speed}s`,
            animationDelay: `${particle.delay}s`,
            transform: 'translate(-50%, -50%)',
            background: `radial-gradient(circle, ${particle.color} 0%, transparent 70%)`,
            filter: 'blur(1px)',
            boxShadow: `0 0 ${particle.size * 3}px ${particle.color}`
          }}
        />
      ))}

      {/* Sophisticated grid pattern - premium, elegant */}
      {!isMini && gridLines.map(grid => (
        <div
          key={grid.id}
          className="absolute top-0 bottom-0 w-[1px] animate-[grid-pulse_linear_infinite]"
          style={{
            left: `${grid.x}%`,
            animationDuration: `${grid.pulseSpeed}s`,
            animationDelay: `${grid.delay}s`,
            background: 'linear-gradient(to bottom, transparent 0%, rgba(147,51,234,0.1) 20%, rgba(34,211,238,0.15) 50%, rgba(147,51,234,0.1) 80%, transparent 100%)',
            filter: 'blur(0.5px)'
          }}
        />
      ))}

      {/* Energy streams - flowing, elegant */}
      {!isMini && energyStreams.map(stream => (
        <div
          key={stream.id}
          className="absolute top-0 bottom-0 animate-[energy-flow_linear_infinite]"
          style={{ 
            left: `${stream.x}%`,
            width: `${stream.width}px`,
            animationDuration: `${stream.speed}s`,
            animationDelay: `${stream.delay}s`,
            background: 'linear-gradient(to bottom, transparent 0%, rgba(147,51,234,0.5) 20%, rgba(34,211,238,0.6) 50%, rgba(236,72,153,0.5) 80%, transparent 100%)',
            filter: 'blur(1.5px)',
            transform: 'translateX(-50%)',
            boxShadow: `0 0 ${stream.width * 4}px rgba(147,51,234,0.6)`
          }}
        />
      ))}

      {/* Glass-like surface reflections - premium depth */}
      <div className="absolute inset-0 opacity-[0.2]">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/[0.15] via-transparent to-transparent"></div>
        <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-gradient-to-tl from-white/[0.12] via-transparent to-transparent"></div>
      </div>

      {/* Subtle texture overlay - elegant refinement */}
      <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/diamond-upholstery.png')] mix-blend-overlay"></div>

      {/* Rotating spotlight - dramatic, premium */}
      {!isMini && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[90%] animate-[spotlight-rotate_25s_linear_infinite]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(147,51,234,0.25)_0%,rgba(34,211,238,0.15)_40%,transparent_70%)]"></div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes crystal-pulse {
          0%, 100% { opacity: 0.4; transform: translate(-50%, -50%) scale(1) rotate(0deg); }
          50% { opacity: 0.8; transform: translate(-50%, -50%) scale(1.05) rotate(5deg); }
        }
        @keyframes particle-drift {
          0% { transform: translate(-50%, -50%) translate(0, 0) rotate(0deg); opacity: 0.3; }
          25% { opacity: 0.9; }
          50% { transform: translate(-50%, -50%) translate(30px, 30px) rotate(180deg); opacity: 0.6; }
          75% { opacity: 0.9; }
          100% { transform: translate(-50%, -50%) translate(0, 0) rotate(360deg); opacity: 0.3; }
        }
        @keyframes building-pulse {
          0%, 100% { opacity: 0.5; filter: blur(1px); }
          50% { opacity: 0.9; filter: blur(0.5px); }
        }
        @keyframes grid-pulse {
          0%, 100% { opacity: 0.05; }
          50% { opacity: 0.15; }
        }
        @keyframes energy-flow {
          0% { transform: translateX(-50%) translateY(-100%); opacity: 0; }
          10% { opacity: 0.7; }
          90% { opacity: 0.7; }
          100% { transform: translateX(-50%) translateY(100vh); opacity: 0; }
        }
        @keyframes spotlight-rotate {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg); }
        }
      `}} />
    </div>
  );
};

const FeltTextureLayer: React.FC = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-100">
    <div className="absolute inset-0 opacity-[0.25] mix-blend-overlay" 
         style={{ 
           backgroundImage: 'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)', 
           backgroundSize: '3px 3px' 
         }}></div>
    
    <svg width="100%" height="100%" className="absolute inset-0 opacity-[1] mix-blend-soft-light">
      <filter id="felt-specular-hd">
        <feTurbulence type="fractalNoise" baseFrequency="0.98" numOctaves="5" stitchTiles="stitch" result="fineNoise" />
        <feSpecularLighting in="fineNoise" surfaceScale="2.5" specularConstant="1.4" specularExponent="45" lightingColor="#ffffff" result="fineSpec">
          <feDistantLight azimuth="45" elevation="65" />
        </feSpecularLighting>
        <feComposite in="fineSpec" in2="fineNoise" operator="arithmetic" k1="0.4" k2="0.6" k3="0" k4="0" />
        <feColorMatrix type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0.9 0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#felt-specular-hd)" />
    </svg>

    <div className="absolute inset-0 opacity-[0.2] bg-[url('https://www.transparenttextures.com/patterns/fabric-of-squares.png')] mix-blend-color-burn"></div>
  </div>
);

const MadnessEngine: React.FC<{ isMini?: boolean }> = ({ isMini }) => {
  // Obsidian shards - sharp, dangerous, elegant
  const shards = useMemo(() => Array.from({ length: isMini ? 6 : 15 }).map((_, i) => ({
    id: `shard-${i}`,
    x: Math.random() * 100,
    y: Math.random() * 100,
    rotation: Math.random() * 360,
    size: 20 + Math.random() * 40,
    delay: Math.random() * -20,
    speed: 15 + Math.random() * 25,
    opacity: 0.08 + Math.random() * 0.12
  })), [isMini]);

  // Crystalline particles - elegant, flowing
  const crystals = useMemo(() => Array.from({ length: isMini ? 30 : 80 }).map((_, i) => ({
    id: `crystal-${i}`,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 1.5 + Math.random() * 3,
    delay: Math.random() * -30,
    speed: 8 + Math.random() * 15,
    rotation: Math.random() * 360,
    glow: 0.3 + Math.random() * 0.7
  })), [isMini]);

  // Hexagonal grid pattern - premium, sophisticated
  const hexagons = useMemo(() => Array.from({ length: isMini ? 8 : 20 }).map((_, i) => ({
    id: `hex-${i}`,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 30 + Math.random() * 50,
    delay: Math.random() * -15,
    pulseSpeed: 3 + Math.random() * 4
  })), [isMini]);

  // Flowing energy streams - sexy, alluring
  const streams = useMemo(() => Array.from({ length: isMini ? 2 : 5 }).map((_, i) => ({
    id: `stream-${i}`,
    x: Math.random() * 100,
    delay: Math.random() * -10,
    speed: 20 + Math.random() * 30,
    width: 2 + Math.random() * 4
  })), [isMini]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden bg-black">
      {/* Deep obsidian base with glass-like reflections */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#000000] via-[#0a0000] to-[#000000]"></div>
      
      {/* Sophisticated radial glow - elegant and deadly */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,0,0,0.25)_0%,rgba(75,0,0,0.15)_30%,rgba(0,0,0,0.8)_70%,transparent_100%)] animate-[pulse_8s_ease-in-out_infinite]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(220,20,60,0.15)_0%,transparent_50%)] animate-[pulse_12s_ease-in-out_infinite]"></div>
      </div>

      {/* Hexagonal grid overlay - premium geometric pattern */}
      {hexagons.map(hex => (
        <div
          key={hex.id}
          className="absolute opacity-[0.03] animate-[hex-pulse_linear_infinite]"
          style={{
            left: `${hex.x}%`,
            top: `${hex.y}%`,
            width: `${hex.size}px`,
            height: `${hex.size}px`,
            animationDuration: `${hex.pulseSpeed}s`,
            animationDelay: `${hex.delay}s`,
            transform: 'translate(-50%, -50%)',
            clipPath: 'polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%)',
            background: 'linear-gradient(135deg, rgba(139,0,0,0.2) 0%, transparent 100%)',
            border: '1px solid rgba(139,0,0,0.1)'
          }}
        />
      ))}

      {/* Obsidian shards - sharp, dangerous, beautiful */}
      {!isMini && shards.map(shard => (
        <div
          key={shard.id}
          className="absolute animate-[shard-float_linear_infinite]"
          style={{ 
            left: `${shard.x}%`,
            top: `${shard.y}%`,
            width: `${shard.size}px`,
            height: `${shard.size}px`,
            animationDuration: `${shard.speed}s`,
            animationDelay: `${shard.delay}s`,
            opacity: shard.opacity,
            clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
            background: `linear-gradient(${shard.rotation}deg, rgba(0,0,0,0.9) 0%, rgba(139,0,0,0.3) 50%, rgba(0,0,0,0.9) 100%)`,
            filter: 'drop-shadow(0 0 8px rgba(139,0,0,0.4))',
            border: '1px solid rgba(139,0,0,0.2)',
            transform: `translate(-50%, -50%) rotate(${shard.rotation}deg)`
          }}
        />
      ))}

      {/* Crystalline particles - elegant, flowing, sexy */}
      {crystals.map(crystal => (
        <div
          key={crystal.id}
          className="absolute animate-[crystal-drift_linear_infinite]"
          style={{ 
            left: `${crystal.x}%`,
            top: `${crystal.y}%`,
            width: `${crystal.size}px`,
            height: `${crystal.size}px`,
            animationDuration: `${crystal.speed}s`,
            animationDelay: `${crystal.delay}s`,
            transform: `translate(-50%, -50%) rotate(${crystal.rotation}deg)`,
            background: `radial-gradient(circle, rgba(220,20,60,${crystal.glow}) 0%, rgba(139,0,0,0.3) 50%, transparent 100%)`,
            borderRadius: '50%',
            filter: 'blur(1px)',
            boxShadow: `0 0 ${crystal.size * 2}px rgba(220,20,60,${crystal.glow * 0.5})`
          }}
        />
      ))}

      {/* Flowing energy streams - alluring, smooth */}
      {!isMini && streams.map(stream => (
        <div
          key={stream.id}
          className="absolute top-0 bottom-0 animate-[stream-flow_linear_infinite]"
          style={{
            left: `${stream.x}%`,
            width: `${stream.width}px`,
            animationDuration: `${stream.speed}s`,
            animationDelay: `${stream.delay}s`,
            background: 'linear-gradient(to bottom, transparent 0%, rgba(220,20,60,0.4) 20%, rgba(139,0,0,0.6) 50%, rgba(220,20,60,0.4) 80%, transparent 100%)',
            filter: 'blur(2px)',
            transform: 'translateX(-50%)',
            boxShadow: `0 0 ${stream.width * 3}px rgba(220,20,60,0.5)`
          }}
        />
      ))}

      {/* Glass-like surface reflections - premium depth */}
      <div className="absolute inset-0 opacity-[0.15]">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/[0.1] via-transparent to-transparent"></div>
        <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-gradient-to-tl from-white/[0.08] via-transparent to-transparent"></div>
      </div>

      {/* Subtle texture overlay - elegant refinement */}
      <div className="absolute inset-0 opacity-[0.02] bg-[url('https://www.transparenttextures.com/patterns/diamond-upholstery.png')] mix-blend-overlay"></div>

      {/* Animated spotlight - dramatic, badass */}
      {!isMini && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] animate-[spotlight-sweep_20s_linear_infinite]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(220,20,60,0.2)_0%,transparent_70%)]"></div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shard-float {
          0%, 100% { transform: translate(-50%, -50%) translateY(0px) rotate(0deg); }
          50% { transform: translate(-50%, -50%) translateY(-10px) rotate(5deg); }
        }
        @keyframes crystal-drift {
          0% { transform: translate(-50%, -50%) rotate(0deg) translate(0, 0); opacity: 0.3; }
          25% { opacity: 0.8; }
          50% { transform: translate(-50%, -50%) rotate(180deg) translate(20px, 20px); opacity: 0.6; }
          75% { opacity: 0.8; }
          100% { transform: translate(-50%, -50%) rotate(360deg) translate(0, 0); opacity: 0.3; }
        }
        @keyframes hex-pulse {
          0%, 100% { opacity: 0.02; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.06; transform: translate(-50%, -50%) scale(1.1); }
        }
        @keyframes stream-flow {
          0% { transform: translateX(-50%) translateY(-100%); opacity: 0; }
          10% { opacity: 0.6; }
          90% { opacity: 0.6; }
          100% { transform: translateX(-50%) translateY(100vh); opacity: 0; }
        }
        @keyframes spotlight-sweep {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg); }
        }
      `}} />
    </div>
  );
};

const SpaceEngine: React.FC<{ isMini?: boolean }> = ({ isMini }) => {
  const stars = useMemo(() => Array.from({ length: isMini ? 40 : 180 }).map((_, i) => ({
    id: `star-natural-${i}`,
    left: Math.random() * 100,
    top: Math.random() * 100,
    size: Math.random() < 0.8 ? Math.random() * 1.5 + 0.5 : Math.random() * 3 + 1,
    twinkleDelay: Math.random() * -20,
    twinkleDuration: 3 + Math.random() * 7,
    opacity: 0.2 + Math.random() * 0.7,
    glow: Math.random() > 0.9,
    depth: i % 3 
  })), [isMini]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden bg-black">
      <div className="absolute inset-0 opacity-[0.4] mix-blend-screen">
          <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] bg-[radial-gradient(ellipse_at_30%_40%,rgba(67,56,202,0.15)_0%,transparent_50%),radial-gradient(ellipse_at_70%_60%,rgba(88,28,135,0.1)_0%,transparent_50%)] animate-[nebula-drift_60s_infinite_alternate_ease-in-out]"></div>
      </div>

      {stars.map(s => (
        <div 
          key={s.id} 
          className={`absolute rounded-full bg-white animate-natural-twinkle`}
          style={{ 
            left: `${s.left}%`, 
            top: `${s.top}%`, 
            width: `${s.size}px`, 
            height: `${s.size}px`, 
            opacity: s.opacity,
            animationDelay: `${s.twinkleDelay}s`, 
            animationDuration: `${s.twinkleDuration}s`,
            boxShadow: s.glow ? `0 0 ${s.size * 3}px ${s.size}px rgba(255,255,255,0.4)` : 'none',
            filter: s.depth === 0 ? 'blur(0.5px)' : 'none'
          }} 
        />
      ))}

      {!isMini && Array.from({ length: 2 }).map((_, i) => (
          <div 
            key={`shooting-${i}`}
            className="absolute top-[-5%] left-[-5%] w-[2px] h-[100px] bg-gradient-to-t from-transparent via-white to-white opacity-0 animate-shooting-star"
            style={{ animationDelay: `${i * 15 + 5}s` }}
          ></div>
      ))}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes natural-twinkle {
          0%, 100% { opacity: 0.3; transform: scale(0.85); filter: brightness(0.8); }
          50% { opacity: 1; transform: scale(1); filter: brightness(1.2); }
        }
        @keyframes nebula-drift {
          from { transform: translate(-2%, -2%) scale(1); }
          to { transform: translate(2%, 2%) scale(1.1); }
        }
        @keyframes shooting-star {
          0% { transform: translateX(0) translateY(0) rotate(45deg); opacity: 0; }
          1% { opacity: 1; }
          5% { transform: translateX(80vw) translateY(80vh) rotate(45deg); opacity: 0; }
          100% { opacity: 0; }
        }
      `}} />
    </div>
  );
};

const LotusForestEngine: React.FC<{ isMini?: boolean }> = ({ isMini }) => {
  const suits = ['SPADE', 'HEART', 'CLUB', 'DIAMOND'];
  
  // Floating playing cards - mystical, premium
  const floatingCards = useMemo(() => Array.from({ length: isMini ? 12 : 30 }).map((_, i) => ({
    id: `card-${i}`,
    type: suits[i % 4],
    x: Math.random() * 100,
    y: Math.random() * 80,
    rotation: Math.random() * 360,
    delay: Math.random() * -30,
    duration: 20 + Math.random() * 25,
    size: 30 + Math.random() * 40,
    zDepth: Math.floor(Math.random() * 1000),
    swayX: (Math.random() - 0.5) * 200,
    isRed: i % 2 === 0
  })), [isMini]);

  // Improved suit paths with better spade shape
  const SUIT_PATHS: Record<string, string> = {
    SPADE: "M50 2 C60 25 85 40 75 60 C70 70 60 75 50 70 C40 75 30 70 25 60 C15 40 40 25 50 2 M50 70 L45 90 L55 90 Z",
    HEART: "M50 30 C50 10 10 10 10 45 C10 75 50 95 50 95 C50 95 90 75 90 45 C90 10 50 10 50 30 Z",
    CLUB: "M50 25 A18 18 0 1 1 68 43 A18 18 0 1 1 55 65 L55 85 L65 95 L35 95 L45 85 L45 65 A18 18 0 1 1 32 43 A18 18 0 1 1 50 25 Z",
    DIAMOND: "M50 5 L90 50 L50 95 L10 50 Z"
  };

  // Glowing lotus flowers - premium, mystical
  const lotusFlowers = useMemo(() => Array.from({ length: isMini ? 4 : 10 }).map((_, i) => ({
    id: `lotus-${i}`,
    x: Math.random() * 100,
    y: 30 + Math.random() * 50,
    size: 40 + Math.random() * 60,
    delay: Math.random() * -15,
    pulseSpeed: 3 + Math.random() * 4,
    isWhite: i % 3 === 0,
    petals: 8 + Math.floor(Math.random() * 4)
  })), [isMini]);

  // Trees - tall silhouettes with roots
  const trees = useMemo(() => Array.from({ length: isMini ? 3 : 8 }).map((_, i) => ({
    id: `tree-${i}`,
    x: Math.random() * 100,
    height: 40 + Math.random() * 50,
    width: 8 + Math.random() * 15,
    delay: Math.random() * -10,
    branchCount: 3 + Math.floor(Math.random() * 4)
  })), [isMini]);

  // Fireflies/sparkles - magical particles
  const fireflies = useMemo(() => Array.from({ length: isMini ? 20 : 50 }).map((_, i) => ({
    id: `firefly-${i}`,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 2 + Math.random() * 4,
    delay: Math.random() * -20,
    speed: 8 + Math.random() * 15,
    glow: 0.5 + Math.random() * 0.5
  })), [isMini]);

  // Vines and foliage - natural elements
  const vines = useMemo(() => Array.from({ length: isMini ? 6 : 15 }).map((_, i) => ({
    id: `vine-${i}`,
    x: Math.random() * 100,
    y: Math.random() * 100,
    length: 30 + Math.random() * 50,
    angle: Math.random() * 360,
    delay: Math.random() * -12,
    swaySpeed: 4 + Math.random() * 6
  })), [isMini]);

  // Golden ornate frames - Kingdom Hearts aesthetic
  const goldenFrames = useMemo(() => Array.from({ length: isMini ? 2 : 4 }).map((_, i) => ({
    id: `frame-${i}`,
    side: i % 2 === 0 ? 'left' : 'right',
    delay: Math.random() * -8,
    glowSpeed: 2 + Math.random() * 3
  })), [isMini]);

  // Water/pond at bottom with lily pads
  const lilyPads = useMemo(() => Array.from({ length: isMini ? 3 : 8 }).map((_, i) => ({
    id: `lily-${i}`,
    x: Math.random() * 100,
    y: 85 + Math.random() * 10,
    size: 20 + Math.random() * 30,
    delay: Math.random() * -10,
    floatSpeed: 3 + Math.random() * 4
  })), [isMini]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden bg-[#0a1f14]">
      {/* Dark forest base - deep green/teal */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a1f14] via-[#0d2e1f] to-[#051a0f]"></div>
      
      {/* Mystical atmospheric glow - Kingdom Hearts style */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.2)_0%,rgba(20,184,166,0.15)_30%,rgba(0,0,0,0.6)_60%,transparent_100%)] animate-[pulse_8s_ease-in-out_infinite]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(182,227,143,0.15)_0%,rgba(16,185,129,0.1)_40%,transparent_70%)] animate-[pulse_12s_ease-in-out_infinite]"></div>
      </div>

      {/* Trees - tall silhouettes with roots and branches */}
      {!isMini && trees.map(tree => (
        <div key={tree.id}>
          {/* Tree trunk */}
          <div
            className="absolute bottom-0"
                style={{ 
              left: `${tree.x}%`,
              height: `${tree.height}%`,
              width: `${tree.width}px`,
              background: `linear-gradient(to top, rgba(5,26,15,0.9) 0%, rgba(10,31,20,0.8) 50%, rgba(13,46,31,0.7) 100%)`,
              clipPath: 'polygon(30% 0%, 70% 0%, 75% 100%, 60% 100%, 55% 95%, 45% 95%, 40% 100%, 25% 100%)',
              filter: 'blur(0.5px)',
              boxShadow: `inset 0 0 ${tree.width * 2}px rgba(16,185,129,0.2)`
            }}
          />
          {/* Tree roots */}
          <div
            className="absolute bottom-0"
            style={{
              left: `${tree.x}%`,
              width: `${tree.width * 2}px`,
              height: `${tree.height * 0.15}%`,
              transform: 'translateX(-50%)',
              background: `radial-gradient(ellipse, rgba(5,26,15,0.8) 0%, transparent 70%)`,
              clipPath: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)',
              filter: 'blur(1px)'
            }}
          />
          {/* Tree branches */}
          {Array.from({ length: tree.branchCount }).map((_, bi) => (
            <div
              key={`branch-${bi}`}
              className="absolute"
              style={{
                left: `${tree.x}%`,
                bottom: `${(bi + 1) * (tree.height / (tree.branchCount + 1))}%`,
                width: `${tree.width * (1.5 + bi * 0.3)}px`,
                height: `${tree.width * 0.8}px`,
                transform: `translateX(-50%) rotate(${(bi % 2 === 0 ? 1 : -1) * (15 + bi * 5)}deg)`,
                background: `linear-gradient(${bi % 2 === 0 ? '135deg' : '45deg'}, rgba(5,26,15,0.9) 0%, transparent 100%)`,
                clipPath: 'polygon(0% 50%, 100% 0%, 100% 100%)',
                filter: 'blur(0.5px)'
              }}
            />
          ))}
        </div>
      ))}

      {/* Glowing lotus flowers - white and pink/purple */}
      {lotusFlowers.map(lotus => (
        <div
          key={lotus.id}
          className="absolute animate-[lotus-pulse_linear_infinite]"
          style={{
            left: `${lotus.x}%`,
            top: `${lotus.y}%`,
            width: `${lotus.size}px`,
            height: `${lotus.size}px`,
            animationDuration: `${lotus.pulseSpeed}s`,
            animationDelay: `${lotus.delay}s`,
            transform: 'translate(-50%, -50%)'
          }}
        >
          {/* Lotus petals */}
          {Array.from({ length: lotus.petals }).map((_, pi) => {
            const angle = (pi * 360) / lotus.petals;
            return (
              <div
                key={`petal-${pi}`}
                className="absolute"
                style={{
                  width: `${lotus.size * 0.4}px`,
                  height: `${lotus.size * 0.3}px`,
                  left: '50%',
                  top: '50%',
                  transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-${lotus.size * 0.25}px)`,
                  background: lotus.isWhite
                    ? `radial-gradient(ellipse, rgba(255,255,255,0.9) 0%, rgba(182,227,143,0.6) 50%, transparent 100%)`
                    : `radial-gradient(ellipse, rgba(236,72,153,0.8) 0%, rgba(139,92,246,0.6) 50%, transparent 100%)`,
                  clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                  filter: `blur(1px) drop-shadow(0 0 ${lotus.size * 0.1}px ${lotus.isWhite ? 'rgba(255,255,255,0.8)' : 'rgba(236,72,153,0.8)'})`,
                  boxShadow: `0 0 ${lotus.size * 0.15}px ${lotus.isWhite ? 'rgba(255,255,255,0.6)' : 'rgba(236,72,153,0.6)'}`
                }}
              />
            );
          })}
          {/* Lotus center */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: `${lotus.size * 0.2}px`,
              height: `${lotus.size * 0.2}px`,
              background: `radial-gradient(circle, ${lotus.isWhite ? 'rgba(251,191,36,0.9)' : 'rgba(236,72,153,0.9)'} 0%, transparent 70%)`,
              boxShadow: `0 0 ${lotus.size * 0.2}px ${lotus.isWhite ? 'rgba(251,191,36,0.8)' : 'rgba(236,72,153,0.8)'}`
            }}
          />
        </div>
      ))}

      {/* Floating playing cards - mystical, rotating */}
      {floatingCards.map(card => (
        <div
          key={card.id}
          className="absolute animate-[card-float_linear_infinite]"
          style={{
            left: `${card.x}%`,
            top: `${card.y}%`,
            width: `${card.size * 0.72}px`,
            height: `${card.size}px`,
            animationDuration: `${card.duration}s`,
            animationDelay: `${card.delay}s`,
            transform: `translate(-50%, -50%) rotate(${card.rotation}deg)`,
            transformStyle: 'preserve-3d',
            opacity: 0.7,
            '--sway': `${card.swayX}px`,
            '--z': `${card.zDepth}px`
          } as any}
                >
                    <div 
            className="relative flex items-center justify-center rounded-sm border border-white/40 shadow-lg backdrop-blur-sm"
                        style={{ 
              width: '100%',
              height: '100%',
              background: card.isRed
                ? 'linear-gradient(145deg, rgba(239,68,68,0.9) 0%, rgba(220,38,38,0.8) 100%)'
                : 'linear-gradient(145deg, rgba(16,185,129,0.9) 0%, rgba(5,150,105,0.8) 100%)',
              boxShadow: `0 0 ${card.size * 0.2}px ${card.isRed ? 'rgba(239,68,68,0.6)' : 'rgba(16,185,129,0.6)'}`
            }}
          >
            <svg width="70%" height="70%" viewBox="0 0 100 100" className="opacity-90 drop-shadow-lg">
                            <path 
                d={SUIT_PATHS[card.type] || SUIT_PATHS.SPADE}
                fill={card.isRed ? 'rgba(220,38,38,0.9)' : 'rgba(5,150,105,0.9)'}
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="1"
                            />
                        </svg>
                    </div>
                </div>
      ))}

      {/* Fireflies/sparkles - magical particles */}
      {fireflies.map(firefly => (
        <div
          key={firefly.id}
          className="absolute animate-[firefly-drift_linear_infinite] rounded-full"
          style={{
            left: `${firefly.x}%`,
            top: `${firefly.y}%`,
            width: `${firefly.size}px`,
            height: `${firefly.size}px`,
            animationDuration: `${firefly.speed}s`,
            animationDelay: `${firefly.delay}s`,
            transform: 'translate(-50%, -50%)',
            background: `radial-gradient(circle, rgba(182,227,143,${firefly.glow}) 0%, rgba(16,185,129,${firefly.glow * 0.6}) 50%, transparent 100%)`,
            filter: 'blur(0.5px)',
            boxShadow: `0 0 ${firefly.size * 4}px rgba(182,227,143,${firefly.glow * 0.8})`
          }}
        />
      ))}

      {/* Vines and foliage - natural elements */}
      {vines.map(vine => (
        <div
          key={vine.id}
          className="absolute animate-[vine-sway_linear_infinite]"
          style={{
            left: `${vine.x}%`,
            top: `${vine.y}%`,
            width: `${vine.length}px`,
            height: `${vine.length * 0.15}px`,
            animationDuration: `${vine.swaySpeed}s`,
            animationDelay: `${vine.delay}s`,
            transform: `translate(-50%, -50%) rotate(${vine.angle}deg)`,
            background: `linear-gradient(90deg, rgba(16,185,129,0.6) 0%, rgba(5,150,105,0.8) 50%, rgba(16,185,129,0.6) 100%)`,
            borderRadius: `${vine.length * 0.15}px`,
            filter: 'blur(1px)',
            boxShadow: `0 0 ${vine.length * 0.2}px rgba(16,185,129,0.4)`
          }}
        />
      ))}

      {/* Golden ornate frames - Kingdom Hearts aesthetic */}
      {!isMini && goldenFrames.map(frame => (
        <div
          key={frame.id}
          className="absolute top-0 bottom-0 animate-[frame-glow_linear_infinite]"
          style={{
            [frame.side]: '5%',
            width: '3px',
            animationDuration: `${frame.glowSpeed}s`,
            animationDelay: `${frame.delay}s`,
            background: `linear-gradient(to bottom, transparent 0%, rgba(251,191,36,0.6) 20%, rgba(251,191,36,0.8) 50%, rgba(251,191,36,0.6) 80%, transparent 100%)`,
            boxShadow: `
              0 0 10px rgba(251,191,36,0.6),
              inset 0 0 20px rgba(251,191,36,0.3)
            `,
            clipPath: 'polygon(0% 10%, 100% 0%, 100% 20%, 0% 30%, 0% 70%, 100% 80%, 100% 100%, 0% 90%)'
          }}
        />
      ))}

      {/* Water/pond at bottom with lily pads */}
      {!isMini && (
        <div className="absolute bottom-0 left-0 right-0 h-[15%] bg-gradient-to-t from-[#0a2e1f]/80 via-[#0d2e1f]/60 to-transparent">
          <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/water.png')] mix-blend-overlay"></div>
            </div>
      )}
      {lilyPads.map(lily => (
        <div
          key={lily.id}
          className="absolute animate-[lily-float_linear_infinite]"
          style={{
            left: `${lily.x}%`,
            top: `${lily.y}%`,
            width: `${lily.size}px`,
            height: `${lily.size * 0.8}px`,
            animationDuration: `${lily.floatSpeed}s`,
            animationDelay: `${lily.delay}s`,
            transform: 'translate(-50%, -50%)',
            background: `radial-gradient(ellipse, rgba(16,185,129,0.7) 0%, rgba(5,150,105,0.8) 50%, rgba(10,31,20,0.9) 100%)`,
            borderRadius: '50%',
            filter: 'blur(1px)',
            boxShadow: `0 0 ${lily.size * 0.3}px rgba(16,185,129,0.4)`
          }}
        />
      ))}

      {/* Subtle mist/fog - mystical atmosphere */}
      <div className="absolute inset-0 opacity-[0.15] bg-gradient-to-b from-transparent via-transparent to-[#0a1f14]"></div>

      {/* Glass-like reflections - premium depth */}
      <div className="absolute inset-0 opacity-[0.1]">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/[0.08] via-transparent to-transparent"></div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes card-float {
          0% { transform: translate(-50%, -50%) translate3d(0, 0, var(--z)) rotate(0deg); opacity: 0.5; }
          25% { opacity: 0.8; }
          50% { transform: translate(-50%, -50%) translate3d(var(--sway), -20px, var(--z)) rotate(180deg); opacity: 0.7; }
          75% { opacity: 0.8; }
          100% { transform: translate(-50%, -50%) translate3d(0, 0, var(--z)) rotate(360deg); opacity: 0.5; }
        }
        @keyframes lotus-pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.8; }
          50% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
        }
        @keyframes firefly-drift {
          0% { transform: translate(-50%, -50%) translate(0, 0); opacity: 0.4; }
          25% { opacity: 0.9; }
          50% { transform: translate(-50%, -50%) translate(30px, 30px); opacity: 0.7; }
          75% { opacity: 0.9; }
          100% { transform: translate(-50%, -50%) translate(0, 0); opacity: 0.4; }
        }
        @keyframes vine-sway {
          0%, 100% { transform: translate(-50%, -50%) rotate(0deg); opacity: 0.6; }
          50% { transform: translate(-50%, -50%) rotate(5deg); opacity: 0.9; }
        }
        @keyframes frame-glow {
          0%, 100% { opacity: 0.5; filter: brightness(1); }
          50% { opacity: 0.9; filter: brightness(1.3); }
        }
        @keyframes lily-float {
          0%, 100% { transform: translate(-50%, -50%) translateY(0px); opacity: 0.7; }
          50% { transform: translate(-50%, -50%) translateY(-5px); opacity: 0.9; }
        }
      `}} />
    </div>
  );
};

const GoldenEmperorEngine: React.FC<{ isMini?: boolean }> = ({ isMini }) => {
  // Chinese lucky symbols - 福 (luck), 財 (wealth), 龍 (dragon), 十三 (thirteen)
  const luckySymbols = useMemo(() => Array.from({ length: isMini ? 12 : 35 }).map((_, i) => ({
    id: `symbol-${i}`,
    x: Math.random() * 100,
    delay: Math.random() * -180,
    duration: 120 + Math.random() * 100,
    size: 30 + Math.random() * 50,
    rotSpeed: 60 + Math.random() * 50,
    opacity: 0.2 + Math.random() * 0.3,
    type: i % 4 === 0 ? 'XIII' : i % 4 === 1 ? '福' : i % 4 === 2 ? '財' : '龍',
    sway: (Math.random() - 0.5) * 300,
    zDepth: Math.floor(Math.random() * 1500)
  })), [isMini]);

  // Dragons - flowing, majestic
  const dragons = useMemo(() => Array.from({ length: isMini ? 1 : 3 }).map((_, i) => ({
    id: `dragon-${i}`,
    x: -20 + i * 40,
    y: 20 + Math.random() * 40,
    delay: Math.random() * -30,
    duration: 40 + Math.random() * 20,
    size: 80 + Math.random() * 100,
    segments: 8 + Math.floor(Math.random() * 6),
    pathOffset: Math.random() * 100
  })), [isMini]);

  // Red envelopes - New Year tradition
  const redEnvelopes = useMemo(() => Array.from({ length: isMini ? 6 : 20 }).map((_, i) => ({
    id: `envelope-${i}`,
    x: Math.random() * 100,
    delay: Math.random() * -60,
    duration: 25 + Math.random() * 20,
    size: 25 + Math.random() * 35,
    rotSpeed: 20 + Math.random() * 15,
    opacity: 0.25 + Math.random() * 0.3,
    sway: (Math.random() - 0.5) * 150,
    zDepth: Math.floor(Math.random() * 800)
  })), [isMini]);

  // Gold coins - prosperity
  const goldCoins = useMemo(() => Array.from({ length: isMini ? 8 : 25 }).map((_, i) => ({
    id: `coin-${i}`,
    x: Math.random() * 100,
    delay: Math.random() * -90,
    duration: 30 + Math.random() * 25,
    size: 20 + Math.random() * 30,
    rotSpeed: 10 + Math.random() * 8,
    opacity: 0.3 + Math.random() * 0.4,
    sway: (Math.random() - 0.5) * 200,
    zDepth: Math.floor(Math.random() * 1000)
  })), [isMini]);

  // Fireworks/sparkles - celebration
  const sparkles = useMemo(() => Array.from({ length: isMini ? 15 : 40 }).map((_, i) => ({
    id: `sparkle-${i}`,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 2 + Math.random() * 5,
    delay: Math.random() * -15,
    speed: 3 + Math.random() * 5,
    glow: 0.6 + Math.random() * 0.4
  })), [isMini]);

  // Ornate patterns - Final Fantasy prestige
  const ornatePatterns = useMemo(() => Array.from({ length: isMini ? 2 : 6 }).map((_, i) => ({
    id: `pattern-${i}`,
    x: i % 2 === 0 ? 10 : 90,
    y: 20 + (Math.floor(i / 2) * 30),
    size: 60 + Math.random() * 40,
    delay: Math.random() * -10,
    pulseSpeed: 4 + Math.random() * 3
  })), [isMini]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden bg-[#1a0000]">
      {/* Deep red base - Chinese New Year */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#4a0000] via-[#2a0000] to-[#0a0000]"></div>
      
      {/* Atmospheric glow - red and gold */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(220,38,38,0.3)_0%,rgba(185,28,28,0.2)_30%,rgba(0,0,0,0.5)_60%,transparent_100%)] animate-[pulse_10s_ease-in-out_infinite]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(251,191,36,0.25)_0%,rgba(234,179,8,0.15)_40%,transparent_70%)] animate-[pulse_14s_ease-in-out_infinite]"></div>
      </div>

      {/* Flowing dragons - majestic, powerful */}
      {dragons.map(dragon => (
        <div
          key={dragon.id}
          className="absolute animate-[dragon-flow_linear_infinite]"
                style={{ 
            left: `${dragon.x}%`,
            top: `${dragon.y}%`,
            animationDuration: `${dragon.duration}s`,
            animationDelay: `${dragon.delay}s`,
            transform: 'translate(-50%, -50%)',
            width: `${dragon.size}px`,
            height: `${dragon.size * 0.3}px`
          }}
        >
          {Array.from({ length: dragon.segments }).map((_, si) => {
            const segmentOffset = (si / dragon.segments) * 100;
            return (
              <div
                key={`segment-${si}`}
                className="absolute"
                style={{
                  left: `${segmentOffset}%`,
                  top: '50%',
                  transform: `translate(-50%, -50%) translateY(${Math.sin((si / dragon.segments) * Math.PI * 2) * 15}px)`,
                  width: `${dragon.size / dragon.segments}px`,
                  height: `${dragon.size * 0.15}px`,
                  background: `radial-gradient(ellipse, rgba(251,191,36,0.9) 0%, rgba(234,179,8,0.8) 30%, rgba(220,38,38,0.7) 60%, transparent 100%)`,
                  borderRadius: '50%',
                  filter: `blur(${si % 2 === 0 ? '2px' : '1px'})`,
                  boxShadow: `0 0 ${dragon.size * 0.1}px rgba(251,191,36,0.8)`
                }}
              >
                {/* Dragon scales */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: `radial-gradient(circle, rgba(251,191,36,0.6) 0%, transparent 70%)`,
                    clipPath: 'polygon(0% 0%, 50% 30%, 100% 0%, 100% 100%, 50% 70%, 0% 100%)'
                  }}
                />
              </div>
            );
          })}
          {/* Dragon head */}
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2"
            style={{
              width: `${dragon.size * 0.2}px`,
              height: `${dragon.size * 0.2}px`,
              background: `radial-gradient(circle, rgba(251,191,36,1) 0%, rgba(234,179,8,0.9) 40%, rgba(220,38,38,0.8) 70%, transparent 100%)`,
              borderRadius: '50%',
              filter: 'blur(1px)',
              boxShadow: `0 0 ${dragon.size * 0.15}px rgba(251,191,36,1)`
            }}
          >
            {/* Dragon eyes */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{
                width: `${dragon.size * 0.05}px`,
                height: `${dragon.size * 0.05}px`,
                background: 'radial-gradient(circle, rgba(220,38,38,1) 0%, rgba(185,28,28,0.9) 100%)',
                borderRadius: '50%',
                boxShadow: `0 0 ${dragon.size * 0.08}px rgba(220,38,38,1)`
              }}
            />
          </div>
        </div>
      ))}

      {/* Lucky symbols - floating, rotating */}
      {luckySymbols.map(symbol => (
        <div
          key={symbol.id}
          className="absolute animate-[symbol-drift_linear_infinite]"
          style={{
            left: `${symbol.x}%`,
            top: '-200px',
            animationDuration: `${symbol.duration}s`,
            animationDelay: `${symbol.delay}s`,
            opacity: symbol.opacity,
            '--sway': `${symbol.sway}px`,
            '--z': `${symbol.zDepth}px`
                } as any}
            >
                <div 
            className="relative animate-[symbol-rotate_linear_infinite]"
            style={{
              animationDuration: `${symbol.rotSpeed}s`,
              fontSize: `${symbol.size}px`,
              transform: 'translate3d(0, 0, var(--z))'
            } as any}
          >
            <div className="font-serif font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-700 drop-shadow-[0_0_15px_rgba(251,191,36,0.6)]">
              {symbol.type}
                    </div>
                </div>
            </div>
        ))}

      {/* Red envelopes - New Year tradition */}
      {redEnvelopes.map(envelope => (
        <div
          key={envelope.id}
          className="absolute animate-[envelope-drift_linear_infinite]"
          style={{
            left: `${envelope.x}%`,
            top: '-150px',
            animationDuration: `${envelope.duration}s`,
            animationDelay: `${envelope.delay}s`,
            opacity: envelope.opacity,
            '--sway': `${envelope.sway}px`,
            '--z': `${envelope.zDepth}px`
          } as any}
        >
          <div
            className="relative animate-[envelope-rotate_linear_infinite]"
            style={{
              animationDuration: `${envelope.rotSpeed}s`,
              width: `${envelope.size * 0.7}px`,
              height: `${envelope.size}px`,
              transform: 'translate3d(0, 0, var(--z))'
            } as any}
          >
            <div
              className="relative flex items-center justify-center rounded-sm border-2 border-yellow-500/60 shadow-lg"
              style={{
                width: '100%',
                height: '100%',
                background: 'linear-gradient(145deg, rgba(220,38,38,0.95) 0%, rgba(185,28,28,0.9) 50%, rgba(153,27,27,0.95) 100%)',
                boxShadow: `0 0 ${envelope.size * 0.3}px rgba(220,38,38,0.6), inset 0 0 ${envelope.size * 0.2}px rgba(251,191,36,0.3)`
              }}
            >
              {/* Gold character on envelope */}
              <div
                className="absolute text-yellow-400 font-black"
                style={{
                  fontSize: `${envelope.size * 0.3}px`,
                  textShadow: `0 0 ${envelope.size * 0.1}px rgba(251,191,36,0.8)`
                }}
              >
                福
      </div>
              {/* Gold border decoration */}
              <div className="absolute inset-0 border-2 border-yellow-500/40 rounded-sm" style={{ borderStyle: 'dashed' }}></div>
            </div>
          </div>
        </div>
      ))}

      {/* Gold coins - prosperity */}
      {goldCoins.map(coin => (
        <div
          key={coin.id}
          className="absolute animate-[coin-drift_linear_infinite]"
          style={{
            left: `${coin.x}%`,
            top: '-100px',
            animationDuration: `${coin.duration}s`,
            animationDelay: `${coin.delay}s`,
            opacity: coin.opacity,
            '--sway': `${coin.sway}px`,
            '--z': `${coin.zDepth}px`
          } as any}
        >
          <div
            className="relative animate-[coin-spin_linear_infinite]"
            style={{
              animationDuration: `${coin.rotSpeed}s`,
              width: `${coin.size}px`,
              height: `${coin.size}px`,
              transform: 'translate3d(0, 0, var(--z))'
            } as any}
          >
            <svg width="100%" height="100%" viewBox="0 0 100 100" className="drop-shadow-lg">
        <defs>
                <linearGradient id={`coin-gold-${coin.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fef3c7" />
                  <stop offset="30%" stopColor="#facc15" />
                  <stop offset="70%" stopColor="#eab308" />
                  <stop offset="100%" stopColor="#ca8a04" />
          </linearGradient>
                <radialGradient id={`coin-shine-${coin.id}`} cx="30%" cy="30%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.8)" />
                  <stop offset="100%" stopColor="transparent" />
                </radialGradient>
        </defs>
              <circle cx="50" cy="50" r="45" fill={`url(#coin-gold-${coin.id})`} stroke={`url(#coin-gold-${coin.id})`} strokeWidth="3" />
              <circle cx="50" cy="50" r="35" fill={`url(#coin-shine-${coin.id})`} />
              <text x="50" y="60" fontSize="30" fill="#ca8a04" textAnchor="middle" fontWeight="bold" fontFamily="serif">財</text>
      </svg>
          </div>
        </div>
      ))}

      {/* Fireworks/sparkles - celebration */}
      {sparkles.map(sparkle => (
        <div
          key={sparkle.id}
          className="absolute animate-[sparkle-twinkle_linear_infinite] rounded-full"
          style={{
            left: `${sparkle.x}%`,
            top: `${sparkle.y}%`,
            width: `${sparkle.size}px`,
            height: `${sparkle.size}px`,
            animationDuration: `${sparkle.speed}s`,
            animationDelay: `${sparkle.delay}s`,
            transform: 'translate(-50%, -50%)',
            background: `radial-gradient(circle, rgba(251,191,36,${sparkle.glow}) 0%, rgba(234,179,8,${sparkle.glow * 0.7}) 50%, transparent 100%)`,
            filter: 'blur(0.5px)',
            boxShadow: `0 0 ${sparkle.size * 3}px rgba(251,191,36,${sparkle.glow * 0.8})`
          }}
        />
      ))}

      {/* Ornate patterns - Final Fantasy prestige */}
      {ornatePatterns.map(pattern => (
        <div
          key={pattern.id}
          className="absolute animate-[pattern-pulse_linear_infinite]"
          style={{
            left: `${pattern.x}%`,
            top: `${pattern.y}%`,
            width: `${pattern.size}px`,
            height: `${pattern.size}px`,
            animationDuration: `${pattern.pulseSpeed}s`,
            animationDelay: `${pattern.delay}s`,
            transform: 'translate(-50%, -50%)',
            opacity: 0.15
          }}
        >
          <svg width="100%" height="100%" viewBox="0 0 100 100" className="drop-shadow-lg">
            <defs>
              <linearGradient id={`pattern-gold-${pattern.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fef3c7" />
                <stop offset="50%" stopColor="#facc15" />
                <stop offset="100%" stopColor="#ca8a04" />
              </linearGradient>
            </defs>
            {/* Ornate XIII pattern */}
            <path
              d="M50 10 L60 20 L50 30 L40 20 Z M50 70 L60 80 L50 90 L40 80 Z M10 50 L20 60 L30 50 L20 40 Z M70 50 L80 60 L90 50 L80 40 Z"
              fill="none"
              stroke={`url(#pattern-gold-${pattern.id})`}
              strokeWidth="1.5"
              opacity="0.6"
            />
            <circle cx="50" cy="50" r="35" fill="none" stroke={`url(#pattern-gold-${pattern.id})`} strokeWidth="1" opacity="0.4" />
            <text x="50" y="58" fontSize="25" fill={`url(#pattern-gold-${pattern.id})`} textAnchor="middle" fontWeight="bold" fontFamily="serif" opacity="0.7">XIII</text>
          </svg>
        </div>
      ))}

      {/* Subtle red paper texture overlay */}
      <div className="absolute inset-0 opacity-[0.08] bg-[url('https://www.transparenttextures.com/patterns/paper.png')] mix-blend-overlay"></div>

      {/* Glass-like reflections - premium depth */}
      <div className="absolute inset-0 opacity-[0.12]">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-yellow-500/[0.15] via-transparent to-transparent"></div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes symbol-drift {
          0% { transform: translate3d(0, 0, var(--z)); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translate3d(var(--sway), 150vh, var(--z)); opacity: 0; }
        }
        @keyframes symbol-rotate {
          from { transform: rotate3d(0.5, 1, 0.3, 0deg); }
          to { transform: rotate3d(0.5, 1, 0.3, 360deg); }
        }
        @keyframes dragon-flow {
          0% { transform: translate(-50%, -50%) translateX(-100px) translateY(0px); opacity: 0.6; }
          25% { opacity: 0.9; }
          50% { transform: translate(-50%, -50%) translateX(0px) translateY(-20px); opacity: 1; }
          75% { opacity: 0.9; }
          100% { transform: translate(-50%, -50%) translateX(100px) translateY(0px); opacity: 0.6; }
        }
        @keyframes envelope-drift {
          0% { transform: translate3d(0, 0, var(--z)); opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { transform: translate3d(var(--sway), 150vh, var(--z)); opacity: 0; }
        }
        @keyframes envelope-rotate {
          from { transform: rotate3d(0.3, 0.7, 0.2, 0deg); }
          to { transform: rotate3d(0.3, 0.7, 0.2, 360deg); }
        }
        @keyframes coin-drift {
          0% { transform: translate3d(0, 0, var(--z)); opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { transform: translate3d(var(--sway), 150vh, var(--z)); opacity: 0; }
        }
        @keyframes coin-spin {
          from { transform: rotateY(0deg); }
          to { transform: rotateY(360deg); }
        }
        @keyframes sparkle-twinkle {
          0%, 100% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.4; }
          50% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
        }
        @keyframes pattern-pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.1; }
          50% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.2; }
        }
      `}} />
    </div>
  );
};

const YuletideEngine: React.FC<{ isMini?: boolean }> = ({ isMini }) => {
  const flakes = useMemo(() => Array.from({ length: isMini ? 12 : 28 }).map((_, i) => ({
    id: `flake-v11-${i}`,
    x: Math.random() * 100,
    delay: Math.random() * -120,
    duration: 50 + Math.random() * 60,
    size: 2 + Math.random() * 4,
    opacity: 0.15 + Math.random() * 0.35
  })), [isMini]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {flakes.map(f => (
        <div 
          key={f.id}
          className="absolute rounded-full bg-white blur-[1px] animate-[snow-drift-v11_linear_infinite]"
          style={{ 
            left: `${f.x}%`, 
            top: '-20px',
            width: `${f.size}px`,
            height: `${f.size}px`,
            animationDelay: `${f.delay}s`, 
            animationDuration: `${f.duration}s`,
            opacity: f.opacity
          }}
        />
      ))}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes snow-drift-v11 {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { transform: translateY(125vh) translateX(60px); opacity: 0; }
        }
      `}} />
    </div>
  );
};

const ZenPondEngine: React.FC<{ isMini?: boolean }> = ({ isMini }) => {
  // Ethereal particles - mystical atmosphere
  const etherealParticles = useMemo(() => Array.from({ length: isMini ? 30 : 80 }).map((_, i) => ({
    id: `particle-${i}`,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 1 + Math.random() * 3,
    delay: Math.random() * -30,
    duration: 20 + Math.random() * 30,
    glow: 0.3 + Math.random() * 0.5,
    zDepth: Math.floor(Math.random() * 2000)
  })), [isMini]);

  // Koi fish - premium, elegant, with sophisticated rendering
  const koiFish = useMemo(() => Array.from({ length: isMini ? 2 : 4 }).map((_, i) => ({
    id: `koi-${i}`,
    x: -15 + Math.random() * 30,
    y: 65 + Math.random() * 20,
    delay: Math.random() * -40,
    duration: 35 + Math.random() * 25,
    size: 50 + Math.random() * 70,
    color: i % 3 === 0 ? 'orange' : i % 3 === 1 ? 'red' : 'white',
    depth: Math.random() * 40,
    pathOffset: Math.random() * 100
  })), [isMini]);

  // Bamboo stalks - elegant, tall
  const bambooStalks = useMemo(() => Array.from({ length: isMini ? 3 : 8 }).map((_, i) => ({
    id: `bamboo-${i}`,
    x: 10 + (i * 12) + Math.random() * 5,
    height: 50 + Math.random() * 30,
    width: 8 + Math.random() * 6,
    delay: Math.random() * -5,
    swaySpeed: 8 + Math.random() * 6,
    segments: 4 + Math.floor(Math.random() * 3)
  })), [isMini]);

  // Moon - full moon in the sky
  const moon = useMemo(() => ({
    x: 75 + Math.random() * 10,
    y: 15 + Math.random() * 10,
    size: isMini ? 60 : 120,
    glow: 0.6 + Math.random() * 0.3
  }), [isMini]);

  // Water ripples - calm pond surface
  const ripples = useMemo(() => Array.from({ length: isMini ? 6 : 15 }).map((_, i) => ({
    id: `ripple-${i}`,
    x: Math.random() * 100,
    y: 60 + Math.random() * 35,
    delay: Math.random() * -8,
    duration: 3 + Math.random() * 4,
    size: 20 + Math.random() * 40
  })), [isMini]);

  // Lily pads - floating on pond
  const lilyPads = useMemo(() => Array.from({ length: isMini ? 3 : 8 }).map((_, i) => ({
    id: `lily-${i}`,
    x: Math.random() * 100,
    y: 65 + Math.random() * 30,
    size: 25 + Math.random() * 35,
    delay: Math.random() * -10,
    floatSpeed: 4 + Math.random() * 3
  })), [isMini]);

  // Cherry blossoms - falling, elegant
  const cherryBlossoms = useMemo(() => Array.from({ length: isMini ? 8 : 20 }).map((_, i) => ({
    id: `blossom-${i}`,
    x: Math.random() * 100,
    delay: Math.random() * -15,
    duration: 15 + Math.random() * 10,
    size: 8 + Math.random() * 12,
    rotation: Math.random() * 360,
    sway: (Math.random() - 0.5) * 100
  })), [isMini]);

  // Fireflies - mystical atmosphere
  const fireflies = useMemo(() => Array.from({ length: isMini ? 10 : 25 }).map((_, i) => ({
    id: `firefly-${i}`,
    x: Math.random() * 100,
    y: Math.random() * 60,
    size: 2 + Math.random() * 3,
    delay: Math.random() * -20,
    speed: 5 + Math.random() * 8,
    glow: 0.5 + Math.random() * 0.5
  })), [isMini]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden bg-[#000000] perspective-[3000px]">
      {/* Deep night sky - premium gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a1a] via-[#050510] to-[#000000]"></div>
      
      {/* Ethereal atmospheric layers - multiple depth */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-3/4 -translate-x-1/2 -translate-y-1/2 w-[300%] h-[300%]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(192,132,252,0.4)_0%,rgba(147,51,234,0.3)_25%,rgba(99,102,241,0.2)_50%,rgba(0,0,0,0.5)_75%,transparent_100%)] animate-[ethereal-pulse_15s_ease-in-out_infinite] mix-blend-screen"></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(236,72,153,0.2)_0%,rgba(192,132,252,0.15)_40%,transparent_70%)] animate-[ethereal-pulse_20s_ease-in-out_infinite] mix-blend-screen"></div>
        </div>
        {/* Secondary atmospheric layer */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-purple-950/30 via-transparent to-indigo-950/40"></div>
      </div>

      {/* Premium Moon - ethereal, glowing */}
      <div
        className="absolute animate-[moon-ethereal_10s_ease-in-out_infinite] transform-style-3d"
        style={{
          left: `${moon.x}%`,
          top: `${moon.y}%`,
          width: `${moon.size}px`,
          height: `${moon.size}px`,
          transform: 'translate(-50%, -50%) translateZ(0)'
        }}
      >
        {/* Outer glow layers - multiple for depth */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle, rgba(255,255,255,${moon.glow * 0.8}) 0%, rgba(236,72,153,${moon.glow * 0.6}) 20%, rgba(192,132,252,${moon.glow * 0.5}) 40%, rgba(147,51,234,${moon.glow * 0.3}) 60%, transparent 80%)`,
            filter: 'blur(30px)',
            boxShadow: `0 0 ${moon.size * 0.8}px rgba(192,132,252,${moon.glow * 0.9}), 0 0 ${moon.size * 1.2}px rgba(236,72,153,${moon.glow * 0.6})`
          }}
        />
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle, rgba(192,132,252,${moon.glow * 0.7}) 0%, rgba(147,51,234,${moon.glow * 0.5}) 40%, transparent 70%)`,
            filter: 'blur(20px)',
            boxShadow: `0 0 ${moon.size * 0.5}px rgba(192,132,252,${moon.glow * 0.8})`
          }}
        />
        {/* Moon disc - premium rendering */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,1) 0%, rgba(250,232,255,0.95) 20%, rgba(236,72,153,0.85) 40%, rgba(192,132,252,0.75) 60%, rgba(147,51,234,0.65) 80%, rgba(99,102,241,0.5) 100%)`,
            boxShadow: `
              inset -15px -15px 30px rgba(0,0,0,0.4),
              inset 10px 10px 20px rgba(255,255,255,0.2),
              0 0 ${moon.size * 0.4}px rgba(192,132,252,0.8),
              0 0 ${moon.size * 0.6}px rgba(236,72,153,0.5)
            `,
            filter: 'drop-shadow(0 0 20px rgba(192,132,252,0.6))'
          }}
        />
        {/* Moon surface detail - sophisticated */}
        <div
          className="absolute inset-0 rounded-full opacity-40 mix-blend-overlay"
          style={{
            backgroundImage: `
              radial-gradient(circle at 35% 30%, rgba(0,0,0,0.4) 1.5px, transparent 1.5px),
              radial-gradient(circle at 60% 45%, rgba(0,0,0,0.3) 1px, transparent 1px),
              radial-gradient(circle at 50% 70%, rgba(0,0,0,0.35) 1.2px, transparent 1.2px),
              radial-gradient(circle at 25% 60%, rgba(0,0,0,0.25) 0.8px, transparent 0.8px)
            `,
            backgroundSize: '100% 100%'
          }}
        />
        {/* Moon shimmer effect */}
        <div
          className="absolute inset-0 rounded-full animate-[moon-shimmer_8s_ease-in-out_infinite]"
          style={{
            background: `linear-gradient(105deg, transparent 45%, rgba(255,255,255,0.4) 50%, transparent 55%)`,
            mixBlendMode: 'screen'
          }}
        />
      </div>

      {/* Premium Bamboo - sophisticated rendering */}
      {bambooStalks.map(bamboo => (
        <div key={bamboo.id} className="transform-style-3d">
          {/* Bamboo stalk - premium with depth */}
        <div 
            className="absolute bottom-0 animate-[bamboo-sway-premium_linear_infinite] transform-style-3d"
          style={{ 
              left: `${bamboo.x}%`,
              height: `${bamboo.height}%`,
              width: `${bamboo.width}px`,
              animationDuration: `${bamboo.swaySpeed}s`,
              animationDelay: `${bamboo.delay}s`,
              transform: 'translateX(-50%) translateZ(0)',
              background: `
                repeating-linear-gradient(
                  90deg,
                  rgba(34,197,94,0.95) 0%,
                  rgba(34,197,94,0.95) ${bamboo.width * 0.25}px,
                  rgba(22,163,74,0.9) ${bamboo.width * 0.25}px,
                  rgba(22,163,74,0.9) ${bamboo.width * 0.5}px,
                  rgba(16,185,129,0.85) ${bamboo.width * 0.5}px,
                  rgba(16,185,129,0.85) ${bamboo.width * 0.75}px,
                  rgba(5,150,105,0.8) ${bamboo.width * 0.75}px,
                  rgba(5,150,105,0.8) ${bamboo.width}px
                )
              `,
              clipPath: 'polygon(15% 0%, 85% 0%, 80% 100%, 20% 100%)',
              boxShadow: `
                inset 0 0 ${bamboo.width * 3}px rgba(34,197,94,0.4),
                inset -2px 0 4px rgba(0,0,0,0.3),
                inset 2px 0 4px rgba(255,255,255,0.1),
                0 0 ${bamboo.width * 0.5}px rgba(34,197,94,0.3)
              `,
              filter: 'drop-shadow(0 0 2px rgba(34,197,94,0.5))'
            }}
          >
            {/* Bamboo segments - premium detail */}
            {Array.from({ length: bamboo.segments }).map((_, si) => (
              <div
                key={`segment-${si}`}
                className="absolute"
                style={{
                  top: `${(si / bamboo.segments) * 100}%`,
                  left: '0%',
                  width: '100%',
                  height: `${100 / bamboo.segments}%`,
                  borderBottom: si < bamboo.segments - 1 ? '2px solid rgba(22,163,74,0.7)' : 'none',
                  boxShadow: si < bamboo.segments - 1 ? 'inset 0 -1px 2px rgba(0,0,0,0.2)' : 'none'
                }}
              />
            ))}
            {/* Bamboo highlight */}
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 30%, rgba(255,255,255,0.1) 50%, transparent 100%)`,
                mixBlendMode: 'overlay'
              }}
            />
          </div>
          {/* Premium bamboo leaves - more sophisticated */}
          {Array.from({ length: 4 }).map((_, li) => (
            <div
              key={`leaf-${li}`}
              className="absolute animate-[leaf-sway-premium_linear_infinite]"
              style={{
                left: `${bamboo.x}%`,
                bottom: `${(li + 1) * (bamboo.height / 5)}%`,
                width: `${bamboo.width * 3.5}px`,
                height: `${bamboo.width * 1}px`,
                animationDuration: `${bamboo.swaySpeed * 0.8}s`,
                animationDelay: `${bamboo.delay + li * 0.5}s`,
                transform: `translateX(-50%) rotate(${(li % 2 === 0 ? 1 : -1) * (15 + li * 8)}deg)`,
                background: `
                  linear-gradient(${li % 2 === 0 ? '135deg' : '45deg'},
                    rgba(34,197,94,0.9) 0%,
                    rgba(22,163,74,0.95) 30%,
                    rgba(16,185,129,0.9) 60%,
                    rgba(5,150,105,0.85) 80%,
                    transparent 100%
                  )
                `,
                clipPath: 'polygon(0% 50%, 5% 45%, 100% 0%, 100% 5%, 5% 50%, 100% 100%, 100% 95%, 0% 50%)',
                filter: 'blur(0.5px) drop-shadow(0 0 2px rgba(34,197,94,0.4))',
                boxShadow: `0 0 ${bamboo.width * 0.3}px rgba(34,197,94,0.3)`
              }}
            >
              {/* Leaf vein */}
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(${li % 2 === 0 ? '135deg' : '45deg'}, transparent 0%, rgba(22,163,74,0.4) 50%, transparent 100%)`,
                  width: '2px',
                  left: '50%',
                  transform: 'translateX(-50%)'
                }}
              />
            </div>
          ))}
        </div>
      ))}

      {/* Premium Pond - ethereal water with depth */}
      <div
        className="absolute bottom-0 left-0 right-0 transform-style-3d"
        style={{
          height: '45%',
          background: `
            linear-gradient(to top, 
              rgba(15,23,42,0.95) 0%,
              rgba(30,58,138,0.85) 10%,
              rgba(37,99,235,0.75) 20%,
              rgba(59,130,246,0.65) 35%,
              rgba(96,165,250,0.55) 50%,
              rgba(147,197,253,0.45) 65%,
              rgba(192,132,252,0.35) 80%,
              rgba(236,72,153,0.25) 90%,
              transparent 100%
            )
          `,
          backdropFilter: 'blur(2px)',
          boxShadow: 'inset 0 20px 40px rgba(0,0,0,0.3)'
        }}
      >
        {/* Water depth layers */}
        <div className="absolute inset-0 opacity-30 mix-blend-overlay">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_rgba(59,130,246,0.3)_0%,_transparent_70%)]"></div>
        </div>
        {/* Premium moon reflection - distorted, ethereal */}
        <div
          className="absolute top-0 left-3/4 -translate-x-1/2 animate-[moon-reflection_12s_ease-in-out_infinite]"
          style={{
            width: `${moon.size * 0.7}px`,
            height: `${moon.size * 0.25}px`,
            background: `
              radial-gradient(ellipse,
                rgba(255,255,255,0.6) 0%,
                rgba(250,232,255,0.5) 20%,
                rgba(236,72,153,0.4) 40%,
                rgba(192,132,252,0.35) 60%,
                rgba(147,51,234,0.3) 80%,
                transparent 100%
              )
            `,
            borderRadius: '50%',
            filter: 'blur(15px)',
            transform: 'scaleY(0.4)',
            boxShadow: `0 0 ${moon.size * 0.3}px rgba(192,132,252,0.6)`
          }}
        />
        {/* Water surface shimmer */}
        <div className="absolute top-0 left-0 w-full h-full opacity-20">
          <div className="absolute top-0 left-[-50%] w-[200%] h-full bg-[linear-gradient(90deg,transparent_0%,rgba(192,132,252,0.2)_50%,transparent_100%)] animate-[water-shimmer_8s_linear_infinite] mix-blend-screen"></div>
        </div>
      </div>

      {/* Premium Koi Fish - sophisticated, elegant */}
      {koiFish.map(koi => (
        <div
          key={koi.id}
          className="absolute animate-[koi-swim-premium_linear_infinite] transform-style-3d"
          style={{
            left: `${koi.x}%`,
            top: `${koi.y + koi.depth * 0.08}%`,
            animationDuration: `${koi.duration}s`,
            animationDelay: `${koi.delay}s`,
            transform: 'translate(-50%, -50%) translateZ(0)',
            width: `${koi.size}px`,
            height: `${koi.size * 0.55}px`,
            opacity: 0.75 + (koi.depth / 150) * 0.25,
            filter: `blur(${koi.depth * 0.02}px)`
          }}
        >
          {/* Koi glow aura */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: koi.color === 'orange'
                ? `radial-gradient(ellipse, rgba(251,146,60,0.4) 0%, rgba(234,88,12,0.3) 50%, transparent 100%)`
                : koi.color === 'red'
                ? `radial-gradient(ellipse, rgba(239,68,68,0.4) 0%, rgba(220,38,38,0.3) 50%, transparent 100%)`
                : `radial-gradient(ellipse, rgba(255,255,255,0.4) 0%, rgba(226,232,240,0.3) 50%, transparent 100%)`,
              filter: 'blur(8px)',
              transform: 'scale(1.3)'
            }}
          />
          {/* Premium Koi body - detailed */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: koi.color === 'orange'
                ? `radial-gradient(ellipse at 35% 50%, rgba(255,237,213,1) 0%, rgba(251,146,60,0.98) 20%, rgba(234,88,12,0.95) 50%, rgba(194,65,12,0.9) 80%, rgba(154,52,18,0.85) 100%)`
                : koi.color === 'red'
                ? `radial-gradient(ellipse at 35% 50%, rgba(254,242,242,1) 0%, rgba(239,68,68,0.98) 20%, rgba(220,38,38,0.95) 50%, rgba(185,28,28,0.9) 80%, rgba(153,27,27,0.85) 100%)`
                : `radial-gradient(ellipse at 35% 50%, rgba(255,255,255,1) 0%, rgba(248,250,252,0.98) 20%, rgba(226,232,240,0.95) 50%, rgba(203,213,225,0.9) 80%, rgba(148,163,184,0.85) 100%)`,
              boxShadow: `
                inset -5px -5px 15px rgba(0,0,0,0.3),
                inset 5px 5px 10px rgba(255,255,255,0.2),
                0 0 ${koi.size * 0.3}px ${koi.color === 'orange' ? 'rgba(251,146,60,0.7)' : koi.color === 'red' ? 'rgba(239,68,68,0.7)' : 'rgba(255,255,255,0.7)'},
                0 0 ${koi.size * 0.5}px ${koi.color === 'orange' ? 'rgba(251,146,60,0.4)' : koi.color === 'red' ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.4)'}
              `,
              filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.3))'
            }}
          >
            {/* Koi scale pattern - premium detail */}
            <div
              className="absolute inset-0"
              style={{
                background: `
                  radial-gradient(ellipse at 30% 45%, rgba(0,0,0,0.25) 0%, transparent 30%),
                  radial-gradient(ellipse at 60% 55%, rgba(0,0,0,0.2) 0%, transparent 25%),
                  radial-gradient(ellipse at 45% 50%, rgba(255,255,255,0.15) 0%, transparent 20%)
                `,
                borderRadius: '50%',
                mixBlendMode: 'overlay'
              }}
            />
            {/* Koi highlight */}
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%)`,
                borderRadius: '50%',
                mixBlendMode: 'screen'
              }}
            />
          </div>
          {/* Premium Koi tail - flowing */}
          <div
            className="absolute right-0 top-1/2 -translate-y-1/2 animate-[tail-flow_linear_infinite]"
            style={{
              width: `${koi.size * 0.45}px`,
              height: `${koi.size * 0.35}px`,
              animationDuration: `${koi.duration * 0.3}s`,
              background: koi.color === 'orange'
                ? `radial-gradient(ellipse, rgba(251,146,60,0.9) 0%, rgba(234,88,12,0.8) 40%, transparent 100%)`
                : koi.color === 'red'
                ? `radial-gradient(ellipse, rgba(239,68,68,0.9) 0%, rgba(220,38,38,0.8) 40%, transparent 100%)`
                : `radial-gradient(ellipse, rgba(255,255,255,0.9) 0%, rgba(226,232,240,0.8) 40%, transparent 100%)`,
              clipPath: 'polygon(0% 0%, 100% 30%, 100% 70%, 0% 100%)',
              filter: 'blur(1px) drop-shadow(0 0 3px rgba(0,0,0,0.2))',
              boxShadow: `0 0 ${koi.size * 0.15}px ${koi.color === 'orange' ? 'rgba(251,146,60,0.5)' : koi.color === 'red' ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.5)'}`
            }}
          />
          {/* Premium Koi fins - detailed */}
          <div
            className="absolute left-[18%] top-1/2 -translate-y-1/2"
            style={{
              width: `${koi.size * 0.18}px`,
              height: `${koi.size * 0.3}px`,
              background: koi.color === 'orange'
                ? `radial-gradient(ellipse, rgba(251,146,60,0.85) 0%, rgba(234,88,12,0.75) 50%, transparent 100%)`
                : koi.color === 'red'
                ? `radial-gradient(ellipse, rgba(239,68,68,0.85) 0%, rgba(220,38,38,0.75) 50%, transparent 100%)`
                : `radial-gradient(ellipse, rgba(255,255,255,0.85) 0%, rgba(226,232,240,0.75) 50%, transparent 100%)`,
              clipPath: 'polygon(0% 0%, 100% 30%, 100% 70%, 0% 100%)',
              filter: 'blur(0.8px) drop-shadow(0 0 2px rgba(0,0,0,0.2))'
            }}
          />
        </div>
      ))}

      {/* Water ripples - calm surface */}
      {ripples.map(ripple => (
        <div
          key={ripple.id}
          className="absolute rounded-full border border-indigo-400/30 animate-[pond-ripple_linear_infinite]"
          style={{
            left: `${ripple.x}%`,
            top: `${ripple.y}%`,
              width: '1px', 
              height: '1px',
            animationDelay: `${ripple.delay}s`,
            animationDuration: `${ripple.duration}s`,
            transform: 'translate(-50%, -50%)'
          }}
        />
      ))}

      {/* Lily pads - floating */}
      {lilyPads.map(lily => (
        <div 
          key={lily.id}
          className="absolute animate-[lily-float_linear_infinite]"
          style={{ 
            left: `${lily.x}%`,
            top: `${lily.y}%`,
            width: `${lily.size}px`,
            height: `${lily.size * 0.8}px`,
            animationDuration: `${lily.floatSpeed}s`,
            animationDelay: `${lily.delay}s`,
            transform: 'translate(-50%, -50%)',
            background: `radial-gradient(ellipse, rgba(16,185,129,0.7) 0%, rgba(5,150,105,0.8) 50%, rgba(4,120,87,0.9) 100%)`,
            borderRadius: '50%',
            filter: 'blur(1px)',
            boxShadow: `0 0 ${lily.size * 0.2}px rgba(16,185,129,0.4)`
          }}
        >
          {/* Lily pad center */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: `${lily.size * 0.15}px`,
              height: `${lily.size * 0.15}px`,
              background: `radial-gradient(circle, rgba(5,150,105,0.9) 0%, rgba(4,120,87,0.8) 100%)`
            }}
          />
        </div>
      ))}

      {/* Cherry blossoms - falling */}
      {cherryBlossoms.map(blossom => (
        <div
          key={blossom.id}
          className="absolute animate-[blossom-fall_linear_infinite]"
          style={{
            left: `${blossom.x}%`,
            top: '-20px',
            animationDuration: `${blossom.duration}s`,
            animationDelay: `${blossom.delay}s`,
            transform: `translate(-50%, -50%) rotate(${blossom.rotation}deg)`,
            '--sway': `${blossom.sway}px`
          } as any}
        >
          <div
            className="relative"
            style={{
              width: `${blossom.size}px`,
              height: `${blossom.size}px`,
              background: `radial-gradient(circle, rgba(251,182,206,0.9) 0%, rgba(244,114,182,0.8) 50%, rgba(236,72,153,0.7) 100%)`,
              borderRadius: '50% 50% 50% 0%',
              transform: 'rotate(45deg)',
              filter: 'blur(0.5px)',
              boxShadow: `0 0 ${blossom.size * 0.3}px rgba(251,182,206,0.6)`
            }}
          />
        </div>
      ))}

      {/* Ethereal particles - mystical atmosphere */}
      {etherealParticles.map(particle => (
        <div
          key={particle.id}
          className="absolute animate-[particle-drift-premium_linear_infinite] rounded-full"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            animationDuration: `${particle.duration}s`,
            animationDelay: `${particle.delay}s`,
            transform: 'translate(-50%, -50%) translateZ(0)',
            background: `radial-gradient(circle, rgba(192,132,252,${particle.glow}) 0%, rgba(236,72,153,${particle.glow * 0.8}) 30%, rgba(147,51,234,${particle.glow * 0.6}) 60%, transparent 100%)`,
            filter: 'blur(1px)',
            boxShadow: `0 0 ${particle.size * 6}px rgba(192,132,252,${particle.glow * 0.9}), 0 0 ${particle.size * 10}px rgba(236,72,153,${particle.glow * 0.5})`,
            opacity: particle.glow
          }}
        />
      ))}

      {/* Fireflies - mystical, premium */}
      {fireflies.map(firefly => (
        <div
          key={firefly.id}
          className="absolute animate-[firefly-drift-premium_linear_infinite] rounded-full"
          style={{
            left: `${firefly.x}%`,
            top: `${firefly.y}%`,
            width: `${firefly.size}px`,
            height: `${firefly.size}px`,
            animationDuration: `${firefly.speed}s`,
            animationDelay: `${firefly.delay}s`,
            transform: 'translate(-50%, -50%) translateZ(0)',
            background: `radial-gradient(circle, rgba(255,255,255,${firefly.glow}) 0%, rgba(192,132,252,${firefly.glow * 0.9}) 40%, rgba(147,51,234,${firefly.glow * 0.7}) 70%, transparent 100%)`,
            filter: 'blur(0.8px)',
            boxShadow: `0 0 ${firefly.size * 5}px rgba(192,132,252,${firefly.glow * 0.9}), 0 0 ${firefly.size * 8}px rgba(236,72,153,${firefly.glow * 0.6})`
          }}
        />
      ))}

      {/* Ethereal mist layers - calm before the storm */}
      <div className="absolute inset-0 opacity-[0.2]">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-950/20 to-[#000000]/40"></div>
        <div className="absolute bottom-0 left-0 right-0 h-[50%] bg-gradient-to-t from-indigo-950/30 via-transparent to-transparent"></div>
      </div>

      {/* Premium glass-like reflections */}
      <div className="absolute inset-0 opacity-[0.15] mix-blend-screen">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-purple-400/[0.2] via-pink-400/[0.15] to-transparent"></div>
        <div className="absolute top-1/4 right-0 w-1/2 h-1/2 bg-gradient-to-bl from-indigo-400/[0.15] via-transparent to-transparent"></div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .transform-style-3d { transform-style: preserve-3d; }
        @keyframes ethereal-pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        @keyframes moon-ethereal {
          0%, 100% { transform: translate(-50%, -50%) translateZ(0) scale(1) rotate(0deg); opacity: 0.9; filter: brightness(1); }
          25% { transform: translate(-50%, -50%) translateZ(0) scale(1.02) rotate(1deg); opacity: 1; filter: brightness(1.1); }
          50% { transform: translate(-50%, -50%) translateZ(0) scale(1.05) rotate(0deg); opacity: 1; filter: brightness(1.15); }
          75% { transform: translate(-50%, -50%) translateZ(0) scale(1.02) rotate(-1deg); opacity: 1; filter: brightness(1.1); }
        }
        @keyframes moon-shimmer {
          0% { transform: translateX(-150%) skewX(-15deg); opacity: 0; }
          50% { opacity: 0.6; }
          100% { transform: translateX(150%) skewX(-15deg); opacity: 0; }
        }
        @keyframes moon-reflection {
          0%, 100% { transform: scaleY(0.4) translateY(0px); opacity: 0.7; }
          50% { transform: scaleY(0.45) translateY(-5px); opacity: 0.9; }
        }
        @keyframes bamboo-sway-premium {
          0%, 100% { transform: translateX(-50%) translateZ(0) translateX(0px) rotate(0deg); }
          25% { transform: translateX(-50%) translateZ(0) translateX(2px) rotate(0.5deg); }
          50% { transform: translateX(-50%) translateZ(0) translateX(4px) rotate(0deg); }
          75% { transform: translateX(-50%) translateZ(0) translateX(2px) rotate(-0.5deg); }
        }
        @keyframes leaf-sway-premium {
          0%, 100% { transform: translateX(-50%) rotate(0deg); }
          50% { transform: translateX(-50%) rotate(3deg); }
        }
        @keyframes koi-swim-premium {
          0% { transform: translate(-50%, -50%) translateZ(0) translateX(-120px) translateY(0px) rotate(0deg); }
          20% { transform: translate(-50%, -50%) translateZ(0) translateX(-60px) translateY(-8px) rotate(2deg); }
          40% { transform: translate(-50%, -50%) translateZ(0) translateX(0px) translateY(-5px) rotate(0deg); }
          60% { transform: translate(-50%, -50%) translateZ(0) translateX(60px) translateY(5px) rotate(-2deg); }
          80% { transform: translate(-50%, -50%) translateZ(0) translateX(100px) translateY(3px) rotate(-1deg); }
          100% { transform: translate(-50%, -50%) translateZ(0) translateX(120px) translateY(0px) rotate(0deg); }
        }
        @keyframes tail-flow {
          0%, 100% { transform: translateY(-50%) rotate(0deg); }
          50% { transform: translateY(-50%) rotate(5deg); }
        }
        @keyframes pond-ripple {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 0.9; border-width: 1px; }
          100% { transform: translate(-50%, -50%) scale(100); opacity: 0; border-width: 0.5px; }
        }
        @keyframes water-shimmer {
          0% { transform: translateX(0); }
          100% { transform: translateX(50%); }
        }
        @keyframes lily-float {
          0%, 100% { transform: translate(-50%, -50%) translateY(0px) rotate(0deg); opacity: 0.8; }
          50% { transform: translate(-50%, -50%) translateY(-4px) rotate(2deg); opacity: 1; }
        }
        @keyframes blossom-fall {
          0% { transform: translate(-50%, -50%) translateY(0) translateX(0) rotate(0deg); opacity: 0.9; }
          50% { transform: translate(-50%, -50%) translateY(50vh) translateX(var(--sway)) rotate(180deg); opacity: 1; }
          100% { transform: translate(-50%, -50%) translateY(100vh) translateX(var(--sway)) rotate(360deg); opacity: 0; }
        }
        @keyframes particle-drift-premium {
          0%, 100% { transform: translate(-50%, -50%) translateZ(0) translate(0, 0); opacity: 0.3; }
          25% { opacity: 0.8; }
          50% { transform: translate(-50%, -50%) translateZ(0) translate(30px, 30px); opacity: 1; }
          75% { opacity: 0.8; }
        }
        @keyframes firefly-drift-premium {
          0%, 100% { transform: translate(-50%, -50%) translateZ(0) translate(0, 0); opacity: 0.5; }
          25% { opacity: 1; }
          50% { transform: translate(-50%, -50%) translateZ(0) translate(25px, 25px); opacity: 0.9; }
          75% { opacity: 1; }
        }
      `}} />
    </div>
  );
};

const GoldFluxEngine: React.FC<{ isMini?: boolean }> = ({ isMini }) => {
  // Light energy particles - warrior/protagonist energy
  const lightParticles = useMemo(() => Array.from({ length: isMini ? 40 : 100 }).map((_, i) => ({
    id: `light-${i}`,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 2 + Math.random() * 6,
    delay: Math.random() * -40,
    duration: 15 + Math.random() * 25,
    glow: 0.5 + Math.random() * 0.5,
    zDepth: Math.floor(Math.random() * 2000),
    speed: 8 + Math.random() * 15
  })), [isMini]);

  // Energy streams - flowing light energy
  const energyStreams = useMemo(() => Array.from({ length: isMini ? 6 : 15 }).map((_, i) => ({
    id: `stream-${i}`,
    x: Math.random() * 100,
    y: Math.random() * 100,
    angle: Math.random() * 360,
    delay: Math.random() * -20,
    duration: 20 + Math.random() * 30,
    length: 100 + Math.random() * 200,
    width: 3 + Math.random() * 8,
    intensity: 0.4 + Math.random() * 0.5
  })), [isMini]);

  // Light rays - divine/protagonist energy
  const lightRays = useMemo(() => Array.from({ length: isMini ? 4 : 12 }).map((_, i) => ({
    id: `ray-${i}`,
    angle: (i * 30) + Math.random() * 15,
    delay: Math.random() * -15,
    speed: 20 + Math.random() * 20,
    intensity: 0.5 + Math.random() * 0.4,
    length: 150 + Math.random() * 100
  })), [isMini]);

  // Floating XIII symbols - protagonist energy (reduced)
  const xiiiSymbols = useMemo(() => Array.from({ length: isMini ? 2 : 4 }).map((_, i) => ({
    id: `xiii-${i}`,
    x: Math.random() * 100,
    delay: Math.random() * -60,
    duration: 30 + Math.random() * 40,
    size: 25 + Math.random() * 45,
    rotSpeed: 40 + Math.random() * 30,
    opacity: 0.15 + Math.random() * 0.25,
    sway: (Math.random() - 0.5) * 200,
    zDepth: Math.floor(Math.random() * 1500)
  })), [isMini]);

  // Ornate patterns - Final Fantasy prestige
  const ornatePatterns = useMemo(() => Array.from({ length: isMini ? 3 : 8 }).map((_, i) => ({
    id: `pattern-${i}`,
    x: 10 + (i % 3) * 40,
    y: 20 + Math.floor(i / 3) * 30,
    size: 50 + Math.random() * 40,
    delay: Math.random() * -10,
    pulseSpeed: 5 + Math.random() * 4,
    rotation: Math.random() * 360
  })), [isMini]);

  // Crystalline shards - premium, ethereal
  const crystalShards = useMemo(() => Array.from({ length: isMini ? 12 : 30 }).map((_, i) => ({
    id: `crystal-${i}`,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 15 + Math.random() * 35,
    delay: Math.random() * -30,
    duration: 25 + Math.random() * 35,
    rotSpeed: 20 + Math.random() * 25,
    opacity: 0.2 + Math.random() * 0.3,
    zDepth: Math.floor(Math.random() * 1800)
  })), [isMini]);

  // Light vs Darkness particles - black and white motif
  const lightDarkParticles = useMemo(() => Array.from({ length: isMini ? 30 : 80 }).map((_, i) => ({
    id: `lightdark-${i}`,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 2 + Math.random() * 5,
    delay: Math.random() * -40,
    duration: 18 + Math.random() * 25,
    isLight: i % 2 === 0,
    glow: 0.4 + Math.random() * 0.5,
    zDepth: Math.floor(Math.random() * 2000)
  })), [isMini]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden bg-[#000000] perspective-[4000px]">
      {/* Deep dark base - final boss arena */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0500] via-[#050300] to-[#000000]"></div>
      
      {/* Premium atmospheric layers - light vs darkness */}
      <div className="absolute inset-0">
        {/* Light side */}
        <div className="absolute top-0 left-0 w-1/2 h-full">
          <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-yellow-50/15 to-transparent"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%]">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.4)_0%,rgba(255,215,0,0.3)_30%,rgba(251,191,36,0.2)_60%,transparent_100%)] animate-[light-pulse_12s_ease-in-out_infinite] mix-blend-screen"></div>
          </div>
        </div>
        {/* Darkness side */}
        <div className="absolute top-0 right-0 w-1/2 h-full">
          <div className="absolute inset-0 bg-gradient-to-l from-black/40 via-gray-900/30 to-transparent"></div>
          <div className="absolute top-1/2 right-1/2 translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%]">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.6)_0%,rgba(17,24,39,0.5)_30%,rgba(31,41,55,0.4)_60%,transparent_100%)] animate-[dark-pulse_15s_ease-in-out_infinite]"></div>
          </div>
        </div>
        {/* Dividing line - light vs darkness */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[2px] h-full bg-gradient-to-b from-white/60 via-yellow-200/40 to-black/60"></div>
      </div>

      {/* Light rays - divine energy */}
      {lightRays.map(ray => (
        <div
          key={ray.id}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-[ray-sweep-premium_linear_infinite] origin-center transform-style-3d"
          style={{
            width: `${ray.length}px`,
            height: '2px',
            animationDuration: `${ray.speed}s`,
            animationDelay: `${ray.delay}s`,
            transform: `translate(-50%, -50%) rotate(${ray.angle}deg) translateZ(0)`,
            background: `linear-gradient(to right, 
              transparent 0%, 
              rgba(255,255,255,${ray.intensity * 0.3}) 10%,
              rgba(255,215,0,${ray.intensity}) 30%,
              rgba(255,193,7,${ray.intensity * 1.2}) 50%,
              rgba(255,215,0,${ray.intensity}) 70%,
              rgba(255,255,255,${ray.intensity * 0.3}) 90%,
              transparent 100%
            )`,
            filter: 'blur(1px)',
            boxShadow: `0 0 ${ray.intensity * 30}px rgba(255,215,0,${ray.intensity * 0.8})`
          }}
        />
      ))}

      {/* Energy streams - flowing light */}
      {energyStreams.map(stream => (
        <div
          key={stream.id}
          className="absolute animate-[stream-flow_linear_infinite]"
          style={{
            left: `${stream.x}%`,
            top: `${stream.y}%`,
            width: `${stream.length}px`,
            height: `${stream.width}px`,
            animationDuration: `${stream.duration}s`,
            animationDelay: `${stream.delay}s`,
            transform: `translate(-50%, -50%) rotate(${stream.angle}deg)`,
            background: `linear-gradient(90deg,
              transparent 0%,
              rgba(255,255,255,${stream.intensity * 0.4}) 20%,
              rgba(255,215,0,${stream.intensity}) 50%,
              rgba(255,255,255,${stream.intensity * 0.4}) 80%,
              transparent 100%
            )`,
            filter: 'blur(2px)',
            boxShadow: `0 0 ${stream.width * 4}px rgba(255,215,0,${stream.intensity * 0.7})`,
            opacity: stream.intensity
          }}
        />
      ))}

      {/* Floating XIII symbols - protagonist energy (reduced) */}
      {xiiiSymbols.map(symbol => (
        <div
          key={symbol.id}
          className="absolute animate-[xiii-drift_linear_infinite] transform-style-3d"
          style={{
            left: `${symbol.x}%`,
            top: '-150px',
            animationDuration: `${symbol.duration}s`,
            animationDelay: `${symbol.delay}s`,
            opacity: symbol.opacity,
            '--sway': `${symbol.sway}px`,
            '--z': `${symbol.zDepth}px`
          } as any}
        >
          <div
            className="relative animate-[xiii-rotate_linear_infinite]"
            style={{
              animationDuration: `${symbol.rotSpeed}s`,
              fontSize: `${symbol.size}px`,
              transform: 'translate3d(0, 0, var(--z))'
            } as any}
          >
            <div className="font-serif font-black italic text-transparent bg-clip-text bg-gradient-to-br from-yellow-200 via-yellow-400 to-amber-600 drop-shadow-[0_0_20px_rgba(255,215,0,0.8)]">
              XIII
            </div>
          </div>
        </div>
      ))}

      {/* Light vs Darkness particles - black and white motif */}
      {lightDarkParticles.map(particle => (
        <div
          key={particle.id}
          className="absolute animate-[lightdark-drift_linear_infinite] rounded-full transform-style-3d"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            animationDuration: `${particle.duration}s`,
            animationDelay: `${particle.delay}s`,
            transform: 'translate(-50%, -50%) translateZ(0)',
            background: particle.isLight
              ? `radial-gradient(circle, rgba(255,255,255,${particle.glow}) 0%, rgba(255,255,240,${particle.glow * 0.9}) 40%, rgba(255,215,0,${particle.glow * 0.6}) 70%, transparent 100%)`
              : `radial-gradient(circle, rgba(0,0,0,${particle.glow}) 0%, rgba(17,24,39,${particle.glow * 0.9}) 40%, rgba(31,41,55,${particle.glow * 0.6}) 70%, transparent 100%)`,
            filter: 'blur(1px)',
            boxShadow: particle.isLight
              ? `0 0 ${particle.size * 8}px rgba(255,255,255,${particle.glow * 0.9}), 0 0 ${particle.size * 12}px rgba(255,215,0,${particle.glow * 0.7})`
              : `0 0 ${particle.size * 8}px rgba(0,0,0,${particle.glow * 0.9}), 0 0 ${particle.size * 12}px rgba(31,41,55,${particle.glow * 0.7})`,
            opacity: particle.glow
          }}
        />
      ))}

      {/* Light particles - warrior energy */}
      {lightParticles.map(particle => (
        <div
          key={particle.id}
          className="absolute animate-[particle-drift-premium_linear_infinite] rounded-full transform-style-3d"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            animationDuration: `${particle.duration}s`,
            animationDelay: `${particle.delay}s`,
            transform: 'translate(-50%, -50%) translateZ(0)',
            background: `radial-gradient(circle, 
              rgba(255,255,255,${particle.glow}) 0%, 
              rgba(255,255,240,${particle.glow * 0.9}) 20%,
              rgba(255,215,0,${particle.glow * 0.8}) 40%,
              rgba(255,193,7,${particle.glow * 0.6}) 60%,
              rgba(251,191,36,${particle.glow * 0.4}) 80%,
              transparent 100%
            )`,
            filter: 'blur(1px)',
            boxShadow: `
              0 0 ${particle.size * 8}px rgba(255,255,255,${particle.glow * 0.9}),
              0 0 ${particle.size * 12}px rgba(255,215,0,${particle.glow * 0.7}),
              0 0 ${particle.size * 16}px rgba(251,191,36,${particle.glow * 0.5})
            `,
            opacity: particle.glow
          }}
        />
      ))}

      {/* Crystalline shards - premium, ethereal */}
      {crystalShards.map(shard => (
        <div
          key={shard.id}
          className="absolute animate-[crystal-drift_linear_infinite] transform-style-3d"
          style={{
            left: `${shard.x}%`,
            top: '-100px',
            animationDuration: `${shard.duration}s`,
            animationDelay: `${shard.delay}s`,
            opacity: shard.opacity,
            '--z': `${shard.zDepth}px`
          } as any}
        >
          <div
            className="relative animate-[crystal-rotate_linear_infinite]"
            style={{
              animationDuration: `${shard.rotSpeed}s`,
              width: `${shard.size}px`,
              height: `${shard.size}px`,
              transform: 'translate3d(0, 0, var(--z))'
            } as any}
          >
            <div
              className="relative flex items-center justify-center"
              style={{
                width: '100%',
                height: '100%',
                background: `linear-gradient(135deg,
                  rgba(255,255,255,0.9) 0%,
                  rgba(255,255,240,0.8) 25%,
                  rgba(255,215,0,0.7) 50%,
                  rgba(255,193,7,0.6) 75%,
                  rgba(251,191,36,0.5) 100%
                )`,
                clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                filter: 'blur(0.5px)',
                boxShadow: `
                  inset 0 0 10px rgba(255,255,255,0.5),
                  0 0 ${shard.size * 0.3}px rgba(255,215,0,0.8),
                  0 0 ${shard.size * 0.5}px rgba(251,191,36,0.6)
                `
              }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 50%)`,
                  mixBlendMode: 'screen'
                }}
              />
            </div>
          </div>
        </div>
      ))}

      {/* Ornate patterns - Final Fantasy prestige */}
      {ornatePatterns.map(pattern => (
        <div
          key={pattern.id}
          className="absolute animate-[pattern-pulse-premium_linear_infinite] transform-style-3d"
          style={{
            left: `${pattern.x}%`,
            top: `${pattern.y}%`,
            width: `${pattern.size}px`,
            height: `${pattern.size}px`,
            animationDuration: `${pattern.pulseSpeed}s`,
            animationDelay: `${pattern.delay}s`,
            transform: 'translate(-50%, -50%) translateZ(0)',
            opacity: 0.2
          }}
        >
          <svg width="100%" height="100%" viewBox="0 0 100 100" className="drop-shadow-2xl">
            <defs>
              <linearGradient id={`pattern-gold-premium-${pattern.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="30%" stopColor="#ffd700" />
                <stop offset="60%" stopColor="#ffc107" />
                <stop offset="100%" stopColor="#fbbf24" />
              </linearGradient>
            </defs>
            {/* Ornate pattern */}
            <path
              d="M50 5 L60 20 L50 35 L40 20 Z M50 65 L60 80 L50 95 L40 80 Z M5 50 L20 60 L35 50 L20 40 Z M65 50 L80 60 L95 50 L80 40 Z"
              fill="none"
              stroke={`url(#pattern-gold-premium-${pattern.id})`}
              strokeWidth="2"
              opacity="0.7"
            />
            <circle cx="50" cy="50" r="40" fill="none" stroke={`url(#pattern-gold-premium-${pattern.id})`} strokeWidth="1.5" opacity="0.5" />
          </svg>
        </div>
      ))}

      {/* Premium glass-like reflections */}
      <div className="absolute inset-0 opacity-[0.15] mix-blend-screen">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-yellow-200/[0.25] via-amber-300/[0.2] to-transparent"></div>
        <div className="absolute top-1/4 right-0 w-1/2 h-1/2 bg-gradient-to-bl from-yellow-100/[0.2] via-transparent to-transparent"></div>
      </div>

      {/* Subtle energy waves */}
      <div className="absolute inset-0 opacity-[0.1]">
        <div className="absolute top-0 left-[-50%] w-[200%] h-full bg-[linear-gradient(90deg,transparent_0%,rgba(255,215,0,0.2)_50%,transparent_100%)] animate-[energy-wave_10s_linear_infinite] mix-blend-screen"></div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .transform-style-3d { transform-style: preserve-3d; }
        @keyframes warrior-pulse {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        @keyframes light-pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        @keyframes dark-pulse {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        @keyframes lightdark-drift {
          0%, 100% { transform: translate(-50%, -50%) translateZ(0) translate(0, 0); opacity: 0.4; }
          25% { opacity: 0.9; }
          50% { transform: translate(-50%, -50%) translateZ(0) translate(35px, 35px); opacity: 1; }
          75% { opacity: 0.9; }
        }
        @keyframes ray-sweep-premium {
          0% { transform: translate(-50%, -50%) rotate(0deg) translateZ(0); opacity: 0.6; }
          50% { opacity: 1; }
          100% { transform: translate(-50%, -50%) rotate(360deg) translateZ(0); opacity: 0.6; }
        }
        @keyframes stream-flow {
          0% { transform: translate(-50%, -50%) translateX(-100px) translateY(0px) rotate(0deg); opacity: 0.5; }
          50% { opacity: 1; }
          100% { transform: translate(-50%, -50%) translateX(100px) translateY(0px) rotate(0deg); opacity: 0.5; }
        }
        @keyframes xiii-drift {
          0% { transform: translate3d(0, 0, var(--z)); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translate3d(var(--sway), 150vh, var(--z)); opacity: 0; }
        }
        @keyframes xiii-rotate {
          from { transform: rotate3d(0.5, 1, 0.3, 0deg); }
          to { transform: rotate3d(0.5, 1, 0.3, 360deg); }
        }
        @keyframes particle-drift-premium {
          0%, 100% { transform: translate(-50%, -50%) translateZ(0) translate(0, 0); opacity: 0.4; }
          25% { opacity: 1; }
          50% { transform: translate(-50%, -50%) translateZ(0) translate(40px, 40px); opacity: 0.9; }
          75% { opacity: 1; }
        }
        @keyframes crystal-drift {
          0% { transform: translate3d(0, 0, var(--z)); opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { transform: translate3d(0, 150vh, var(--z)); opacity: 0; }
        }
        @keyframes crystal-rotate {
          from { transform: rotate3d(0.7, 0.7, 0.3, 0deg); }
          to { transform: rotate3d(0.7, 0.7, 0.3, 360deg); }
        }
        @keyframes pattern-pulse-premium {
          0%, 100% { transform: translate(-50%, -50%) translateZ(0) scale(1); opacity: 0.15; filter: brightness(1); }
          50% { transform: translate(-50%, -50%) translateZ(0) scale(1.15); opacity: 0.25; filter: brightness(1.3); }
        }
        @keyframes energy-wave {
          0% { transform: translateX(0); }
          100% { transform: translateX(50%); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}} />
    </div>
  );
};

export const BoardSurface: React.FC<{ themeId: BackgroundTheme; isMini?: boolean }> = ({ themeId, isMini }) => {
    const config = PREMIUM_BOARDS.find(b => b.id === themeId) || PREMIUM_BOARDS[0];
    return (
        <div className={`absolute inset-0 ${config.base} overflow-hidden`}>
            {config.texture && <FeltTextureLayer />}
            {config.justAGirl && <JustAGirlEngine isMini={isMini} />}
            {config.shiba && <ShibaEngine isMini={isMini} />}
            {config.lasVegas && <LasVegasEngine isMini={isMini} />}
            {config.highRoller && <CastleOblivionEngine isMini={isMini} />}
            {config.zenPond && <ZenPondEngine isMini={isMini} />}
            {config.obsidianMadness && <MadnessEngine isMini={isMini} />}
            {config.lotusForest && <LotusForestEngine isMini={isMini} />}
            {config.yuletide && <YuletideEngine isMini={isMini} />}
            {config.prestige && <GoldenEmperorEngine isMini={isMini} />}
            {config.goldFlux && <GoldFluxEngine isMini={isMini} />}
            {config.id === 'CYBERPUNK_NEON' && <TokyoEngine isMini={isMini} />}
            
            <div className={`absolute inset-0 bg-gradient-to-br ${config.colors}`} />
            
            {config.spotlight && (
                <div 
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full"
                  style={{ background: `radial-gradient(circle at center, ${config.spotlight} 0%, transparent 70%)` }}
                />
            )}
        </div>
    );
};

export const BoardPreview: React.FC<{ themeId: string; unlocked?: boolean; active?: boolean; className?: string; hideActiveMarker?: boolean }> = ({ themeId, unlocked, active, className = '', hideActiveMarker }) => {
    return (
        <div className={`relative aspect-[16/10] w-full rounded-2xl overflow-hidden border-2 transition-all duration-300 ${active ? 'border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.4)]' : 'border-white/10'} ${className}`}>
            <BoardSurface themeId={themeId as BackgroundTheme} isMini />
            {!unlocked && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center">
                    <span className="text-xl">🔒</span>
                </div>
            )}
            {active && !hideActiveMarker && (
                <div className="absolute top-2 right-2 bg-yellow-500 text-black text-[8px] font-black px-2 py-0.5 rounded-full shadow-lg">ACTIVE</div>
            )}
        </div>
    );
};

interface UserHubProps {
  profile: UserProfile | null;
  onClose: () => void;
  playerName: string;
  setPlayerName: (name: string) => void;
  playerAvatar: string;
  setPlayerAvatar: (avatar: string) => void;
  onSignOut: () => void;
  onRefreshProfile: () => void;
  isGuest?: boolean;
  onLinkAccount?: () => void;
  initialTab?: HubTab;
}

export const UserHub: React.FC<UserHubProps> = ({ 
    profile, onClose, playerName, playerAvatar, setPlayerAvatar, onSignOut, onRefreshProfile, isGuest, onLinkAccount, initialTab = 'PROFILE'
}) => {
    const [activeTab, setActiveTab] = useState<HubTab>(initialTab || 'PROFILE');
    const [showLevelRewards, setShowLevelRewards] = useState(false);
    const [showEmotePicker, setShowEmotePicker] = useState(false);
    const [remoteEmotes, setRemoteEmotes] = useState<Emote[]>([]);
    const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);

    // Fetch remote emotes
    useEffect(() => {
        fetchEmotes().then(setRemoteEmotes).catch(console.error);
    }, []);

    // Handle LEVEL_REWARDS tab - open as modal instead
    useEffect(() => {
        if (activeTab === 'LEVEL_REWARDS') {
            setShowLevelRewards(true);
            setActiveTab('PROFILE'); // Reset to profile tab
        }
    }, [activeTab]);

    if (!profile) return null;

    const currentLevel = calculateLevel(profile.xp);
    const unlockedAvatars = useMemo(() => {
        const unlocked = (profile?.unlocked_avatars || []).filter(avatar => avatar !== ':smile:');
        // Filter out :smile: (Loyal Shiba) as it shows fallback emoji
        const defaultAvatarsFiltered = DEFAULT_AVATARS.filter(avatar => avatar !== ':smile:');
        // Combine default avatars (without :smile:) and unlocked avatars
        // Also include remote emotes that are unlocked
        const allAvatars = [...defaultAvatarsFiltered, ...unlocked];
        // Add remote emotes that user has unlocked, but exclude :smile: and problematic emotes that fail to load
        const problematicTriggers = [':doge_focus:', ':game_over:', ':lunar_new_year:', ':the_mooner:'];
        const remoteUnlocked = remoteEmotes
            .filter(emote => emote.trigger_code && emote.trigger_code !== ':smile:')
            .filter(emote => !problematicTriggers.includes(emote.trigger_code.toLowerCase()))
            .filter(emote => unlocked.includes(emote.trigger_code))
            .map(emote => emote.trigger_code);
        const allUnlocked = Array.from(new Set([...allAvatars, ...remoteUnlocked]))
            .filter(avatar => avatar !== ':smile:')
            .filter(avatar => !problematicTriggers.includes(avatar.toLowerCase()));
        return allUnlocked;
    }, [profile, remoteEmotes]);

    const handleAvatarSelect = async (avatar: string) => {
        if (isUpdatingAvatar || avatar === playerAvatar) return;
        setIsUpdatingAvatar(true);
        try {
            await updateProfileAvatar(profile.id, avatar);
            setPlayerAvatar(avatar);
            await onRefreshProfile();
            setShowEmotePicker(false);
        } catch (error) {
            console.error('Failed to update avatar:', error);
        } finally {
            setIsUpdatingAvatar(false);
        }
    };
    
    return (
        <>
            {showLevelRewards && (
                <LevelRewards 
                    profile={profile} 
                    onClose={() => setShowLevelRewards(false)} 
                    inline={false} 
                />
            )}
            {showEmotePicker && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/90 backdrop-blur-2xl p-4 animate-in fade-in duration-200" onClick={() => setShowEmotePicker(false)}>
                    <div className="relative bg-white/[0.05] backdrop-blur-3xl border border-white/20 w-full max-w-md rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.7)] animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-6 py-4">
                            <h3 className="text-lg font-bold text-white">Select Avatar</h3>
                        <button 
                                onClick={() => setShowEmotePicker(false)}
                                className="text-white/60 hover:text-white transition-colors duration-200 p-1"
                        >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 6L6 18M6 6l12 12"/>
                                </svg>
                        </button>
                </div>

                        {/* Emote Grid */}
                        <div className="p-6">
                            <div className="grid grid-cols-4 gap-4">
                                {unlockedAvatars.map(avatar => {
                                    const isSelected = avatar === playerAvatar;
                                    const isLocked = !unlockedAvatars.includes(avatar);
                                    const avatarName = getAvatarName(avatar, remoteEmotes);
                                    
                                    return (
                                        <button
                                            key={avatar}
                                            onClick={() => !isLocked && handleAvatarSelect(avatar)}
                                            disabled={isLocked || isUpdatingAvatar}
                                            className={`relative group flex flex-col items-center gap-2 p-4 rounded-2xl transition-all duration-300 ${
                                                isSelected 
                                                    ? 'bg-gradient-to-br from-yellow-500/30 to-yellow-600/20 border-2 border-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.4)]' 
                                                    : isLocked
                                                    ? 'bg-white/[0.03] border border-white/10 opacity-50 cursor-not-allowed'
                                                    : 'bg-white/[0.05] border border-white/10 hover:bg-white/[0.08] hover:border-white/20 hover:scale-105 cursor-pointer'
                                            }`}
                                        >
                                            <div className={`w-16 h-16 rounded-xl flex items-center justify-center overflow-hidden ${
                                                isSelected ? 'ring-2 ring-yellow-400/50' : ''
                                            }`}>
                                                <VisualEmote trigger={avatar} remoteEmotes={remoteEmotes} size="lg" />
                                </div>
                                            <span className={`text-[10px] font-medium text-center leading-tight ${
                                                isSelected ? 'text-yellow-300' : 'text-white/70'
                                            }`}>
                                                {avatarName}
                                            </span>
                                            {isSelected && (
                                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M20 6L9 17l-5-5"/>
                                                    </svg>
                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                                </div>
                                </div>
                                </div>
            )}
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-2xl p-4 animate-in fade-in duration-300" onClick={onClose}>
            <div className="relative bg-white/[0.03] backdrop-blur-3xl border border-white/10 w-full max-w-4xl max-h-[90vh] rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.5)] flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Hub Navigation - Clean Apple Style */}
                <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] backdrop-blur-xl px-4 sm:px-6 py-4">
                        <button 
                        onClick={onClose}
                        className="text-white/60 hover:text-white transition-colors duration-200 flex items-center gap-2 group shrink-0"
                        >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-0.5 transition-transform duration-200">
                            <path d="M19 12H5M12 19l-7-7 7-7"/>
                        </svg>
                        <span className="text-sm font-medium">Back</span>
                        </button>
                    
                    <div className="flex items-center gap-2 sm:gap-3">
                            <button 
                            onClick={() => setActiveTab('PROFILE')}
                            className={`px-4 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${
                                activeTab === 'PROFILE' 
                                    ? 'bg-white/10 text-white border border-white/20' 
                                    : 'text-white/50 hover:text-white/70 hover:bg-white/5'
                            }`}
                        >
                            Profile
                        </button>
                        <button 
                            onClick={() => setActiveTab('STATS')}
                            className={`px-4 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${
                                activeTab === 'STATS' 
                                    ? 'bg-white/10 text-white border border-white/20' 
                                    : 'text-white/50 hover:text-white/70 hover:bg-white/5'
                            }`}
                        >
                            Stats
                            </button>
                                </div>
                            </div>

                <div className="flex-1 overflow-y-auto p-6 sm:p-8 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {activeTab === 'PROFILE' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {/* PLAYER PROFILE Header */}
                            <div className="mb-4">
                                <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider">Player Profile</h2>
                            </div>
                            
                            {/* Premium Profile Header */}
                            <div className="relative">
                                {/* Background gradient effect */}
                                <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent rounded-3xl blur-2xl"></div>
                                
                                <div className="relative bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 overflow-hidden">
                                    {/* Decorative elements */}
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-yellow-500/10 to-transparent rounded-full blur-3xl"></div>
                                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-emerald-500/10 to-transparent rounded-full blur-2xl"></div>
                                    
                                    <div className="relative flex flex-col items-center gap-6">
                                        {/* Clickable Avatar */}
                                        <button 
                                            onClick={() => setShowEmotePicker(true)}
                                            className="relative group shrink-0"
                                        >
                                            <div className="absolute inset-[-8px] bg-gradient-to-br from-yellow-500/20 via-yellow-600/10 to-transparent rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-br from-white/[0.12] to-white/[0.06] backdrop-blur-2xl border-2 border-white/20 flex items-center justify-center overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4)] group-hover:scale-105 group-hover:border-yellow-500/40 group-hover:shadow-[0_12px_40px_rgba(234,179,8,0.3)] transition-all duration-300">
                                                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent"></div>
                                                <VisualEmote 
                                                    trigger={playerAvatar} 
                                                    remoteEmotes={remoteEmotes} 
                                                    size="xl" 
                                                />
                                            </div>
                                            {/* Edit indicator */}
                                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full border-2 border-black/20 flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                </svg>
                                            </div>
                                        </button>
                                        
                                        {/* User Info - Centered */}
                                        <div className="w-full flex flex-col items-center gap-4">
                                            {/* Name and Level */}
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="flex items-center justify-center">
                                                    {profile && !isGuest && profile.username ? (
                                                        <div className="flex items-center gap-2">
                                                            <CopyUsername 
                                                                username={profile.username} 
                                                                className="[&>span]:text-3xl [&>span]:sm:text-4xl [&>span]:font-bold [&>span]:tracking-tight" 
                                                            />
                                                        </div>
                                                    ) : (
                                                        <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight text-center">
                                                            {playerName}
                                                        </h2>
                                                    )}
                                                </div>
                                                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/[0.08] border border-white/10 rounded-xl">
                                                    <span className="text-xs font-semibold text-white/90">Level {currentLevel}</span>
                                                </div>
                                            </div>
                                            
                                            {/* XP Progress Bar - Full Width */}
                                            <div className="w-full space-y-1.5 px-2">
                                                <div className="flex justify-center items-center text-xs">
                                                    <span className="text-white/50 font-medium">
                                                        {(() => {
                                                            const currentLevelXp = getXpForLevel(currentLevel);
                                                            const nextLevelXp = getXpForLevel(currentLevel + 1);
                                                            const safeXp = Math.max(currentLevelXp, profile.xp || 0);
                                                            const xpToNext = nextLevelXp - safeXp;
                                                            return xpToNext > 0 
                                                                ? `${xpToNext.toLocaleString()} XP TO RANK UP`
                                                                : 'MAX LEVEL';
                                                        })()}
                                                    </span>
                                                </div>
                                                <div className="h-2 bg-black/40 rounded-full overflow-hidden border border-white/10">
                                                    <div 
                                                        className="h-full bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.5)] transition-all duration-700 relative overflow-hidden" 
                                                        style={{ width: `${(() => {
                                                            const currentLevelXp = getXpForLevel(currentLevel);
                                                            const nextLevelXp = getXpForLevel(currentLevel + 1);
                                                            const safeXp = Math.max(currentLevelXp, profile.xp || 0);
                                                            const range = Math.max(1, nextLevelXp - currentLevelXp);
                                                            return Math.min(100, Math.max(0, ((safeXp - currentLevelXp) / range) * 100));
                                                        })()}%` }}
                                                    >
                                                        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_25%,rgba(255,255,255,0.4)_50%,transparent_75%)] bg-[length:200%_100%] animate-[shimmer_2s_infinite]"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Save Progress Section - Only for Guests */}
                            {isGuest && onLinkAccount && (
                                <div className="relative">
                                    <div className="absolute inset-0 bg-gradient-to-br from-amber-900/20 via-amber-800/10 to-amber-900/20 rounded-3xl blur-2xl"></div>
                                    
                                    <div className="relative bg-gradient-to-br from-amber-900/30 via-amber-800/20 to-amber-900/30 backdrop-blur-xl border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 overflow-hidden">
                                        {/* Decorative glow */}
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500/20 to-transparent rounded-full blur-3xl"></div>
                                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-amber-600/20 to-transparent rounded-full blur-2xl"></div>
                                        
                                        <div className="relative flex flex-col gap-4">
                                            {/* Header */}
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                                                <h3 className="text-base sm:text-lg font-black text-amber-300 uppercase tracking-wider">
                                                    Save Progress
                                                </h3>
                                            </div>
                                            
                                            {/* Description */}
                                            <p className="text-xs sm:text-sm text-amber-200/80 leading-relaxed">
                                                Your progress is saved locally. Link your account to sync across devices and never lose your progress.
                                            </p>
                                            
                                            {/* Stats Grid */}
                                            <div className="grid grid-cols-3 gap-3 mt-2">
                                                {profile && (profile.gems || 0) > 0 && (
                                                    <div className="flex flex-col items-center gap-1.5 p-3 bg-black/20 rounded-xl border border-amber-500/20">
                                                        <CurrencyIcon type="GEMS" size="sm" />
                                                        <span className="text-xs font-bold text-amber-200">{profile.gems || 0}</span>
                                                    </div>
                                                )}
                                                {profile && (profile.xp || 0) > 0 && (
                                                    <div className="flex flex-col items-center gap-1.5 p-3 bg-black/20 rounded-xl border border-amber-500/20">
                                                        <span className="text-lg">⭐</span>
                                                        <span className="text-xs font-bold text-amber-200">{profile.xp || 0}</span>
                                                    </div>
                                                )}
                                                {profile && (profile.coins || 0) > 0 && (
                                                    <div className="flex flex-col items-center gap-1.5 p-3 bg-black/20 rounded-xl border border-amber-500/20">
                                                        <CurrencyIcon type="GOLD" size="sm" />
                                                        <span className="text-xs font-bold text-amber-200">{profile.coins || 0}</span>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* Link Account Button */}
                                            <button
                                                onClick={onLinkAccount}
                                                className="group relative mt-2 w-full px-6 py-3.5 bg-gradient-to-br from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:via-amber-400 hover:to-amber-500 border-2 border-amber-400/50 rounded-2xl text-black font-black text-sm uppercase tracking-wider transition-all duration-300 hover:scale-105 hover:border-amber-300/70 active:scale-95 shadow-[0_8px_30px_rgba(217,119,6,0.4)] hover:shadow-[0_12px_40px_rgba(217,119,6,0.6)]"
                                            >
                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                                                <span className="relative z-10 flex items-center justify-center gap-2">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                                    </svg>
                                                    Link Account
                                                </span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            {/* Premium Stats Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div className="group relative bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-5 text-center hover:from-white/[0.08] hover:to-white/[0.04] hover:border-white/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                    <div className="relative z-10">
                                        <span className="block text-xs font-semibold text-white/60 mb-2 uppercase tracking-wider">Wins</span>
                                        <span className="text-3xl sm:text-4xl font-bold text-white">{profile.wins}</span>
                                    </div>
                                </div>
                                
                                <div className="group relative bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-5 text-center hover:from-white/[0.08] hover:to-white/[0.04] hover:border-white/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                    <div className="relative z-10">
                                        <span className="block text-xs font-semibold text-white/60 mb-2 uppercase tracking-wider">Played</span>
                                        <span className="text-3xl sm:text-4xl font-bold text-white">{profile.games_played}</span>
                             </div>
                                </div>
                                
                                <div className="group relative bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-5 text-center hover:from-white/[0.08] hover:to-white/[0.04] hover:border-white/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                    <div className="relative z-10">
                                        <span className="block text-xs font-semibold text-white/60 mb-2 uppercase tracking-wider">Win Rate</span>
                                        <span className="text-3xl sm:text-4xl font-bold text-white">{profile.games_played ? Math.round((profile.wins / profile.games_played) * 100) : 0}%</span>
                                    </div>
                                </div>
                                
                                <div className="group relative bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-5 text-center hover:from-white/[0.08] hover:to-white/[0.04] hover:border-white/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                    <div className="relative z-10">
                                        <span className="block text-xs font-semibold text-white/60 mb-2 uppercase tracking-wider">Chops</span>
                                        <span className="text-3xl sm:text-4xl font-bold text-yellow-400">{profile.total_chops || 0}</span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Delete Account Section - Only for authenticated users (not guests) */}
                            {!isGuest && (
                                <div className="mt-8 pt-6 border-t border-white/10">
                                    <DeleteAccountButton
                                        onAccountDeleted={() => {
                                            // Clear all state and redirect to landing page
                                            // The DeleteAccountButton already clears localStorage and signs out
                                            // We just need to redirect
                                            window.location.replace('/');
                                        }}
                                        className="w-full"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'INVENTORY' && <InventoryGrid profile={profile} onRefresh={onRefreshProfile} />}
                    

                    {activeTab === 'STATS' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <div className="bg-white/5 p-8 rounded-3xl border border-white/10">
                                <h4 className="text-xs font-black text-white/40 uppercase tracking-[0.4em] mb-6">Match Statistics</h4>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center"><span className="text-[10px] text-white/60 uppercase">Longest Streak</span><span className="text-lg font-black text-white">{profile.longest_streak || 0}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-[10px] text-white/60 uppercase">Current Streak</span><span className="text-lg font-black text-emerald-400">{profile.current_streak || 0}</span></div>
                                    <div className="h-[1px] bg-white/5 w-full my-4"></div>
                                    <div className="flex justify-between items-center"><span className="text-[10px] text-white/60 uppercase">Total XP</span><span className="text-lg font-black text-yellow-500">{profile.xp.toLocaleString()}</span></div>
                                    <div className="h-[1px] bg-white/5 w-full my-4"></div>
                                    {(() => {
                                        try {
                                            const stored = localStorage.getItem('emote_usage_stats');
                                            const stats: Record<string, number> = stored ? JSON.parse(stored) : {};
                                            if (Object.keys(stats).length === 0) {
                                                return (
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[10px] text-white/60 uppercase">Most Used Emote</span>
                                                        <span className="text-sm text-white/40">None yet</span>
                                                    </div>
                                                );
                                            }
                                            const mostUsed = Object.entries(stats).reduce((a, b) => stats[a[0]] > stats[b[0]] ? a : b);
                                            return (
                                                <div className="flex justify-between items-center gap-3">
                                                    <span className="text-[10px] text-white/60 uppercase">Most Used Emote</span>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 flex items-center justify-center">
                                                            <VisualEmote trigger={mostUsed[0]} remoteEmotes={remoteEmotes} size="md" />
                                                        </div>
                                                        <span className="text-lg font-black text-white">{mostUsed[1]}</span>
                                                    </div>
                                                </div>
                                            );
                                        } catch (e) {
                                            return (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] text-white/60 uppercase">Most Used Emote</span>
                                                    <span className="text-sm text-white/40">None yet</span>
                                                </div>
                                            );
                                        }
                                    })()}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
        </>
    );
};