
import React, { useState, useMemo } from 'react';
import { UserProfile, BackgroundTheme, AiDifficulty } from '../types';
import { calculateLevel, getXpForLevel, DEFAULT_AVATARS, PREMIUM_AVATARS, buyItem, getAvatarName } from '../services/supabase';
import { SignOutButton } from './SignOutButton';
import { CardCoverStyle, Card } from './Card';
import { audioService } from '../services/audio';

/**
 * Enhanced Theme Configuration
 */
export interface ThemeConfig {
  id: string;
  name: string;
  price: number;
  base: string;
  colors: string;
  texture?: boolean;      // Felt/Grain texture
  technoGrid?: boolean;   // Cyberpunk grid
  cityLights?: boolean;   // Galactic star fields
  lotusForest?: boolean;  // New Lotus Forest engine
  yuletide?: boolean;     // New Yuletide engine
  highRoller?: boolean;   // New High Roller engine
  prestige?: boolean;     // New Prestige engine
  emperor?: boolean;      // Imperial gold patterns
  koiPrestige?: boolean;  // New Imperial Koi engine
  spotlight?: string;     // Custom central light color
  tier: 'BASIC' | 'PREMIUM';
  isCityLightsPixel?: boolean;
}

export const PREMIUM_BOARDS: ThemeConfig[] = [
  { 
    id: 'EMERALD', 
    name: 'Emerald Felt', 
    tier: 'BASIC',
    price: 0, 
    base: 'bg-[#0a3d23]', 
    colors: 'from-green-500/20 via-emerald-800/40 to-[#052e16]', 
    texture: true 
  },
  { 
    id: 'CYBER_BLUE', 
    name: 'Cobalt Felt', 
    tier: 'BASIC',
    price: 500, 
    base: 'bg-[#0a1e3d]', 
    colors: 'from-blue-400/30 via-indigo-600/40 to-[#020617]', 
    texture: true 
  },
  { 
    id: 'CRIMSON_VOID', 
    name: 'Baccarat Ruby', 
    tier: 'BASIC',
    price: 1000, 
    base: 'bg-[#4d0000]', 
    colors: 'from-red-500/40 via-red-900/60 to-black', 
    texture: true,
    spotlight: 'rgba(239, 68, 68, 0.25)' 
  },
  { 
    id: 'CYBERPUNK_NEON', 
    name: 'ONYX SPACE', 
    tier: 'PREMIUM',
    price: 2500, 
    base: 'bg-[#010103]', 
    colors: 'from-blue-950/10 via-black to-black', 
    technoGrid: true, 
    cityLights: true,
    spotlight: 'rgba(6, 182, 212, 0.05)' 
  },
  { 
    id: 'CITY_LIGHTS_PIXEL', 
    name: 'Nocturnal Penthouse', 
    tier: 'PREMIUM',
    price: 3500, 
    base: 'bg-[#050510]', 
    colors: 'from-purple-900/20 via-[#050510] to-black', 
    isCityLightsPixel: true,
    spotlight: 'rgba(168, 85, 247, 0.15)' 
  },
  { 
    id: 'LOTUS_FOREST', 
    name: 'Lotus Forest', 
    tier: 'PREMIUM',
    price: 4000, 
    base: 'bg-[#064e3b]', 
    colors: 'from-[#34d399]/40 via-[#10b981]/20 to-[#064e3b]', 
    lotusForest: true,
    emperor: true,
    spotlight: 'rgba(252, 231, 243, 0.5)' 
  },
  { 
    id: 'CHRISTMAS_YULETIDE', 
    name: 'Midnight Yuletide', 
    tier: 'PREMIUM',
    price: 4500, 
    base: 'bg-[#010b13]', 
    colors: 'from-blue-900/30 via-[#010b13] to-black', 
    yuletide: true,
    spotlight: 'rgba(191, 219, 254, 0.2)' 
  },
  { 
    id: 'GOLDEN_EMPEROR', 
    name: 'Lucky Envelope', 
    tier: 'PREMIUM',
    price: 5000, 
    base: 'bg-[#1a0000]', 
    colors: 'from-[#800000] via-[#330000] to-black', 
    prestige: true, 
    spotlight: 'rgba(251, 191, 36, 0.15)' 
  },
  { 
    id: 'KOI_PRESTIGE', 
    name: 'Imperial Koi Pavilion', 
    tier: 'PREMIUM',
    price: 8500, 
    base: 'bg-[#0a2e3d]', 
    colors: 'from-[#14b8a6]/20 via-[#0a2e3d]/40 to-[#020617]', 
    koiPrestige: true,
    spotlight: 'rgba(20, 184, 166, 0.2)' 
  },
  { 
    id: 'HIGH_ROLLER', 
    name: 'Le Blanc', 
    tier: 'PREMIUM',
    price: 10000, 
    base: 'bg-slate-50', 
    colors: 'from-white via-slate-100 to-slate-200', 
    highRoller: true, 
    spotlight: 'rgba(251, 191, 36, 0.08)' 
  }
];

export const ImperialGoldLayer: React.FC<{ opacity?: number; isMini?: boolean }> = ({ opacity = 0.6, isMini = false }) => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ opacity }}>
    <div className="absolute top-0 left-0 w-full h-full opacity-20" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/oriental-tiles.png")' }}></div>
    <div className={`absolute ${isMini ? 'top-2 left-2 w-6 h-6 border-t-2 border-l-2' : 'top-8 left-8 w-32 h-32 border-t-4 border-l-4'} border-yellow-500/30 ${isMini ? 'rounded-tl-lg' : 'rounded-tl-3xl'}`}></div>
    <div className={`absolute ${isMini ? 'top-2 right-2 w-6 h-6 border-t-2 border-r-2' : 'top-8 right-8 w-32 h-32 border-t-4 border-r-4'} border-yellow-500/30 ${isMini ? 'rounded-tr-lg' : 'rounded-tr-3xl'}`}></div>
    <div className={`absolute ${isMini ? 'bottom-2 left-2 w-6 h-6 border-b-2 border-l-2' : 'bottom-8 left-8 w-32 h-32 border-b-4 border-l-4'} border-yellow-500/30 ${isMini ? 'rounded-bl-lg' : 'rounded-bl-3xl'}`}></div>
    <div className={`absolute ${isMini ? 'bottom-2 right-2 w-6 h-6 border-b-2 border-r-2' : 'bottom-8 right-8 w-32 h-32 border-b-4 border-r-4'} border-yellow-500/30 ${isMini ? 'rounded-br-lg' : 'rounded-br-3xl'}`}></div>
  </div>
);

/**
 * ImperialKoiEngine - Luxury prestige water environment.
 * Features procedural caustic light, gold flakes, and high-quality koi navigation.
 */
