
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card as CardType, GameState, Player, Suit, Rank, PlayTurn, BackgroundTheme, AiDifficulty, GameStatus } from '../types';
import { Card, CardCoverStyle } from './Card';
import { InstructionsModal } from './InstructionsModal';
import { BoardSurface } from './UserHub';
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
  onSignOut: () => void;
  backgroundTheme: BackgroundTheme;
  onChangeBackgroundTheme: (theme: BackgroundTheme) => void;
  isSinglePlayer?: boolean;
  spQuickFinish?: boolean;
  setSpQuickFinish?: (val: boolean) => void;
  aiDifficulty?: AiDifficulty;
  onChangeDifficulty?: (d: AiDifficulty) => void;
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;
  onOpenSettings: () => void;
}

const getOrdinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const HistoryModal: React.FC<{ gameState: GameState; onClose: () => void }> = ({ gameState, onClose }) => {
  const allRounds = useMemo(() => {
    const history = gameState.roundHistory || [];
    return gameState.currentPlayPile.length > 0 
      ? [...history, gameState.currentPlayPile]
      : history;
  }, [gameState.roundHistory, gameState.currentPlayPile]);

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-md p-4" onClick={onClose}>
      <div className="bg-black/80 border border-white/10 w-full max-w-md max-h-[85vh] rounded-[2rem] overflow-hidden shadow-2xl flex flex-col backdrop-blur-xl" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
          <div className="flex flex-col">
            <h3 className="text-yellow-400 font-black text-xl tracking-[0.2em] uppercase">Play History</h3>
            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Complete Match History</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-all">✕</button>
        </div>
        <div className="overflow-y-auto p-6 space-y-8 scrollbar-thin scrollbar-thumb-white/10">
          {allRounds.length === 0 ? (
            <div className="text-gray-500 text-center text-[10px] font-black py-16 tracking-[0.5em] uppercase opacity-30">No maneuvers recorded</div>
          ) : (
            allRounds.map((round, rIdx) => {
              const isCurrent = rIdx === allRounds.length - 1 && gameState.currentPlayPile.length > 0;
              return (
                <div key={rIdx} className="space-y-4">
                  <div className="flex items-center gap-4">
                     <span className={`text-[10px] font-black uppercase tracking-[0.3em] whitespace-nowrap ${isCurrent ? 'text-yellow-500' : 'text-gray-500'}`}>
                        Round {rIdx + 1} {isCurrent && "• Active"}
                     </span>
                     <div className={`flex-1 h-[1px] ${isCurrent ? 'bg-yellow-500/20' : 'bg-white/5'}`}></div>
                  </div>
                  <div className="space-y-3 pl-2">
                    {round.map((turn, tIdx) => {
                      const player = gameState.players.find(p => p.id === turn.playerId);
                      return (
                        <div key={tIdx} className="group flex flex-col gap-2 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.03] hover:bg-white/[0.05] transition-all">
                           <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                 <span className="text-lg">{player?.avatar || '👤'}</span>
                                 <span className="text-[10px] font-black uppercase tracking-widest text-white/80">{player?.name}</span>
                              </div>
                              <span className="text-[8px] font-bold uppercase tracking-widest text-yellow-600 bg-yellow-500/5 px-2 py-0.5 rounded border border-yellow-500/10">{turn.comboType.replace('_', ' ')}</span>
                           </div>
                           <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                              {turn.cards.map(c => (
                                <Card key={c.id} card={c} small className="!w-9 !h-13 !text-[9px] shadow-lg" />
                              ))}
                           </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="p-4 bg-white/[0.02] border-t border-white/5">
           <p className="text-center text-[8px] font-black text-white/20 uppercase tracking-[0.4em]">End of Log</p>
        </div>
      </div>
    </div>
  );
};

export const GameTable: React.FC<GameTableProps> = ({ 
  gameState, myId, myHand, onPlayCards, onPassTurn, cardCoverStyle, backgroundTheme, soundEnabled, onOpenSettings
}) => {
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const [showHistory, setShowHistory] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [bombEffect, setBombEffect] = useState<{ type: string; level: number } | null>(null);
  const [comboVariations, setComboVariations] = useState<Record<string, number>>({});
  const lastSelectedCardId = useRef<string | null>(null);
  const bombTimerRef = useRef<number | null>(null);

  const lastPlayedMove = gameState.currentPlayPile.length > 0 
    ? gameState.currentPlayPile[gameState.currentPlayPile.length - 1] 
    : null;

  useEffect(() => {
    if (lastPlayedMove) {
      if (['QUAD', '3_PAIRS', '4_PAIRS'].includes(lastPlayedMove.comboType)) {
        const level = lastPlayedMove.comboType === '4_PAIRS' ? 3 : lastPlayedMove.comboType === 'QUAD' ? 2 : 1;
        setBombEffect({ type: lastPlayedMove.comboType, level });
        audioService.playBomb();
        if (bombTimerRef.current) window.clearTimeout(bombTimerRef.current);
        bombTimerRef.current = window.setTimeout(() => { setBombEffect(null); bombTimerRef.current = null; }, 2500);
      } else { setBombEffect(null); audioService.playPlay(); }
    } else {
      setBombEffect(null);
      if (gameState.currentPlayPile.length === 0 && gameState.lastPlayerToPlayId) audioService.playPass();
    }
  }, [gameState.currentPlayPile.length, lastPlayedMove]);

  const sortedHand = useMemo(() => sortCards(myHand), [myHand]);
  const me = gameState.players.find(p => p.id === myId);
  const myIndex = gameState.players.findIndex(p => p.id === myId);
  const isMyTurn = gameState.currentPlayerId === myId;
  const iAmFinished = !!me?.finishedRank;

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
    } else { newSelected.add(id); lastSelectedCardId.current = id; }
    setSelectedCardIds(newSelected);
  };

  const handleClear = () => {
    setSelectedCardIds(new Set());
    lastSelectedCardId.current = null;
    setComboVariations({});
    audioService.playPass();
  };

  const selectCombo = (type: string) => {
    if (!smartCombos) return;
    const variations = smartCombos[type];
    if (!variations || variations.length === 0) return;
    const currentIdx = comboVariations[type] || 0;
    const currentCombo = variations[currentIdx];
    const isAlreadySelected = currentCombo.every(c => selectedCardIds.has(c.id)) && currentCombo.length === selectedCardIds.size;
    let actualIdx = isAlreadySelected ? (currentIdx + 1) % variations.length : currentIdx;
    const nextCombo = variations[actualIdx];
    setSelectedCardIds(new Set(nextCombo.map(c => c.id)));
    setComboVariations(prev => ({ ...prev, [type]: actualIdx }));
    audioService.playPlay();
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
      case 2: return 'top';
      case 3: return 'right';
      default: return 'unknown';
    }
  };

  const getHandSpacingClass = (count: number) => {
    if (count <= 1) return '';
    if (count <= 3) return 'space-x-1 sm:space-x-4 md:space-6';
    if (count <= 6) return '-space-x-4 sm:-space-x-4 md:space-0';
    if (count <= 10) return '-space-x-10 sm:-space-x-10 md:-space-x-4';
    return '-space-x-14 sm:-space-x-16 md:-space-x-12';
  };

  const currentStatusText = gameState.status === GameStatus.FINISHED
    ? "Match Over"
    : iAmFinished 
        ? `Spectating • Placed ${getOrdinal(me?.finishedRank || 0)}`
        : isMyTurn 
            ? (mustPass ? "No Moves Possible" : "Your Turn")
            : "Waiting...";

  return (
    <div className={`fixed inset-0 w-full h-full bg-black overflow-hidden font-sans select-none flex flex-col justify-between ${bombEffect ? 'animate-screen-shake' : ''}`}>
      {/* Unified Master Board Surface */}
      <BoardSurface themeId={backgroundTheme} />

      {/* PERSISTENT HIGH-VIS BETA TAG */}
      <div className="absolute bottom-4 right-4 z-[40] opacity-40 hover:opacity-100 transition-opacity duration-700 pointer-events-none flex flex-col items-end">
         <span className="text-[8px] font-black uppercase tracking-[0.5em] text-red-500 drop-shadow-[0_0_8px_#ef4444]">BETA PROTOCOL ACTIVE</span>
         <span className="text-[6px] font-bold text-white/50 uppercase tracking-widest mt-1 italic">Active Testing Calibration</span>
      </div>

      <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-40 flex flex-col gap-2 items-start pointer-events-none">
        <h1 className="hidden lg:block text-3xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-yellow-500 to-yellow-700 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] tracking-tighter uppercase">THIRTEEN</h1>
        {lastPlayedMove && (
            <div className="bg-black/60 backdrop-blur-xl border border-white/10 text-gray-300 text-[8px] sm:text-[9px] uppercase px-3 py-1.5 rounded-full shadow-xl font-black tracking-widest flex items-center gap-2 pointer-events-auto animate-in fade-in slide-in-from-left-2">
                <span className="opacity-70 italic font-medium">Played by</span>
                <span className="text-yellow-400 text-[10px] sm:text-xs">{gameState.players.find(p => p.id === lastPlayedMove.playerId)?.name}</span>
            </div>
        )}
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
                  <button key={type} onClick={() => selectCombo(type)} className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all flex items-center justify-between gap-3 ${isActive ? 'bg-yellow-500 text-black border-yellow-300 shadow-[0_0_15px_rgba(234,179,8,0.4)] scale-105' : 'bg-black/40 backdrop-blur-md border-white/10 text-white/70 hover:bg-white/5'}`}>
                    <span>{type === 'QUAD' ? 'BOMB' : type.replace('_', ' ')}</span>
                    {typedVars.length > 1 && <span className={`px-1.5 py-0.5 rounded-md text-[7px] ${isActive ? 'bg-black/20' : 'bg-white/10'}`}>{currentVar}/{typedVars.length}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="absolute top-3 right-3 z-50 flex flex-col-reverse sm:flex-row gap-3 items-end sm:items-center">
          <button onClick={() => setShowInstructions(true)} className="w-10 h-10 md:w-9 md:h-9 rounded-full bg-white/5 border border-white/10 text-yellow-400 font-serif font-bold text-lg flex items-center justify-center transition-all shadow-lg backdrop-blur-md hover:scale-105">?</button>
          
          <button 
            onClick={onOpenSettings} 
            className="w-10 h-10 md:w-9 md:h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white flex items-center justify-center transition-all shadow-lg backdrop-blur-md hover:scale-110 active:scale-95 group relative overflow-hidden"
            title="Tactical Configuration"
          >
             <svg viewBox="0 0 24 24" className="w-6 h-6 transition-all duration-700 group-hover:rotate-90 group-hover:scale-110 drop-shadow-[0_0_100px_rgba(255,255,255,0.2)]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
             </svg>
          </button>

          <button onClick={() => setShowHistory(true)} className="bg-white/5 hover:bg-white/10 text-gray-200 text-xs px-4 py-2 rounded-full border border-white/10 backdrop-blur-md flex items-center gap-2 transition-all shadow-lg font-bold tracking-wide uppercase hover:scale-105">
            <span className="hidden sm:inline opacity-70">History</span>
            <span className="bg-yellow-500 text-black text-[10px] font-black px-1.5 py-0.5 rounded shadow-sm">{(gameState.roundHistory?.length || 0) + (gameState.currentPlayPile.length > 0 ? 1 : 0)}</span>
          </button>
      </div>

      {showHistory && <HistoryModal gameState={gameState} onClose={() => setShowHistory(false)} />}
      {showInstructions && <InstructionsModal onClose={() => setShowInstructions(false)} />}

      {bombEffect && (
        <div className="fixed inset-0 z-[200] pointer-events-none flex items-center justify-center overflow-hidden">
            <div className={`relative flex flex-col items-center animate-bomb-impact-v2`}>
                <h1 className="text-[12vw] md:text-[15rem] font-black italic uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-red-400 via-orange-600 to-red-950 drop-shadow-[0_0_80px_rgba(220,38,38,0.8)] filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]">
                  {['QUAD', '3_PAIRS', '4_PAIRS'].includes(bombEffect.type) ? 'BOMB' : bombEffect.type.replace('_', ' ')}
                </h1>
                <div className="absolute inset-0 bg-red-600/20 blur-[100px] animate-pulse"></div>
            </div>
            <div className="absolute inset-0 bg-white opacity-0 animate-bomb-flash"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-4 border-yellow-400/50 opacity-0 animate-bomb-shockwave"></div>
        </div>
      )}

      {/* Discard pile area */}
      <div className="absolute top-[45%] md:top-[50%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-96 flex items-center justify-center pointer-events-none z-10 overflow-visible">
         {!lastPlayedMove ? (
            <div className="flex flex-col items-center justify-center text-center opacity-20">
               <span className="text-white font-black text-xl md:text-2xl uppercase tracking-[0.5em] mb-4">{isMyTurn ? "Your Lead" : "Waiting"}</span>
               <div className="w-8 h-1 bg-white/20 rounded-full"></div>
            </div>
         ) : (
            <div className="relative w-full h-full flex items-center justify-center overflow-visible">
              <div className="absolute inset-0 flex items-center justify-center scale-100 md:scale-110 lg:scale-125 z-50 transition-all duration-300">
                  <div className="relative filter drop-shadow-[0_25px_40px_rgba(0,0,0,0.8)]">
                      {lastPlayedMove.cards.map((card, cardIdx) => {
                          const baseTranslateX = (cardIdx - (lastPlayedMove.cards.length - 1) / 2) * 35;
                          const baseRotate = (cardIdx - (lastPlayedMove.cards.length - 1) / 2) * 6;
                          return (
                              <div key={card.id} className="absolute transition-transform duration-200" style={{ transform: `translateX(${baseTranslateX}px) rotate(${baseRotate}deg)`, left: '-40px', top: '-70px' }}><Card card={card} /></div>
                          );
                      })}
                  </div>
              </div>
            </div>
         )}
      </div>

      {/* Opponents grid */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        {gameState.players.map((player, idx) => {
            if (player.id === myId) return null;
            const pos = getPlayerPosition(idx, gameState.players.length, myIndex);
            const isActive = gameState.currentPlayerId === player.id;
            let posClasses = "";
            let layoutClasses = "";
            if (pos === 'left') { posClasses = "left-4 top-1/2 -translate-y-1/2"; layoutClasses = "flex-col landscape:flex-row"; }
            else if (pos === 'top') { posClasses = "top-4 left-1/2 -translate-x-1/2"; layoutClasses = "flex-row"; }
            else if (pos === 'right') { posClasses = "right-4 top-1/2 -translate-y-1/2"; layoutClasses = "flex-col landscape:flex-row-reverse"; }
            return (
            <div key={player.id} className={`absolute flex items-center gap-5 landscape:scale-[0.8] ${posClasses} ${layoutClasses} transition-all duration-500 pointer-events-auto`}>
                <div className={`relative flex flex-col items-center justify-center p-3 rounded-[2rem] backdrop-blur-3xl border transition-all duration-500 shadow-2xl ${isActive ? 'bg-green-600/10 border-green-400/50 shadow-[0_0_30px_rgba(34,197,94,0.2)] scale-110' : player.hasPassed ? 'bg-black/40 border-white/5 opacity-60 grayscale' : 'bg-black/20 border-white/10 hover:bg-white/5'} w-24 h-24 md:w-32 md:h-32 group`}>
                    <div className={`relative flex items-center justify-center transition-transform duration-500 ${isActive ? 'animate-float' : ''}`}>
                        {isActive && <div className="absolute inset-[-6px] md:inset-[-8px] rounded-full border-2 border-green-500/40 animate-pulse pointer-events-none"></div>}
                        <div className={`w-10 h-10 md:w-16 md:h-16 rounded-full flex items-center justify-center text-2xl md:text-4xl border-2 shadow-inner overflow-hidden transition-all duration-500 ${isActive ? 'border-green-400/50 bg-green-500/20' : 'border-white/10 bg-white/5'}`}>{player.avatar || '😊'}</div>
                    </div>
                    <div className="text-white font-black text-[9px] md:text-[11px] tracking-widest max-w-full truncate px-2 text-center mt-3 uppercase opacity-80">{player.name}</div>
                    <div className="absolute -bottom-3 flex gap-2">
                        {player.finishedRank ? <div className="px-3 py-1 bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-600 text-black rounded-lg font-black text-[8px] md:text-[10px] uppercase shadow-lg ring-1 ring-white/20 whitespace-nowrap">{getOrdinal(player.finishedRank)} Place</div> : player.hasPassed && <div className="px-3 py-1 bg-red-600/90 text-white text-[8px] md:text-[10px] font-black uppercase rounded-lg shadow-lg ring-1 ring-red-400/50 animate-pulse">Passed</div>}
                    </div>
                </div>
                {!player.finishedRank && (
                    <div className={`relative transition-all duration-500 ${isActive ? 'scale-110 translate-x-1' : ''}`}>
                        <div className="relative">
                            {player.cardCount > 1 && <div className="absolute top-1 left-1.5 rotate-6 w-full h-full opacity-40"><Card faceDown coverStyle={cardCoverStyle} small className="!w-9 !h-13 md:!w-12 md:!h-18 bg-black/60" /></div>}
                            <Card faceDown coverStyle={cardCoverStyle} small className="!w-9 !h-13 md:!w-12 md:!h-18 shadow-[0_15px_30px_rgba(0,0,0,0.5)] ring-1 ring-white/10" />
                            <div className="absolute -bottom-2 -right-2 w-6 h-6 md:w-8 md:h-8 bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-600 text-black text-[10px] md:text-[13px] font-black rounded-xl flex items-center justify-center border-2 border-black/80 shadow-[0_5px_15px_rgba(0,0,0,0.4)] z-30">{player.cardCount}</div>
                        </div>
                    </div>
                )}
            </div>
            );
        })}
      </div>

      <div className="w-full mt-auto flex flex-col items-center pb-6 bg-gradient-to-t from-black via-black/95 to-transparent pt-12 relative z-[60]">
        <div className="relative z-[100] w-full flex flex-col items-center">
          <div className={`flex px-6 py-2 rounded-full font-bold tracking-widest text-xs sm:text-sm uppercase shadow-2xl border backdrop-blur-xl whitespace-nowrap mb-6 transition-all ${isMyTurn ? mustPass ? 'bg-red-600/40 text-red-100 border-red-400/50 shadow-[0_0_25px_rgba(220,38,38,0.3)] scale-105 animate-pulse' : 'bg-green-600 text-white border-green-400 shadow-[0_0_25px_rgba(34,197,94,0.4)] scale-105 animate-pulse' : 'bg-black/60 border-white/10 text-gray-400'} ${isMyTurn ? 'mobile-landscape-status-visible' : 'mobile-landscape-status-hidden'}`}>
            {currentStatusText}
          </div>
          <div className="flex justify-center gap-4 w-full px-8 mb-6 overflow-visible min-h-[50px]">
              {!iAmFinished && gameState.status === GameStatus.PLAYING && (
                  <>
                      {selectedCardIds.size > 0 ? (
                        <button onClick={handleClear} className="flex items-center justify-center px-6 md:px-10 py-3 rounded-xl font-bold uppercase tracking-wider text-xs border border-slate-600/50 bg-slate-800/80 text-slate-300 hover:bg-slate-700 transition-all shadow-lg mobile-landscape-clear animate-in fade-in zoom-in duration-200">Clear</button>
                      ) : (
                        <button onClick={handlePass} disabled={!isMyTurn || gameState.currentPlayPile.length === 0} className={`flex items-center justify-center px-6 md:px-10 py-3 rounded-xl font-bold uppercase tracking-wider text-xs border transition-all shadow-lg ${mustPass ? 'bg-red-600/40 border-red-400 text-red-100 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.4)]' : 'bg-red-500/40 border-red-400/60 text-red-50 hover:bg-red-500/60'} disabled:opacity-30 mobile-landscape-pass animate-in fade-in zoom-in duration-200`}>Pass</button>
                      )}
                      <button onClick={handlePlaySelected} disabled={!isMyTurn || selectedCardIds.size === 0} className="flex items-center justify-center px-8 md:px-14 py-3 rounded-xl font-black uppercase tracking-wider text-xs text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 hover:shadow-[0_0_30px_rgba(34,197,94,0.3)] hover:scale-105 active:scale-95 disabled:opacity-50 transition-all duration-200 shadow-xl mobile-landscape-play">Play Cards</button>
                  </>
              )}
          </div>
        </div>
        {!iAmFinished && (
            <div className="w-full max-w-full px-4 sm:px-12 flex justify-center pb-2 origin-bottom z-10 transition-all duration-300 overflow-visible">
                <div className={`flex justify-center mx-auto ${getHandSpacingClass(sortedHand.length)} py-2 md:py-4 max-w-full transition-all duration-300 mobile-landscape-card-container`}>
                    {sortedHand.map((card, idx) => {
                        const isFirstTurn3S = gameState.isFirstTurnOfGame && card.rank === Rank.Three && card.suit === Suit.Spades;
                        return (
                            <div key={card.id} style={{ zIndex: idx }} className="transition-all duration-300 hover:z-50 shrink-0 transform origin-bottom hover:-translate-y-10 cursor-pointer mobile-landscape-card-scale"><Card card={card} selected={selectedCardIds.has(card.id)} onClick={() => toggleSelectCard(card.id)} className={`shadow-2xl transition-transform duration-200 ${isFirstTurn3S ? 'ring-2 ring-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.9)] animate-pulse' : ''}`} /></div>
                        );
                    })}
                </div>
            </div>
        )}
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        .animate-float { animation: float 3s ease-in-out infinite; }
        @keyframes bombImpactV2 { 0% { transform: scale(0.2); opacity: 0; filter: blur(50px) brightness(5); } 10% { transform: scale(1.1); opacity: 1; filter: blur(0px) brightness(1.5); } 20% { transform: scale(1); filter: contrast(2); } 80% { transform: scale(1.1); opacity: 1; filter: contrast(1.5) blur(2px); } 100% { transform: scale(2); opacity: 0; filter: blur(20px); } }
        @keyframes screenShake { 0%, 100% { transform: translate(0, 0) rotate(0deg); } 10%, 30%, 50%, 70%, 90% { transform: translate(-4px, -4px) rotate(-0.5deg); } 20%, 40%, 60%, 80% { transform: translate(4px, 4px) rotate(0.5deg); } }
        @keyframes bombFlash { 0% { opacity: 0; } 5% { opacity: 0.8; } 15% { opacity: 0; } }
        @keyframes shockwave { 0% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; } 100% { transform: translate(-50%, -50%) scale(40); opacity: 0; } }
        @keyframes winnerGlow { 0% { transform: translateX(-150%) skewX(-45deg); } 50% { transform: translateX(150%) skewX(-45deg); } 100% { transform: translateX(150%) skewX(-45deg); } }
        .animate-bomb-impact-v2 { animation: bombImpactV2 2.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-screen-shake { animation: screenShake 0.4s ease-in-out 3; }
        .animate-bomb-flash { animation: bombFlash 2.5s ease-out forwards; }
        .animate-bomb-shockwave { animation: shockwave 1.5s ease-out forwards; }
        @media (orientation: landscape) and (max-width: 932px) {
            .mobile-landscape-card-scale { transform: scale(0.8) !important; }
            .mobile-landscape-card-container { gap: 2px !important; }
            .mobile-landscape-clear, .mobile-landscape-pass { position: fixed !important; bottom: 24px !important; left: 24px !important; z-index: 200 !important; margin: 0 !important; }
            .mobile-landscape-play { position: fixed !important; bottom: 24px !important; right: 24px !important; z-index: 200 !important; margin: 0 !important; }
            .mobile-landscape-status-visible { position: fixed !important; top: 68px !important; right: 12px !important; padding: 8px 16px !important; font-size: 10px !important; z-index: 200 !important; display: flex !important; }
            .mobile-landscape-status-hidden { display: none !important; }
        }
      `}} />
    </div>
  );
};
