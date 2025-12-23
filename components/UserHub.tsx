
import React, { useState, useMemo, useEffect } from 'react';
import { UserProfile, BackgroundTheme, AiDifficulty } from '../types';
import { calculateLevel, getXpForLevel, DEFAULT_AVATARS, PREMIUM_AVATARS, buyItem, getAvatarName } from '../services/supabase';
import { SignOutButton } from './SignOutButton';
import { CardCoverStyle, Card } from './Card';
import { audioService } from '../services/audio';

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
  koiWaters?: boolean;
  obsidianSanctum?: boolean;
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
  { id: 'CITY_LIGHTS_PIXEL', name: 'Obsidian Sanctum', tier: 'PREMIUM', price: 3500, base: 'bg-[#010103]', colors: 'from-purple-950/20 via-[#010103] to-black', obsidianSanctum: true, spotlight: 'rgba(168, 85, 247, 0.06)' },
  { id: 'CRYSTAL_TOKYO', name: 'Crystal Tokyo', tier: 'PREMIUM', price: 12000, base: 'bg-[#02020a]', colors: 'from-cyan-950/30 via-black to-black', crystalTokyo: true, spotlight: 'rgba(34, 211, 238, 0.15)' },
  { id: 'LOTUS_FOREST', name: 'Lotus Sanctuary', tier: 'PREMIUM', price: 4000, base: 'bg-[#022115]', colors: 'from-emerald-400/30 via-emerald-600/10 to-black', lotusForest: true, spotlight: 'rgba(182, 227, 143, 0.4)' },
  { id: 'CHRISTMAS_YULETIDE', name: 'Midnight Yuletide', tier: 'PREMIUM', price: 4500, base: 'bg-[#010b13]', colors: 'from-blue-900/30 via-[#010b13] to-black', yuletide: true, spotlight: 'rgba(191, 219, 254, 0.2)' },
  { id: 'GOLDEN_EMPEROR', name: 'Lucky Envelope', tier: 'PREMIUM', price: 5000, base: 'bg-[#080000]', colors: 'from-[#660000] via-[#1a0000] to-black', prestige: true, spotlight: 'rgba(251, 191, 36, 0.12)' },
  { id: 'KOI_WATERS', name: 'Koi Waters', tier: 'PREMIUM', price: 6000, base: 'bg-[#000000]', colors: 'from-[#083344]/40 via-[#010810]/60 to-black', koiWaters: true, spotlight: 'rgba(34, 211, 238, 0.15)' },
  { id: 'GOLD_FLUX', name: 'Gold Flux', tier: 'PREMIUM', price: 8500, base: 'bg-[#fffbeb]', colors: 'from-white via-yellow-50/80 to-yellow-100/40', goldFlux: true, spotlight: 'rgba(255, 255, 255, 0.8)' },
  { id: 'HIGH_ROLLER', name: 'Sanctum Oblivion', tier: 'PREMIUM', price: 15000, base: 'bg-[#ffffff]', colors: 'from-white via-slate-100 to-indigo-950/20', highRoller: true, spotlight: 'rgba(255, 255, 255, 0.4)' }
];