const ImperialKoiEngine: React.FC<{ isMini?: boolean }> = ({ isMini }) => {
  const koi = useMemo(() => {
    return Array.from({ length: isMini ? 3 : 8 }).map((_, i) => ({
      id: `koi-${i}`,
      delay: Math.random() * -40,
      duration: 20 + Math.random() * 20,
      top: 10 + Math.random() * 80,
      scale: 0.6 + Math.random() * 0.8,
      type: i % 3 === 0 ? 'KOHAKU' : i % 3 === 1 ? 'SANKE' : 'GOLDEN',
      rotate: Math.random() > 0.5 ? 0 : 180,
    }));
  }, [isMini]);

  const goldFlakes = useMemo(() => {
    return Array.from({ length: isMini ? 10 : 40 }).map((_, i) => ({
      id: `gold-${i}`,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: 1 + Math.random() * 3,
      delay: Math.random() * -10,
      duration: 5 + Math.random() * 5
    }));
  }, [isMini]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden bg-[#020617]">
      {/* 1. Deep Imperial Water Base */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0f766e]/20 via-[#0a2e3d] to-[#020617]"></div>

      {/* 2. Procedural Water Caustics (Expensive Refraction Look) */}
      <div className="absolute inset-0 opacity-[0.15] mix-blend-screen overflow-hidden">
        <svg width="100%" height="100%" className="scale-[1.5]">
            <filter id="waterCaustics">
                <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="3" result="noise" seed="5" />
                <feDisplacementMap in="SourceGraphic" in2="noise" scale="50" />
            </filter>
            <rect width="100%" height="100%" fill="#14b8a6" filter="url(#waterCaustics)" className="animate-[caustic-drift_60s_linear_infinite]" />
        </svg>
      </div>

      {/* 3. Gold Leaf Sediment */}
      {goldFlakes.map(f => (
        <div 
            key={f.id}
            className="absolute bg-yellow-500 rounded-sm opacity-20 blur-[0.5px] animate-pulse"
            style={{
                left: `${f.left}%`,
                top: `${f.top}%`,
                width: `${f.size}px`,
                height: `${f.size}px`,
                animationDelay: `${f.delay}s`,
                animationDuration: `${f.duration}s`
            }}
        />
      ))}

      {/* 4. Luxury Koi Navigation */}
      {koi.map(k => {
        let bodyColor = "from-white via-orange-500 to-red-600";
        if (k.type === 'KOHAKU') bodyColor = "from-white via-red-500 to-white";
        if (k.type === 'GOLDEN') bodyColor = "from-yellow-200 via-yellow-500 to-orange-400";

        return (
            <div 
              key={k.id}
              className="absolute animate-koi-swim-prestige opacity-60"
              style={{
                top: `${k.top}%`,
                animationDelay: `${k.delay}s`,
                animationDuration: `${k.duration}s`,
                transform: `scale(${k.scale}) rotate(${k.rotate}deg)`,
              } as any}
            >
                <div className="relative w-24 h-8 md:w-40 md:h-12 flex items-center justify-center">
                    {/* Shadow layer */}
                    <div className="absolute inset-0 bg-black/30 blur-xl translate-y-8 scale-x-110"></div>
                    
                    {/* Tail */}
                    <div className="absolute right-0 w-1/3 h-full bg-inherit opacity-40 animate-koi-tail-wag" style={{ clipPath: 'polygon(0 40%, 100% 0, 100% 100%, 0 60%)' }}></div>
                    
                    {/* Body */}
                    <div className={`w-full h-full rounded-full bg-gradient-to-r ${bodyColor} border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.1)] relative overflow-hidden`}>
                         <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 0)', backgroundSize: '4px 4px' }}></div>
                         <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 bg-white/20 blur-md rounded-full"></div>
                    </div>

                    {/* Fins */}
                    <div className="absolute top-[-20%] left-1/4 w-1/4 h-1/2 bg-white/30 rounded-full blur-[1px] rotate-[-20deg]"></div>
                    <div className="absolute bottom-[-20%] left-1/4 w-1/4 h-1/2 bg-white/30 rounded-full blur-[1px] rotate-[20deg]"></div>
                </div>
            </div>
        );
      })}

      {/* 5. Surface Sparkle (Top Layer) */}
      {!isMini && Array.from({ length: 15 }).map((_, i) => (
          <div 
            key={`sparkle-${i}`}
            className="absolute w-1 h-1 bg-white/80 rounded-full blur-[1px] animate-[sparkle_8s_infinite_ease-in-out]"
            style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 10}s`
            }}
          />
      ))}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes caustic-drift {
            0% { transform: translate(-10%, -10%) rotate(0deg); }
            100% { transform: translate(10%, 10%) rotate(360deg); }
        }
        @keyframes koi-swim-prestige {
            0% { left: -300px; transform: translateY(0px) scaleX(1); }
            25% { transform: translateY(50px); }
            50% { transform: translateY(-50px); }
            75% { transform: translateY(30px); }
            100% { left: 110%; transform: translateY(0px) scaleX(1); }
        }
        @keyframes koi-tail-wag {
            0%, 100% { transform: scaleY(1); }
            50% { transform: scaleY(1.4); }
        }
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0); }
          50% { opacity: 0.8; transform: scale(1.5); }
        }
        .animate-koi-swim-prestige { animation: koi-swim-prestige linear infinite; }
        .animate-koi-tail-wag { animation: koi-tail-wag 0.8s ease-in-out infinite; transform-origin: left center; }
      `}} />
    </div>
  );
};

/**
 * CityLightsEngine - Premium Nocturnal Vantage Point
 */
const CityLightsEngine: React.FC<{ isMini?: boolean }> = ({ isMini }) => {
  const pixelLights = useMemo(() => {
    return Array.from({ length: isMini ? 40 : 150 }).map((_, i) => ({
      id: `p-light-${i}`,
      x: Math.random() * 100,
      y: 40 + Math.random() * 60,
      size: Math.random() * 2 + 1,
      delay: Math.random() * 5,
      duration: 2 + Math.random() * 3,
      color: i % 5 === 0 ? '#facc15' : i % 8 === 0 ? '#d946ef' : i % 3 === 0 ? '#22d3ee' : '#ffffff'
    }));
  }, [isMini]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden bg-[#050510]">
      {/* 1. Deep Distant Skyline - High Quality Pixel Art (Penhouse View) */}
      <div className="absolute inset-0 opacity-40 bg-[url('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-bottom mix-blend-screen filter brightness-[0.4] grayscale-[0.5] contrast-125"></div>
      
      {/* 2. City Glow Layer */}
      <div className="absolute bottom-0 left-0 w-full h-[60%] bg-gradient-to-t from-purple-900/30 via-blue-900/10 to-transparent"></div>
      
      {/* 3. Twinkling Window Pixels */}
      {pixelLights.map(p => (
        <div 
          key={p.id}
          className="absolute animate-pulse"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`
          }}
        />
      ))}

      {/* 4. Luxury Penthouse Overlay - Glass Balcony Reflection */}
      <div className="absolute inset-0 z-10">
          {/* Subtle Vertical Reflections */}
          <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 49%, rgba(255,255,255,0.4) 51%, transparent 100%)', backgroundSize: '400px 100%' }}></div>
          {/* Top-down Penthouse Light */}
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-purple-500/10 to-transparent"></div>
          {/* Floor Reflection Gradient */}
          <div className="absolute bottom-0 left-0 w-full h-[40%] bg-gradient-to-t from-[#050510] to-transparent"></div>
      </div>

      {/* 5. Scanline Aesthetic Overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-20" style={{ backgroundImage: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))', backgroundSize: '100% 4px, 3px 100%' }}></div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes drift {
          0% { background-position: 0% 0%; }
          100% { background-position: 100% 0%; }
        }
      `}} />
    </div>
  );
};

/**
 * High-Precision Kingdom Hearts / Final Fantasy Geometry
 */
const PRESTIGE_ASSETS = {
  XIII: "M5,20 L12,20 L25,45 L38,20 L45,20 L28,50 L45,80 L38,80 L25,55 L12,80 L5,80 L22,50 Z M55,20 L61,20 L61,80 L55,80 Z M70,20 L76,20 L76,80 L70,80 Z M85,20 L91,20 L91,80 L85,80 Z",
  HEART: "M50,25 C35,5 5,10 5,45 C5,75 50,95 50,95 C50,95 95,75 95,45 C95,10 65,5 50,25 Z M50,45 L50,80",
  DIAMOND: "M50,5 L90,50 L50,95 L10,50 Z M50,15 L50,85 M20,50 L80,50"
};

/**
 * Asian Prestige Assets: Coins, Ingots, Clouds
 */
const ASIAN_PRESTIGE_ASSETS = {
  INGOT: "M10,60 Q10,40 30,30 Q40,10 50,10 Q60,10 70,30 Q90,40 90,60 Q90,85 50,85 Q10,85 10,60",
  COIN: "M50,5 A45,45 0 1,0 50,95 A45,45 0 1,0 50,5 Z M40,40 H60 V60 H40 Z",
  CLOUD: "M25,60 C15,60 10,50 15,40 C10,30 25,20 35,30 C45,15 65,15 75,30 C90,20 95,45 85,55 C95,65 85,80 70,75 C60,90 40,90 30,80 C15,85 10,70 25,60",
  XIII_ORNATE: "M5,20 L12,20 L25,45 L38,20 L45,20 L28,50 L45,80 L38,80 L25,55 L12,80 L5,80 L22,50 Z M55,20 L61,20 L61,80 L55,80 Z M70,20 L76,20 L76,80 L70,80 Z M85,20 L91,20 L91,80 L85,80 Z"
};

/**
 * HighRollerEngine - The "Le Blanc" Motif
 */
const HighRollerEngine: React.FC<{ isMini?: boolean }> = ({ isMini }) => {
  const assetCount = isMini ? 12 : 32;
  
  const artifacts = useMemo(() => {
    const keys = Object.keys(PRESTIGE_ASSETS);
    return Array.from({ length: assetCount }).map((_, i) => {
      const type = keys[Math.floor(Math.random() * keys.length)];
      const sizeBase = Math.random();
      const size = sizeBase > 0.85 ? (Math.random() * 20 + 40) : (Math.random() * 10 + 12);
      
      return {
        id: `castle-v3-${i}`,
        type,
        path: PRESTIGE_ASSETS[type as keyof typeof PRESTIGE_ASSETS],
        x: Math.random() * 100,
        y: Math.random() * 100,
        size,
        delay: Math.random() * -60,
        duration: 45 + Math.random() * 45,
        rotate: Math.random() * 360,
        sway: Math.random() * 180 - 90,
        hue: type === 'HEART' ? '#facc15' : type === 'DIAMOND' ? '#d4af37' : '#fbbf24',
        glow: 'rgba(251, 191, 36, 0.2)',
        blur: size < 18 ? 2 : 0
      };
    });
  }, [assetCount]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden bg-slate-50">
      <div className="absolute inset-0 bg-gradient-to-br from-white via-slate-50 to-slate-200"></div>
      <div className="absolute inset-0 opacity-40">
          <div className="absolute top-[-40%] left-[-20%] w-[140%] h-[140%] bg-[repeating-linear-gradient(75deg,rgba(251,191,36,0.03)_0px,rgba(251,191,36,0.03)_100px,transparent_100px,transparent_800px)] blur-[120px] animate-[pulse_25s_infinite]"></div>
      </div>
      {artifacts.map(a => (
        <div 
          key={a.id}
          className="absolute animate-castle-drift"
          style={{
            left: `${a.x}%`,
            top: '110%',
            width: `${a.size}px`,
            height: `${a.size}px`,
            filter: a.blur ? `blur(${a.blur}px)` : 'none',
            animationDelay: `${a.delay}s`,
            animationDuration: `${a.duration}s`,
            '--sway': `${a.sway}px`
          } as any}
        >
          <svg viewBox="0 0 100 100" className="w-full h-full" style={{ filter: `drop-shadow(0 2px 8px ${a.glow})` }}>
             <defs>
                <linearGradient id={`castleGradV3-${a.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fff9db" />
                    <stop offset="50%" stopColor={a.hue} />
                    <stop offset="100%" stopColor={a.hue} stopOpacity="0.8" />
                </linearGradient>
             </defs>
             <path d={a.path} fill={`url(#castleGradV3-${a.id})`} stroke="#d4af37" strokeWidth="0.5" strokeOpacity="0.3" />
             <path d={a.path} fill="white" opacity="0.15" className="animate-pulse" />
          </svg>
        </div>
      ))}
      {!isMini && Array.from({ length: 20 }).map((_, i) => (
        <div 
          key={`glint-castle-v3-${i}`}
          className="absolute w-1.5 h-1.5 bg-yellow-400/30 rounded-full blur-[1px] animate-[sparkle_8s_infinite_ease-in-out]"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 12}s`,
          }}
        />
      ))}
      <div className="absolute inset-0 shadow-[inset_0_0_150px_rgba(251,191,36,0.06)] pointer-events-none"></div>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes castle-drift {
          0% { transform: translateY(0vh) translateX(0) rotate(0deg) scale(0.7); opacity: 0; }
          15% { opacity: 0.65; }
          85% { opacity: 0.65; }
          100% { transform: translateY(-135vh) translateX(var(--sway)) rotate(360deg) scale(1); opacity: 0; }
        }
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        .animate-castle-drift { animation: castle-drift linear infinite; }
      `}} />
    </div>
  );
};

/**
 * PrestigeEngine - High-End Asian Luxury Red & Gold
 */
const PrestigeEngine: React.FC<{ isMini?: boolean }> = ({ isMini }) => {
  const assetCount = isMini ? 12 : 36;
  
  const symbols = useMemo(() => {
    const keys = Object.keys(ASIAN_PRESTIGE_ASSETS);
    return Array.from({ length: assetCount }).map((_, i) => {
      const type = keys[Math.floor(Math.random() * keys.length)];
      const sizeBase = Math.random();
      const size = sizeBase > 0.85 ? (Math.random() * 25 + 35) : (Math.random() * 10 + 10);
      
      return {
        id: `prestige-${i}`,
        path: ASIAN_PRESTIGE_ASSETS[type as keyof typeof ASIAN_PRESTIGE_ASSETS],
        x: Math.random() * 100,
        y: Math.random() * 100,
        size,
        delay: Math.random() * -60,
        duration: 35 + Math.random() * 30,
        rotate: Math.random() * 360,
        sway: Math.random() * 140 - 70,
        gold: Math.random() > 0.3 ? '#facc15' : '#fbbf24',
        blur: size < 12 ? 1.5 : 0
      };
    });
  }, [assetCount]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden bg-[#1a0000]">
      {/* 1. Deep Imperial Lacquer Base */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#4d0000] via-[#1a0000] to-black"></div>
      
      {/* 2. Auspicious Lattice Background (Wow factor texture) */}
      <div className="absolute inset-0 opacity-[0.07] mix-blend-overlay" style={{ 
        backgroundImage: 'url("https://www.transparenttextures.com/patterns/oriental-tiles.png")',
        backgroundSize: '250px'
      }}></div>

      {/* 3. High-Key Red Silk Radiance */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-40">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.15)_0%,transparent_70%)] animate-pulse"></div>
      </div>

      {/* 4. Luxury Floating Gold Artifacts */}
      {symbols.map(s => (
        <div 
          key={s.id}
          className="absolute animate-prestige-drift"
          style={{
            left: `${s.x}%`,
            top: '110%',
            width: `${s.size}px`,
            height: `${s.size}px`,
            filter: s.blur ? `blur(${s.blur}px)` : 'none',
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
            '--sway': `${s.sway}px`
          } as any}
        >
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_2px_12px_rgba(251,191,36,0.4)]">
             <defs>
                <linearGradient id={`goldGrad-${s.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fff9db" />
                    <stop offset="30%" stopColor="#facc15" />
                    <stop offset="70%" stopColor="#8b6508" />
                    <stop offset="100%" stopColor="#3d280a" />
                </linearGradient>
             </defs>
             <path d={s.path} fill={`url(#goldGrad-${s.id})`} stroke="#d4af37" strokeWidth="0.5" strokeOpacity="0.4" />
             {/* Metallic Sheen layer */}
             <path d={s.path} fill="white" opacity="0.1" className="animate-pulse" />
          </svg>
        </div>
      ))}

      {/* 5. Imperial Gold Corner Framing (Mini only uses 2) */}
      {!isMini && (
          <>
            <div className="absolute top-0 left-0 w-48 h-48 border-t-[3px] border-l-[3px] border-yellow-500/20 rounded-tl-[4rem] m-6"></div>
            <div className="absolute bottom-0 right-0 w-48 h-48 border-b-[3px] border-r-[3px] border-yellow-500/20 rounded-br-[4rem] m-6"></div>
          </>
      )}

      {/* 6. Pure Gold Dust Particles */}
      {!isMini && Array.from({ length: 25 }).map((_, i) => (
        <div 
          key={`dust-${i}`}
          className="absolute w-1 h-1 bg-yellow-500/60 rounded-full blur-[0.5px] animate-[gold-sparkle_10s_infinite_ease-in-out]"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 15}s`,
          }}
        />
      ))}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes prestige-drift {
          0% { transform: translateY(0vh) translateX(0) rotate(0deg) scale(0.65); opacity: 0; }
          15% { opacity: 0.9; }
          85% { opacity: 0.9; }
          100% { transform: translateY(-135vh) translateX(var(--sway)) rotate(450deg) scale(1.05); opacity: 0; }
        }
        @keyframes gold-sparkle {
          0%, 100% { opacity: 0; transform: scale(0); }
          50% { opacity: 1; transform: scale(1.5) rotate(45deg); }
        }
        .animate-prestige-drift { animation: prestige-drift linear infinite; }
      `}} />
    </div>
  );
};

/**
 * Yuletide Snow Path
 */
const SNOWFLAKE_PATH = "M50,0 L53,35 L85,15 L65,45 L100,50 L65,55 L85,85 L53,65 L50,100 L47,65 L15,85 L35,55 L0,50 L35,45 L15,15 L47,35 Z";

/**
 * YuletideEngine - Prestige Winter Atmosphere
 */
const YuletideEngine: React.FC<{ isMini?: boolean }> = ({ isMini }) => {
  const flakeCount = isMini ? 15 : 45;
  const bokehCount = isMini ? 5 : 12;

  const flakes = useMemo(() => {
    return Array.from({ length: flakeCount }).map((_, i) => {
      const sizeBase = Math.random();
      const size = sizeBase > 0.8 ? (Math.random() * 20 + 20) : (Math.random() * 8 + 6);
      return {
        id: `flake-${i}`,
        x: Math.random() * 100,
        y: Math.random() * -100, 
        size,
        delay: Math.random() * -40,
        duration: 15 + Math.random() * 15,
        rotate: Math.random() * 360,
        sway: Math.random() * 100 - 50,
        blur: size < 10 ? 1 : 0
      };
    });
  }, [flakeCount]);

  const bokeh = useMemo(() => {
    const colors = ['rgba(16, 185, 129, 0.15)', 'rgba(239, 68, 68, 0.15)', 'rgba(234, 179, 8, 0.15)'];
    return Array.from({ length: bokehCount }).map((_, i) => ({
      id: `bokeh-${i}`,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 150 + 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      duration: 10 + Math.random() * 10,
      delay: Math.random() * -20
    }));
  }, [bokehCount]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden bg-[#010b13]">
      <div className="absolute inset-0 bg-gradient-to-b from-[#021b2d] via-[#010b13] to-black"></div>
      <div className="absolute inset-0 opacity-[0.04] mix-blend-screen" style={{ 
        backgroundImage: 'url("https://www.transparenttextures.com/patterns/p6.png")',
        backgroundSize: '200px'
      }}></div>
      {bokeh.map(b => (
        <div 
          key={b.id}
          className="absolute rounded-full blur-[80px] animate-pulse"
          style={{
            left: `${b.x}%`,
            top: `${b.y}%`,
            width: `${b.size}px`,
            height: `${b.size}px`,
            backgroundColor: b.color,
            animationDuration: `${b.duration}s`,
            animationDelay: `${b.delay}s`
          }}
        />
      ))}
      {flakes.map(s => (
        <div 
          key={s.id}
          className="absolute animate-yuletide-fall"
          style={{
            left: `${s.x}%`,
            top: '-10%',
            width: `${s.size}px`,
            height: `${s.size}px`,
            filter: s.blur ? `blur(${s.blur}px)` : 'none',
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
            '--sway': `${s.sway}px`
          } as any}
        >
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">
             <defs>
                <linearGradient id={`flakeGrad-${s.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="50%" stopColor="#bfdbfe" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0.5" />
                </linearGradient>
             </defs>
             <path d={SNOWFLAKE_PATH} fill={`url(#flakeGrad-${s.id})`} opacity="0.8" />
          </svg>
        </div>
      ))}
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] aspect-square bg-[radial-gradient(circle_at_center,_rgba(234,179,8,0.1)_0%,_transparent_70%)]"></div>
      <div className="absolute inset-0 border-[40px] border-transparent shadow-[inset_0_0_150px_rgba(191,219,254,0.08)] pointer-events-none"></div>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes yuletide-fall {
          0% { transform: translateY(-10vh) translateX(0) rotate(0deg) scale(0.8); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(110vh) translateX(var(--sway)) rotate(360deg) scale(1); opacity: 0; }
        }
        .animate-yuletide-fall { animation: yuletide-fall linear infinite; }
      `}} />
    </div>
  );
};

/**
 * Lotus Symbol Paths
 */
const SYMBOL_PATHS = {
  LOTUS: "M50,5 C60,25 90,35 90,55 C90,75 70,85 50,85 C30,85 10,75 10,55 C10,35 40,25 50,5 Z M50,25 C55,40 75,50 75,60 C75,70 65,75 50,75 C35,75 25,70 25,60 C25,50 45,40 50,25 Z",
  PETAL: "M50,15 C70,35 80,65 50,85 C20,65 30,35 50,15 Z",
  DIAMOND_CRYSTAL: "M50,5 L85,35 L50,95 L15,35 Z M25,35 L75,35 M50,5 L50,95 M15,35 L85,35"
};

/**
 * LotusEngine - Prestige Nature & Crystal Vibes
 */
const LotusEngine: React.FC<{ isMini?: boolean }> = ({ isMini }) => {
  const particleCount = isMini ? 12 : 36;
  
  const symbols = useMemo(() => {
    const types = Object.keys(SYMBOL_PATHS);
    return Array.from({ length: particleCount }).map((_, i) => {
      const sizeBase = Math.random();
      const size = sizeBase > 0.85 ? (Math.random() * 25 + 40) : sizeBase > 0.3 ? (Math.random() * 15 + 15) : (Math.random() * 8 + 8);
      
      return {
        id: `symbol-${i}`,
        path: SYMBOL_PATHS[types[Math.floor(Math.random() * types.length)] as keyof typeof SYMBOL_PATHS],
        x: Math.random() * 100,
        y: Math.random() * 100,
        size,
        delay: Math.random() * -60,
        duration: 30 + Math.random() * 40, 
        rotate: Math.random() * 360,
        sway: Math.random() * 160 - 80,
        hue: Math.random() > 0.5 ? '#f472b6' : '#fbcfe8',
        blur: size < 12 ? 1.5 : size > 45 ? 0 : 0.8, 
        initialOpacity: size < 12 ? 0.2 : 0.7
      };
    });
  }, [particleCount]);

  const bambooStalks = useMemo(() => {
    return Array.from({ length: isMini ? 4 : 12 }).map((_, i) => ({
      id: `bamboo-${i}`,
      x: (i * (100 / (isMini ? 4 : 12))) + (Math.random() * 6),
      width: Math.random() * 5 + 3,
      opacity: 0.04 + (Math.random() * 0.09),
      height: 85 + Math.random() * 35
    }));
  }, [isMini]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden bg-[#065f46]">
      <div className="absolute inset-0 bg-gradient-to-br from-[#6ee7b7] via-[#10b981] to-[#064e3b]"></div>
      <div className="absolute inset-0 opacity-[0.06] mix-blend-overlay" style={{ 
        backgroundImage: 'url("https://www.transparenttextures.com/patterns/wave-cut.png")',
        backgroundSize: '280px'
      }}></div>
      {bambooStalks.map(s => (
        <div 
          key={s.id}
          className="absolute bottom-0 rounded-full"
          style={{
            left: `${s.x}%`,
            width: `${s.width}px`,
            height: `${s.height}%`,
            opacity: s.opacity,
            background: 'linear-gradient(to right, rgba(255,255,255,0.4), rgba(255,255,255,0.1) 40%, rgba(0,0,0,0.1) 60%, rgba(255,255,255,0.3))',
            boxShadow: 'inset 0 0 12px rgba(16,185,129,0.3)',
            backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0px, transparent 140px, rgba(0,0,0,0.2) 140px, rgba(0,0,0,0.2) 144px, rgba(255,255,255,0.1) 144px, rgba(255,255,255,0.1) 146px)'
          }}
        />
      ))}
      <div className="absolute top-[-20%] right-[-10%] w-[120%] h-[120%] opacity-40 pointer-events-none">
          <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.08)_0px,rgba(255,255,255,0.08)_80px,transparent_80px,transparent_400px)] blur-[120px] animate-[pulse_18s_infinite]"></div>
      </div>
      {symbols.map(s => (
        <div 
          key={s.id}
          className="absolute animate-lotus-drift-v3"
          style={{
            left: `${s.x}%`,
            top: '110%',
            width: `${s.size}px`,
            height: `${s.size}px`,
            filter: s.blur ? `blur(${s.blur}px)` : 'none',
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
            '--sway': `${s.sway}px`
          } as any}
        >
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_18px_rgba(255,255,255,0.5)]">
             <defs>
                <linearGradient id={`symbolGradV3-${s.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="white" />
                    <stop offset="60%" stopColor={s.hue} />
                    <stop offset="100%" stopColor={s.hue} stopOpacity="0.8" />
                </linearGradient>
             </defs>
             <path d={s.path} fill={`url(#symbolGradV3-${s.id})`} />
             <path d={s.path} fill="white" opacity="0.12" className="animate-pulse" />
          </svg>
        </div>
      ))}
      {!isMini && Array.from({ length: 18 }).map((_, i) => (
        <div 
          key={`glintV3-${i}`}
          className="absolute w-2 h-2 bg-white shadow-[0_0_20px_white] animate-[lotus-sparkle-v3_7s_infinite_ease-in-out]"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 12}s`,
            clipPath: 'polygon(50% 0%, 65% 35%, 100% 50%, 65% 65%, 50% 100%, 35% 65%, 0% 50%, 35% 35%)'
          }}
        />
      ))}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,_rgba(255,255,255,0.1)_0%,_transparent_60%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_85%,_rgba(251,207,232,0.2)_0%,_transparent_60%)]"></div>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes lotus-drift-v3 {
          0% { transform: translateY(0vh) translateX(0) rotate(0deg) scale(0.6); opacity: 0; }
          15% { opacity: 0.95; }
          85% { opacity: 0.95; }
          100% { transform: translateY(-140vh) translateX(var(--sway)) rotate(540deg) scale(1.1); opacity: 0; }
        }
        @keyframes lotus-sparkle-v3 {
          0%, 100% { opacity: 0; transform: scale(0.1) rotate(0deg); }
          50% { opacity: 0.7; transform: scale(1.5) rotate(180deg); }
        }
        .animate-lotus-drift-v3 { animation: lotus-drift-v3 linear infinite; }
      `}} />
    </div>
  );
};

/**
 * SpaceEngine - Twinkling Galactic Sprawl
 */
const SpaceEngine: React.FC<{ isMini?: boolean }> = ({ isMini }) => {
  const starCount = isMini ? 100 : 800;
  const starFields = useMemo(() => {
    return Array.from({ length: starCount }).map((_, i) => ({
      id: `star-${i}`,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 1.8 + 0.2,
      opacity: 0.1 + Math.random() * 0.7,
      color: Math.random() > 0.8 ? '#facc15' : Math.random() > 0.6 ? '#67e8f9' : '#ffffff', 
      delay: Math.random() * 40,
      duration: 10 + Math.random() * 20 
    }));
  }, [starCount]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden bg-black">
      <div className="absolute inset-0 bg-gradient-to-b from-[#010103] via-[#02050c] to-[#000000]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(34,211,238,0.02)_0%,_transparent_80%)] opacity-60"></div>
      <div className="absolute inset-0 z-10">
        {starFields.map(s => (
          <div 
            key={s.id}
            className="absolute rounded-full animate-star-shimmer"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: `${s.size}px`,
              height: `${s.size}px`,
              backgroundColor: s.color,
              boxShadow: `0 0 ${s.size * 4}px ${s.color}`,
              opacity: s.opacity,
              animationDelay: `${s.delay}s`,
              animationDuration: `${s.duration}s`
            }}
          />
        ))}
      </div>
      <div className="absolute inset-0 z-20 pointer-events-none opacity-10">
         <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black"></div>
         <div className="absolute inset-0 opacity-[0.04]" style={{ 
            backgroundImage: 'repeating-linear-gradient(90deg, transparent 0, transparent 150px, #fff 151px, transparent 155px)', 
            backgroundSize: '100% 400px' 
         }}></div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes star-shimmer {
          0%, 100% { opacity: 0.1; transform: scale(1); filter: brightness(1); }
          50% { opacity: 1; transform: scale(1.2); filter: brightness(1.5); }
        }
        .animate-star-shimmer { animation: star-shimmer infinite ease-in-out; }
      `}} />
    </div>
  );
};

/**
 * Master Board Surface Component
 */
export const BoardSurface: React.FC<{ 
  themeId: string; 
  isMini?: boolean;
  className?: string;
}> = ({ themeId, isMini = false, className = "" }) => {
  const theme = PREMIUM_BOARDS.find(b => b.id === themeId) || PREMIUM_BOARDS[0];
  
  return (
    <div className={`absolute inset-0 overflow-hidden ${theme.base} ${className}`}>
      {theme.id === 'CITY_LIGHTS_PIXEL' && <CityLightsEngine isMini={isMini} />}
      {theme.koiPrestige && <ImperialKoiEngine isMini={isMini} />}
      <div className={`absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] ${theme.colors} opacity-100 mix-blend-screen transition-all duration-1000 z-1`}></div>
      {theme.texture && (
        <div className="absolute inset-0 opacity-[0.2] mix-blend-overlay pointer-events-none z-2" 
             style={{ 
               backgroundImage: 'repeating-radial-gradient(circle at center, #fff 0, #fff 1px, transparent 0, transparent 100%)', 
               backgroundSize: isMini ? '2px 2px' : '3.5px 3.5px' 
             }}></div>
      )}
      {theme.cityLights && <SpaceEngine isMini={isMini} />}
      {theme.lotusForest && <LotusEngine isMini={isMini} />}
      {theme.yuletide && <YuletideEngine isMini={isMini} />}
      {theme.highRoller && <HighRollerEngine isMini={isMini} />}
      {theme.prestige && <PrestigeEngine isMini={isMini} />}
      {theme.technoGrid && (
        <div className={`absolute inset-0 ${isMini ? 'opacity-[0.04]' : 'opacity-[0.02]'} pointer-events-none z-3`} 
             style={{ 
               backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', 
               backgroundSize: isMini ? '20px 20px' : '80px 80px' 
             }}></div>
      )}
      <div className="absolute inset-0 pointer-events-none z-4" 
           style={{ backgroundImage: `radial-gradient(circle at center, ${theme.spotlight || 'rgba(255,255,255,0.05)'} 0%, transparent 80%)` }}></div>
      {theme.emperor && <ImperialGoldLayer opacity={theme.id === 'LOTUS_FOREST' ? (isMini ? 0.15 : 0.25) : (isMini ? 0.4 : 0.6)} isMini={isMini} />}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-transparent pointer-events-none z-5"></div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        .board-city-lights {
          background-image: url('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=2000&auto=format&fit=crop');
          background-size: cover;
          background-position: center;
          position: relative;
        }
        .board-city-lights::after {
          content: "";
          position: absolute;
          inset: 0;
          background-color: rgba(0, 0, 0, 0.6);
        }
      `}} />
    </div>
  );
};

/**
 * Individual Board Selection Preview Tile
 */
export const BoardPreview: React.FC<{ 
  themeId: string; 
  className?: string; 
  active?: boolean;
  unlocked?: boolean;
}> = ({ themeId, className = "", active, unlocked = true }) => {
  return (
    <div className={`relative w-full aspect-[16/10] rounded-2xl overflow-hidden border transition-all duration-500 ${active ? 'border-yellow-500/50 ring-2 ring-yellow-500 ring-inset shadow-2xl' : 'border-white/10 group-hover:border-white/20'} ${className}`}>
      <BoardSurface themeId={themeId} isMini />
      {!unlocked && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-black/60 border border-white/10 flex items-center justify-center opacity-60">
            <span className="text-xs">🔒</span>
          </div>
        </div>
      )}
      {active && (
        <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-yellow-500 text-black flex items-center justify-center text-[10px] font-black shadow-lg animate-in zoom-in duration-300">
           ✓
        </div>
      )}
    </div>
  );
};

export type HubTab = 'PROFILE' | 'CUSTOMIZE' | 'SETTINGS';

interface UserHubProps {
  initialTab?: HubTab;
  onClose: () => void;
  profile: UserProfile | null;
  isGuest?: boolean;
  onRefreshProfile?: () => void;
  currentSleeve?: CardCoverStyle;
  onEquipSleeve?: (style: CardCoverStyle) => void;
  playerName: string;
  setPlayerName: (name: string) => void;
  playerAvatar: string;
  setPlayerAvatar: (avatar: string) => void;
  currentTheme?: BackgroundTheme;
  onChangeTheme?: (theme: BackgroundTheme) => void;
  soundEnabled?: boolean;
  setSoundEnabled?: (val: boolean) => void;
  isSinglePlayer?: boolean;
  spQuickFinish?: boolean;
  setSpQuickFinish?: (val: boolean) => void;
  currentDifficulty?: AiDifficulty;
  onChangeDifficulty?: (d: AiDifficulty) => void;
  onExitGame?: () => void;
  onSignOut: () => void;
  onOpenStore?: (tab?: 'SLEEVES' | 'AVATARS' | 'BOARDS') => void;
}

const StatBox: React.FC<{ label: string; value: string | number; icon: string; highlight?: boolean }> = ({ label, value, icon, highlight }) => (
  <div className={`relative bg-white/[0.03] border border-white/5 p-4 rounded-2xl transition-all hover:bg-white/[0.06] ${highlight ? 'ring-1 ring-yellow-500/20' : ''}`}>
    <div className="absolute top-2 right-3 text-lg opacity-10">{icon}</div>
    <p className="text-[7px] font-black text-white/30 uppercase tracking-[0.3em] mb-1">{label}</p>
    <p className={`text-xl sm:text-2xl font-black tracking-tighter ${highlight ? 'text-yellow-500' : 'text-white'}`}>{value}</p>
  </div>
);

export const UserHub: React.FC<UserHubProps> = ({
  onClose,
  profile,
  playerName,
  setPlayerName,
  playerAvatar,
  setPlayerAvatar,
  onSignOut,
  onRefreshProfile,
  isGuest
}) => {
  const [isCatalogExpanded, setIsCatalogExpanded] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);
  const [pendingPurchase, setPendingPurchase] = useState<{ id: string, name: string, price: number, type: 'SLEEVE' | 'AVATAR' | 'BOARD' } | null>(null);
  const [awardItem, setAwardItem] = useState<{ id: string, name: string, type: 'SLEEVE' | 'AVATAR' | 'BOARD' } | null>(null);

  if (!profile) return null;

  const currentLevel = calculateLevel(profile.xp);
  const nextLevelXp = getXpForLevel(currentLevel + 1);
  const curLevelXpFloor = getXpForLevel(currentLevel);
  const rangeTotal = Math.max(1, nextLevelXp - curLevelXpFloor);
  const progress = Math.min(100, Math.max(0, ((profile.xp - curLevelXpFloor) / rangeTotal) * 100));

  const wins = profile.wins || 0;
  const games = profile.games_played || 0;
  const winRate = games > 0 ? ((wins / games) * 100).toFixed(1) : "0.0";

  const isAvatarUnlocked = (emoji: string) => profile?.unlocked_avatars?.includes(emoji) || DEFAULT_AVATARS.includes(emoji);

  const handlePurchaseAttempt = (emoji: string) => {
    if (profile.coins < 250) return;
    setPendingPurchase({ id: emoji, name: getAvatarName(emoji), price: 250, type: 'AVATAR' });
  };

  const executePurchase = async () => {
    if (!pendingPurchase || buying) return;
    setBuying(pendingPurchase.id);
    try {
      await buyItem(profile.id, pendingPurchase.price, pendingPurchase.id, pendingPurchase.type, !!isGuest);
      audioService.playPurchase();
      setAwardItem({ id: pendingPurchase.id, name: pendingPurchase.name, type: pendingPurchase.type });
      setPendingPurchase(null);
      onRefreshProfile?.();
    } catch (err) {
      console.error(err);
    } finally {
      setBuying(null);
    }
  };

  const allPossibleAvatars = [...DEFAULT_AVATARS, ...PREMIUM_AVATARS];
  const visibleAvatars = isCatalogExpanded ? allPossibleAvatars : allPossibleAvatars.slice(0, 10);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-in fade-in duration-300" onClick={onClose}>
      
      {/* PURCHASE CONFIRMATION MODAL */}
      {pendingPurchase && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-md p-6 animate-in zoom-in-95 duration-200">
              <div className="bg-[#0a0a0a] border border-yellow-500/20 w-full max-w-xs rounded-[2rem] p-8 flex flex-col items-center text-center shadow-[0_0_100px_rgba(234,179,8,0.15)]">
                  <div className="text-4xl mb-4">💳</div>
                  <h3 className="text-white font-black uppercase tracking-widest text-sm mb-2">Confirm Purchase?</h3>
                  <p className="text-gray-500 text-[10px] uppercase tracking-widest mb-6">
                    Unlock <span className="text-white">{pendingPurchase.name}</span> for <span className="text-yellow-500">{pendingPurchase.price} GOLD</span>
                  </p>
                  <div className="grid grid-cols-2 gap-3 w-full">
                      <button onClick={() => setPendingPurchase(null)} className="py-3 rounded-xl bg-white/5 text-white/40 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors">Cancel</button>
                      <button 
                        onClick={executePurchase} 
                        disabled={!!buying}
                        className="py-3 rounded-xl bg-yellow-500 text-black text-[10px] font-black uppercase tracking-widest shadow-lg hover:scale-105 transition-transform disabled:opacity-50"
                      >
                        {buying ? '...' : 'Confirm'}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* ASSET SECURED AWARD ANIMATION */}
      {awardItem && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 backdrop-blur-3xl animate-in fade-in duration-500 overflow-hidden">
              {Array.from({ length: 20 }).map((_, i) => (
                  <div key={i} className="absolute w-2 h-2 rounded-sm bg-yellow-500/40 animate-award-particle" style={{
                      left: '50%',
                      top: '50%',
                      '--tx': `${(Math.random() - 0.5) * 600}px`,
                      '--ty': `${(Math.random() - 0.5) * 600}px`,
                      '--rot': `${Math.random() * 360}deg`,
                      animationDelay: `${Math.random() * 0.2}s`
                  } as any}></div>
              ))}
              <div className="relative flex flex-col items-center text-center max-w-sm">
                  <div className="absolute inset-0 bg-yellow-500/10 blur-[120px] animate-pulse"></div>
                  <div className="relative mb-10 animate-award-pop">
                      <div className="text-9xl drop-shadow-[0_0_40px_rgba(234,179,8,0.5)]">{awardItem.id}</div>
                  </div>
                  <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-yellow-200 to-yellow-500 uppercase tracking-tighter italic animate-award-text">ASSET SECURED</h2>
                  <p className="text-[10px] font-black uppercase tracking-[0.6em] text-gray-500 mt-4 animate-award-text [animation-delay:0.2s]">{awardItem.name} • UNLOCKED</p>
                  <button onClick={() => setAwardItem(null)} className="mt-12 px-12 py-4 rounded-full bg-white text-black font-black uppercase tracking-[0.3em] text-xs hover:scale-105 active:scale-95 transition-all shadow-2xl animate-award-text [animation-delay:0.4s]">DEPLOY ASSET</button>
              </div>
          </div>
      )}

      <div className="relative bg-[#050505] border border-white/10 w-full max-w-2xl max-h-[90vh] rounded-[2.5rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,1)] flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* Compact Header */}
        <div className="px-6 py-5 sm:px-8 sm:py-6 border-b border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent flex justify-between items-center relative">
          <div className="flex flex-col">
            <h2 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-white/80 to-white/30 uppercase italic tracking-widest font-serif leading-none">PLAYER DOSSIER</h2>
            <div className="flex items-center gap-2 mt-1.5">
               <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></span>
               <p className="text-[7px] font-black uppercase tracking-[0.4em] text-gray-500">Security Clearance Level A</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white rounded-xl flex items-center justify-center transition-all active:scale-90 group border border-white/5">
            <span className="text-lg font-black group-hover:rotate-90 transition-transform">✕</span>
          </button>
        </div>

        {/* Condensed Content Area */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-5 sm:space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          
          {/* Identity & Rank Section - More compact for mobile */}
          <div className="flex flex-col sm:flex-row gap-6 items-center">
            <div className="relative shrink-0">
                <div className="absolute inset-[-10px] bg-yellow-500/10 blur-[20px] rounded-full"></div>
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-black/40 border-2 border-yellow-500/20 flex items-center justify-center text-5xl sm:text-6xl shadow-inner group-hover:scale-105 transition-transform duration-500">
                    {playerAvatar}
                </div>
            </div>
            
            <div className="flex-1 w-full space-y-3 sm:space-y-4">
                <div className="space-y-1">
                    <p className="text-[7px] font-black uppercase tracking-[0.4em] text-yellow-500/40 text-center sm:text-left">Operator Handle</p>
                    <input 
                      type="text" 
                      value={playerName} 
                      onChange={e => setPlayerName(e.target.value.toUpperCase())} 
                      maxLength={12} 
                      className="w-full bg-black/40 border border-white/5 px-4 py-2 rounded-xl text-white font-black uppercase tracking-widest text-lg sm:text-xl text-center sm:text-left focus:border-yellow-500/30 outline-none transition-all shadow-inner" 
                    />
                </div>

                <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl space-y-2 sm:space-y-3">
                    <div className="flex justify-between items-end">
                        <span className="text-[7px] font-black text-white/30 uppercase tracking-[0.3em]">Mastery Level {currentLevel}</span>
                        <span className="text-[7px] font-black text-yellow-500/60 uppercase tracking-widest">{nextLevelXp - profile.xp} XP TO ASCEND</span>
                    </div>
                    <div className="relative h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                        <div className="h-full bg-gradient-to-r from-yellow-700 via-yellow-400 to-yellow-200 transition-all duration-1000" style={{ width: `${progress}%` }} />
                    </div>
                </div>
            </div>
          </div>

          {/* Signature Archive - Grid Selection - Reduced Spacing */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-[8px] font-black uppercase tracking-[0.4em] text-white/20 whitespace-nowrap">Signature Archive</span>
              <div className="h-[1px] flex-1 bg-white/5"></div>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {visibleAvatars.map(a => {
                const unlocked = isAvatarUnlocked(a);
                const active = playerAvatar === a;
                return (
                  <button 
                    key={a} 
                    title={getAvatarName(a)}
                    onClick={() => unlocked ? setPlayerAvatar(a) : handlePurchaseAttempt(a)} 
                    className={`aspect-square rounded-xl flex items-center justify-center text-2xl transition-all ${active ? 'bg-yellow-500/20 ring-2 ring-yellow-500 scale-110' : unlocked ? 'bg-white/5 hover:bg-white/10' : 'opacity-20 grayscale hover:opacity-40'}`}
                  >
                    {a}
                  </button>
                );
              })}
            </div>
            
            {/* ENHANCED ICON TOGGLE BUTTON - REDUCED TOP PADDING */}
            <div className="flex flex-col items-center pt-1">
                <button 
                    onClick={() => setIsCatalogExpanded(!isCatalogExpanded)} 
                    className={`group relative flex items-center justify-center w-10 h-10 rounded-full bg-white/[0.03] border border-white/10 hover:border-yellow-500/40 hover:bg-white/[0.08] transition-all duration-500 active:scale-90 shadow-lg`}
                    title={isCatalogExpanded ? "Collapse View" : "Expand All Options"}
                >
                    <div className={`absolute inset-0 rounded-full bg-yellow-500/10 blur-md opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                    <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        width="20" 
                        height="20" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="3" 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        className={`text-white/60 group-hover:text-yellow-500 transition-all duration-500 ${isCatalogExpanded ? 'rotate-180' : 'rotate-0'}`}
                    >
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </button>
                <span className="text-[7px] font-black uppercase tracking-[0.4em] text-white/20 mt-1">
                    {isCatalogExpanded ? "MINIMIZE" : "EXPAND"}
                </span>
            </div>
          </div>

          {/* Tactical Analytics - Compact grid */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-[8px] font-black uppercase tracking-[0.4em] text-white/20 whitespace-nowrap">Tactical Analytics</span>
              <div className="h-[1px] flex-1 bg-white/5"></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <StatBox label="Victories" value={wins} icon="🏆" />
                <StatBox label="Sorties" value={games} icon="⚔️" />
                <StatBox label="Win Factor" value={`${winRate}%`} icon="📈" highlight />
                <StatBox label="Currency" value={profile.coins.toLocaleString()} icon="💰" highlight />
            </div>
          </div>

          <SignOutButton onSignOut={onSignOut} className="!py-4 w-full" />
        </div>

        {/* Minimal Footer */}
        <div className="px-6 py-4 border-t border-white/5 bg-black/40 flex justify-between items-center opacity-40">
            <span className="text-[6px] font-black text-white/40 uppercase tracking-[0.5em]">COMMAND CORE v1.9 // SECURE CHANNEL</span>
            <div className="flex gap-2">
                <div className="w-1 h-1 rounded-full bg-white/20"></div>
                <div className="w-1 h-1 rounded-full bg-white/20"></div>
            </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes awardPop {
            0% { transform: scale(0.5); opacity: 0; filter: blur(20px); }
            60% { transform: scale(1.1); opacity: 1; filter: blur(0); }
            100% { transform: scale(1); }
        }
        @keyframes awardText {
            0% { transform: translateY(20px); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes awardParticle {
            0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
            100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0) rotate(var(--rot)); opacity: 0; }
        }
        .animate-award-pop { animation: awardPop 0.8s cubic-bezier(0.17, 0.67, 0.83, 0.67) forwards; }
        .animate-award-text { opacity: 0; animation: awardText 0.6s ease-out forwards; }
        .animate-award-particle { animation: awardParticle 1.2s ease-out forwards; }
      `}} />
    </div>
  );
};
