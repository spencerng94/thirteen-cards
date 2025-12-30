import React from 'react';
import { UserProfile } from '../types';
import { CurrencyIcon } from './Store';

interface GemPack {
  id: string;
  price: string;
  totalGems: number;
  bonusGems: number;
}

const GEM_PACKS: GemPack[] = [
  { id: 'gem_1', price: '$1.99', totalGems: 250, bonusGems: 0 },
  { id: 'gem_2', price: '$4.99', totalGems: 700, bonusGems: 75 },
  { id: 'gem_3', price: '$9.99', totalGems: 1500, bonusGems: 250 },
  { id: 'gem_4', price: '$19.99', totalGems: 3200, bonusGems: 700 },
  { id: 'gem_5', price: '$49.99', totalGems: 8500, bonusGems: 2250 },
  { id: 'gem_6', price: '$99.99', totalGems: 18000, bonusGems: 5500 },
];

/**
 * AAA-Grade Sharp Faceted Hexagon
 * Replaces circular gloss with geometric light refraction logic.
 */
const HexFacetedGem: React.FC<{ tier: number; size: number }> = ({ tier, size }) => {
  const isElite = tier >= 5;
  const primary = isElite ? '#ff007f' : '#ec4899';
  const mid = isElite ? '#9d174d' : '#be185d';
  const dark = isElite ? '#4c0519' : '#701a35';

  // Master Hex Points
  const p = {
    top: "50,5",
    tr: "89,27.5",
    br: "89,72.5",
    bottom: "50,95",
    bl: "11,72.5",
    tl: "11,27.5",
    center: "50,50",
    ct: "50,25",
    ctr: "73,38",
    cbr: "73,62",
    cb: "50,75",
    cbl: "27,62",
    ctl: "27,38"
  };

  return (
    <svg viewBox="0 0 100 100" style={{ width: size, height: size }} className="overflow-visible filter drop-shadow-[0_0_30px_rgba(255,0,127,0.3)]">
      <defs>
        <filter id="facetingBloom">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <linearGradient id={`gradFace1-${tier}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="white" stopOpacity="0.8" />
          <stop offset="100%" stopColor={primary} />
        </linearGradient>
      </defs>

      {/* Deep Aura */}
      <circle cx="50" cy="50" r="45" fill={primary} opacity={0.15 + (tier * 0.05)} filter="url(#facetingBloom)" className="animate-pulse" />

      {/* Main Base Hexagon */}
      <polygon points={`${p.top} ${p.tr} ${p.br} ${p.bottom} ${p.bl} ${p.tl}`} fill={dark} />

      {/* Brilliant Cut Facets */}
      <g opacity={0.8}>
        {/* Top-Right Facet */}
        <polygon points={`${p.center} ${p.top} ${p.tr}`} fill={primary} opacity="0.9" />
        {/* Right Facet */}
        <polygon points={`${p.center} ${p.tr} ${p.br}`} fill={mid} opacity="1" />
        {/* Bottom-Right Facet */}
        <polygon points={`${p.center} ${p.br} ${p.bottom}`} fill={dark} opacity="0.8" />
        {/* Bottom-Left Facet */}
        <polygon points={`${p.center} ${p.bottom} ${p.bl}`} fill={dark} opacity="1" />
        {/* Left Facet */}
        <polygon points={`${p.center} ${p.bl} ${p.tl}`} fill={mid} opacity="0.9" />
        {/* Top-Left Facet */}
        <polygon points={`${p.center} ${p.tl} ${p.top}`} fill={primary} opacity="1" />
      </g>

      {/* Internal "Table" Cut (The crown of the gem) */}
      <g stroke="white" strokeWidth="0.5" strokeOpacity="0.3">
        <polygon points={`${p.ct} ${p.ctr} ${p.cbr} ${p.cb} ${p.cbl} ${p.ctl}`} fill={`url(#gradFace1-${tier})`} opacity="0.9" />
        
        {/* Connecting Edge Bevels */}
        <line x1="50" y1="5" x2="50" y2="25" />
        <line x1="89" y1="27.5" x2="73" y2="38" />
        <line x1="89" y1="72.5" x2="73" y2="62" />
        <line x1="50" y1="95" x2="50" y2="75" />
        <line x1="11" y1="72.5" x2="27" y2="62" />
        <line x1="11" y1="27.5" x2="27" y2="38" />
      </g>

      {/* Sharp Specular Linear Glints (Replaces the "cheap" circular arc) */}
      <g style={{ mixBlendMode: 'plus-lighter' }}>
        <path d="M50 25 L73 38 L50 42 Z" fill="white" opacity="0.4" />
        <path d="M27 38 L50 25 L50 35 Z" fill="white" opacity="0.2" />
        
        {/* Tier-based intensity: Brilliant Point */}
        {tier >= 3 && (
            <circle cx="50" cy="35" r="4" fill="white" opacity="0.6" filter="url(#facetingBloom)" className="animate-pulse" />
        )}
      </g>

      {/* Elite Crystalline Flare */}
      {isElite && (
        <g filter="url(#facetingBloom)">
            <path d="M50 20 L53 45 L70 50 L53 55 L50 80 L47 55 L30 50 L47 45 Z" fill="white" opacity="0.4" className="animate-pulse" />
        </g>
      )}
    </svg>
  );
};

const CinematicNode: React.FC<{ tier: number }> = ({ tier }) => {
  const baseSize = 42;
  const size = baseSize + (tier * 16);

  return (
    <div className="relative flex items-center justify-center animate-[float-gem-v3_6s_ease-in-out_infinite]">
      {/* Background Volumetrics */}
      <div className={`absolute inset-[-140%] bg-pink-600/10 blur-[100px] rounded-full transition-opacity duration-1000 ${tier >= 4 ? 'opacity-100' : 'opacity-30'}`}></div>
      
      {/* Precision Orbit (Tier 3+) */}
      {tier >= 3 && (
        <div className="absolute inset-[-45%] border-[0.5px] border-white/5 rounded-full animate-[spin_25s_linear_infinite] opacity-40">
           <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-pink-300 rounded-full shadow-[0_0_12px_#ff007f]"></div>
        </div>
      )}

      {/* Prismatic Rays (Tier 6 Only) */}
      {tier === 6 && (
        <div className="absolute inset-[-250%] z-0 pointer-events-none opacity-40">
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500%] h-[0.5px] bg-gradient-to-r from-transparent via-white/40 to-transparent rotate-[15deg] animate-pulse"></div>
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500%] h-[0.5px] bg-gradient-to-r from-transparent via-white/40 to-transparent -rotate-[15deg] animate-pulse [animation-delay:2s]"></div>
        </div>
      )}

      <div className="relative z-10 transition-all duration-700 hover:scale-110">
        <HexFacetedGem tier={tier} size={size} />
      </div>
    </div>
  );
};

export const GemPacks: React.FC<{
  onClose: () => void;
  profile: UserProfile | null;
  onRefreshProfile: () => void;
}> = ({ onClose, profile }) => {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/98 backdrop-blur-3xl p-3 sm:p-4 animate-in fade-in duration-700 overflow-hidden" onClick={onClose}>
      
      {/* Deep Space Background Ambience */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
         {Array.from({ length: 40 }).map((_, i) => (
           <div key={i} className="absolute w-[1.2px] h-[1.2px] bg-white rounded-full animate-float-pixel-v3" style={{
             left: `${Math.random() * 100}%`,
             top: `${Math.random() * 100}%`,
             animationDelay: `${Math.random() * 8}s`,
             animationDuration: `${12 + Math.random() * 10}s`
           } as any} />
         ))}
      </div>

      <div className="relative bg-[#020202]/95 border border-white/10 w-full max-w-md h-[92vh] rounded-[3.5rem] overflow-hidden shadow-[0_0_300px_rgba(0,0,0,1)] flex flex-col transition-all" onClick={e => e.stopPropagation()}>
        
        {/* Minimal Tool Header */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-4 px-6 py-2.5 rounded-full bg-black/80 backdrop-blur-2xl border border-white/5 shadow-2xl">
          <div className="flex items-center gap-2">
             <CurrencyIcon type="GEMS" size="sm" />
             <span className="text-[16px] font-black text-white tracking-tighter font-mono">{(profile?.gems || 0).toLocaleString()}</span>
          </div>
          <div className="w-[1px] h-4 bg-white/10"></div>
          <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.4em]">Gem Vault</span>
        </div>

        <button onClick={onClose} className="absolute top-6 right-6 z-[100] w-10 h-10 bg-white/[0.02] hover:bg-white/[0.08] border border-white/5 text-white rounded-xl flex items-center justify-center transition-all active:scale-90 group">
          <span className="text-xl font-black group-hover:rotate-90 transition-transform">✕</span>
        </button>

        {/* Brand Header */}
        <div className="px-8 mt-24 mb-4 flex flex-col items-center">
            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-white/80 to-white/40 uppercase tracking-tighter italic font-serif leading-none text-center">SHARD DEPOT</h1>
            <div className="h-[1.5px] w-24 bg-gradient-to-r from-transparent via-pink-500/40 to-transparent mt-5 rounded-full"></div>
        </div>

        {/* Optimized Vertical Scroll */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32 scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
          {GEM_PACKS.map((pack, idx) => {
            const tier = idx + 1;
            const isElite = tier >= 5;

            return (
              <div 
                key={pack.id}
                className={`group relative flex items-center justify-between p-6 sm:p-7 rounded-[2.5rem] border transition-all duration-700 overflow-hidden
                  ${isElite 
                    ? 'bg-gradient-to-br from-[#100008] via-black to-black border-pink-500/30 shadow-[inset_0_0_40px_rgba(236,72,153,0.05)]' 
                    : 'bg-white/[0.02] border-white/5 hover:border-white/20'}
                  min-h-[140px]
                `}
              >
                {/* Visual Node */}
                <div className="relative z-10 w-24 sm:w-28 h-24 sm:h-28 flex items-center justify-center shrink-0">
                   <CinematicNode tier={tier} />
                </div>

                {/* Info Node */}
                <div className="relative z-10 flex flex-col gap-1.5 flex-1 pl-4 items-end text-right">
                   <div className="flex flex-col items-end">
                      <span className="text-4xl sm:text-5xl font-black text-white italic tracking-tighter leading-none font-serif drop-shadow-2xl">
                        {pack.totalGems.toLocaleString()}
                      </span>
                      {pack.bonusGems > 0 ? (
                        <div className="flex items-center gap-2 mt-2">
                           <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.1em]">{(pack.totalGems - pack.bonusGems).toLocaleString()}</span>
                           <span className="text-[9px] font-black text-pink-400 uppercase tracking-[0.1em] animate-pulse">+{pack.bonusGems.toLocaleString()} BONUS</span>
                        </div>
                      ) : (
                        <span className="text-[8px] font-black text-white/10 uppercase tracking-[0.4em] mt-2 italic">Refined Yield</span>
                      )}
                   </div>
                   
                   <div className="mt-4">
                      <div className="inline-flex px-10 py-3 rounded-2xl border border-white/5 bg-white/5 text-white/20 text-[9px] font-black uppercase tracking-[0.3em] grayscale cursor-not-allowed transition-all duration-500 group-hover:bg-white/10">
                        OFFLINE
                      </div>
                   </div>
                </div>

                {/* Tech Pattern Detail */}
                <div className="absolute inset-0 opacity-[0.02] pointer-events-none mix-blend-screen overflow-hidden">
                   <div className="absolute top-0 left-0 w-full h-full" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1.5px, transparent 1.5px), linear-gradient(90deg, rgba(255,255,255,0.5) 1.5px, transparent 1.5px)', backgroundSize: '25px 25px' }}></div>
                </div>
                
                {/* Radial Glow */}
                <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-pink-500/5 blur-[80px] rounded-full"></div>
              </div>
            );
          })}

          {/* Maintenance Notice */}
          <div className="pt-12 pb-16 flex flex-col items-center opacity-30 text-center space-y-4">
             <div className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_#ef4444]"></span>
                <p className="text-[10px] font-black uppercase tracking-[0.8em] text-white">REFINERY OFFLINE</p>
             </div>
             <p className="text-[9px] font-medium max-w-[240px] uppercase tracking-[0.3em] leading-relaxed text-white/60">
               Acquisition protocols are undergoing structural refinement. Check back soon.
             </p>
          </div>
        </div>

        {/* Footer Fade */}
        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-black via-black/90 to-transparent pointer-events-none z-20"></div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float-gem-v3 {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(1deg); }
        }
        @keyframes float-pixel-v3 {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0; }
          20% { opacity: 0.3; }
          80% { opacity: 0.3; }
          100% { transform: translateY(-60px) translateX(20px); opacity: 0; }
        }
      `}} />
    </div>
  );
};