
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
            flex items-center justify-center overflow-hidden transition-all duration-300 transform-gpu
            hover:scale-105 hover:-translate-y-1 group
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
        relative bg-[#fafafa] border border-gray-200/80 rounded-xl select-none cursor-pointer transition-all duration-300 transform-gpu
        ${small ? 'w-10 h-14 text-xs' : 'w-20 h-28 sm:w-24 sm:h-36 text-base'}
        ${selected 
          ? '-translate-y-10 shadow-[0_30px_60px_rgba(0,0,0,0.6)] ring-4 ring-yellow-400/90 z-20 scale-110' 
          : 'shadow-[0_8px_20px_rgba(0,0,0,0.3)] hover:-translate-y-4 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] hover:z-10'}
        ${className}
        group
      `}
    >
      {/* 3D Depth Highlight */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/80 via-transparent to-black/5 pointer-events-none"></div>
      
      {/* Top Left Corner */}
      <div className={`absolute top-1 left-1 font-black flex flex-col items-center leading-none ${colorClass} ${small ? 'text-[10px]' : 'text-xl'}`}>
        <div className="tracking-tighter drop-shadow-sm">{rankLabel}</div>
        <div className={`${small ? 'text-[8px]' : 'text-[0.7em]'} mt-0.5`}>{suitSymbol}</div>
      </div>
      
      {/* Bottom Right Corner (Inverted) */}
      <div className={`absolute bottom-1 right-1 font-black rotate-180 flex flex-col items-center leading-none ${colorClass} ${small ? 'text-[10px]' : 'text-xl'}`}>
        <div className="tracking-tighter drop-shadow-sm">{rankLabel}</div>
        <div className={`${small ? 'text-[8px]' : 'text-[0.7em]'} mt-0.5`}>{suitSymbol}</div>
      </div>

      {/* Center Art - Enhanced with glow for high value cards */}
      <div className={`absolute inset-0 flex items-center justify-center pointer-events-none ${colorClass}`}>
        <div className={`
          ${small ? 'text-xl' : 'text-5xl'} 
          ${isHighValue ? 'drop-shadow-[0_0_12px_rgba(0,0,0,0.2)] scale-110' : 'opacity-90'} 
          transition-transform duration-500 group-hover:scale-125
        `}>
          {suitSymbol}
        </div>
      </div>
      
      {/* Premium Glossy Overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 rounded-xl pointer-events-none transition-opacity duration-500"></div>

      {/* Selected Indicator Glow */}
      {selected && (
        <div className="absolute inset-0 rounded-xl bg-yellow-400/10 animate-pulse pointer-events-none"></div>
      )}
      
      {/* Subtle Scratch/Texture overlay for "used" luxury feel */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay bg-[url('https://www.transparenttextures.com/patterns/cardboard.png')] rounded-xl"></div>
    </div>
  );
};
