
import React, { useState, useMemo, useEffect } from 'react';
import { UserProfile, BackgroundTheme, AiDifficulty, Emote } from '../types';
import { calculateLevel, getXpForLevel, DEFAULT_AVATARS, PREMIUM_AVATARS, buyItem, getAvatarName } from '../services/supabase';
import { SignOutButton } from './SignOutButton';
import { CardCoverStyle, Card } from './Card';
import { audioService } from '../services/audio';
import { VisualEmote } from './VisualEmote';

export interface ThemeConfig {
  id: string;
  name: string;
  price: number;
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
  spotlight?: string;
  tier: 'BASIC' | 'PREMIUM';
  isCityLightsPixel?: boolean;
}

export const PREMIUM_BOARDS: ThemeConfig[] = [
  { id: 'CLASSIC_GREEN', name: 'Classic Imperial', tier: 'BASIC', price: 0, base: 'bg-[#0a2e1c]', colors: 'from-green-600/20 via-transparent to-black', texture: false },
  { id: 'EMERALD', name: 'Emerald Felt', tier: 'BASIC', price: 0, base: 'bg-[#064e3b]', colors: 'from-emerald-400/40 via-emerald-600/20 to-[#022c22]', texture: true },
  { id: 'CYBER_BLUE', name: 'Cobalt Felt', tier: 'BASIC', price: 500, base: 'bg-[#1e3a8a]', colors: 'from-blue-400/40 via-blue-600/20 to-[#172554]', texture: true },
  { id: 'CRIMSON_VOID', name: 'Baccarat Ruby', tier: 'BASIC', price: 1000, base: 'bg-[#7f1d1d]', colors: 'from-rose-400/40 via-rose-700/20 to-[#450a0a]', texture: true, spotlight: 'rgba(251, 113, 133, 0.25)' },
  { id: 'CYBERPUNK_NEON', name: 'Onyx Space', tier: 'PREMIUM', price: 2500, base: 'bg-[#010103]', colors: 'from-indigo-950/20 via-black to-black', technoGrid: false, cityLights: false, spotlight: 'rgba(255, 255, 255, 0.03)' },
  { id: 'OBSIDIAN_MADNESS', name: 'Obsidian Madness', tier: 'PREMIUM', price: 3500, base: 'bg-[#000000]', colors: 'from-red-950/40 via-black to-black', obsidianMadness: true, spotlight: 'rgba(220, 38, 38, 0.05)' },
  { id: 'CRYSTAL_TOKYO', name: 'Crystal Tokyo', tier: 'PREMIUM', price: 12000, base: 'bg-[#02020a]', colors: 'from-cyan-950/30 via-black to-black', crystalTokyo: true, spotlight: 'rgba(34, 211, 238, 0.15)' },
  { id: 'LOTUS_FOREST', name: 'Lotus Deal', tier: 'PREMIUM', price: 4000, base: 'bg-[#011a0f]', colors: 'from-emerald-500/20 via-emerald-900/10 to-black', lotusForest: true, spotlight: 'rgba(182, 227, 143, 0.3)' },
  { id: 'CHRISTMAS_YULETIDE', name: 'Midnight Yuletide', tier: 'PREMIUM', price: 4500, base: 'bg-[#010b13]', colors: 'from-blue-900/30 via-[#010b13] to-black', yuletide: true, spotlight: 'rgba(191, 219, 254, 0.2)' },
  { id: 'GOLDEN_EMPEROR', name: 'Lucky Envelope', tier: 'PREMIUM', price: 5000, base: 'bg-[#080000]', colors: 'from-[#660000] via-[#1a0000] to-black', prestige: true, spotlight: 'rgba(251, 191, 36, 0.12)' },
  { id: 'ZEN_POND', name: 'Zen Pond', tier: 'PREMIUM', price: 6000, base: 'bg-[#000000]', colors: 'from-[#083344]/40 via-[#010810]/60 to-black', zenPond: true, spotlight: 'rgba(34, 211, 238, 0.15)' },
  { id: 'GOLD_FLUX', name: 'Gold Flux', tier: 'PREMIUM', price: 8500, base: 'bg-[#fffbeb]', colors: 'from-white via-yellow-50/80 to-yellow-100/40', goldFlux: true, spotlight: 'rgba(255, 255, 255, 0.8)' },
  { id: 'HIGH_ROLLER', name: 'Sanctum Oblivion', tier: 'PREMIUM', price: 15000, base: 'bg-[#ffffff]', colors: 'from-white via-slate-100 to-indigo-950/20', highRoller: true, spotlight: 'rgba(255, 255, 255, 0.4)' }
];

