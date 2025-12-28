import React from 'react';
import { Card as CardType, Suit, Rank } from '../types';

/* Added sovereign styles to fix type errors in Store.tsx */
export type CardCoverStyle = 'BLUE' | 'RED' | 'PATTERN' | 'GOLDEN_IMPERIAL' | 'VOID_ONYX' | 'ROYAL_JADE' | 'CRYSTAL_EMERALD' | 'DRAGON_SCALE' | 'NEON_CYBER' | 'PIXEL_CITY_LIGHTS' | 'AMETHYST_ROYAL' | 'CHERRY_BLOSSOM_NOIR' | 'AETHER_VOID' | 'DIVINE_ROYAL' | 'EMPERORS_HUBRIS' | 'WITS_END' | 'SOVEREIGN_SPADE' | 'SOVEREIGN_CLUB' | 'SOVEREIGN_DIAMOND' | 'SOVEREIGN_HEART';

interface CardProps {
  card?: CardType;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
  small?: boolean;
  faceDown?: boolean;
  coverStyle?: CardCoverStyle;
  disableEffects?: boolean;
  activeTurn?: boolean;
}

const getRankLabel = (rank: Rank): string => {
  if (rank <= 10) return rank.toString();
  switch (rank) {
    case 11: return 'J';
    case 12: return 'Q';
    case 13: return 'K';
    case 14: return 'A';
    case 15: return '2';
    default: return '?';
  }
};

const getSuitSymbol = (suit: Suit): string => {
  switch (suit) {
    case Suit.Hearts: return '♥';
    case Suit.Diamonds: return '♦';
    case Suit.Clubs: return '♣';
    case Suit.Spades: return '♠';
    default: return '?';
  }
};

const SUIT_PATH_DATA = {
  SPADE: "M50 5 C65 40 100 65 75 90 C65 100 55 95 50 85 C45 95 35 100 25 90 C0 65 35 40 50 5 M50 80 L58 100 L42 100 Z",
  HEART: "M50 30 C50 10 10 10 10 45 C10 75 50 95 50 95 C50 95 90 75 90 45 C90 10 50 10 50 30 Z",
  CLUB: "M50 25 A18 18 0 1 1 68 43 A18 18 0 1 1 55 65 L55 85 L65 95 L35 95 L45 85 L45 65 A18 18 0 1 1 32 43 A18 18 0 1 1 50 25 Z",
  DIAMOND: "M50 5 L90 50 L50 95 L10 50 Z"
};

/**
 * Logic to determine the face visual style based on the sleeve (coverStyle)
 */
