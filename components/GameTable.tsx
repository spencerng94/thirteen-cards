import React, { useState, useEffect } from 'react';
import { Card as CardType, GameState, Player, Suit, Rank, PlayTurn } from '../types';
import { Card, CardCoverStyle } from './Card';
import { InstructionsModal } from './InstructionsModal';
import { SettingsModal } from './SettingsModal';

interface GameTableProps {
  gameState: GameState;
  myId: string;
  myHand: CardType[];
  onPlayCards: (cards: CardType[]) => void;
  onPassTurn: () => void;
  cardCoverStyle: CardCoverStyle;
  onChangeCoverStyle: (style: CardCoverStyle) => void;
  onExitGame: () => void;
}

export const GameTable: React.FC<GameTableProps> = ({ 
  gameState, 
  myId, 
  myHand, 
  onPlayCards, 
  onPassTurn,
  cardCoverStyle,
  onChangeCoverStyle,
  onExitGame
}) => {
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const [showHistory, setShowHistory] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [bombEffect, setBombEffect] = useState<string | null>(null);

  // Derived State: The active move to beat
  const lastPlayedMove = gameState.currentPlayPile.length > 0 
    ? gameState.currentPlayPile[gameState.currentPlayPile.length - 1] 
    : null;

  // Bomb Effect Detector
  useEffect(() => {
    if (lastPlayedMove) {
      if (['QUAD', '3_PAIRS', '4_PAIRS'].includes(lastPlayedMove.comboType)) {
        setBombEffect("BOMB!");
        const timer = setTimeout(() => setBombEffect(null), 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [lastPlayedMove]);

  // Sort hand for display
  const sortedHand = [...myHand].sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    return a.suit - b.suit;
  });

  const toggleSelectCard = (id: string) => {
    const newSelected = new Set(selectedCardIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedCardIds(newSelected);
  };

  const playSelectedCards = () => {
    const cardsToPlay = sortedHand.filter(c => selectedCardIds.has(c.id));
    if (cardsToPlay.length === 0) return;
    onPlayCards(cardsToPlay);
    setSelectedCardIds(new Set()); // Reset selection
  };

  const getPlayerPosition = (index: number, totalPlayers: number, myIndex: number) => {
    const relativeIndex = (index - myIndex + totalPlayers) % totalPlayers;
    switch(relativeIndex) {
      case 0: return 'bottom';
      case 1: return 'left';
      case 2: return totalPlayers === 3 ? 'right' : 'top';
      case 3: return 'right';
      default: return 'unknown';
    }
  };

  // Determine dynamic spacing class based on hand size to avoid bunching or overflow
  const getHandSpacingClass = (count: number) => {
    // Mobile logic (Tailwind defaults)
    if (count <= 3) return 'space-x-2 md:space-x-4';
    if (count <= 5) return '-space-x-2 md:-space-x-4';
    if (count <= 8) return '-space-x-8 md:-space-x-10';
    if (count <= 10) return '-space-x-10 md:-space-x-12';
    // Very tight for full hands on mobile
    return '-space-x-[55px] md:-space-x-14';
  };

  const myIndex = gameState.players.findIndex(p => p.id === myId);
  const isMyTurn = gameState.currentPlayerId === myId;

  // --- History Modal Component ---
  const HistoryModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowHistory(false)}>
      <div className="bg-gray-900 border-2 border-yellow-600/30 w-full max-w-md max-h-[80vh] rounded-2xl overflow-hidden shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-800">
          <h3 className="text-yellow-400 font-bold text-lg tracking-wider">ROUND HISTORY</h3>
          <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-white">✕</button>
        </div>
        <div className="overflow-y-auto p-4 space-y-4 bg-gray-900/95 scrollbar-thin">
          {gameState.currentPlayPile.length === 0 ? (
            <div className="text-gray-500 text-center italic py-8">No moves yet in this round.</div>
          ) : (
            gameState.currentPlayPile.map((turn, idx) => {
              const playerName = gameState.players.find(p => p.id === turn.playerId)?.name || 'Unknown';
              return (
                <div key={idx} className="flex flex-col gap-1 border-b border-gray-800 pb-2 last:border-0">
                   <div className="flex justify-between text-xs text-gray-400 font-bold">
                     <span>{idx + 1}. {playerName}</span>
                     <span className="uppercase text-yellow-600">{turn.comboType.replace('_', ' ')}</span>
                   </div>
                   <div className="flex gap-1 overflow-x-auto pb-1">
                      {turn.cards.map(c => (
                        <Card key={c.id} card={c} small className="!w-8 !h-12 text-[8px]" />
                      ))}
                   </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-900 via-green-950 to-black overflow-hidden font-sans select-none flex flex-col justify-between">
      
      {/* --- Top Left: Premium Logo --- */}
      <div className="absolute top-4 left-4 z-40 pointer-events-none hidden lg:block">
        <div className="flex flex-col">
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-yellow-500 to-yellow-700 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] tracking-tighter">
                Tiến Lên
            </h1>
            <span className="text-[10px] text-yellow-500/80 font-bold tracking-[0.3em] uppercase ml-1">
                The Killer 13
            </span>
        </div>
      </div>

      {/* --- Top Right: Controls --- 
          Mobile Portrait: Stacked (Reverse)
          Mobile Landscape: Row
          Desktop: Row
      */}
      <div className="absolute top-2 right-2 z-50 flex flex-col-reverse sm:flex-row landscape:flex-row gap-2 items-end sm:items-center landscape:items-center">
          {/* Instructions Button */}
          <button 
            onClick={() => setShowInstructions(true)}
            className="w-10 h-10 md:w-8 md:h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/20 text-yellow-400 font-serif font-bold text-lg flex items-center justify-center transition-all shadow-lg backdrop-blur-md"
            title="How to Play"
          >
            ?
          </button>
          
          {/* Settings Button */}
          <button 
            onClick={() => setShowSettings(true)}
            className="w-10 h-10 md:w-8 md:h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/20 text-gray-300 hover:text-white flex items-center justify-center transition-all shadow-lg backdrop-blur-md"
            title="Settings"
          >
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 md:w-5 md:h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
             </svg>
          </button>
          
          {/* History Button */}
          <button 
            onClick={() => setShowHistory(true)}
            className="bg-white/5 hover:bg-white/10 text-gray-200 text-xs md:text-[10px] px-3 py-2 md:py-1 rounded-full border border-white/20 backdrop-blur-md flex items-center gap-2 transition-all shadow-lg font-bold tracking-wide"
          >
            <span className="hidden sm:inline">LOG</span>
            <span className="bg-yellow-500 text-black text-xs md:text-[10px] font-bold px-2 py-0.5 rounded-full">{gameState.currentPlayPile.length}</span>
          </button>
      </div>

      {showHistory && <HistoryModal />}
      {showInstructions && <InstructionsModal onClose={() => setShowInstructions(false)} />}
      {showSettings && (
        <SettingsModal 
            onClose={() => setShowSettings(false)} 
            onExitGame={onExitGame}
            currentCoverStyle={cardCoverStyle}
            onChangeCoverStyle={onChangeCoverStyle}
        />
      )}

      {/* --- Bomb Effect Overlay --- */}
      {bombEffect && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center pointer-events-none">
            <div className="animate-bounce">
                <h1 className="text-7xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-red-500 to-red-900 stroke-white drop-shadow-[0_5px_5px_rgba(0,0,0,1)] tracking-tighter transform rotate-[-5deg] scale-150 transition-all duration-75">
                    {bombEffect}
                </h1>
            </div>
            <div className="absolute inset-0 bg-red-500/20 mix-blend-overlay animate-pulse"></div>
        </div>
      )}

      {/* --- Table Center (Active Move Only) --- */}
      {/* Optimized: Moved to top-[45%] for portrait to center it better, kept 40% for landscape */}
      <div className="absolute top-[45%] md:top-[50%] landscape:top-[40%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 landscape:translate-y-[-50%] w-64 h-32 md:w-full md:max-w-lg md:h-64 flex items-center justify-center pointer-events-none z-10">
         {!lastPlayedMove ? (
            <div className="text-white/10 font-bold text-xl uppercase tracking-[0.2em] pl-[0.2em] border-2 md:border-4 border-dashed border-white/5 rounded-full w-40 h-40 md:w-48 md:h-48 landscape:w-32 landscape:h-32 flex items-center justify-center animate-pulse text-center">
               {isMyTurn ? "Your Lead" : "Waiting"}
            </div>
         ) : (
            <div className="relative scale-90 md:scale-100 landscape:scale-75 lg:landscape:scale-100">
                 {/* The Actual Cards to Beat */}
                 <div className="relative z-10 filter drop-shadow-[0_20px_25px_rgba(0,0,0,0.6)]">
                    {lastPlayedMove.cards.map((card, idx) => (
                        <div
                            key={card.id}
                            className="absolute transition-transform duration-300"
                            style={{
                                transform: `translateX(${(idx - (lastPlayedMove.cards.length - 1) / 2) * 35}px) rotate(${(idx - (lastPlayedMove.cards.length - 1) / 2) * 6}deg)`,
                                left: '-40px', // Exactly half of w-20 (80px) to center the card origin
                                top: '-70px'
                            }}
                        >
                             <Card card={card} />
                        </div>
                    ))}
                 </div>
                 
                 {/* Badge for who played it */}
                 <div className="absolute top-24 left-1/2 -translate-x-1/2 pointer-events-auto">
                    <div className="bg-black/80 text-gray-300 text-[10px] uppercase px-4 py-1.5 rounded-full whitespace-nowrap border border-white/10 backdrop-blur-md shadow-lg font-bold tracking-widest flex items-center gap-2">
                        <span>By</span>
                        <span className="text-yellow-400 text-xs">{gameState.players.find(p => p.id === lastPlayedMove.playerId)?.name}</span>
                    </div>
                 </div>
            </div>
         )}
      </div>

      {/* --- Opponents --- */}
      {gameState.players.map((player, idx) => {
        if (player.id === myId) return null;
        const pos = getPlayerPosition(idx, gameState.players.length, myIndex);
        
        let positionClasses = "";
        let layoutClasses = "flex-row"; // Default layout

        if (pos === 'left') {
            // Mobile: stack vertically, hug left edge
            positionClasses = "absolute left-2 top-[40%] -translate-y-1/2 z-20";
            layoutClasses = "flex-col";
        }
        else if (pos === 'top') {
            // Top: horizontal, centered
            positionClasses = "absolute top-4 left-1/2 -translate-x-1/2 z-20";
            layoutClasses = "flex-row-reverse"; // Hand on right of avatar
        }
        else if (pos === 'right') {
            // Mobile: stack vertically, hug right edge
            positionClasses = "absolute right-2 top-[40%] -translate-y-1/2 z-20";
            layoutClasses = "flex-col";
        }

        return (
          <div key={player.id} className={`flex items-center gap-2 md:gap-3 landscape:scale-90 ${positionClasses} ${layoutClasses}`}>
             <div className={`
               flex flex-col items-center justify-center gap-1 p-2 md:p-3 rounded-xl backdrop-blur-md border transition-all duration-300 shadow-xl
               ${gameState.currentPlayerId === player.id ? 'bg-black/60 border-yellow-500/50 shadow-yellow-900/20 scale-105' : 'bg-black/30 border-white/5'}
               ${player.hasPassed ? 'opacity-60 grayscale' : ''}
               min-w-[80px] md:min-w-[100px]
             `}>
                <div className="relative">
                    {/* Avatar Circle */}
                    <div className="w-12 h-12 md:w-14 md:h-14 bg-black/40 rounded-full flex items-center justify-center text-2xl md:text-3xl border border-white/20 shadow-inner overflow-hidden">
                        {player.avatar || '😊'}
                    </div>
                </div>
                
                <div className="text-white font-bold text-xs md:text-sm tracking-wide max-w-[70px] md:max-w-[80px] truncate text-center">{player.name}</div>
                
                {player.hasPassed && (
                    <div className="px-1 py-0.5 bg-red-900/80 text-red-200 text-[8px] md:text-[10px] font-black uppercase rounded tracking-wider border border-red-500/30">
                        PASSED
                    </div>
                )}
             </div>
             
             {/* Simplified Opponent Hand Visual - Space Efficient */}
             <div className="relative">
                <div className="relative group">
                    {/* Visual stack hint for depth */}
                    {player.cardCount > 1 && (
                         <div className="absolute top-0.5 left-1 rotate-6 w-full h-full opacity-60">
                            <Card faceDown coverStyle={cardCoverStyle} small className="!w-8 !h-11 md:!w-10 md:!h-14 bg-black/50" />
                         </div>
                    )}
                    
                    {/* Main Card Icon */}
                    <Card 
                        faceDown 
                        coverStyle={cardCoverStyle} 
                        small 
                        className="!w-8 !h-11 md:!w-10 md:!h-14 shadow-lg ring-1 ring-white/10" 
                    />
                    
                    {/* Count Badge */}
                    <div className="absolute -bottom-2 -right-2 md:-bottom-3 md:-right-3 w-5 h-5 md:w-6 md:h-6 bg-yellow-500 text-black text-[10px] md:text-xs font-black rounded-full flex items-center justify-center border-2 border-gray-900 shadow-xl z-20">
                        {player.cardCount}
                    </div>
                </div>
             </div>
          </div>
        );
      })}

      {/* --- Me / Controls --- */}
      <div className="w-full z-30 mt-auto flex flex-col items-center gap-2 pb-2 bg-gradient-to-t from-black/80 to-transparent">
        
        {/* Controls Container: Portrait (Col), Landscape (Row) */}
        <div className="flex flex-col landscape:flex-row items-center gap-3 landscape:gap-4 landscape:w-full landscape:justify-center landscape:px-8 pointer-events-auto">

            {/* Status Text Pill (Order 1 in Portrait, Order 2 in Landscape) */}
            <div className={`
                order-1 landscape:order-2
                px-6 py-2 rounded-full font-bold tracking-widest text-xs md:text-[10px] uppercase shadow-lg transition-all duration-500 border border-white/5 backdrop-blur-md whitespace-nowrap
                ${isMyTurn ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50 animate-pulse' : 'bg-black/40 text-gray-500'}
            `}>
              {isMyTurn ? "It's Your Turn" : (gameState.players.find(p => p.id === gameState.currentPlayerId)?.hasPassed ? "Resolving..." : `Waiting for ${gameState.players.find(p => p.id === gameState.currentPlayerId)?.name}...`)}
            </div>

            {/* Action Buttons Wrapper - Use contents to flatten layout in Landscape */}
            <div className="order-2 landscape:contents flex gap-3 h-12 md:h-14">
              
               {/* Pass Button (Order 1 in Landscape) */}
               <button 
                 onClick={onPassTurn}
                 disabled={!isMyTurn || gameState.currentPlayPile.length === 0}
                 className="
                    landscape:order-1
                    relative overflow-hidden group px-6 md:px-8 py-3 landscape:py-2 rounded-xl font-bold uppercase tracking-wider text-xs md:text-xs transition-all duration-200
                    bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 hover:border-white/20 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]
                    disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:bg-white/5
                 "
               >
                 Pass
               </button>
               
               {/* Play Button (Order 3 in Landscape) */}
               <button 
                 onClick={playSelectedCards}
                 disabled={!isMyTurn || selectedCardIds.size === 0}
                 className="
                    landscape:order-3
                    relative overflow-hidden group px-8 md:px-12 py-3 landscape:py-2 rounded-xl font-black uppercase tracking-wider text-xs md:text-sm transition-all duration-200
                    text-black
                    bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-600
                    hover:shadow-[0_0_30px_rgba(234,179,8,0.4)] hover:scale-105 active:scale-95
                    disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:scale-100
                 "
               >
                 Play
               </button>
            </div>
        </div>

        {/* My Hand - Scaled down in Landscape to save space, Dynamic spacing applied */}
        <div className="w-full flex justify-center pb-2 px-1 overflow-visible landscape:scale-90 origin-bottom">
            <div className={`
                flex 
                justify-center
                mx-auto
                ${getHandSpacingClass(sortedHand.length)} 
                py-2 md:py-4 landscape:py-1
            `}>
                {sortedHand.map((card, idx) => (
                    <div 
                        key={card.id}
                        style={{ zIndex: idx }}
                        className="transition-all duration-300 hover:z-50 shrink-0 transform origin-bottom hover:-translate-y-4"
                    >
                        <Card
                        card={card}
                        selected={selectedCardIds.has(card.id)}
                        onClick={() => toggleSelectCard(card.id)}
                        className="shadow-2xl transition-transform duration-200"
                        />
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};