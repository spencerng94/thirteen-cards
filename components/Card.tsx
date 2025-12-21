import React from 'react';
import { Card as CardType, Suit, Rank } from '../types';

export type CardCoverStyle = 'BLUE' | 'RED' | 'PATTERN';

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
  
  // -- Face Down Render --
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
            flex items-center justify-center overflow-hidden transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) transform-gpu
            hover:scale-110 hover:-translate-y-2 hover:rotate-1 group
            animate-[card-pop_0.4s_ease-out]
            ${className}
            `}
        >
            {/* Inner Metallic Border */}
            <div className="absolute inset-1 border border-white/10 rounded-lg pointer-events-none"></div>
            
            {/* Pattern/Texture */}
            <div className="w-[88%] h-[88%] border border-white/5 rounded-lg flex items-center justify-center overflow-hidden relative">
                {patternContent}
                {/* Metallic Shimmer Beam */}
                <div className={`absolute inset-0 ${metallicReflect} -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out`}></div>
                
                {/* Logo/Icon in center of back */}
                <div className="w-8 h-12 bg-white/5 rounded-full blur-xl transform rotate-45 group-hover:bg-white/10 transition-colors"></div>
            </div>
        </div>
    );
  }

  // -- Face Up Render --
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
        transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1)
        animate-[card-pop_0.5s_cubic-bezier(0.34,1.56,0.64,1)]
        group
      `}
    >
      {/* 3D Depth Highlight */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/90 via-transparent to-black/10 pointer-events-none"></div>
      
      {/* Top Left Corner */}
      <div className={`absolute top-1.5 left-1.5 font-black flex flex-col items-center leading-none ${colorClass} ${small ? 'text-[10px]' : 'text-xl'}`}>
        <div className="tracking-tighter drop-shadow-sm">{rankLabel}</div>
        <div className={`${small ? 'text-[8px]' : 'text-[0.7em]'} mt-0.5`}>{suitSymbol}</div>
      </div>
      
      {/* Bottom Right Corner (Inverted) */}
      <div className={`absolute bottom-1.5 right-1.5 font-black rotate-180 flex flex-col items-center leading-none ${colorClass} ${small ? 'text-[10px]' : 'text-xl'}`}>
        <div className="tracking-tighter drop-shadow-sm">{rankLabel}</div>
        <div className={`${small ? 'text-[8px]' : 'text-[0.7em]'} mt-0.5`}>{suitSymbol}</div>
      </div>

      {/* Center Art - Enhanced with glow for high value cards */}
      <div className={`absolute inset-0 flex items-center justify-center pointer-events-none ${colorClass}`}>
        <div className={`
          ${small ? 'text-xl' : 'text-5xl'} 
          ${isHighValue ? 'drop-shadow-[0_0_15px_rgba(0,0,0,0.25)] scale-110' : 'opacity-90'} 
          transition-transform duration-700 group-hover:scale-125
        `}>
          {suitSymbol}
        </div>
      </div>
      
      {/* Premium Glossy Overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 rounded-xl pointer-events-none transition-opacity duration-700"></div>

      {/* Selected Indicator Glow */}
      {selected && (
        <div className="absolute inset-[-10px] rounded-[1.5rem] bg-yellow-400/20 blur-xl animate-pulse pointer-events-none z-[-1]"></div>
      )}
      
      {/* Subtle Scratch/Texture overlay for "used" luxury feel */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/cardboard.png')] rounded-xl"></div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes card-pop {
          0% { opacity: 0; transform: scale(0.6) translateY(40px) rotate(-5deg); filter: blur(4px); }
          100% { opacity: 1; transform: scale(1) translateY(0) rotate(0deg); filter: blur(0); }
        }
        .cubic-bezier {
            transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}} />
    </div>
  );
};
