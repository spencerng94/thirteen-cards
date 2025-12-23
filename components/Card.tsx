
import React from 'react';
import { Card as CardType, Suit, Rank } from '../types';

export type CardCoverStyle = 'BLUE' | 'RED' | 'PATTERN' | 'GOLDEN_IMPERIAL' | 'VOID_ONYX' | 'ROYAL_JADE' | 'CRYSTAL_EMERALD' | 'DRAGON_SCALE' | 'NEON_CYBER' | 'PIXEL_CITY_LIGHTS' | 'AMETHYST_ROYAL' | 'CHERRY_BLOSSOM_NOIR';

interface CardProps {
  card?: CardType; // Optional because faceDown cards might not need data
  selected?: boolean;
  onClick?: () => void;
  className?: string;
  small?: boolean;
  faceDown?: boolean;
  coverStyle?: CardCoverStyle;
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

const getSuitColor = (suit: Suit): string => {
  return (suit === Suit.Hearts || suit === Suit.Diamonds) ? 'text-rose-600' : 'text-slate-900';
};

export const Card: React.FC<CardProps> = ({ 
  card, 
  selected, 
  onClick, 
  className = '', 
  small = false, 
  faceDown = false,
  coverStyle = 'BLUE' 
}) => {
  
  if (faceDown) {
    let bgClass = '';
    let borderClass = 'border-white/20';
    let patternContent = null;
    let metallicReflect = "bg-gradient-to-tr from-white/0 via-white/10 to-white/0";

    switch (coverStyle) {
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
                    {/* Scattered Pixel Lights */}
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
            bgClass = 'bg-[#0a0a0a]';
            borderClass = 'border-pink-500/50 shadow-[0_0_15px_rgba(236,72,153,0.3)]';
            metallicReflect = "bg-gradient-to-tr from-transparent via-pink-300/10 to-transparent";
            patternContent = (
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute inset-0 opacity-[0.15] bg-[url('https://www.transparenttextures.com/patterns/padded-cells.png')]"></div>
                    {/* Floating Sakura Petals */}
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
            ${className}
            `}
        >
            <div className="absolute inset-1 border border-white/10 rounded-lg pointer-events-none"></div>
            <div className="w-[88%] h-[88%] border border-white/5 rounded-lg flex items-center justify-center overflow-hidden relative">
                {patternContent}
                <div className={`absolute inset-0 ${metallicReflect} -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out`}></div>
                <div className="w-8 h-12 bg-white/5 rounded-full blur-xl transform rotate-45 group-hover:bg-white/10 transition-colors"></div>
            </div>
        </div>
    );
  }

  if (!card) return null;

  const rankLabel = getRankLabel(card.rank);
  const suitSymbol = getSuitSymbol(card.suit);
  const colorClass = getSuitColor(card.suit);
  const isHighValue = card.rank === Rank.Two;

  return (
    <div
      onClick={onClick}
      className={`
        relative bg-[#fafafa] border border-gray-200/80 rounded-xl select-none cursor-pointer transform-gpu
        ${small ? 'w-10 h-14 text-xs' : 'w-20 h-28 sm:w-24 sm:h-36 text-base'}
        ${selected 
          ? '-translate-y-12 shadow-[0_40px_80px_rgba(0,0,0,0.7)] ring-4 ring-yellow-400 z-40 scale-125' 
          : 'shadow-[0_8px_20px_rgba(0,0,0,0.3)] hover:-translate-y-6 hover:rotate-2 hover:shadow-[0_25px_50px_rgba(0,0,0,0.45)] hover:z-30'}
        ${className}
        transition-all duration-200 ease-out
        group
      `}
    >
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/90 via-transparent to-black/10 pointer-events-none"></div>
      <div className={`absolute top-1.5 left-1.5 font-black flex flex-col items-center leading-none ${colorClass} ${small ? 'text-[10px]' : 'text-xl'}`}>
        <div className="tracking-tighter drop-shadow-sm">{rankLabel}</div>
        <div className={`${small ? 'text-[8px]' : 'text-[0.7em]'} mt-0.5`}>{suitSymbol}</div>
      </div>
      <div className={`absolute bottom-1.5 right-1.5 font-black rotate-180 flex flex-col items-center leading-none ${colorClass} ${small ? 'text-[10px]' : 'text-xl'}`}>
        <div className="tracking-tighter drop-shadow-sm">{rankLabel}</div>
        <div className={`${small ? 'text-[8px]' : 'text-[0.7em]'} mt-0.5`}>{suitSymbol}</div>
      </div>
      <div className={`absolute inset-0 flex items-center justify-center pointer-events-none ${colorClass}`}>
        <div className={`
          ${small ? 'text-xl' : 'text-5xl'} 
          ${isHighValue ? 'drop-shadow-[0_0_15px_rgba(0,0,0,0.25)] scale-110' : 'opacity-90'} 
          transition-transform duration-300 group-hover:scale-125
        `}>
          {suitSymbol}
        </div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 rounded-xl pointer-events-none transition-opacity duration-300"></div>
      {selected && (
        <div className="absolute inset-[-10px] rounded-[1.5rem] bg-yellow-400/20 blur-xl animate-pulse pointer-events-none z-[-1]"></div>
      )}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/cardboard.png')] rounded-xl"></div>
    </div>
  );
};