const CastleOblivionEngine: React.FC<{ isMini?: boolean }> = ({ isMini }) => {
  const shards = useMemo(() => Array.from({ length: isMini ? 10 : 30 }).map((_, i) => ({
    id: `oblivion-shard-${i}`,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 15 + Math.random() * 40,
    rot: Math.random() * 360,
    duration: 10 + Math.random() * 20,
    delay: Math.random() * -20,
    type: i % 2 === 0 ? 'light' : 'dark'
  })), [isMini]);

  const chains = useMemo(() => Array.from({ length: isMini ? 2 : 6 }).map((_, i) => ({
    id: `chain-${i}`,
    x: Math.random() * 100,
    delay: Math.random() * -30,
    duration: 60 + Math.random() * 40
  })), [isMini]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden bg-white">
      <div className="absolute inset-0 bg-gradient-to-br from-white via-slate-100 to-indigo-950 opacity-100"></div>
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')] opacity-10 mix-blend-multiply"></div>

      {!isMini && (
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] mix-blend-multiply">
           <svg viewBox="0 0 1000 1000" className="w-[120%] h-[120%] text-black fill-current">
              <path d="M100,1000 L100,400 Q100,100 500,100 Q900,100 900,400 L900,1000 M500,100 L500,1000 M200,1000 L200,450 Q200,200 500,200 Q800,200 800,450 L800,1000" fill="none" stroke="currentColor" strokeWidth="2" />
              {Array.from({ length: 8 }).map((_, i) => (
                <rect key={i} x={200 + i * 80} y="400" width="40" height="400" rx="20" />
              ))}
           </svg>
        </div>
      )}

      {!isMini && chains.map(c => (
        <div 
          key={c.id}
          className="absolute top-[-20%] w-[1px] h-[140%] bg-gradient-to-b from-transparent via-indigo-900/20 to-transparent animate-[oblivion-chain-sway_linear_infinite_alternate]"
          style={{ left: `${c.x}%`, animationDuration: `${c.duration}s`, animationDelay: `${c.delay}s` }}
        >
          <div className="absolute inset-0 shadow-[0_0_10px_rgba(49,46,129,0.3)]"></div>
        </div>
      ))}

      {shards.map(s => (
        <div 
          key={s.id}
          className="absolute animate-[oblivion-drift_linear_infinite]"
          style={{ 
            left: `${s.x}%`, 
            top: `${s.y}%`, 
            animationDuration: `${s.duration}s`, 
            animationDelay: `${s.delay}s` 
          }}
        >
          <div 
            className={`
              w-12 h-16 border transform rotate-45 transition-all duration-1000
              ${s.type === 'light' 
                ? 'bg-white/40 border-yellow-200 shadow-[0_0_20px_rgba(255,255,255,0.8)] backdrop-blur-sm' 
                : 'bg-indigo-950/60 border-indigo-400 shadow-[0_0_15px_rgba(79,70,229,0.4)] backdrop-blur-md'}
            `}
            style={{ 
              width: `${s.size}px`, 
              height: `${s.size * 1.4}px`,
              transform: `rotate(${s.rot}deg)`
            }}
          >
             <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent"></div>
          </div>
        </div>
      ))}

      {!isMini && Array.from({ length: 12 }).map((_, i) => (
        <div 
          key={`particle-${i}`}
          className={`absolute rounded-full animate-oblivion-particle`}
          style={{ 
            left: '50%', 
            top: '50%', 
            width: `${2 + Math.random() * 4}px`, 
            height: `${2 + Math.random() * 4}px`,
            backgroundColor: i % 2 === 0 ? '#ffffff' : '#312e81',
            boxShadow: i % 2 === 0 ? '0 0 10px white' : '0 0 8px #4338ca',
            animationDelay: `${Math.random() * -10}s`,
            animationDuration: `${5 + Math.random() * 10}s`,
            '--tx': `${(Math.random() - 0.5) * 1200}px`,
            '--ty': `${(Math.random() - 0.5) * 1200}px`,
          } as any}
        />
      ))}

      {!isMini && (
        <div className="absolute top-[15%] left-1/2 -translate-x-1/2 opacity-[0.05] mix-blend-multiply flex flex-col items-center">
           <div className="text-[260px] font-serif font-black italic tracking-tighter leading-none text-black select-none">XIII</div>
           <div className="w-96 h-[1px] bg-gradient-to-r from-transparent via-black to-transparent mt-[-40px]"></div>
        </div>
      )}

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(255,255,255,0.1)_60%,rgba(49,46,129,0.15)_100%)]"></div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes oblivion-drift {
          0% { transform: translate(0, 0) rotate(0deg); opacity: 0; }
          20% { opacity: 0.8; }
          80% { opacity: 0.8; }
          100% { transform: translate(-100px, -200px) rotate(360deg); opacity: 0; }
        }
        @keyframes oblivion-chain-sway {
          from { transform: rotate(-1deg) translateX(-10px); }
          to { transform: rotate(1deg) translateX(10px); }
        }
        @keyframes oblivion-particle {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0); opacity: 0; }
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

