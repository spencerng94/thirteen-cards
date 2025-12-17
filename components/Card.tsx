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
  return (suit === Suit.Hearts || suit === Suit.Diamonds) ? 'text-red-600' : 'text-black';
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

    switch (coverStyle) {
        case 'RED':
            bgClass = 'bg-gradient-to-br from-red-700 to-red-900';
            borderClass = 'border-red-300/30';
            break;
        case 'PATTERN':
            bgClass = 'bg-gray-900';
            borderClass = 'border-yellow-600/50';
            patternContent = (
                <div className="absolute inset-0 opacity-20" 
                     style={{ backgroundImage: 'radial-gradient(circle, #fbbf24 1px, transparent 1px)', backgroundSize: '8px 8px' }}>
                </div>
            );
            break;
        case 'BLUE':
        default:
            bgClass = 'bg-gradient-to-br from-blue-700 to-blue-900';
            borderClass = 'border-blue-300/30';
            break;
    }

    return (
        <div
            className={`
            relative rounded-xl shadow-lg border-2 ${bgClass} ${borderClass}
            ${small ? 'w-10 h-14' : 'w-20 h-28 sm:w-24 sm:h-36'}
            flex items-center justify-center
            ${className}
            `}
        >
            {/* Inner Design */}
            <div className="w-[85%] h-[85%] border border-white/20 rounded-lg flex items-center justify-center overflow-hidden relative">
                {patternContent}
                <div className="w-8 h-12 bg-white/10 rounded-full blur-xl transform rotate-45"></div>
            </div>
        </div>
    );
  }

  // -- Face Up Render --
  if (!card) return null;

  const rankLabel = getRankLabel(card.rank);
  const suitSymbol = getSuitSymbol(card.suit);
  const colorClass = getSuitColor(card.suit);

  return (
    <div
      onClick={onClick}
      className={`
        relative bg-white border border-gray-200 rounded-xl select-none cursor-pointer transition-all duration-200
        ${small ? 'w-10 h-14 text-xs shadow-sm' : 'w-20 h-28 sm:w-24 sm:h-36 text-base shadow-xl'}
        ${selected ? '-translate-y-6 shadow-2xl ring-4 ring-yellow-400 z-10' : 'hover:-translate-y-2 hover:shadow-2xl'}
        ${className}
      `}
    >
      {/* Top Left */}
      <div className={`absolute top-0.5 left-0.5 font-bold flex flex-col items-center ${colorClass} ${small ? 'text-[10px]' : 'text-lg'}`}>
        <div className="leading-none tracking-tighter">{rankLabel}</div>
        <div className="leading-none text-[0.8em]">{suitSymbol}</div>
      </div>
      
      {/* Bottom Right */}
      <div className={`absolute bottom-0.5 right-0.5 font-bold rotate-180 flex flex-col items-center ${colorClass} ${small ? 'text-[10px]' : 'text-lg'}`}>
        <div className="leading-none tracking-tighter">{rankLabel}</div>
        <div className="leading-none text-[0.8em]">{suitSymbol}</div>
      </div>

      {/* Center Art */}
      <div className={`absolute inset-0 flex items-center justify-center ${colorClass} ${small ? 'text-xl' : 'text-5xl'}`}>
        {suitSymbol}
      </div>
      
      {/* Shine Effect */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 hover:opacity-100 rounded-xl pointer-events-none transition-opacity"></div>
    </div>
  );
};