const CastleOblivionEngine: React.FC<{ isMini?: boolean }> = ({ isMini }) => {
  const shards = useMemo(() => Array.from({ length: isMini ? 12 : 35 }).map((_, i) => ({
    id: `oblivion-shard-v15-${i}`,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 15 + Math.random() * 50,
    rot: Math.random() * 360,
    duration: 15 + Math.random() * 25,
    delay: Math.random() * -30,
    type: i % 2 === 0 ? 'light' : 'dark'
  })), [isMini]);

  const chains = useMemo(() => Array.from({ length: isMini ? 2 : 5 }).map((_, i) => ({
    id: `chain-v15-${i}`,
    x: Math.random() * 100,
    delay: Math.random() * -40,
    duration: 50 + Math.random() * 30
  })), [isMini]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden bg-white">
      <div className="absolute inset-0 bg-gradient-to-br from-white via-slate-100 to-indigo-950/30 opacity-100"></div>
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')] opacity-[0.08] mix-blend-multiply"></div>

      {!isMini && (
        <div className="absolute inset-0 opacity-20 mix-blend-soft-light">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[150%] bg-[linear-gradient(110deg,transparent_0%,rgba(255,255,255,0.4)_50%,transparent_100%)] rotate-[25deg] animate-[oblivion-ray-v15_30s_infinite_alternate_ease-in-out]"></div>
        </div>
      )}

      {!isMini && (
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] mix-blend-multiply">
           <svg viewBox="0 0 1000 1000" className="w-[120%] h-[120%] text-indigo-900 fill-current">
              <path d="M100,1000 L100,400 Q100,100 500,100 Q900,100 900,400 L900,1000" fill="none" stroke="currentColor" strokeWidth="1" />
              {Array.from({ length: 6 }).map((_, i) => (
                <rect key={i} x={250 + i * 100} y="400" width="30" height="500" rx="15" />
              ))}
           </svg>
        </div>
      )}

      {!isMini && chains.map(c => (
        <div 
          key={c.id}
          className="absolute top-[-20%] w-[1px] h-[140%] bg-gradient-to-b from-transparent via-indigo-900/10 to-transparent animate-[oblivion-sway-v15_linear_infinite_alternate]"
          style={{ left: `${c.x}%`, animationDuration: `${c.duration}s`, animationDelay: `${c.delay}s` }}
        >
          <div className="absolute inset-0 shadow-[0_0_15px_rgba(49,46,129,0.2)]"></div>
        </div>
      ))}

      {shards.map(s => (
        <div 
          key={s.id}
          className="absolute animate-[oblivion-drift-v15_linear_infinite]"
          style={{ 
            left: `${s.x}%`, 
            top: `${s.y}%`, 
            animationDuration: `${s.duration}s`, 
            animationDelay: `${s.delay}s` 
          }}
        >
          <div 
            className={`
              w-12 h-16 border transform transition-all duration-1000
              ${s.type === 'light' 
                ? 'bg-white/40 border-white/60 shadow-[0_0_20px_rgba(255,255,255,0.7)] backdrop-blur-sm' 
                : 'bg-indigo-950/40 border-indigo-400/30 shadow-[0_0_15px_rgba(49,46,129,0.3)] backdrop-blur-md'}
            `}
            style={{ 
              width: `${s.size}px`, 
              height: `${s.size * 1.5}px`,
              transform: `rotate(${s.rot}deg)`,
              clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)'
            }}
          >
             <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent"></div>
          </div>
        </div>
      ))}

      {!isMini && (
        <div className="absolute top-[18%] left-1/2 -translate-x-1/2 opacity-[0.06] mix-blend-multiply flex flex-col items-center select-none">
           <div className="text-[280px] font-serif font-black italic tracking-tighter leading-none text-black">XIII</div>
           <div className="w-80 h-[1px] bg-gradient-to-r from-transparent via-indigo-950 to-transparent mt-[-35px]"></div>
        </div>
      )}

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(255,255,255,0.05)_70%,rgba(49,46,129,0.15)_100%)]"></div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes oblivion-drift-v15 {
          0% { transform: translate(0, 0) rotate(0deg); opacity: 0; }
          20% { opacity: 0.8; }
          80% { opacity: 0.8; }
          100% { transform: translate(-80px, -220px) rotate(360deg); opacity: 0; }
        }
        @keyframes oblivion-sway-v15 {
          from { transform: rotate(-1.5deg) translateX(-15px); }
          to { transform: rotate(1.5deg) translateX(15px); }
        }
        @keyframes oblivion-ray-v15 {
          from { transform: translateX(-10%) rotate(25deg); opacity: 0.1; }
          to { transform: translateX(10%) rotate(25deg); opacity: 0.3; }
        }
      `}} />
    </div>
  );
};

const TokyoEngine: React.FC<{ isMini?: boolean }> = ({ isMini }) => {
  const traces = useMemo(() => Array.from({ length: isMini ? 6 : 18 }).map((_, i) => ({
    id: `trace-${i}`,
    y: Math.random() * 100,
    w: 100 + Math.random() * 300,
    delay: Math.random() * -10,
    duration: 1 + Math.random() * 2,
    color: i % 3 === 0 ? 'bg-cyan-400' : i % 3 === 1 ? 'bg-magenta-400' : 'bg-white'
  })), [isMini]);

  const monoliths = useMemo(() => Array.from({ length: isMini ? 4 : 10 }).map((_, i) => ({
    id: `mono-${i}`,
    x: Math.random() * 100,
    h: 50 + Math.random() * 150,
    w: 40 + Math.random() * 80,
    delay: Math.random() * -60,
    duration: 40 + Math.random() * 40
  })), [isMini]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden bg-[#02020a]">
      {!isMini && monoliths.map(m => (
        <div 
          key={m.id}
          className="absolute bottom-[-20%] border-x border-white/5 bg-gradient-to-t from-cyan-900/20 via-transparent to-transparent animate-[tokyo-sway_linear_infinite_alternate]"
          style={{ 
            left: `${m.x}%`, 
            height: `${m.h}px`, 
            width: `${m.w}px`,
            animationDuration: `${m.duration}s`,
            animationDelay: `${m.delay}s`
          }}
        >
          <div className="absolute top-0 right-0 w-[1px] h-full bg-gradient-to-b from-cyan-400/40 via-transparent to-transparent shadow-[0_0_10px_rgba(34,211,238,0.5)]"></div>
          <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '100% 4px' }}></div>
        </div>
      ))}

      {!isMini && traces.map(t => (
        <div 
          key={t.id}
          className={`absolute h-[1px] ${t.color} opacity-40 shadow-[0_0_15px_currentColor] animate-tokyo-zip`}
          style={{ 
            top: `${t.y}%`, 
            width: `${t.w}px`, 
            left: '-500px',
            animationDelay: `${t.delay}s`,
            animationDuration: `${t.duration}s`
          }}
        />
      ))}

      {!isMini && (
        <div className="absolute top-[12%] left-1/4 opacity-[0.08] mix-blend-plus-lighter animate-pulse">
           <div className="text-[200px] font-black text-cyan-400 font-serif rotate-[-15deg] drop-shadow-[0_0_50px_rgba(34,211,238,1)]">十三</div>
        </div>
      )}

      <div className="absolute inset-0 opacity-40 mix-blend-screen">
          <div className="absolute top-[-20%] left-[-10%] w-64 h-64 rounded-full bg-cyan-600/20 blur-[100px] animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-5%] w-96 h-96 rounded-full bg-purple-600/10 blur-[120px] animate-pulse [animation-delay:2s]"></div>
      </div>

      {!isMini && Array.from({ length: 20 }).map((_, i) => (
        <div 
          key={`shard-${i}`}
          className="absolute w-2 h-4 bg-gradient-to-br from-white via-cyan-300 to-transparent opacity-20 animate-tokyo-drift"
          style={{ 
            left: `${Math.random() * 100}%`, 
            top: '-20px', 
            animationDelay: `${Math.random() * -20}s`,
            animationDuration: `${10 + Math.random() * 15}s`,
            transform: `rotate(${Math.random() * 360}deg)`
          }}
        />
      ))}

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.5)_70%,rgba(0,0,0,0.9)_100%)]"></div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes tokyo-zip {
          0% { transform: translateX(-100vw); opacity: 0; }
          10% { opacity: 0.8; }
          90% { opacity: 0.8; }
          100% { transform: translateX(200vw); opacity: 0; }
        }
        @keyframes tokyo-drift {
          0% { transform: translateY(0) rotate(0deg); opacity: 0; }
          20% { opacity: 0.4; }
          80% { opacity: 0.4; }
          100% { transform: translateY(120vh) rotate(720deg); opacity: 0; }
        }
        @keyframes tokyo-sway {
          from { transform: translateX(-20px); }
          to { transform: translateX(20px); }
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
        <feSpecularLighting in="fineNoise" surfaceScale="2.5" specularConstant="1.4" specularExponent="45" lightingColor="#ffffff" result="fiberSpec">
          <feDistantLight azimuth="45" elevation="65" />
        </feSpecularLighting>
        <feComposite in="fiberSpec" in2="lowNoise" operator="arithmetic" k1="0.4" k2="0.6" k3="0" k4="0" />
        <feColorMatrix type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0.9 0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#felt-specular-hd)" />
    </svg>

    <div className="absolute inset-0 opacity-[0.2] bg-[url('https://www.transparenttextures.com/patterns/fabric-of-squares.png')] mix-blend-color-burn"></div>
  </div>
);

const MadnessEngine: React.FC<{ isMini?: boolean }> = ({ isMini }) => {
  const monoliths = useMemo(() => Array.from({ length: isMini ? 4 : 10 }).map((_, i) => ({
    id: `madness-mono-${i}`,
    x: Math.random() * 100,
    h: 60 + Math.random() * 40,
    w: 5 + Math.random() * 15,
    delay: Math.random() * -30,
    speed: 40 + Math.random() * 20,
    z: Math.random() * -400
  })), [isMini]);

  const ash = useMemo(() => Array.from({ length: isMini ? 20 : 60 }).map((_, i) => ({
    id: `ash-${i}`,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 1 + Math.random() * 2.5,
    delay: Math.random() * -20,
    speed: 5 + Math.random() * 8,
    tx: (Math.random() - 0.5) * 150
  })), [isMini]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden bg-black perspective-[1000px]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#0a0000_0%,_#000000_70%,_#000000_100%)]"></div>
      
      <div className="absolute inset-0 opacity-40 mix-blend-multiply">
          <div className="absolute bottom-0 left-0 w-full h-[60%] bg-gradient-to-t from-red-950/30 to-transparent animate-pulse"></div>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.1] scale-150"></div>
      </div>

      {!isMini && (
        <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] opacity-[0.08] mix-blend-plus-lighter pointer-events-none">
           <div className="w-full h-full rounded-full bg-red-600 blur-[150px] animate-pulse"></div>
           <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-64 h-64 rounded-full border-[1px] border-red-500/20 animate-[spin_60s_linear_infinite]"></div>
              <div className="absolute w-80 h-80 rounded-full border-[2px] border-red-900/10 animate-[spin_45s_linear_infinite_reverse]"></div>
           </div>
        </div>
      )}

      {!isMini && monoliths.map(m => (
        <div 
          key={m.id}
          className="absolute bottom-[-10%] bg-gradient-to-t from-black via-[#0a0a0a] to-transparent border-x border-white/[0.03] shadow-[0_0_50px_rgba(0,0,0,1)] animate-[madness-sway_linear_infinite_alternate]"
          style={{ 
            left: `${m.x}%`, 
            height: `${m.h}%`, 
            width: `${m.w}px`,
            transform: `translateZ(${m.z}px)`,
            animationDuration: `${m.speed}s`,
            animationDelay: `${m.delay}s`
          }}
        >
           <div className="absolute top-0 left-0 w-full h-[1px] bg-red-600/10 shadow-[0_0_15px_rgba(220,38,38,0.3)]"></div>
           <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '100% 12px' }}></div>
        </div>
      ))}

      {ash.map(a => (
        <div 
          key={a.id}
          className="absolute bg-white/20 blur-[0.5px] rounded-sm animate-[ash-fall_linear_infinite]"
          style={{ 
            left: `${a.x}%`, 
            top: '-20px',
            width: `${a.size}px`,
            height: `${a.size}px`,
            animationDelay: `${a.delay}s`,
            animationDuration: `${a.speed}s`,
            '--tx': `${a.tx}px`
          } as any}
        />
      ))}

      <div className="absolute inset-0 opacity-[0.04] bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')] mix-blend-screen"></div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes madness-sway {
          from { transform: translateX(-10px); }
          to { transform: translateX(10px); }
        }
        @keyframes ash-fall {
          0% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 0; }
          20% { opacity: 0.6; }
          80% { opacity: 0.6; }
          100% { transform: translateY(120vh) translateX(var(--tx)) rotate(360deg); opacity: 0; }
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
  
  const shards = useMemo(() => Array.from({ length: isMini ? 15 : 50 }).map((_, i) => ({
    id: `kh-bijou-v26-${i}`,
    type: suits[i % 4],
    x: Math.random() * 110 - 5,
    delay: Math.random() * -60,
    duration: 30 + Math.random() * 20, 
    size: 35 + Math.random() * 25, 
    rotSpeed: 15 + Math.random() * 15,
    zDepth: Math.floor(Math.random() * 2000),
    swayX: (Math.random() - 0.5) * 500,
    isPink: i % 2 === 0,
  })), [isMini]);

  const SUIT_PATHS: Record<string, string> = {
    SPADE: "M50 5 C65 40 100 65 75 90 C65 100 55 95 50 85 C45 95 35 100 25 90 C0 65 35 40 50 5 M50 80 L58 100 L42 100 Z",
    HEART: "M50 30 C50 10 10 10 10 45 C10 75 50 95 50 95 C50 95 90 75 90 45 C90 10 50 10 50 30 Z",
    CLUB: "M50 25 A18 18 0 1 1 68 43 A18 18 0 1 1 55 65 L55 85 L65 95 L35 95 L45 85 L45 65 A18 18 0 1 1 32 43 A18 18 0 1 1 50 25 Z",
    DIAMOND: "M50 5 L90 50 L50 95 L10 50 Z"
  };

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden bg-[#eafaf1] perspective-[3000px]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,_#f2fff9_0%,_#d5eee2_50%,_#b8dfcd_100%)]"></div>
      
      <div className="absolute inset-0 opacity-20 mix-blend-soft-light">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,_#fff_0%,_transparent_60%)] animate-[kh-flare_20s_infinite_alternate]"></div>
      </div>

      <div className="absolute inset-0 transform-style-3d">
        {shards.map(p => (
            <div 
                key={p.id}
                className="absolute transform-style-3d will-change-transform animate-[kh-drift-v26_linear_infinite]"
                style={{ 
                    left: `${p.x}%`, 
                    top: '-150px',
                    animationDelay: `${p.delay}s`, 
                    animationDuration: `${p.duration}s`,
                    '--sway': `${p.swayX}px`,
                    '--z': `${p.zDepth}px`
                } as any}
            >
                <div 
                    className="relative transform-style-3d animate-[kh-tumble-v26_linear_infinite]"
                    style={{ animationDuration: `${p.rotSpeed}s` }}
                >
                    <div 
                        className="relative flex items-center justify-center rounded-[2px] border border-white/60 shadow-lg backdrop-blur-[1px]"
                        style={{ 
                            width: `${p.size * 0.72}px`, 
                            height: `${p.size}px`,
                            background: p.isPink 
                                ? 'linear-gradient(145deg, #fff1f2, #fb7185)' 
                                : 'linear-gradient(145deg, #f0fff4, #4ade80)',
                            opacity: 0.95
                        }}
                    >
                        <div className="absolute inset-0 bg-[linear-gradient(105deg,transparent_45%,rgba(255,255,255,0.6)_50%,transparent_55%)] animate-[kh-glint-v26_3s_infinite_ease-in-out]"></div>

                        <svg width="65%" height="65%" viewBox="0 0 100 100" className="opacity-80 drop-shadow-sm">
                            <path 
                                d={SUIT_PATHS[p.type]} 
                                fill={p.isPink ? '#881337' : '#064e3b'}
                                className="mix-blend-multiply opacity-40"
                            />
                        </svg>

                        <div className="absolute top-0.5 left-0.5 w-1.5 h-1.5 border-t border-l border-white/70"></div>
                        <div className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 border-b border-r border-white/70"></div>
                    </div>
                </div>
            </div>
        ))}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .transform-style-3d { transform-style: preserve-3d; }
        @keyframes kh-drift-v26 {
          0% { transform: translate3d(0, 0, var(--z)); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translate3d(var(--sway), 130vh, var(--z)); opacity: 0; }
        }
        @keyframes kh-tumble-v26 {
          from { transform: rotate3d(0.4, 1, 0.3, 0deg); }
          to { transform: rotate3d(0.4, 1, 0.3, 360deg); }
        }
        @keyframes kh-glint-v26 {
          0% { transform: translateX(-150%) skewX(-15deg); }
          100% { transform: translateX(150%) skewX(-15deg); }
        }
        @keyframes kh-flare {
          from { opacity: 0.1; transform: scale(1); }
          to { opacity: 0.3; transform: scale(1.1); }
        }
      `}} />
    </div>
  );
};