const SovereignEngine: React.FC<{ isMini?: boolean }> = ({ isMini }) => {
  const spires = useMemo(() => Array.from({ length: isMini ? 4 : 12 }).map((_, i) => ({
    id: `void-spire-${i}`,
    x: Math.random() * 100,
    h: 40 + Math.random() * 60,
    w: 2 + Math.random() * 4,
    delay: Math.random() * -60,
    duration: 120 + Math.random() * 100,
    depth: i % 4 
  })), [isMini]);

  const ribbons = useMemo(() => Array.from({ length: isMini ? 2 : 5 }).map((_, i) => ({
    id: `mana-ribbon-${i}`,
    delay: Math.random() * -20,
    duration: 15 + Math.random() * 10,
    y: 20 + Math.random() * 60
  })), [isMini]);

  const dust = useMemo(() => Array.from({ length: isMini ? 10 : 40 }).map((_, i) => ({
    id: `dust-${i}`,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 1.5 + 0.5,
    delay: Math.random() * -10,
    speed: 5 + Math.random() * 10
  })), [isMini]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden bg-[#010103] perspective-[2000px]">
      {!isMini && (
        <div className="absolute bottom-0 left-0 w-full h-full opacity-20 transition-all duration-1000">
           <div className="absolute inset-0 bg-gradient-to-t from-purple-900/10 to-transparent"></div>
           {spires.map(s => (
             <div 
               key={s.id} 
               className="absolute bottom-0 bg-gradient-to-t from-[#0a0a1a] via-[#020205] to-transparent border-x border-white/5"
               style={{ 
                 left: `${s.x}%`, 
                 height: `${s.h}%`, 
                 width: `${s.w}px`,
                 opacity: (s.depth + 1) / 5,
                 filter: s.depth < 2 ? 'blur(2px)' : 'none',
                 transform: `translateZ(${s.depth * -200}px)`
               }}
             />
           ))}
        </div>
      )}

      {!isMini && ribbons.map(r => (
        <div 
          key={r.id}
          className="absolute w-[200%] h-32 bg-gradient-to-r from-transparent via-purple-500/10 to-transparent blur-3xl animate-mana-flow"
          style={{ top: `${r.y}%`, left: '-50%', animationDelay: `${r.delay}s`, animationDuration: `${r.duration}s` }}
        />
      ))}

      {!isMini && (
        <div className="absolute inset-0 opacity-20 mix-blend-plus-lighter">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[150%] bg-[linear-gradient(110deg,transparent_0%,rgba(168,85,247,0.3)_45%,rgba(255,255,255,0.1)_50%,rgba(168,85,247,0.3)_55%,transparent_100%)] rotate-[35deg] animate-[godray-sweep_40s_infinite_alternate_ease-in-out]"></div>
          <div className="absolute top-[-20%] right-[-10%] w-[40%] h-[150%] bg-[linear-gradient(110deg,transparent_0%,rgba(139,92,246,0.2)_50%,transparent_100%)] rotate-[25deg] animate-[godray-sweep_30s_infinite_alternate-reverse_ease-in-out]"></div>
        </div>
      )}

      {!isMini && dust.map(d => (
        <div 
          key={d.id}
          className="absolute rounded-full bg-white/40 animate-dust-float"
          style={{ 
            left: `${d.x}%`, 
            top: `${d.y}%`, 
            width: `${d.size}px`, 
            height: `${d.size}px`, 
            animationDelay: `${d.delay}s`,
            animationDuration: `${d.speed}s`
          }}
        />
      ))}

      {!isMini && Array.from({ length: 15 }).map((_, i) => (
        <div 
          key={`splinter-${i}`}
          className="absolute w-[1px] h-[30px] bg-gradient-to-t from-transparent via-purple-400 to-white/80 opacity-0 animate-splinter-orbit"
          style={{ 
            left: '50%', 
            top: '50%', 
            animationDelay: `${Math.random() * -10}s`,
            animationDuration: `${2 + Math.random() * 3}s`,
            '--tx': `${(Math.random() - 0.5) * 800}px`,
            '--ty': `${(Math.random() - 0.5) * 800}px`,
          } as any}
        />
      ))}

      {!isMini && (
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] mix-blend-screen pointer-events-none translate-y-[-10%]">
           <div className="w-[1400px] h-[1400px] rounded-full border border-purple-500/20 animate-[prestige-slow-spin-v11_400s_linear_infinite] flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-[80%] h-[80%] text-white fill-none stroke-current opacity-40">
                 <circle cx="50" cy="50" r="48" strokeWidth="0.1" />
                 <path d="M50,2 L50,98 M2,50 L98,50" strokeWidth="0.05" />
                 <text x="50" y="52" textAnchor="middle" fontSize="12" fontWeight="100" fontFamily="serif" className="italic opacity-20">XIII</text>
              </svg>
           </div>
        </div>
      )}

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,rgba(0,0,0,0.4)_60%,rgba(0,0,0,0.9)_100%)]"></div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes godray-sweep {
          from { transform: translateX(-10%) rotate(35deg); opacity: 0.1; }
          to { transform: translateX(10%) rotate(35deg); opacity: 0.25; }
        }
        @keyframes dust-float {
          0% { transform: translate(0, 0); opacity: 0; }
          50% { opacity: 0.6; }
          100% { transform: translate(40px, -60px); opacity: 0; }
        }
        @keyframes mana-flow {
          0% { transform: translateX(-10%) translateY(0) scale(1); }
          50% { transform: translateX(10%) translateY(-20px) scale(1.1); }
          100% { transform: translateX(-10%) translateY(0) scale(1); }
        }
        @keyframes splinter-orbit {
          0% { transform: translate(-50%, -50%) rotate(0deg) translateX(200px) scaleX(0.1); opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translate(-50%, -50%) rotate(360deg) translateX(600px) scaleX(1); opacity: 0; }
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
  
  const shards = useMemo(() => Array.from({ length: isMini ? 15 : 60 }).map((_, i) => ({
    id: `lotus-suit-v17-${i}`,
    suitType: suits[i % 4],
    x: Math.random() * 110 - 5,
    delay: Math.random() * -45,
    duration: 22 + Math.random() * 12, // Slightly faster for more 'energy'
    size: 28 + Math.random() * 40, // Larger variance
    rotSpeed: 12 + Math.random() * 18,
    opacity: 0.7 + Math.random() * 0.3,
    glow: true,
    zDepth: Math.floor(Math.random() * 1200),
    swayX: (Math.random() - 0.5) * 600,
  })), [isMini]);

  const SUIT_PATHS: Record<string, string> = {
    SPADE: "M50 5 C65 40 100 65 75 90 C65 100 55 95 50 85 C45 95 35 100 25 90 C0 65 35 40 50 5 M50 80 L58 100 L42 100 Z",
    HEART: "M50 90 C15 65 10 25 50 15 C90 25 85 65 50 90 Z",
    // UPGRADED TO 4-POINTED NINJA STAR (SHURIKEN)
    CLUB: "M50 5 L60 40 L95 50 L60 60 L50 95 L40 60 L5 50 L40 40 Z M50 45 A5 5 0 1 0 50 55 A5 5 0 1 0 50 45",
    DIAMOND: "M50 5 L90 50 L50 95 L10 50 Z"
  };

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden bg-[#022115] perspective-[2500px]">
      {/* 1. MEGANIUM EMERALD VIBRANT ARENA */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,_#b6e38f66_0%,_#10b98133_30%,_#022115_85%,_#000000_100%)]"></div>
      
      {/* 2. VOLUMETRIC EMERALD GOD-RAYS */}
      {!isMini && (
          <div className="absolute inset-0 opacity-40 mix-blend-plus-lighter">
              <div className="absolute top-[-30%] left-[-20%] w-[100%] h-[180%] bg-[linear-gradient(110deg,transparent_40%,#ff69b422_50%,transparent_60%)] rotate-[30deg] animate-[lotus-light-sweep_25s_infinite_alternate_ease-in-out]"></div>
          </div>
      )}

      {/* 3. ETHEREAL PINK SUIT-PETAL STORM */}
      <div className="absolute inset-0 transform-style-3d">
        {shards.map(p => (
            <div 
                key={p.id}
                className="absolute transform-style-3d will-change-transform animate-[lotus-drift-v17_linear_infinite]"
                style={{ 
                    left: `${p.x}%`, 
                    top: '-300px',
                    animationDelay: `${p.delay}s`, 
                    animationDuration: `${p.duration}s`,
                    opacity: p.opacity,
                    '--sway': `${p.swayX}px`,
                    '--z': `${p.zDepth}px`
                } as any}
            >
                <div 
                    className="relative transform-style-3d animate-[lotus-tumble-3d-v17_linear_infinite]"
                    style={{ animationDuration: `${p.rotSpeed}s` }}
                >
                    <svg 
                        width={p.size} 
                        height={p.size} 
                        viewBox="0 0 100 100" 
                        className="overflow-visible transform-style-3d drop-shadow-[0_0_15px_rgba(255,105,180,0.7)]"
                    >
                        <defs>
                            <linearGradient id={`grad-suit-ethereal-v17-${p.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#fff" />
                                <stop offset="40%" stopColor="#ffb6c1" />
                                <stop offset="100%" stopColor="#d946ef" />
                            </linearGradient>
                            <filter id={`specular-v17-${p.id}`} colorInterpolationFilters="sRGB">
                                <feGaussianBlur stdDeviation="0.8" result="blur" />
                                <feSpecularLighting surfaceScale="5" specularConstant="1.8" specularExponent="35" lightingColor="#ffffff" in="blur" result="spec">
                                    <fePointLight x="-150" y="-150" z="400" />
                                </feSpecularLighting>
                                <feComposite in="spec" in2="SourceGraphic" operator="in" result="lit" />
                                <feMerge>
                                    <feMergeNode in="SourceGraphic" />
                                    <feMergeNode in="lit" />
                                </feMerge>
                            </filter>
                        </defs>
                        <path 
                            d={SUIT_PATHS[p.suitType]} 
                            fill={`url(#grad-suit-ethereal-v17-${p.id})`}
                            filter={`url(#specular-v17-${p.id})`}
                            className="mix-blend-screen opacity-95"
                        />
                        {/* Blade rim highlight */}
                        <path 
                            d={SUIT_PATHS[p.suitType]}
                            fill="none" 
                            stroke="#ffffff66" 
                            strokeWidth="1" 
                            opacity="0.5"
                        />
                    </svg>
                </div>
            </div>
        ))}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .transform-style-3d { transform-style: preserve-3d; }
        @keyframes lotus-drift-v17 {
          0% { transform: translate3d(0, 0, var(--z)); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translate3d(var(--sway), 150vh, var(--z)); opacity: 0; }
        }
        @keyframes lotus-tumble-3d-v17 {
          from { transform: rotate3d(1, 0.4, 0.8, 0deg); }
          to { transform: rotate3d(1, 0.4, 0.8, 360deg); }
        }
        @keyframes lotus-light-sweep {
            from { transform: translateX(-30%) rotate(30deg); opacity: 0.2; }
            to { transform: translateX(30%) rotate(30deg); opacity: 0.4; }
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

const KoiWatersEngine: React.FC<{ isMini?: boolean }> = ({ isMini }) => {
  const [customImage, setCustomImage] = useState<string | null>(localStorage.getItem('thirteen_custom_koi'));
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const handleUpdate = () => {
        const item = localStorage.getItem('thirteen_custom_koi');
        setCustomImage(item === "null" ? null : item);
        setIsReady(false);
    };
    window.addEventListener('thirteen_koi_synthesis_complete', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
        window.removeEventListener('thirteen_koi_synthesis_complete', handleUpdate);
        window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const FALLBACK = "https://images.unsplash.com/photo-1544923246-77307dd654ca?q=90&w=1200&auto=format&fit=crop";
  const KOI_SOURCE = (customImage && customImage.startsWith('data:image')) ? customImage : FALLBACK;

  const silhouettes = useMemo(() => Array.from({ length: isMini ? 2 : 4 }).map((_, i) => ({
    id: `koi-v11-${i}`,
    delay: Math.random() * -40,
    duration: 35 + Math.random() * 20,
    scale: 0.4 + Math.random() * 0.3,
    type: i % 2 === 0 ? 'white' : 'gold'
  })), [isMini]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden bg-[#000508]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,_#03141a_0%,_#000508_60%,_#000000_100%)]"></div>
      
      {silhouettes.map(s => (
        <div 
          key={s.id}
          className="absolute pointer-events-none opacity-0 mix-blend-screen will-change-transform"
          style={{ 
              width: '300px', height: '300px', 
              animation: `prestige-koi-swim-v11 ${s.duration}s infinite linear`,
              animationDelay: `${s.delay}s`,
              transform: `scale(${s.scale})`
          }}
        >
          <svg viewBox="0 0 1000 1000" className="w-full h-full drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]">
             <path d="M500,200 C450,250 420,350 420,500 C420,650 450,750 500,800 C550,750 580,650 580,500 C580,350 550,250 500,200" fill={s.type === 'gold' ? '#f59e0b' : '#f8fafc'} opacity="0.25" />
          </svg>
        </div>
      ))}

      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${isMini ? 'w-[140%] h-[140%]' : 'w-[115vw] h-[115vw] max-w-[1400px] max-h-[1400px]'} animate-[prestige-slow-spin-v11_400s_linear_infinite] transition-all duration-1000`}>
          <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-[3000ms] ${isReady ? 'opacity-100' : 'opacity-0'}`}>
              <div className="absolute w-[44%] h-[82%] -translate-y-[24%] -translate-x-[6%] -rotate-[12deg]">
                <img src={KOI_SOURCE} className="w-full h-full object-contain mix-blend-screen grayscale brightness-[2.5] contrast-[6]" onLoad={() => setIsReady(true)} onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK; }} />
              </div>
              <div className="absolute w-[44%] h-[82%] translate-y-[24%] translate-x-[6%] rotate-[168deg]">
                <img src={KOI_SOURCE} className="w-full h-full object-contain mix-blend-screen sepia-[0.8] saturate-[40] hue-rotate-[340deg] brightness-[1.8] contrast-[5]" />
              </div>
          </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes prestige-slow-spin-v11 { from { transform: translate(-50%, -50%) rotate(0deg); } to { transform: translate(-50%, -50%) rotate(360deg); } }
        @keyframes prestige-koi-swim-v11 {
            0% { transform: translate(-100%, 120vh) rotate(-30deg); opacity: 0; }
            15% { opacity: 0.1; }
            85% { opacity: 0.1; }
            100% { transform: translate(120%, -100px) rotate(30deg); opacity: 0; }
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
      {theme.koiWaters && <KoiWatersEngine isMini={isMini} />}
      {theme.lotusForest && <LotusForestEngine isMini={isMini} />}
      {theme.id === 'GOLDEN_EMPEROR' && <GoldenEmperorEngine isMini={isMini} />}
      {theme.yuletide && <YuletideEngine isMini={isMini} />}
      {theme.obsidianSanctum && <SovereignEngine isMini={isMini} />}
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

export const UserHub: React.FC<HubTab | any> = ({ onClose, profile, playerName, setPlayerName, playerAvatar, setPlayerAvatar, onSignOut, onRefreshProfile, isGuest }) => {
  const [isCatalogExpanded, setIsCatalogExpanded] = useState(false);

  if (!profile) return null;

  const currentLevel = calculateLevel(profile.xp);
  const nextLevelXp = getXpForLevel(currentLevel + 1);
  const curLevelXpFloor = getXpForLevel(currentLevel);
  const progress = Math.min(100, Math.max(0, ((profile.xp - curLevelXpFloor) / (nextLevelXp - curLevelXpFloor)) * 100));

  const isAvatarUnlocked = (emoji: string) => profile?.unlocked_avatars?.includes(emoji) || DEFAULT_AVATARS.includes(emoji);
  const visibleAvatars = isCatalogExpanded ? [...DEFAULT_AVATARS, ...PREMIUM_AVATARS] : [...DEFAULT_AVATARS, ...PREMIUM_AVATARS].slice(0, 10);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 animate-in fade-in duration-300" onClick={onClose}>
      
      <div className="relative bg-[#050505] border border-white/10 w-full max-w-2xl max-h-[90vh] rounded-[2.5rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,1)] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 sm:px-8 sm:py-6 border-b border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent flex justify-between items-center">
          <div className="flex flex-col">
            <h2 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-white/80 to-white/40 uppercase italic tracking-widest leading-none">PLAYER PROFILE</h2>
          </div>
          <button onClick={onClose} className="w-10 h-10 bg-red-600/10 hover:bg-red-600 text-white rounded-xl flex items-center justify-center transition-all group border border-white/5"><span className="text-lg font-black group-hover:rotate-90 transition-transform">✕</span></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          <div className="flex flex-col sm:flex-row gap-6 items-center">
            <div className="relative shrink-0"><div className="absolute inset-[-10px] bg-yellow-500/10 blur-[20px] rounded-full"></div><div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-black/40 border-2 border-yellow-500/20 flex items-center justify-center text-5xl sm:text-6xl shadow-inner">{playerAvatar}</div></div>
            <div className="flex-1 w-full space-y-3 sm:space-y-4">
                <input type="text" value={playerName} onChange={e => setPlayerName(e.target.value.toUpperCase())} maxLength={12} className="w-full bg-black/40 border border-white/5 px-4 py-2 rounded-xl text-white font-black uppercase tracking-widest text-lg sm:text-xl focus:border-yellow-500/30 outline-none transition-all shadow-inner" />
                <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl space-y-2"><div className="flex justify-between items-end"><span className="text-[7px] font-black text-white/30 uppercase tracking-[0.3em]">Mastery {currentLevel}</span><span className="text-[7px] font-black text-yellow-500/60 uppercase tracking-widest">{nextLevelXp - profile.xp} XP TO ASCEND</span></div><div className="relative h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5"><div className="h-full bg-gradient-to-r from-yellow-700 via-yellow-400 to-yellow-200 transition-all duration-1000" style={{ width: `${progress}%` }} /></div></div>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {visibleAvatars.map(a => (<button key={a} onClick={() => isAvatarUnlocked(a) ? setPlayerAvatar(a) : null} className={`aspect-square rounded-xl flex items-center justify-center text-2xl transition-all ${playerAvatar === a ? 'bg-yellow-500/20 ring-2 ring-yellow-500 scale-110' : isAvatarUnlocked(a) ? 'bg-white/5 hover:bg-white/10' : 'opacity-20 grayscale'}`}>{a}</button>))}
          </div>

          <div className="flex flex-col items-center pt-1"><button onClick={() => setIsCatalogExpanded(!isCatalogExpanded)} className="group relative flex items-center justify-center w-10 h-10 rounded-full bg-white/[0.03] border border-white/10 hover:border-yellow-500/40 transition-all duration-500"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`text-white/60 group-hover:text-yellow-500 transition-all duration-500 ${isCatalogExpanded ? 'rotate-180' : 'rotate-0'}`}><polyline points="6 9 12 15 18 9"></polyline></svg></button><span className="text-[7px] font-black uppercase tracking-[0.4em] text-white/20 mt-1">{isCatalogExpanded ? "MINIMIZE" : "EXPAND"}</span></div>
          <SignOutButton onSignOut={onSignOut} className="!py-4 w-full" />
        </div>
      </div>
    </div>
  );
};
export type HubTab = 'PROFILE' | 'CUSTOMIZE' | 'SETTINGS';
