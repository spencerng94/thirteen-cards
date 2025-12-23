
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
  zenithAurum?: boolean;  // New Zenith Aurum engine
  spotlight?: string;     // Custom central light color
  tier: 'BASIC' | 'PREMIUM';
  isCityLightsPixel?: boolean;
}

export const PREMIUM_BOARDS: ThemeConfig[] = [
  { 
    id: 'CLASSIC_GREEN', 
    name: 'Classic Imperial', 
    tier: 'BASIC',
    price: 0, 
    base: 'bg-[#0a3d23]', 
    colors: 'from-green-600/30 via-transparent to-black', 
    texture: false 
  },
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
    base: 'bg-[#022c22]', 
    colors: 'from-[#f9a8d4]/20 via-[#134e4a]/10 to-[#022c22]', 
    lotusForest: true,
    emperor: true,
    spotlight: 'rgba(251, 207, 232, 0.2)' 
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
    id: 'ZENITH_AURUM', 
    name: 'Zenith Aurum', 
    tier: 'PREMIUM',
    price: 8500, 
    base: 'bg-[#020205]', 
    colors: 'from-yellow-600/10 via-transparent to-black', 
    zenithAurum: true,
    spotlight: 'rgba(251, 191, 36, 0.05)' 
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
 * ZenithAurumEngine - Procedural Obsidian & Molten Gold
 */
const ZenithAurumEngine: React.FC<{ isMini?: boolean }> = ({ isMini }) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden bg-[#020205]">
      {/* 1. Deep Specular Obsidian Base */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_#0a0a0f_0%,_#000000_100%)]"></div>
      
      {/* 2. Micro-Texture Grain */}
      <div className="absolute inset-0 opacity-[0.15] mix-blend-overlay" style={{ 
        backgroundImage: 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")',
        backgroundSize: isMini ? '50px' : '150px'
      }}></div>

      {/* 3. Molten Gold Flow (SVG Liquid Shader) */}
      <div className="absolute inset-0 opacity-40 mix-blend-screen filter blur-[2px]">
        <svg width="100%" height="100%" className="scale-[1.8] origin-center animate-[aurum-pulse_60s_linear_infinite]">
          <filter id="aurum-liquid">
            <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="4" seed="88" result="noise" />
            <feColorMatrix in="noise" type="matrix" values="1 0 0 0 0  0 0.8 0 0 0  0 0.4 0 0 0  0 0 0 1 0" />
            <feComposite in="SourceGraphic" operator="in" />
          </filter>
          <rect width="100%" height="100%" fill="#fbbf24" filter="url(#aurum-liquid)" className="animate-[aurum-drift_20s_ease-in-out_infinite]" />
        </svg>
      </div>

      {/* 4. Second Layer of High-Intensity Gold Veins */}
      <div className="absolute inset-0 opacity-20 mix-blend-color-dodge">
        <svg width="100%" height="100%" className="scale-[2.2] origin-bottom animate-[aurum-pulse-alt_45s_linear_infinite]">
          <filter id="aurum-liquid-alt">
            <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" seed="123" result="noise2" />
            <feColorMatrix in="noise2" type="matrix" values="1 0 0 0 0  0 0.9 0 0 0  0 0.6 0 0 0  0 0 0 1 0" />
          </filter>
          <rect width="100%" height="100%" fill="#fef08a" filter="url(#aurum-liquid-alt)" />
        </svg>
      </div>

      {/* 5. Suspended Aurum Particles (Floating Gold Dust) */}
      {!isMini && Array.from({ length: 40 }).map((_, i) => (
        <div 
          key={`gold-dust-${i}`}
          className="absolute w-1 h-1 bg-yellow-400/40 rounded-full blur-[0.5px] animate-[aurum-drift-dust_15s_infinite_ease-in-out]"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * -15}s`,
          }}
        />
      ))}

      {/* 6. Atmospheric Glow Veil */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(251,191,36,0.08)_0%,_transparent_75%)] pointer-events-none"></div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes aurum-pulse {
          0%, 100% { transform: scale(1.8) rotate(0deg); opacity: 0.3; }
          50% { transform: scale(2.0) rotate(5deg); opacity: 0.5; }
        }
        @keyframes aurum-pulse-alt {
          0%, 100% { transform: scale(2.2) rotate(0deg); opacity: 0.1; }
          50% { transform: scale(2.5) rotate(-3deg); opacity: 0.3; }
        }
        @keyframes aurum-drift {
          0%, 100% { transform: translateX(-5%); }
          50% { transform: translateX(5%); }
        }
        @keyframes aurum-drift-dust {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.2; }
          50% { transform: translate(100px, 80px) scale(1.5); opacity: 0.6; }
        }
      `}} />
    </div>
  );
};

/**
 * SpaceEngine - Galactic Starfield & Nebulae
 */
const SpaceEngine: React.FC<{ isMini?: boolean }> = ({ isMini }) => {
  const stars = useMemo(() => {
    return Array.from({ length: isMini ? 30 : 100 }).map((_, i) => ({
      id: `star-${i}`,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: Math.random() * 2 + 0.5,
      delay: Math.random() * -5,
      duration: 2 + Math.random() * 3,
      opacity: Math.random() * 0.5 + 0.3
    }));
  }, [isMini]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden bg-black">
      <div className="absolute inset-0 opacity-20 mix-blend-screen">
        <div className="absolute top-[-20%] left-[-10%] w-[120%] h-[120%] bg-[radial-gradient(circle_at_30%_40%,rgba(6,182,212,0.15),transparent_50%),radial-gradient(circle_at_70%_60%,rgba(217,70,239,0.15),transparent_50%)] animate-pulse"></div>
      </div>
      {stars.map(s => (
        <div 
          key={s.id}
          className="absolute rounded-full bg-white animate-pulse"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            opacity: s.opacity,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
            boxShadow: `0 0 ${s.size * 2}px white`
          }}
        />
      ))}
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
      <div className="absolute inset-0 opacity-40 bg-[url('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-bottom mix-blend-screen filter brightness-[0.4] grayscale-[0.5] contrast-125"></div>
      <div className="absolute bottom-0 left-0 w-full h-[60%] bg-gradient-to-t from-purple-900/30 via-blue-900/10 to-transparent"></div>
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
      <div className="absolute inset-0 z-10">
          <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 49%, rgba(255,255,255,0.4) 51%, transparent 100%)', backgroundSize: '400px 100%' }}></div>
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-purple-500/10 to-transparent"></div>
          <div className="absolute bottom-0 left-0 w-full h-[40%] bg-gradient-to-t from-[#050510] to-transparent"></div>
      </div>
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-20" style={{ backgroundImage: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))', backgroundSize: '100% 4px, 3px 100%' }}></div>
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
      <div className="absolute inset-0 shadow-[inset_0_0_150px_rgba(251,191,36,0.06)] pointer-events-none"></div>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes castle-drift {
          0% { transform: translateY(0vh) translateX(0) rotate(0deg) scale(0.7); opacity: 0; }
          15% { opacity: 0.65; }
          85% { opacity: 0.65; }
          100% { transform: translateY(-135vh) translateX(var(--sway)) rotate(360deg) scale(1); opacity: 0; }
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
      <div className="absolute inset-0 bg-gradient-to-br from-[#4d0000] via-[#1a0000] to-black"></div>
      <div className="absolute inset-0 opacity-[0.07] mix-blend-overlay" style={{ 
        backgroundImage: 'url("https://www.transparenttextures.com/patterns/oriental-tiles.png")',
        backgroundSize: '250px'
      }}></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-40">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.15)_0%,transparent_70%)] animate-pulse"></div>
      </div>
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
             <path d={s.path} fill="white" opacity="0.1" className="animate-pulse" />
          </svg>
        </div>
      ))}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes prestige-drift {
          0% { transform: translateY(0vh) translateX(0) rotate(0deg) scale(0.65); opacity: 0; }
          15% { opacity: 0.9; }
          85% { opacity: 0.9; }
          100% { transform: translateY(-135vh) translateX(var(--sway)) rotate(450deg) scale(1.05); opacity: 0; }
        }
        .animate-prestige-drift { animation: prestige-drift linear infinite; }
      `}} />
    </div>
  );
};

/**
 * LotusEngine 3.0 - High Quality Nature/Zen Ambiance
 * Features lighter, glowing Sakura-pink suit motifs and lush Jade greens.
 */
const LotusEngine: React.FC<{ isMini?: boolean }> = ({ isMini }) => {
  const petals = useMemo(() => {
    const shapes = ['PETAL', 'HEART', 'DIAMOND'];
    return Array.from({ length: isMini ? 12 : 35 }).map((_, i) => ({
      id: `lotus-v3-${i}`,
      type: shapes[Math.floor(Math.random() * shapes.length)],
      left: Math.random() * 100,
      delay: Math.random() * -30,
      duration: 12 + Math.random() * 15,
      size: 14 + Math.random() * 18,
      rotate: Math.random() * 360,
      sway: 30 + Math.random() * 60,
    }));
  }, [isMini]);

  const fireflies = useMemo(() => {
    return Array.from({ length: isMini ? 6 : 20 }).map((_, i) => ({
        id: `firefly-${i}`,
        left: Math.random() * 100,
        top: Math.random() * 100,
        delay: Math.random() * -10,
        duration: 5 + Math.random() * 5
    }));
  }, [isMini]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Floating Petals & Suits */}
      {petals.map(p => (
        <div 
          key={p.id}
          className="absolute animate-lotus-fall"
          style={{
            left: `${p.left}%`,
            top: '-10%',
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            '--sway-amount': `${p.sway}px`
          } as any}
        >
          <svg 
            width={p.size} 
            height={p.size} 
            viewBox="0 0 100 100" 
            style={{ 
                transform: `rotate(${p.rotate}deg)`,
                filter: 'drop-shadow(0 2px 6px rgba(249, 168, 212, 0.4))'
            }}
          >
            <defs>
              <linearGradient id={`lotusGrad-${p.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fff1f2" />
                <stop offset="40%" stopColor="#f9a8d4" />
                <stop offset="100%" stopColor="#db2777" />
              </linearGradient>
            </defs>
            {p.type === 'PETAL' && (
               <path d="M50,5 C65,40 95,55 50,95 C5,55 35,40 50,5" fill={`url(#lotusGrad-${p.id})`} fillOpacity="0.8" />
            )}
            {p.type === 'HEART' && (
               <path d="M50,30 C50,10 10,10 10,45 C10,70 50,90 50,90 C50,90 90,70 90,45 C90,10 50,10 50,30" fill={`url(#lotusGrad-${p.id})`} fillOpacity="0.7" />
            )}
            {p.type === 'DIAMOND' && (
               <path d="M50,10 L85,50 L50,90 L15,50 Z" fill={`url(#lotusGrad-${p.id})`} fillOpacity="0.75" />
            )}
            <path d="M0,0 L100,100" stroke="white" strokeWidth="0.8" opacity="0.12" />
          </svg>
        </div>
      ))}

      {/* Nature Ambiance Fireflies */}
      {!isMini && fireflies.map(f => (
          <div 
            key={f.id}
            className="absolute w-1.5 h-1.5 bg-[#bef264] rounded-full blur-[1px] animate-firefly"
            style={{
                left: `${f.left}%`,
                top: `${f.top}%`,
                animationDelay: `${f.delay}s`,
                animationDuration: `${f.duration}s`,
                boxShadow: '0 0 10px #bef264'
            }}
          />
      ))}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes lotus-fall {
          0% { transform: translateY(0) translateX(0) rotate(0deg) scale(0.8); opacity: 0; }
          15% { opacity: 0.9; }
          85% { opacity: 0.9; }
          100% { transform: translateY(115vh) translateX(var(--sway-amount)) rotate(540deg) scale(1.1); opacity: 0; }
        }
        @keyframes firefly {
            0%, 100% { transform: translate(0, 0); opacity: 0.1; }
            50% { transform: translate(40px, -60px); opacity: 0.6; }
        }
        .animate-lotus-fall { animation: lotus-fall linear infinite; }
        .animate-firefly { animation: firefly ease-in-out infinite; }
      `}} />
    </div>
  );
};

/**
 * YuletideEngine - Midnight snow fall
 */
const YuletideEngine: React.FC<{ isMini?: boolean }> = ({ isMini }) => {
  const flakes = useMemo(() => {
    return Array.from({ length: isMini ? 15 : 50 }).map((_, i) => ({
      id: `snow-flake-${i}`,
      left: Math.random() * 100,
      delay: Math.random() * -20,
      duration: 8 + Math.random() * 8,
      size: 2 + Math.random() * 3,
    }));
  }, [isMini]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {flakes.map(f => (
        <div 
          key={f.id}
          className="absolute bg-white/60 rounded-full blur-[0.5px] animate-snow-fall"
          style={{
            left: `${f.left}%`,
            top: '-5%',
            width: `${f.size}px`,
            height: `${f.size}px`,
            animationDelay: `${f.delay}s`,
            animationDuration: `${f.duration}s`,
          } as any}
        />
      ))}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes snow-fall {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translateY(110vh) translateX(30px); opacity: 0; }
        }
        .animate-snow-fall { animation: snow-fall linear infinite; }
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
      {theme.id === 'CLASSIC_GREEN' && (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_#115e34_0%,_#000000_100%)]"></div>
      )}
      {theme.id === 'CITY_LIGHTS_PIXEL' && <CityLightsEngine isMini={isMini} />}
      {theme.zenithAurum && <ZenithAurumEngine isMini={isMini} />}
      <div className={`absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] ${theme.colors} opacity-100 mix-blend-screen transition-all duration-1000 z-1`}></div>
      {theme.texture && (
        <div className="absolute inset-0 opacity-[0.2] mix-blend-overlay pointer-events-none z-2" 
             style={{ 
               backgroundImage: 'repeating-radial-gradient(circle at center, #fff 0, #fff 1px, transparent 0, transparent 100%)', 
               backgroundSize: isMini ? '2px 2px' : '3.5px 3.5px' 
             }}></div>
      )}
      {theme.id === 'CYBERPUNK_NEON' && <SpaceEngine isMini={isMini} />}
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
      {theme.emperor && <ImperialGoldLayer opacity={theme.id === 'LOTUS_FOREST' ? (isMini ? 0.1 : 0.2) : (isMini ? 0.4 : 0.6)} isMini={isMini} />}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-transparent pointer-events-none z-5"></div>
    </div>
  );
};

export const BoardPreview: React.FC<{ 
  themeId: string; 
  className?: string; 
  active?: boolean;
  unlocked?: boolean;
  hideActiveMarker?: boolean;
}> = ({ themeId, className = "", active, unlocked = true, hideActiveMarker = false }) => {
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
      {active && !hideActiveMarker && (
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
            <h2 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-white/80 to-white/40 uppercase italic tracking-widest font-serif leading-none">PLAYER DOSSIER</h2>
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