const GoldenEmperorEngine: React.FC<{ isMini?: boolean }> = ({ isMini }) => {
  const relics = useMemo(() => Array.from({ length: isMini ? 8 : 32 }).map((_, i) => ({
    id: `emperor-v12-${i}`,
    x: Math.random() * 100,
    delay: Math.random() * -240,
    duration: 180 + Math.random() * 120,
    size: 25 + Math.random() * 45,
    rotSpeed: 80 + Math.random() * 60,
    opacity: 0.15 + Math.random() * 0.25,
    type: i % 3 === 0 ? 'COIN' : i % 3 === 1 ? 'XIII' : 'KANJI',
    sway: (Math.random() - 0.5) * 200,
  })), [isMini]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden bg-[#050000] perspective-[2000px]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,_#4d0000_0%,_#080000_75%,_#000000_100%)]"></div>
      
      <div className="absolute inset-0 transform-style-3d">
        {relics.map(p => (
            <div 
                key={p.id}
                className="absolute transform-style-3d will-change-transform animate-[relic-drift-v11_linear_infinite]"
                style={{ 
                    left: `${p.x}%`, 
                    top: '-300px',
                    animationDelay: `${p.delay}s`, 
                    animationDuration: `${p.duration}s`,
                    opacity: p.opacity,
                    '--sway': `${p.sway}px`
                } as any}
            >
                <div 
                    className="relative transform-style-3d animate-[relic-rotate-v11_linear_infinite]"
                    style={{ animationDuration: `${p.rotSpeed}s` }}
                >
                    <div className="relative transform-style-3d filter drop-shadow-[0_0_10px_rgba(251,191,36,0.2)]">
                        {p.type === 'COIN' ? (
                            <svg width={p.size} height={p.size} viewBox="0 0 100 100" className="overflow-visible transform-style-3d">
                                <circle cx="50" cy="50" r="46" fill="none" stroke="url(#relic-gold-lux-v11)" strokeWidth="4" />
                                <rect x="34" y="34" width="32" height="32" fill="none" stroke="url(#relic-gold-lux-v11)" strokeWidth="2.5" rx="3" />
                            </svg>
                        ) : p.type === 'XIII' ? (
                            <div style={{ fontSize: p.size * 0.7 }} className="font-serif font-black italic text-transparent bg-clip-text bg-gradient-to-br from-white via-yellow-400 to-yellow-800 tracking-tighter">XIII</div>
                        ) : (
                            <div style={{ fontSize: p.size * 0.85 }} className="font-serif font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-yellow-300 to-yellow-600">十三</div>
                        )}
                    </div>
                </div>
            </div>
        ))}
      </div>

      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="relic-gold-lux-v11" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="40%" stopColor="#facc15" />
            <stop offset="100%" stopColor="#78350f" />
          </linearGradient>
        </defs>
      </svg>

      <style dangerouslySetInnerHTML={{ __html: `
        .transform-style-3d { transform-style: preserve-3d; }
        @keyframes relic-drift-v11 {
          0% { transform: translate3d(0, 0, 0); opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { transform: translate3d(var(--sway), 150vh, 0); opacity: 0; }
        }
        @keyframes relic-rotate-v11 {
          from { transform: rotate3d(1, 1, 0.5, 0deg); }
          to { transform: rotate3d(1, 1, 0.5, 360deg); }
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
  const ripples = useMemo(() => Array.from({ length: isMini ? 4 : 8 }).map((_, i) => ({
    id: `ripple-${i}`,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * -10,
    duration: 4 + Math.random() * 4
  })), [isMini]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden bg-[#000208]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#081d2b_0%,_#000208_70%,_#000000_100%)]"></div>
      
      <div className="absolute inset-0 opacity-20 mix-blend-screen">
          <div className="absolute top-0 left-[-50%] w-[200%] h-full bg-[linear-gradient(90deg,transparent_0%,rgba(34,211,238,0.1)_50%,transparent_100%)] animate-[water-flow_12s_linear_infinite]"></div>
          <div className="absolute top-0 left-[-50%] w-[200%] h-full bg-[linear-gradient(90deg,transparent_0%,rgba(34,211,238,0.05)_50%,transparent_100%)] animate-[water-flow_18s_linear_infinite_reverse] [animation-delay:2s]"></div>
      </div>

      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${isMini ? 'w-40 h-40' : 'w-96 h-96'} transition-all duration-1000`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.4)_0%,_rgba(34,211,238,0.1)_40%,_transparent_70%)] animate-pulse blur-xl"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.8)_0%,_transparent_20%)] mix-blend-screen"></div>
          <div className="absolute inset-0 opacity-40 mix-blend-overlay animate-[moon-shimmer_6s_ease-in-out_infinite]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '15px 15px' }}></div>
      </div>

      {ripples.map(r => (
        <div 
          key={r.id}
          className="absolute rounded-full border border-cyan-400/20 animate-pond-ripple"
          style={{ 
              left: `${r.x}%`, 
              top: `${r.y}%`, 
              width: '1px', 
              height: '1px',
              animationDelay: `${r.delay}s`,
              animationDuration: `${r.duration}s`
          }}
        />
      ))}

      {!isMini && Array.from({ length: 15 }).map((_, i) => (
        <div 
          key={`petal-${i}`}
          className="absolute w-2 h-2 bg-white/40 rounded-full blur-[1px] animate-petal-fall"
          style={{ 
            left: `${Math.random() * 100}%`, 
            top: '-20px', 
            animationDelay: `${Math.random() * -15}s`,
            animationDuration: `${10 + Math.random() * 10}s`,
            '--tx': `${(Math.random() - 0.5) * 200}px`
          } as any}
        />
      ))}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes water-flow {
          0% { transform: translateX(0); }
          100% { transform: translateX(50%); }
        }
        @keyframes moon-shimmer {
          0%, 100% { transform: scale(1) opacity(0.4); }
          50% { transform: scale(1.1) opacity(0.6); }
        }
        @keyframes pond-ripple {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(300); opacity: 0; }
        }
        @keyframes petal-fall {
          0% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 0; }
          20% { opacity: 0.6; }
          80% { opacity: 0.6; }
          100% { transform: translateY(120vh) translateX(var(--tx)) rotate(720deg); opacity: 0; }
        }
      `}} />
    </div>
  );
};

export const BoardSurface: React.FC<{ themeId: string; isMini?: boolean; className?: string; }> = ({ themeId, isMini = false, className = "" }) => {
  const theme = PREMIUM_BOARDS.find(b => b.id === themeId) || PREMIUM_BOARDS[0];
  return (
    <div className={`absolute inset-0 overflow-hidden ${theme.base} ${className}`}>
      {theme.texture && <FeltTextureLayer />}
      {theme.id === 'CYBERPUNK_NEON' && <SpaceEngine isMini={isMini} />}
      {theme.zenPond && <ZenPondEngine isMini={isMini} />}
      {theme.lotusForest && <LotusForestEngine isMini={isMini} />}
      {theme.id === 'GOLDEN_EMPEROR' && <GoldenEmperorEngine isMini={isMini} />}
      {theme.yuletide && <YuletideEngine isMini={isMini} />}
      {theme.obsidianMadness && <MadnessEngine isMini={isMini} />}
      {theme.crystalTokyo && <TokyoEngine isMini={isMini} />}
      {theme.highRoller && <CastleOblivionEngine isMini={isMini} />}
      
      <div className={`absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] ${theme.colors} opacity-100 mix-blend-screen transition-all duration-1000 z-1`}></div>
      <div className="absolute inset-0 pointer-events-none z-4" style={{ backgroundImage: `radial-gradient(circle at center, ${theme.spotlight || 'rgba(255,255,255,0.05)'} 0%, transparent 80%)` }}></div>
    </div>
  );
};

export const BoardPreview: React.FC<{ themeId: string; className?: string; active?: boolean; unlocked?: boolean; hideActiveMarker?: boolean; }> = ({ themeId, className = "", active, unlocked = true, hideActiveMarker = false }) => {
  return (
    <div className={`relative w-full aspect-[16/10] rounded-2xl overflow-hidden border transition-all duration-500 ${active ? 'border-yellow-500/50 ring-2 ring-yellow-500 ring-inset shadow-2xl' : 'border-white/10 group-hover:border-white/20'} ${className}`}>
      <BoardSurface themeId={themeId} isMini />
      {!unlocked && <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center"><div className="w-8 h-8 rounded-full bg-black/60 border border-white/10 flex items-center justify-center opacity-60"><span className="text-xs">🔒</span></div></div>}
    </div>
  );
};

export const UserHub: React.FC<HubTab | any> = ({ onClose, profile, playerName, setPlayerName, playerAvatar, setPlayerAvatar, onSignOut, onRefreshProfile, isGuest, remoteEmotes = [] }) => {
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'STATS'>('PROFILE');
  const [isCatalogExpanded, setIsCatalogExpanded] = useState(false);

  if (!profile) return null;

  const currentLevel = calculateLevel(profile.xp);
  const nextLevelXp = getXpForLevel(currentLevel + 1);
  const curLevelXpFloor = getXpForLevel(currentLevel);
  const progress = Math.min(100, Math.max(0, ((profile.xp - curLevelXpFloor) / (nextLevelXp - curLevelXpFloor)) * 100));

  const isAvatarUnlocked = (emoji: string) => profile?.unlocked_avatars?.includes(emoji) || DEFAULT_AVATARS.includes(emoji);
  const visibleAvatars = isCatalogExpanded ? [...DEFAULT_AVATARS, ...PREMIUM_AVATARS] : [...DEFAULT_AVATARS, ...PREMIUM_AVATARS].slice(0, 10);

  // Stats Logic
  const gamesLost = profile.games_played - profile.wins;
  const avgCardsLeft = gamesLost > 0 ? (profile.total_cards_left_sum / gamesLost).toFixed(1) : '0.0';
  const finishDist = profile.finish_dist || [0, 0, 0, 0];
  const maxFinish = Math.max(...finishDist, 1);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-in fade-in duration-300" onClick={onClose}>
      
      <div className="relative bg-[#050505] border border-white/10 w-full max-w-2xl max-h-[90vh] rounded-[2.5rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,1)] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 sm:px-8 sm:py-6 border-b border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent flex flex-col gap-4">
          <div className="flex justify-between items-center w-full">
            <h2 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-white/90 to-white/40 uppercase italic tracking-widest leading-none">PLAYER PROFILE</h2>
            <button onClick={onClose} className="w-10 h-10 bg-red-600/10 hover:bg-red-600 text-white rounded-xl flex items-center justify-center transition-all group border border-white/5"><span className="text-lg font-black group-hover:rotate-90 transition-transform">✕</span></button>
          </div>
          
          <div className="flex gap-2 p-1 bg-black/40 rounded-2xl border border-white/5 w-full">
            <button 
                onClick={() => setActiveTab('PROFILE')}
                className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'PROFILE' ? 'bg-yellow-500 text-black shadow-lg' : 'text-white/40 hover:text-white/60'}`}
            >
                Credentials
            </button>
            <button 
                onClick={() => setActiveTab('STATS')}
                className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'STATS' ? 'bg-yellow-500 text-black shadow-lg' : 'text-white/40 hover:text-white/60'}`}
            >
                Arena Stats
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {activeTab === 'PROFILE' ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex flex-col sm:flex-row gap-8 items-center">
                    <div className="relative shrink-0">
                      <div className="absolute inset-[-15px] bg-yellow-500/10 blur-[40px] rounded-full"></div>
                      <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-black/40 border-2 border-yellow-500/20 flex items-center justify-center shadow-inner overflow-hidden">
                        {/* Player Profile Large Avatar Slot uses VisualEmote significantly boosted in size */}
                        <VisualEmote trigger={playerAvatar} remoteEmotes={remoteEmotes} size="xl" />
                      </div>
                    </div>
                    <div className="flex-1 w-full space-y-3 sm:space-y-4">
                        <input type="text" value={playerName} onChange={e => setPlayerName(e.target.value.toUpperCase())} maxLength={12} className="w-full bg-black/40 border border-white/5 px-4 py-2 rounded-xl text-white font-black uppercase tracking-widest text-lg sm:text-xl focus:border-yellow-500/30 outline-none transition-all shadow-inner" />
                        <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl space-y-2"><div className="flex justify-between items-end"><span className="text-[7px] font-black text-white/30 uppercase tracking-[0.3em]">Mastery {currentLevel}</span><span className="text-[7px] font-black text-yellow-500/60 uppercase tracking-widest">{nextLevelXp - profile.xp} XP TO ASCEND</span></div><div className="relative h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5"><div className="h-full bg-gradient-to-r from-yellow-700 via-yellow-400 to-yellow-200 transition-all duration-1000" style={{ width: `${progress}%` }} /></div></div>
                    </div>
                </div>

                <div className="grid grid-cols-5 gap-2">
                    {visibleAvatars.map(a => (
                      <button 
                        key={a} 
                        onClick={() => isAvatarUnlocked(a) ? setPlayerAvatar(a) : null} 
                        className={`aspect-square rounded-xl flex items-center justify-center transition-all ${playerAvatar === a ? 'bg-yellow-500/20 ring-2 ring-yellow-500 scale-110' : isAvatarUnlocked(a) ? 'bg-white/5 hover:bg-white/10' : 'opacity-20 grayscale'}`}
                      >
                        <VisualEmote trigger={a} remoteEmotes={remoteEmotes} size="md" />
                      </button>
                    ))}
                </div>

                <div className="flex flex-col items-center pt-1"><button onClick={() => setIsCatalogExpanded(!isCatalogExpanded)} className="group relative flex items-center justify-center w-10 h-10 rounded-full bg-white/[0.03] border border-white/10 hover:border-yellow-500/40 transition-all duration-500"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`text-white/60 group-hover:text-yellow-500 transition-all duration-500 ${isCatalogExpanded ? 'rotate-180' : 'rotate-0'}`}><polyline points="6 9 12 15 18 9"></polyline></svg></button><span className="text-[7px] font-black uppercase tracking-[0.4em] text-white/20 mt-1">{isCatalogExpanded ? "MINIMIZE" : "EXPAND"}</span></div>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { label: 'Battles', value: profile.games_played, icon: '⚔️' },
                        { label: 'Elite Chops', value: profile.total_chops, icon: '💣' },
                        { label: 'Win Streak', value: profile.current_streak, icon: '🔥' },
                        { label: 'Max Streak', value: profile.longest_streak, icon: '👑' }
                    ].map(stat => (
                        <div key={stat.label} className="bg-white/[0.02] border border-white/5 p-4 rounded-3xl flex flex-col items-center gap-1 group hover:bg-white/[0.04] transition-all">
                            <span className="text-xl mb-1">{stat.icon}</span>
                            <span className="text-xl font-black text-white">{stat.value}</span>
                            <span className="text-[7px] font-black uppercase tracking-widest text-white/30">{stat.label}</span>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white/[0.02] border border-white/5 p-6 rounded-[2rem] space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-[8px] font-black uppercase tracking-widest text-yellow-500">Defeat Severity</span>
                            <span className="text-xs font-black text-white">{avgCardsLeft}</span>
                        </div>
                        <p className="text-[9px] text-white/40 leading-relaxed uppercase tracking-widest">Typical hand size when failing to extract from arena.</p>
                        <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                            <div className="h-full bg-rose-500/60" style={{ width: `${Math.min(100, parseFloat(avgCardsLeft) * 7.7)}%` }}></div>
                        </div>
                    </div>
                    
                    <div className="bg-white/[0.02] border border-white/5 p-6 rounded-[2rem] space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500">Victory Efficiency</span>
                            <span className="text-xs font-black text-white">
                                {profile.games_played > 0 ? ((profile.wins / profile.games_played) * 100).toFixed(0) : 0}%
                            </span>
                        </div>
                        <p className="text-[9px] text-white/40 leading-relaxed uppercase tracking-widest">Protocol success rate across all historical deployments.</p>
                        <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500/60" style={{ width: `${(profile.wins / Math.max(1, profile.games_played)) * 100}%` }}></div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <SectionHeader>Placement Distribution</SectionHeader>
                    <div className="space-y-3">
                        {['1ST', '2ND', '3RD', '4TH'].map((label, i) => {
                            const val = finishDist[i];
                            const percent = (val / maxFinish) * 100;
                            const colorClass = i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-gray-300' : i === 2 ? 'bg-orange-400' : 'bg-red-500';
                            return (
                                <div key={label} className="group flex items-center gap-4">
                                    <span className="text-[8px] font-black text-white/40 w-6">{label}</span>
                                    <div className="flex-1 h-3 bg-black/40 rounded-full overflow-hidden border border-white/5">
                                        <div 
                                            className={`h-full ${colorClass} transition-all duration-1000 ease-out flex items-center justify-end px-2`}
                                            style={{ width: `${percent}%` }}
                                        >
                                            {val > 0 && <span className="text-[7px] font-black text-black/60">{val}</span>}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
          )}

          <div className="pt-8 border-t border-white/5">
            <SignOutButton onSignOut={onSignOut} className="!py-4 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
};

const SectionHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="flex items-center gap-3 mb-4">
        <span className="text-[9px] font-black uppercase tracking-[0.4em] text-yellow-500/70 italic whitespace-nowrap">{children}</span>
        <div className="h-[1px] flex-1 bg-gradient-to-r from-yellow-500/30 to-transparent"></div>
    </div>
);

export type HubTab = 'PROFILE' | 'CUSTOMIZE' | 'SETTINGS';