const getFaceTheming = (style: CardCoverStyle | undefined, suit: Suit, disableEffects: boolean = false) => {
  const isRedSuit = suit === Suit.Hearts || suit === Suit.Diamonds;
  
  // Default (Off-white face)
  let bg = 'bg-[#fafafa]';
  let border = 'border-gray-200/80';
  let textColor = isRedSuit ? 'text-rose-600' : 'text-slate-900';
  let symbolColor = isRedSuit ? 'text-rose-600' : 'text-slate-900';
  let innerGlow = '';
  let fontClass = 'font-black';

  if (disableEffects) {
    return { bg, border, textColor, symbolColor, innerGlow, fontClass };
  }

  switch (style) {
    /* Sovereign face themes */
    case 'SOVEREIGN_SPADE':
      bg = 'bg-[#020617]';
      border = 'border-indigo-500/40';
      textColor = 'text-indigo-400';
      symbolColor = 'text-indigo-500';
      innerGlow = 'shadow-[inset_0_0_20px_rgba(99,102,241,0.2)]';
      break;
    case 'SOVEREIGN_CLUB':
      bg = 'bg-[#022c22]';
      border = 'border-emerald-500/40';
      textColor = 'text-emerald-400';
      symbolColor = 'text-emerald-500';
      innerGlow = 'shadow-[inset_0_0_20px_rgba(52,211,153,0.2)]';
      break;
    case 'SOVEREIGN_DIAMOND':
      bg = 'bg-[#450a0a]';
      border = 'border-rose-500/40';
      textColor = 'text-rose-400';
      symbolColor = 'text-rose-500';
      innerGlow = 'shadow-[inset_0_0_20px_rgba(244,63,94,0.2)]';
      break;
    case 'SOVEREIGN_HEART':
      bg = 'bg-[#881337]';
      border = 'border-pink-500/40';
      textColor = 'text-pink-400';
      symbolColor = 'text-pink-500';
      innerGlow = 'shadow-[inset_0_0_20px_rgba(244,114,182,0.2)]';
      break;
    case 'WITS_END':
      bg = 'bg-gradient-to-br from-[#020005] via-[#0a0515] to-[#010003]';
      border = 'border-purple-900/60 shadow-[inset_0_0_15px_rgba(147,51,234,0.3)]';
      textColor = isRedSuit ? 'text-purple-400' : 'text-slate-400';
      symbolColor = isRedSuit ? 'text-purple-500' : 'text-slate-300';
      fontClass = 'font-serif font-black italic';
      innerGlow = 'shadow-[inset_0_0_30px_rgba(88,28,135,0.4)]';
      break;
    case 'EMPERORS_HUBRIS':
      bg = 'bg-gradient-to-br from-[#fffef0] via-[#fdf5d5] to-[#f7e9b0]';
      border = 'border-yellow-700/60 shadow-[inset_0_0_10px_rgba(184,134,11,0.2)]';
      textColor = 'text-[#5d4037]';
      symbolColor = isRedSuit ? 'text-[#c62828]' : 'text-[#212121]';
      fontClass = 'font-serif font-black';
      break;
    case 'DIVINE_ROYAL':
      bg = 'bg-gradient-to-br from-[#fffdf5] via-[#fef9e7] to-[#f7f1d5]';
      border = 'border-yellow-600/40';
      textColor = isRedSuit ? 'text-rose-700' : 'text-indigo-950';
      symbolColor = isRedSuit ? 'text-rose-600' : 'text-indigo-900';
      innerGlow = 'shadow-[inset_0_0_15px_rgba(234,179,8,0.25)]';
      fontClass = 'font-serif font-black italic';
      break;
    case 'AETHER_VOID':
      bg = 'bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#050505]';
      border = 'border-yellow-500/40';
      textColor = isRedSuit ? 'text-yellow-500' : 'text-slate-50';
      symbolColor = isRedSuit ? 'text-yellow-500' : 'text-slate-50';
      innerGlow = 'shadow-[inset_0_0_20px_rgba(250,204,21,0.2)]';
      break;
    case 'GOLDEN_IMPERIAL':
      bg = 'bg-gradient-to-br from-[#fff9c4] via-[#fbc02d] to-[#f9a825]';
      border = 'border-[#8b6508]/40';
      textColor = isRedSuit ? 'text-[#800000]' : 'text-[#0a0a0a]';
      symbolColor = isRedSuit ? 'text-[#800000]' : 'text-[#0a0a0a]';
      innerGlow = 'shadow-[inset_0_0_15px_rgba(255,255,255,0.5)]';
      break;
    case 'VOID_ONYX':
      bg = 'bg-gradient-to-br from-[#020210] via-[#050520] to-[#010108]';
      border = 'border-indigo-500/50';
      textColor = isRedSuit ? 'text-indigo-400' : 'text-slate-200';
      symbolColor = isRedSuit ? 'text-indigo-300' : 'text-indigo-100';
      innerGlow = 'shadow-[inset_0_0_25px_rgba(99,102,241,0.4)]';
      break;
    case 'NEON_CYBER':
      bg = 'bg-[#020205]';
      border = 'border-cyan-500/60 shadow-[0_0_15px_rgba(34,211,238,0.2)]';
      textColor = isRedSuit ? 'text-pink-500' : 'text-cyan-400';
      symbolColor = isRedSuit ? 'text-pink-400' : 'text-cyan-300';
      innerGlow = 'shadow-[inset_0_0_15px_rgba(217,70,239,0.15)]';
      break;
    case 'PIXEL_CITY_LIGHTS':
      bg = 'bg-gradient-to-br from-[#0a0a1a] to-[#02020a]';
      border = 'border-blue-400/40 shadow-[0_0_10px_rgba(96,165,250,0.1)]';
      textColor = isRedSuit ? 'text-yellow-400' : 'text-blue-300';
      symbolColor = isRedSuit ? 'text-yellow-400' : 'text-blue-400';
      innerGlow = 'shadow-[inset_0_0_20px_rgba(30,58,138,0.5)]';
      break;
    case 'CHERRY_BLOSSOM_NOIR':
      bg = 'bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#050505]';
      border = 'border-pink-500/40';
      textColor = isRedSuit ? 'text-pink-500' : 'text-slate-100';
      symbolColor = isRedSuit ? 'text-pink-400' : 'text-slate-50';
      innerGlow = 'shadow-[inset_0_0_30px_rgba(236,72,153,0.25)]';
      break;
    case 'AMETHYST_ROYAL':
      bg = 'bg-gradient-to-br from-[#1e1b4b] via-[#0f172a] to-[#020617]';
      border = 'border-purple-300/40';
      textColor = isRedSuit ? 'text-purple-400' : 'text-slate-200';
      symbolColor = isRedSuit ? 'text-purple-300' : 'text-white';
      innerGlow = 'shadow-[inset_0_0_20px_rgba(16,185,129,0.3)]';
      break;
    case 'DRAGON_SCALE':
      bg = 'bg-gradient-to-br from-[#2a0a05] via-[#1a0a05] to-[#0a0502]';
      border = 'border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.2)]';
      textColor = isRedSuit ? 'text-orange-600' : 'text-amber-500';
      symbolColor = isRedSuit ? 'text-orange-500' : 'text-amber-400';
      innerGlow = 'shadow-[inset_0_0_35px_rgba(154,52,18,0.5)]';
      break;
    case 'ROYAL_JADE':
      bg = 'bg-gradient-to-br from-[#064e3b] via-[#022c22] to-[#011a13]';
      border = 'border-yellow-500/40';
      textColor = isRedSuit ? 'text-yellow-500' : 'text-emerald-50';
      symbolColor = isRedSuit ? 'text-yellow-500' : 'text-emerald-50';
      innerGlow = 'shadow-[inset_0_0_25px_rgba(16,185,129,0.5)]';
      break;
    case 'CRYSTAL_EMERALD':
      bg = 'bg-gradient-to-br from-[#064e3b] via-[#047857] to-[#065f46]';
      border = 'border-green-200/40 shadow-[0_0_10px_rgba(110,231,183,0.2)]';
      textColor = isRedSuit ? 'text-green-300' : 'text-white';
      symbolColor = isRedSuit ? 'text-green-200' : 'text-white';
      innerGlow = 'shadow-[inset_0_0_20px_rgba(255,255,255,0.1)]';
      break;
  }

  return { bg, border, textColor, symbolColor, innerGlow, fontClass };
};

