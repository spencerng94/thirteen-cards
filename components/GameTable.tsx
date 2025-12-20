
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card as CardType, GameState, Player, Suit, Rank, PlayTurn, BackgroundTheme, AiDifficulty } from '../types';
import { Card, CardCoverStyle } from './Card';
import { InstructionsModal } from './InstructionsModal';
import { SettingsModal } from './SettingsModal';
import { audioService } from '../services/audio';
import { canPlayAnyMove, sortCards, findAllValidCombos } from '../utils/gameLogic';

interface GameTableProps {
  gameState: GameState;
  myId: string;
  myHand: CardType[];
  onPlayCards: (cards: CardType[]) => void;
  onPassTurn: () => void;
  cardCoverStyle: CardCoverStyle;
  onChangeCoverStyle: (style: CardCoverStyle) => void;
  onExitGame: () => void;
  backgroundTheme: BackgroundTheme;
  onChangeBackgroundTheme: (theme: BackgroundTheme) => void;
  isSinglePlayer?: boolean;
  spQuickFinish?: boolean;
  setSpQuickFinish?: (val: boolean) => void;
  aiDifficulty?: AiDifficulty;
  onChangeDifficulty?: (d: AiDifficulty) => void;
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;
}

const getOrdinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const HistoryModal: React.FC<{ gameState: GameState; onClose: () => void }> = ({ gameState, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4" onClick={onClose}>
    <div className="bg-black/80 border border-white/10 w-full max-w-md max-h-[80vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col backdrop-blur-xl" onClick={e => e.stopPropagation()}>
      <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
        <h3 className="text-yellow-400 font-bold text-lg tracking-wider uppercase">Round Log</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white px-2 py-1">✕</button>
      </div>
      <div className="overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {gameState.currentPlayPile.length === 0 ? (
          <div className="text-gray-500 text-center text-xs font-mono py-8 tracking-widest uppercase">No moves yet</div>
        ) : (
          gameState.currentPlayPile.map((turn, idx) => {
            const playerName = gameState.players.find(p => p.id === turn.playerId)?.name || 'Unknown';
            return (
              <div key={idx} className="flex flex-col gap-1 border-b border-white/5 pb-2 last:border-0">
                 <div className="flex justify-between text-[10px] uppercase text-gray-400 font-bold tracking-wide">
                   <span className="text-gray-300">{idx + 1}. {playerName}</span>
                   <span className="text-yellow-600">{turn.comboType.replace('_', ' ')}</span>
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

export const GameTable: React.FC<GameTableProps> = ({ 
  gameState, 
  myId, 
  myHand, 
  onPlayCards, 
  onPassTurn,
  cardCoverStyle,
  onChangeCoverStyle,
  onExitGame,
  backgroundTheme,
  onChangeBackgroundTheme,
  isSinglePlayer,
  spQuickFinish,
  setSpQuickFinish,
  aiDifficulty,
  onChangeDifficulty,
  soundEnabled,
  setSoundEnabled
}) => {
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const [showHistory, setShowHistory] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [bombEffect, setBombEffect] = useState<string | null>(null);
  const [comboVariations, setComboVariations] = useState<Record<string, number>>({});
  const lastSelectedCardId = useRef<string | null>(null);

  const lastPlayedMove = gameState.currentPlayPile.length > 0 
    ? gameState.currentPlayPile[gameState.currentPlayPile.length - 1] 
    : null;

  useEffect(() => {
    if (lastPlayedMove) {
      if (['QUAD', '3_PAIRS', '4_PAIRS'].includes(lastPlayedMove.comboType)) {
        setBombEffect("BOMB!");
        audioService.playBomb();
        const timer = setTimeout(() => setBombEffect(null), 2000);
        return () => clearTimeout(timer);
      } else {
        audioService.playPlay();
      }
    } else if (gameState.currentPlayPile.length === 0 && gameState.lastPlayerToPlayId) {
        audioService.playPass();
    }
  }, [gameState.currentPlayPile.length, lastPlayedMove]);

  const sortedHand = useMemo(() => sortCards(myHand), [myHand]);

  const me = gameState.players.find(p => p.id === myId);
  const myIndex = gameState.players.findIndex(p => p.id === myId);
  const isMyTurn = gameState.currentPlayerId === myId;
  const iAmFinished = !!me?.finishedRank;

  // Compute smart combos for the bar
  const smartCombos = useMemo(() => {
    if (!isMyTurn || iAmFinished || !lastSelectedCardId.current || selectedCardIds.size === 0) return null;
    return findAllValidCombos(myHand, lastSelectedCardId.current, gameState.currentPlayPile, gameState.isFirstTurnOfGame);
  }, [isMyTurn, iAmFinished, myHand, lastSelectedCardId.current, selectedCardIds.size, gameState.currentPlayPile, gameState.isFirstTurnOfGame]);

  const mustPass = useMemo(() => {
    if (!isMyTurn || iAmFinished || gameState.currentPlayPile.length === 0) return false;
    return !canPlayAnyMove(myHand, gameState.currentPlayPile, gameState.isFirstTurnOfGame);
  }, [isMyTurn, iAmFinished, myHand, gameState.currentPlayPile, gameState.isFirstTurnOfGame]);

  const toggleSelectCard = (id: string) => {
    const newSelected = new Set(selectedCardIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
      if (lastSelectedCardId.current === id) lastSelectedCardId.current = Array.from(newSelected).pop() || null;
    } else {
      newSelected.add(id);
      lastSelectedCardId.current = id;
    }
    setSelectedCardIds(newSelected);
  };

  const selectCombo = (type: string) => {
    if (!smartCombos) return;
    const variations = smartCombos[type];
    if (!variations || variations.length === 0) return;

    const currentIdx = comboVariations[type] || 0;
    
    // Cycle logic: if currently selected matches this variation, go to next
    let actualIdx = currentIdx;
    const currentCombo = variations[currentIdx];
    const isAlreadySelected = currentCombo.every(c => selectedCardIds.has(c.id)) && currentCombo.length === selectedCardIds.size;
    
    if (isAlreadySelected) {
      actualIdx = (currentIdx + 1) % variations.length;
    }

    const nextCombo = variations[actualIdx];
    setSelectedCardIds(new Set(nextCombo.map(c => c.id)));
    setComboVariations(prev => ({ ...prev, [type]: actualIdx }));
    audioService.playPlay(); // Subtle feedback
  };

  const handlePlaySelected = () => {
    const cardsToPlay = sortedHand.filter(c => selectedCardIds.has(c.id));
    if (cardsToPlay.length === 0) return;
    onPlayCards(cardsToPlay);
    setSelectedCardIds(new Set());
    lastSelectedCardId.current = null;
    setComboVariations({});
  };

  const handlePass = () => {
    onPassTurn();
    audioService.playPass();
    setSelectedCardIds(new Set());
    lastSelectedCardId.current = null;
    setComboVariations({});
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

  const getHandSpacingClass = (count: number) => {
    if (count <= 3) return 'space-x-2 md:space-x-4';
    if (count <= 5) return '-space-x-2 md:-space-x-4';
    if (count <= 8) return '-space-x-8 md:-space-x-10';
    if (count <= 10) return '-space-x-10 md:-space-x-12';
    return '-space-x-[55px] md:-space-x-14';
  };

  let bgBase = '';
  let gradientStops = '';

  switch (backgroundTheme) {
    case 'CYBER_BLUE':
      bgBase = 'bg-slate-950';
      gradientStops = 'from-blue-900/40 via-transparent to-black';
      break;
    case 'CRIMSON_VOID':
      bgBase = 'bg-[#0a0000]';
      gradientStops = 'from-red-900/40 via-transparent to-black';
      break;
    case 'GREEN':
    default:
      bgBase = 'bg-green-900';
      gradientStops = 'from-green-600/40 via-green-900 to-green-950';
      break;
  }

  const currentStatusText = iAmFinished 
    ? `Spectating • Placed ${getOrdinal(me?.finishedRank || 0)}`
    : isMyTurn 
        ? (mustPass ? "No Moves Possible" : "Your Turn")
        : (gameState.players.find(p => p.id === gameState.currentPlayerId)?.hasPassed ? "Resolving..." : `Wait for ${gameState.players.find(p => p.id === gameState.currentPlayerId)?.name}...`);

  return (
    <div className={`fixed inset-0 w-full h-full ${bgBase} overflow-hidden font-sans select-none flex flex-col justify-between transition-colors duration-1000`}>
      <div className={`absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] ${gradientStops} pointer-events-none transition-colors duration-1000`}></div>
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none"></div>

      {/* Top Left: Title & Status */}
      <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-40 flex flex-col gap-2 items-start pointer-events-none">
        <h1 className="hidden lg:block text-3xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-yellow-500 to-yellow-700 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] tracking-tighter">
            THIRTEEN
        </h1>
        {lastPlayedMove && (
            <div className="bg-black/75 backdrop-blur-xl border border-white/10 text-gray-300 text-[8px] sm:text-[9px] uppercase px-3 py-1.5 rounded-full shadow-xl font-bold tracking-widest flex items-center gap-2 pointer-events-auto">
                <span className="opacity-70 italic">Played by</span>
                <span className="text-yellow-400 text-[10px] sm:text-xs">{gameState.players.find(p => p.id === lastPlayedMove.playerId)?.name}</span>
            </div>
        )}

        {/* Smart Combo Detection Bar - Now in Top Left */}
        {smartCombos && (
          <div className="flex flex-col gap-2 mt-4 pointer-events-auto animate-in fade-in slide-in-from-left-4 duration-500 max-w-[140px] sm:max-w-[180px]">
            <p className="text-[8px] font-black uppercase tracking-[0.3em] text-yellow-500/60 ml-1">Valid Combos</p>
            <div className="flex flex-col gap-1.5">
              {Object.entries(smartCombos).map(([type, variations]) => {
                const typedVars = variations as CardType[][];
                if (typedVars.length === 0) return null;
                const currentVar = (comboVariations[type] || 0) + 1;
                const isActive = typedVars[comboVariations[type] || 0].every(c => selectedCardIds.has(c.id)) && typedVars[comboVariations[type] || 0].length === selectedCardIds.size;

                return (
                  <button
                    key={type}
                    onClick={() => selectCombo(type)}
                    className={`
                      px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all flex items-center justify-between gap-3
                      ${isActive 
                        ? 'bg-yellow-500 text-black border-yellow-300 shadow-[0_0_15px_rgba(234,179,8,0.4)] scale-105' 
                        : 'bg-black/40 backdrop-blur-md border-white/10 text-white/70 hover:bg-white/5'}
                    `}
                  >
                    <span>{type.replace('_', ' ')}</span>
                    {typedVars.length > 1 && (
                      <span className={`px-1.5 py-0.5 rounded-md text-[7px] ${isActive ? 'bg-black/20' : 'bg-white/10'}`}>
                        {currentVar}/{typedVars.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Top Right: Controls */}
      <div className="absolute top-3 right-3 z-50 flex flex-col-reverse sm:flex-row gap-3 items-end sm:items-center">
          <button onClick={() => setShowInstructions(true)} className="w-10 h-10 md:w-9 md:h-9 rounded-full bg-white/5 border border-white/10 text-yellow-400 font-serif font-bold text-lg flex items-center justify-center transition-all shadow-lg backdrop-blur-md hover:scale-105">?</button>
          <button onClick={() => setShowSettings(true)} className="w-10 h-10 md:w-9 md:h-9 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-all shadow-lg backdrop-blur-md hover:scale-105">
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
             </svg>
          </button>
          <button onClick={() => setShowHistory(true)} className="bg-white/5 hover:bg-white/10 text-gray-200 text-xs px-4 py-2 rounded-full border border-white/10 backdrop-blur-md flex items-center gap-2 transition-all shadow-lg font-bold tracking-wide uppercase hover:scale-105">
            <span className="hidden sm:inline opacity-70">Round Log</span>
            <span className="bg-yellow-500 text-black text-[10px] font-black px-1.5 py-0.5 rounded shadow-sm">{gameState.currentPlayPile.length}</span>
          </button>
      </div>

      {showHistory && <HistoryModal gameState={gameState} onClose={() => setShowHistory(false)} />}
      {showInstructions && <InstructionsModal onClose={() => setShowInstructions(false)} />}
      {showSettings && (
        <SettingsModal 
            onClose={() => setShowSettings(false)} 
            onExitGame={onExitGame}
            currentCoverStyle={cardCoverStyle}
            onChangeCoverStyle={onChangeCoverStyle}
            currentTheme={backgroundTheme}
            onChangeTheme={onChangeBackgroundTheme}
            isSinglePlayer={isSinglePlayer}
            spQuickFinish={spQuickFinish}
            setSpQuickFinish={setSpQuickFinish}
            currentDifficulty={aiDifficulty}
            onChangeDifficulty={onChangeDifficulty}
            soundEnabled={soundEnabled}
            setSoundEnabled={setSoundEnabled}
        />
      )}

      {/* Bomb Overlay */}
      {bombEffect && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center pointer-events-none">
            <div className="animate-bounce">
                <h1 className="text-7xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-red-500 to-red-900 stroke-white drop-shadow-[0_5px_5px_rgba(0,0,0,1)] tracking-tighter transform rotate-[-5deg] scale-150 transition-all duration-75">
                    {bombEffect}
                </h1>
            </div>
        </div>
      )}

      {/* Table Center */}
      <div className="absolute top-[45%] md:top-[50%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-32 md:w-full md:max-w-lg md:h-64 flex items-center justify-center pointer-events-none z-10">
         {!lastPlayedMove ? (
            <div className="text-white/5 font-bold text-xl uppercase tracking-[0.2em] border-2 border-dashed border-white/5 rounded-full w-40 h-40 md:w-48 md:h-48 flex items-center justify-center animate-pulse text-center backdrop-blur-sm">
               {isMyTurn ? "Your Lead" : "Waiting"}
            </div>
         ) : (
            <div className="relative scale-90 md:scale-110 lg:scale-125 transition-transform duration-500">
                 <div className="relative z-10 filter drop-shadow-[0_20px_25px_rgba(0,0,0,0.6)]">
                    {lastPlayedMove.cards.map((card, idx) => (
                        <div
                            key={card.id}
                            className="absolute transition-transform duration-300"
                            style={{
                                transform: `translateX(${(idx - (lastPlayedMove.cards.length - 1) / 2) * 35}px) rotate(${(idx - (lastPlayedMove.cards.length - 1) / 2) * 6}deg)`,
                                left: '-40px', 
                                top: '-70px'
                            }}
                        >
                             <Card card={card} />
                        </div>
                    ))}
                 </div>
            </div>
         )}
      </div>

      {/* Opponents Rendering */}
      {gameState.players.map((player, idx) => {
        if (player.id === myId) return null;
        const pos = getPlayerPosition(idx, gameState.players.length, myIndex);
        let posClasses = "";
        let layoutClasses = "flex-row"; 
        if (pos === 'left') { posClasses = "absolute left-2 top-1/2 -translate-y-1/2 z-20"; layoutClasses = "flex-col"; }
        else if (pos === 'top') { posClasses = "absolute top-3 left-1/2 -translate-x-[48px] z-20"; layoutClasses = "flex-row"; }
        else if (pos === 'right') { posClasses = "absolute right-2 top-1/2 -translate-y-1/2 z-20"; layoutClasses = "flex-col"; }

        return (
          <div key={player.id} className={`flex items-center gap-3 landscape:scale-[0.85] ${posClasses} ${layoutClasses}`}>
             <div className={`
               flex flex-col items-center justify-center p-2 rounded-2xl backdrop-blur-md border transition-all duration-300 shadow-2xl
               ${gameState.currentPlayerId === player.id ? 'bg-black/60 border-green-500/30 shadow-[0_0_20px_rgba(34,197,94,0.1)] scale-105' : 'bg-black/20 border-white/5'}
               ${player.hasPassed ? 'opacity-50 grayscale' : ''}
               w-24 h-24 md:w-28 md:h-28
             `}>
                <div className="relative">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-white/10 to-transparent rounded-full flex items-center justify-center text-xl md:text-2xl border border-white/10 shadow-inner overflow-hidden">
                        {player.avatar || '😊'}
                    </div>
                    {gameState.currentPlayerId === player.id && (
                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-black rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,1)]"></div>
                    )}
                </div>
                <div className="text-white font-bold text-[10px] tracking-wide max-w-full truncate px-1 text-center mt-2.5 pb-1">{player.name}</div>
                <div className="absolute -bottom-2 flex gap-1">
                    {player.finishedRank ? <div className="px-1.5 py-0.5 bg-yellow-500 text-black rounded font-black text-[8px] uppercase">{getOrdinal(player.finishedRank)}</div> : player.hasPassed && <div className="px-1.5 py-0.5 bg-red-600 text-white text-[8px] font-black uppercase rounded">PASS</div>}
                </div>
             </div>
             {!player.finishedRank && (
                 <div className="relative">
                    <div className="relative group">
                        {player.cardCount > 1 && <div className="absolute top-0.5 left-1 rotate-6 w-full h-full opacity-60"><Card faceDown coverStyle={cardCoverStyle} small className="!w-8 !h-11 md:!w-9 md:!h-13 bg-black/50" /></div>}
                        <Card faceDown coverStyle={cardCoverStyle} small className="!w-8 !h-11 md:!w-9 md:!h-13 shadow-2xl ring-1 ring-white/5" />
                        <div className="absolute -bottom-2 -right-2 w-5 h-5 bg-yellow-500 text-black text-[10px] font-black rounded-full flex items-center justify-center border-2 border-black shadow-xl z-20">{player.cardCount}</div>
                    </div>
                 </div>
             )}
          </div>
        );
      })}

      {/* Action Bar */}
      <div className="w-full z-30 mt-auto flex flex-col items-center gap-2 pb-2 bg-gradient-to-t from-black via-black/90 to-transparent pt-12">
        <div className={`
            flex px-6 py-2 rounded-full font-bold tracking-widest text-xs sm:text-sm uppercase shadow-2xl border backdrop-blur-xl whitespace-nowrap mb-1
            ${isMyTurn ? 'bg-green-600 text-white border-green-400 shadow-[0_0_25px_rgba(34,197,94,0.4)] scale-105 animate-pulse' : 'bg-black/60 border-white/10 text-gray-400'}
        `}>
          {currentStatusText}
        </div>

        <div className="flex flex-col items-center gap-3 w-full justify-center px-8 pointer-events-auto">
            {!iAmFinished && (
                <div className="flex justify-center gap-4 h-12 md:h-14">
                    <button 
                      onClick={handlePass} 
                      disabled={!isMyTurn || gameState.currentPlayPile.length === 0} 
                      className={`
                        flex items-center justify-center px-6 md:px-10 py-3 rounded-xl font-bold uppercase tracking-wider text-xs border transition-all shadow-lg
                        ${mustPass 
                          ? 'bg-red-950/40 border-red-500 text-red-400 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.4)]' 
                          : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}
                        disabled:opacity-30
                      `}
                    >
                      Pass
                    </button>
                    <button 
                      onClick={handlePlaySelected} 
                      disabled={!isMyTurn || selectedCardIds.size === 0} 
                      className="flex items-center justify-center px-8 md:px-14 py-3 rounded-xl font-black uppercase tracking-wider text-xs text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 hover:shadow-[0_0_30px_rgba(34,197,94,0.3)] hover:scale-105 active:scale-95 disabled:opacity-50 transition-all duration-200 shadow-xl"
                    >
                      Play Cards
                    </button>
                </div>
            )}
        </div>

        {!iAmFinished && (
            <div className="w-full flex justify-center pb-2 px-1 overflow-visible landscape:scale-[0.8] origin-bottom">
                <div className={`flex justify-center mx-auto ${getHandSpacingClass(sortedHand.length)} py-2 md:py-4`}>
                    {sortedHand.map((card, idx) => {
                        const isFirstTurn3S = gameState.isFirstTurnOfGame && card.rank === Rank.Three && card.suit === Suit.Spades;
                        return (
                            <div key={card.id} style={{ zIndex: idx }} className="transition-all duration-300 hover:z-50 shrink-0 transform origin-bottom hover:-translate-y-6 cursor-pointer">
                                <Card
                                    card={card}
                                    selected={selectedCardIds.has(card.id)}
                                    onClick={() => toggleSelectCard(card.id)}
                                    className={`shadow-2xl transition-transform duration-200 ${isFirstTurn3S ? 'ring-2 ring-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.9)] animate-pulse' : ''}`}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>
        )}
      </div>
      
      {/* Scrollable fix for mobile smart bar */}
      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
};