export const Card: React.FC<CardProps> = ({ 
  card, 
  selected, 
  onClick, 
  className = '', 
  small = false, 
  faceDown = false,
  coverStyle = 'BLUE',
  disableEffects = false,
  activeTurn = false
}) => {
  
  if (faceDown) {
    let bgClass = '';
    let borderClass = 'border-white/20';
    let patternContent = null;
    let metallicReflect = "bg-gradient-to-tr from-white/0 via-white/10 to-white/0";
    let specialAnimation = "";

    const renderSovereignSuit = (type: keyof typeof SUIT_PATH_DATA, colorClass: string, shadowClass: string) => (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
          <svg viewBox="0 0 100 100" className={`w-full h-full drop-shadow-[0_0_15px_${shadowClass}] ${colorClass} opacity-90`}>
            <defs>
              <linearGradient id={`goldMetallicPremium-${type}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3d280a" />
                <stop offset="25%" stopColor="#d4af37" />
                <stop offset="50%" stopColor="#fbf5b7" />
                <stop offset="75%" stopColor="#d4af37" />
                <stop offset="100%" stopColor="#3d280a" />
              </linearGradient>
            </defs>
            <path d={SUIT_PATH_DATA[type]} fill={`url(#goldMetallicPremium-${type})`} />
          </svg>
          {!disableEffects && (
            <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_40%,rgba(255,255,255,0.6)_50%,transparent_60%)] bg-[length:200%_100%] animate-[sovereign-glint_3s_infinite_linear] pointer-events-none mix-blend-overlay" style={{ clipPath: `path('${SUIT_PATH_DATA[type]}')` }}></div>
          )}
        </div>
      </div>
    );

    switch (coverStyle) {
        case 'SOVEREIGN_SPADE':
            bgClass = 'bg-gradient-to-br from-[#020617] via-[#1e1b4b] to-black';
            borderClass = 'border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.4)]';
            metallicReflect = "bg-gradient-to-tr from-transparent via-indigo-400/20 to-transparent";
            patternContent = renderSovereignSuit('SPADE', 'text-indigo-400', 'rgba(99,102,241,0.5)');
            break;
        case 'SOVEREIGN_CLUB':
            bgClass = 'bg-gradient-to-br from-[#022c22] via-[#064e3b] to-black';
            borderClass = 'border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.4)]';
            metallicReflect = "bg-gradient-to-tr from-transparent via-emerald-400/20 to-transparent";
            patternContent = renderSovereignSuit('CLUB', 'text-emerald-400', 'rgba(52,211,153,0.5)');
            break;
        case 'SOVEREIGN_DIAMOND':
            bgClass = 'bg-gradient-to-br from-[#450a0a] via-[#7f1d1d] to-black';
            borderClass = 'border-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.4)]';
            metallicReflect = "bg-gradient-to-tr from-transparent via-rose-400/20 to-transparent";
            patternContent = renderSovereignSuit('DIAMOND', 'text-rose-400', 'rgba(244,63,94,0.5)');
            break;
        case 'SOVEREIGN_HEART':
            bgClass = 'bg-gradient-to-br from-[#881337] via-[#be123c] to-black';
            borderClass = 'border-pink-400 shadow-[0_0_20px_rgba(244,114,182,0.4)]';
            metallicReflect = "bg-gradient-to-tr from-transparent via-pink-400/20 to-transparent";
            patternContent = renderSovereignSuit('HEART', 'text-pink-400', 'rgba(244,114,182,0.5)');
            break;
        case 'WITS_END':
            bgClass = 'bg-gradient-to-br from-[#05000a] via-[#100520] to-[#010003]';
            borderClass = 'border-purple-600 shadow-[0_0_40px_rgba(147,51,234,0.4),inset_0_0_15px_rgba(255,255,255,0.2)]';
            metallicReflect = "bg-gradient-to-tr from-transparent via-purple-400/30 to-transparent";
            specialAnimation = "animate-ethereal-pulse";
            patternContent = (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="relative group/void">
                        <svg viewBox="0 0 100 100" className="w-16 h-16 drop-shadow-[0_0_12px_rgba(168,85,247,0.6)] fill-purple-500 opacity-60">
                             <path d="M50 20 C30 20 10 50 10 50 C10 50 30 80 50 80 C70 80 90 50 90 50 C90 50 70 20 50 20 Z M50 65 C41.7 65 35 58.3 35 50 C35 41.7 41.7 35 50 35 C58.3 35 65 41.7 65 50 C65 58.3 58.3 65 50 65 Z" />
                             <circle cx="50" cy="50" r="8" className="animate-pulse" />
                             <path d="M40 30 L30 20 M60 30 L70 20 M40 70 L30 80 M60 70 L70 80" stroke="currentColor" strokeWidth="2" />
                        </svg>
                        {!disableEffects && (
                            <div className="absolute inset-0">
                                <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-purple-400 rounded-full blur-md animate-ethereal-float"></div>
                                <div className="absolute top-1/2 left-1/2 w-3 h-3 bg-indigo-500 rounded-full blur-md animate-ethereal-float [animation-delay:0.7s]"></div>
                                <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-slate-200 rounded-full blur-sm animate-ethereal-float [animation-delay:1.4s]"></div>
                            </div>
                        )}
                        {activeTurn && !disableEffects && (
                            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                <div className="w-5 h-5 bg-purple-900/40 rounded-full blur-xl animate-smoke-puff"></div>
                                <div className="w-4 h-4 bg-indigo-900/30 rounded-full blur-xl animate-smoke-puff [animation-delay:0.4s] ml-2 mt-[-5px]"></div>
                            </div>
                        )}
                    </div>
                </div>
            );
            break;
        case 'EMPERORS_HUBRIS':
            bgClass = 'bg-gradient-to-br from-[#ffd700] via-[#fff176] to-[#b8860b]';
            borderClass = 'border-yellow-200 shadow-[0_0_40px_rgba(255,215,0,0.4),inset_0_0_15px_rgba(255,255,255,0.6)]';
            metallicReflect = "bg-gradient-to-tr from-transparent via-white/70 to-transparent";
            patternContent = (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="relative group/dragon">
                        <svg viewBox="0 0 100 100" className="w-16 h-16 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] fill-[#3d2b1f] opacity-80 filter grayscale-[0.2]">
                             <path d="M50 10C55 10 60 15 60 20C60 25 55 30 50 30C45 30 40 25 40 20C40 15 45 10 50 10ZM50 80C30 80 15 65 15 45C15 25 30 10 50 10C70 10 85 25 85 45C85 65 70 80 50 80ZM50 35C50 35 30 50 30 65C30 80 50 90 50 90C50 90 70 80 70 65C70 50 50 35Z" opacity="0.3"/>
                             <path d="M82,45 C82,20 60,15 50,15 C40,15 18,20 18,45 C18,65 35,85 50,85 C65,85 82,65 82,45 M50,25 C58,25 65,32 65,40 C65,48 58,55 50,55 C42,55 35,48 35,40 C35,32 42,25 50,25" />
                             <circle cx="50" cy="40" r="5" />
                        </svg>
                        {activeTurn && !disableEffects && (
                            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                <div className="w-4 h-4 bg-white/40 rounded-full blur-md animate-smoke-puff"></div>
                                <div className="w-3 h-3 bg-white/30 rounded-full blur-md animate-smoke-puff [animation-delay:0.4s] ml-2 mt-[-5px]"></div>
                            </div>
                        )}
                    </div>
                </div>
            );
            break;
        case 'DIVINE_ROYAL':
            bgClass = 'bg-gradient-to-br from-[#fffef5] via-[#f9f1d4] to-[#f3e5b3]';
            borderClass = 'border-yellow-400 shadow-[0_0_30px_rgba(234,179,8,0.5),inset_0_0_10px_rgba(255,255,255,0.5)]';
            metallicReflect = "bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.4)_0%,transparent_70%)]";
            specialAnimation = "animate-divine-aura";
            patternContent = (
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] opacity-20"></div>
                    <div className="absolute inset-0 flex items-center justify-center opacity-40">
                        <div className="w-16 h-16 border-2 border-yellow-600/30 rounded-full animate-[spin_20s_linear_infinite]"></div>
                        <div className="absolute w-12 h-12 border border-yellow-600/20 rounded-full animate-[spin_15s_linear_infinite_reverse]"></div>
                    </div>
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div 
                            key={i}
                            className="absolute w-1 h-1 bg-yellow-500 rounded-full blur-[0.5px] animate-pulse"
                            style={{
                                top: `${Math.random() * 100}%`,
                                left: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 2}s`
                            }}
                        />
                    ))}
                </div>
            );
            break;
        case 'RED':
            bgClass = 'bg-gradient-to-br from-red-600 via-red-800 to-red-950';
            borderClass = 'border-red-400/40';
            break;
        case 'PATTERN':
            bgClass = 'bg-[#1a1a1a]';
            borderClass = 'border-yellow-500/40';
            patternContent = (
                <div className="absolute inset-0 opacity-30" 
                     style={{ 
                       backgroundImage: 'radial-gradient(circle, #fbbf24 1px, transparent 1px)', 
                       backgroundSize: '10px 10px',
                       filter: 'drop-shadow(0 0 2px rgba(251, 191, 36, 0.5))'
                     }}>
                </div>
            );
            break;
        case 'GOLDEN_IMPERIAL':
            bgClass = 'bg-gradient-to-br from-[#3d280a] via-[#fbf5b7] to-[#8b6508]';
            borderClass = 'border-yellow-200/60 shadow-[0_0_20px_rgba(234,179,8,0.4)]';
            metallicReflect = "bg-gradient-to-tr from-transparent via-white/60 to-transparent";
            patternContent = (
                <div className="absolute inset-0 opacity-40 mix-blend-overlay"
                     style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 0, transparent 50%)', backgroundSize: '4px 4px' }}>
                </div>
            );
            break;
        case 'VOID_ONYX':
            bgClass = 'bg-zinc-950';
            borderClass = 'border-indigo-500/50 shadow-[inset_0_0_15px_rgba(99,102,241,0.5)]';
            metallicReflect = "bg-gradient-to-tr from-transparent via-indigo-400/40 to-transparent";
            patternContent = (
                <div className="absolute inset-0 opacity-20"
                     style={{ backgroundImage: 'linear-gradient(30deg, #6366f1 12%, transparent 12.5%, transparent 87%, #6366f1 87.5%, #6366f1), linear-gradient(150deg, #6366f1 12%, transparent 12.5%, transparent 87%, #6366f1 87.5%, #6366f1), linear-gradient(30deg, #6366f1 12%, transparent 12.5%, transparent 87%, #6366f1 87.5%, #6366f1), linear-gradient(150deg, #6366f1 12%, transparent 12.5%, transparent 87%, #6366f1 87.5%, #6366f1), linear-gradient(60deg, #6366f177 25%, transparent 25.5%, transparent 75%, #6366f177 75%, #6366f177), linear-gradient(60deg, #6366f177 25%, transparent 25.5%, transparent 75%, #6366f177 75%, #6366f177)', backgroundSize: '20px 35px' }}>
                </div>
            );
            break;
        case 'ROYAL_JADE':
            bgClass = 'bg-gradient-to-br from-emerald-900 via-green-700 to-emerald-950';
            borderClass = 'border-yellow-600/50';
            patternContent = (
                <div className="absolute inset-2 border-2 border-yellow-500/20 rounded-lg pointer-events-none overflow-hidden">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-yellow-500/40"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-yellow-500/40 rotate-180"></div>
                    <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/marble.png')]"></div>
                </div>
            );
            break;
        case 'CRYSTAL_EMERALD':
            bgClass = 'bg-gradient-to-br from-green-400 via-emerald-600 to-green-900';
            borderClass = 'border-green-200/50';
            metallicReflect = "bg-gradient-to-tr from-transparent via-white/40 to-transparent";
            patternContent = (
                <div className="absolute inset-0 opacity-30" 
                     style={{ 
                       backgroundImage: 'linear-gradient(45deg, transparent 48%, #fff 50%, transparent 52%)', 
                       backgroundSize: '15px 15px'
                     }}>
                </div>
            );
            break;
        case 'DRAGON_SCALE':
            bgClass = 'bg-gradient-to-br from-red-900 via-orange-800 to-amber-900';
            borderClass = 'border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.3)]';
            patternContent = (
                <div className="absolute inset-0 opacity-40" 
                     style={{ 
                       backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0l10 10L20 0v20L10 10 0 20z\' fill=\'%23000\' fill-opacity=\'0.1\' fill-rule=\'evenodd\'%3E%3C/path%3E%3C/svg%3E")',
                       backgroundSize: '12px 12px'
                     }}>
                </div>
            );
            break;
        case 'NEON_CYBER':
            bgClass = 'bg-[#050505]';
            borderClass = 'border-cyan-500 shadow-[0_0_10px_#06b6d4,inset_0_0_10px_#d946ef]';
            metallicReflect = "bg-gradient-to-tr from-transparent via-cyan-400/20 to-transparent";
            patternContent = (
                <div className="absolute inset-0 opacity-50" 
                     style={{ 
                       backgroundImage: 'linear-gradient(#d946ef 1px, transparent 1px), linear-gradient(90deg, #06b6d4 1px, transparent 1px)', 
                       backgroundSize: '20px 20px',
                       filter: 'blur(0.5px)'
                     }}>
                </div>
            );
            break;
        case 'PIXEL_CITY_LIGHTS':
            bgClass = 'bg-[#0a0a1a]';
            borderClass = 'border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.4)]';
            metallicReflect = "bg-gradient-to-tr from-transparent via-cyan-300/10 to-transparent";
            patternContent = (
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute inset-0 opacity-[0.08]" 
                         style={{ 
                           backgroundImage: 'linear-gradient(rgba(59, 130, 246, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.2) 1px, transparent 1px)',
                           backgroundSize: '6px 6px' 
                         }}></div>
                    {Array.from({ length: 14 }).map((_, i) => (
                        <div 
                            key={i}
                            className="absolute w-1 h-1 rounded-sm animate-pulse"
                            style={{
                                top: `${Math.floor(Math.random() * 20) * 5}%`,
                                left: `${Math.floor(Math.random() * 20) * 5}%`,
                                backgroundColor: i % 3 === 0 ? '#facc15' : i % 3 === 1 ? '#22d3ee' : '#d946ef',
                                boxShadow: `0 0 6px ${i % 3 === 0 ? '#facc15' : i % 3 === 1 ? '#22d3ee' : '#d946ef'}`,
                                opacity: Math.random() * 0.6 + 0.2,
                                animationDelay: `${Math.random() * 3}s`,
                                animationDuration: `${2 + Math.random() * 3}s`
                            }}
                        />
                    ))}
                </div>
            );
            break;
        case 'AMETHYST_ROYAL':
            bgClass = 'bg-gradient-to-br from-violet-900 via-purple-800 to-indigo-950';
            borderClass = 'border-purple-300/40 shadow-[0_0_15px_rgba(168,85,247,0.4)]';
            metallicReflect = "bg-gradient-to-tr from-transparent via-purple-200/30 to-transparent";
            patternContent = (
                <div className="absolute inset-0 opacity-30 mix-blend-screen"
                     style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/gray-floral.png")', backgroundSize: '150px' }}>
                </div>
            );
            break;
        case 'CHERRY_BLOSSOM_NOIR':
            bgClass = 'bg-[#0a0a1a]';
            borderClass = 'border-pink-500/50 shadow-[0_0_15px_rgba(236,72,153,0.3)]';
            metallicReflect = "bg-gradient-to-tr from-transparent via-pink-300/10 to-transparent";
            patternContent = (
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute inset-0 opacity-[0.15] bg-[url('https://www.transparenttextures.com/patterns/padded-cells.png')]"></div>
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div 
                            key={i}
                            className="absolute w-2 h-2 bg-pink-400/60 blur-[0.5px] rounded-full animate-pulse"
                            style={{
                                top: `${20 + i * 10}%`,
                                left: `${(i * 13) % 100}%`,
                                opacity: 0.4,
                                transform: `rotate(${i * 45}deg)`,
                                animationDelay: `${i * 0.5}s`,
                            }}
                        />
                    ))}
                </div>
            );
            break;
        case 'AETHER_VOID':
            bgClass = 'bg-[#050505]';
            borderClass = 'border-[#facc15] shadow-[0_0_25px_rgba(250,204,21,0.6),inset_0_0_15px_rgba(255,255,255,0.2)]';
            metallicReflect = "bg-gradient-to-tr from-transparent via-white/40 to-transparent";
            patternContent = (
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/60"></div>
                    {Array.from({ length: 12 }).map((_, i) => (
                        <div 
                            key={i}
                            className="absolute bg-white/20 blur-[2px] transform rotate-45 animate-pulse"
                            style={{
                                top: `${Math.random() * 100}%`,
                                left: `${Math.random() * 100}%`,
                                width: `${2 + Math.random() * 8}px`,
                                height: `${10 + Math.random() * 30}px`,
                                animationDelay: `${Math.random() * 2}s`,
                                animationDuration: `${3 + Math.random() * 4}s`
                            }}
                        />
                    ))}
                    <div className="absolute inset-0 flex items-center justify-center opacity-30">
                        <div className="w-12 h-12 rounded-full border-2 border-white/40 animate-[spin_10s_linear_infinite]"></div>
                        <div className="absolute w-8 h-8 rounded-full border border-yellow-400/40 animate-[spin_6s_linear_infinite_reverse]"></div>
                    </div>
                </div>
            );
            break;
        case 'BLUE':
        default:
            bgClass = 'bg-gradient-to-br from-indigo-600 via-blue-800 to-slate-900';
            borderClass = 'border-blue-400/40';
            break;
    }

    return (
        <div
            className={`
            relative rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] border-2 ${bgClass} ${borderClass}
            ${small ? 'w-10 h-14' : 'w-20 h-28 sm:w-24 sm:h-36'}
            flex items-center justify-center overflow-hidden transition-all duration-200 transform-gpu
            hover:scale-110 hover:-translate-y-2 hover:rotate-1 group
            ${specialAnimation}
            ${className}
            `}
        >
            <div className="absolute inset-1 border border-white/10 rounded-lg pointer-events-none"></div>
            <div className="w-[88%] h-[88%] border border-white/5 rounded-lg flex items-center justify-center overflow-hidden relative">
                {patternContent}
                <div className={`absolute inset-0 ${metallicReflect} ${coverStyle === 'DIVINE_ROYAL' || coverStyle === 'EMPERORS_HUBRIS' || coverStyle === 'WITS_END' ? '' : '-translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out'}`}></div>
                <div className="w-8 h-12 bg-white/5 rounded-full blur-xl transform rotate-45 group-hover:bg-white/10 transition-colors"></div>
            </div>
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes divineAura {
                    0% { transform: translateY(0); filter: drop-shadow(0 10px 20px rgba(234,179,8,0.3)); }
                    50% { transform: translateY(-5px); filter: drop-shadow(0 25px 40px rgba(234,179,8,0.5)); }
                    100% { transform: translateY(0); filter: drop-shadow(0 10px 20px rgba(234,179,8,0.3)); }
                }
                @keyframes etherealPulse {
                    0% { transform: translateY(0) scale(1); filter: drop-shadow(0 5px 15px rgba(168,85,247,0.4)); }
                    50% { transform: translateY(-3px) scale(1.02); filter: drop-shadow(0 20px 35px rgba(147,51,234,0.6)); }
                    100% { transform: translateY(0) scale(1); filter: drop-shadow(0 5px 15px rgba(168,85,247,0.4)); }
                }
                @keyframes smokePuff {
                    0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
                    50% { opacity: 0.6; }
                    100% { transform: translate(-80%, -150%) scale(2.5); opacity: 0; }
                }
                @keyframes etherealFloat {
                    0% { transform: translate(-50%, -50%) translate(0, 0) scale(1); opacity: 0; }
                    50% { opacity: 0.5; }
                    100% { transform: translate(-50%, -50%) translate(var(--ex, 10px), var(--ey, -30px)) scale(2); opacity: 0; }
                }
                @keyframes sovereign-glint {
                  0% { transform: translateX(-150%) skewX(-15deg); }
                  100% { transform: translateX(150%) skewX(-15deg); }
                }
                .animate-divine-aura { animation: divineAura 4s ease-in-out infinite; }
                .animate-ethereal-pulse { animation: etherealPulse 5s ease-in-out infinite; }
                .animate-smoke-puff { animation: smokePuff 1.5s ease-out infinite; }
                .animate-ethereal-float { 
                    animation: etherealFloat 2s ease-out infinite;
                    --ex: ${Math.random() * 40 - 20}px;
                    --ey: ${-Math.random() * 40 - 20}px;
                }
            `}} />
        </div>
    );
  }

  if (!card) return null;

  const rankLabel = getRankLabel(card.rank);
  const suitSymbol = getSuitSymbol(card.suit);
  const isHighValue = card.rank === Rank.Two;

  /* Explicitly cast coverStyle to CardCoverStyle to resolve type widening issues */
  const { bg, border, textColor, symbolColor, innerGlow, fontClass } = getFaceTheming(coverStyle as CardCoverStyle, card.suit, disableEffects);

  return (
    <div
      onClick={onClick}
      className={`
        relative ${bg} border ${border} rounded-xl select-none cursor-pointer transform-gpu
        ${small ? 'w-10 h-14 text-xs' : 'w-20 h-28 sm:w-24 sm:h-36 text-base'}
        ${selected 
          ? '-translate-y-16 shadow-[0_40px_80px_rgba(0,0,0,0.7)] ring-4 ring-yellow-400 z-40 scale-[1.05]' 
          : 'shadow-[0_8px_20px_rgba(0,0,0,0.3)] hover:-translate-y-6 hover:rotate-2 hover:shadow-[0_25px_50px_rgba(0,0,0,0.45)] hover:z-30'}
        ${innerGlow}
        ${((coverStyle === 'DIVINE_ROYAL' || coverStyle === 'EMPERORS_HUBRIS' || coverStyle === 'WITS_END')) && !disableEffects ? (coverStyle === 'WITS_END' ? 'animate-ethereal-pulse' : 'animate-divine-aura') : ''}
        ${className}
        transition-all duration-200 ease-out
        group
      `}
    >
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/10 via-transparent to-black/20 pointer-events-none"></div>
      <div className={`absolute top-1.5 left-1.5 flex flex-col items-center leading-none ${textColor} ${small ? 'text-[10px]' : 'text-xl'} ${fontClass}`}>
        <div className="tracking-tighter drop-shadow-sm">{rankLabel}</div>
        <div className={`${small ? 'text-[8px]' : 'text-[0.7em]'} mt-0.5`}>{suitSymbol}</div>
      </div>
      <div className={`absolute bottom-1.5 right-1.5 rotate-180 flex flex-col items-center leading-none ${textColor} ${small ? 'text-[10px]' : 'text-xl'} ${fontClass}`}>
        <div className="tracking-tighter drop-shadow-sm">{rankLabel}</div>
        <div className={`${small ? 'text-[8px]' : 'text-[0.7em]'} mt-0.5`}>{suitSymbol}</div>
      </div>
      <div className={`absolute inset-0 flex items-center justify-center pointer-events-none ${symbolColor}`}>
        <div className={`
          ${small ? 'text-xl' : 'text-5xl'} 
          ${isHighValue ? 'drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] scale-110' : 'opacity-90'} 
          transition-transform duration-300 group-hover:scale-125
        `}>
          {suitSymbol}
        </div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 rounded-xl pointer-events-none transition-opacity duration-300"></div>
      {selected && (
        <div className="absolute inset-[-10px] rounded-[1.5rem] bg-yellow-400/20 blur-xl animate-pulse pointer-events-none z-[-1]"></div>
      )}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/cardboard.png')] rounded-xl"></div>
    </div>
  );
};