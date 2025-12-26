
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card as CardType, GameState, Player, Suit, Rank, PlayTurn, BackgroundTheme, AiDifficulty, GameStatus, SocketEvents, UserProfile, Emote } from '../types';
import { Card, CardCoverStyle } from './Card';
import { InstructionsModal } from './InstructionsModal';
import { BoardSurface } from './UserHub';
import { audioService } from '../services/audio';
import { sortCards, validateMove, getComboType, findAllValidCombos, canPlayAnyMove } from '../utils/gameLogic';
import { socket } from '../services/socket';
import { DEFAULT_AVATARS, fetchEmotes } from '../services/supabase';
import { VisualEmote } from './VisualEmote';

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
  profile?: UserProfile | null;
}

interface ActiveEmote {
  id: string;
  playerId: string;
  emote: string;
}

const EMOTE_COOLDOWN = 2000;

const OneRowIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="7" width="18" height="10" rx="2" />
    <path d="M7 12h10" opacity="0.3" />
  </svg>
);

const TwoRowIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="3.5" width="16" height="8" rx="1.5" />
    <rect x="4" y="12.5" width="16" height="8" rx="1.5" />
  </svg>
);

const SettingsIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3.5" fill="currentColor" fillOpacity="0.2" />
  </svg>
);

const EmoteBubble: React.FC<{ emote: string; remoteEmotes: Emote[]; position: 'bottom' | 'left' | 'top' | 'right' }> = ({ emote, remoteEmotes, position }) => {
  const paths: Record<string, { start: string; focus: string; end: string }> = {
    bottom: { start: "translate(0, 45vh) scale(0.2)", focus: "translate(0, 15vh) scale(1.9)", end: "translate(0, -15vh) scale(1.7)" },
    left: { start: "translate(-45vw, 0) scale(0.2)", focus: "translate(-25vw, -15vh) scale(1.9)", end: "translate(-20vw, -45vh) scale(1.7)" },
    right: { start: "translate(45vw, 0) scale(0.2)", focus: "translate(25vw, -15vh) scale(1.9)", end: "translate(20vw, -45vh) scale(1.7)" },
    top: { start: "translate(0, -45vh) scale(0.2)", focus: "translate(15vw, -35vh) scale(1.9)", end: "translate(18vw, -65vh) scale(1.7)" }
  };
  const path = paths[position];
  return (
    <div className="fixed inset-0 z-[400] pointer-events-none flex items-center justify-center">
      <div className="animate-emote-fly bg-black/95 border-2 border-yellow-500/40 p-2.5 rounded-[2.5rem] shadow-[0_20px_80px_rgba(0,0,0,1)] backdrop-blur-3xl ring-4 ring-yellow-500/10 w-24 h-24 sm:w-32 sm:h-32 flex items-center justify-center overflow-hidden"
        style={{ '--start-pos': path.start, '--focus-pos': path.focus, '--end-pos': path.end } as any}
      >
        <VisualEmote trigger={emote} remoteEmotes={remoteEmotes} size="xl" />
      </div>
    </div>
  );
};

const PlayerSlot: React.FC<{ player: Player; position: 'top' | 'left' | 'right'; isTurn: boolean; remoteEmotes: Emote[]; coverStyle: CardCoverStyle; turnEndTime?: number }> = ({ player, position, isTurn, remoteEmotes, coverStyle, turnEndTime }) => {
  const isFinished = !!player.finishedRank;
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!isTurn || !turnEndTime || isFinished) {
      setTimeLeft(0);
      return;
    }
    const update = () => {
      const remaining = Math.max(0, Math.ceil((turnEndTime - Date.now()) / 1000));
      setTimeLeft(remaining);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [isTurn, turnEndTime, isFinished]);
  
  return (
    <div className={`relative flex transition-all duration-500 ${isFinished ? 'opacity-30' : 'opacity-100'} 
      ${position === 'top' ? 'flex-row items-center gap-3 sm:gap-8' : 'flex-col items-center gap-2 sm:gap-4'}`}>
        <div className="relative flex flex-col items-center shrink-0">
            <div className="relative">
                {isTurn && !isFinished && (
                    <div className={`absolute inset-[-12px] rounded-full border-2 ${timeLeft <= 3 && timeLeft > 0 ? 'border-rose-500' : 'border-emerald-500/50'} animate-ping`}></div>
                )}
                <div className={`w-20 h-20 sm:w-24 h-24 sm:h-24 rounded-full border-2 transition-all duration-500 overflow-hidden bg-black/60 shadow-2xl flex items-center justify-center shrink-0 ${isTurn ? (timeLeft <= 3 && timeLeft > 0 ? 'border-rose-500' : 'border-emerald-400') + ' scale-110' : 'border-white/10'}`}>
                    <VisualEmote trigger={player.avatar} remoteEmotes={remoteEmotes} size="lg" />
                    {isTurn && !isFinished && timeLeft > 0 && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <span className={`text-2xl font-black italic ${timeLeft <= 3 ? 'text-rose-500 animate-pulse' : 'text-white'}`}>{timeLeft}</span>
                        </div>
                    )}
                </div>
                {isFinished && (
                    <div className="absolute -top-1 -right-1 bg-yellow-500 text-black text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border border-black shadow-lg z-20">
                        #{player.finishedRank}
                    </div>
                )}
                {player.hasPassed && !isFinished && (
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px] rounded-full flex items-center justify-center z-10">
                        <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest text-center leading-none">Passed</span>
                    </div>
                )}
                {player.isOffline && !isFinished && (
                    <div className="absolute inset-0 bg-amber-600/40 backdrop-blur-[2px] rounded-full flex items-center justify-center z-10 animate-pulse border-2 border-amber-500/50">
                        <span className="text-[8px] font-black text-white uppercase tracking-tighter text-center leading-none shadow-lg">Offline</span>
                    </div>
                )}
            </div>
            <div className={`bg-black/60 backdrop-blur-md px-3 py-1 sm:px-4 sm:py-1.5 rounded-full border min-w-[75px] sm:min-w-[95px] text-center shadow-lg mt-2.5 transition-colors ${player.isOffline ? 'border-amber-500/50' : 'border-white/5'}`}>
                <span className={`text-[8px] sm:text-[10px] font-black uppercase tracking-widest truncate max-w-[65px] sm:max-w-[85px] inline-block ${player.isOffline ? 'text-amber-500' : 'text-white/90'}`}>
                  {player.name}
                </span>
            </div>
        </div>
        {!isFinished && (
            <div className={`relative animate-in slide-in-from-bottom-2 duration-700 shrink-0 transition-transform landscape:scale-[0.85]`}>
                <Card faceDown coverStyle={coverStyle} small className="!w-10 !h-14 sm:!w-14 sm:!h-20 shadow-xl opacity-90 border-white/20" />
                <div className="absolute -top-2.5 -right-2.5 bg-yellow-500 text-black text-[10px] font-black w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center border-2 border-black shadow-lg ring-1 ring-yellow-400/50">
                    {player.cardCount}
                </div>
            </div>
        )}
    </div>
  );
};

export const GameTable: React.FC<GameTableProps> = ({ 
  gameState, myId, myHand, onPlayCards, onPassTurn, cardCoverStyle, backgroundTheme, onOpenSettings, profile
}) => {
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const [showEmotePicker, setShowEmotePicker] = useState(false);
  const [activeEmotes, setActiveEmotes] = useState<ActiveEmote[]>([]);
  const [remoteEmotes, setRemoteEmotes] = useState<Emote[]>([]);
  const [showInstructions, setShowInstructions] = useState(false);
  const [handRows, setHandRows] = useState<1 | 2>(1);
  const lastEmoteSentAt = useRef<number>(0);
  const [timeLeft, setTimeLeft] = useState(0);

  const isMyTurn = gameState.currentPlayerId === myId;
  const isLeader = gameState.currentPlayPile.length === 0;

  const unlockedAvatars = useMemo(() => {
    const unlocked = profile?.unlocked_avatars || [];
    return Array.from(new Set([...DEFAULT_AVATARS, ...unlocked]));
  }, [profile]);

  useEffect(() => {
    if (!isMyTurn) {
      setSelectedCardIds(new Set());
    }
  }, [isMyTurn]);

  useEffect(() => {
    setSelectedCardIds(prev => {
      const next = new Set<string>();
      prev.forEach(id => { if (myHand.some(c => c.id === id)) next.add(id); });
      return next;
    });
  }, [myHand]);

  useEffect(() => { fetchEmotes().then(setRemoteEmotes); }, []);

  useEffect(() => {
    const handleReceiveEmote = ({ playerId, emote }: { playerId: string; emote: string }) => {
      const id = Math.random().toString();
      setActiveEmotes(prev => [...prev, { id, playerId, emote }]);
      audioService.playEmote();
      setTimeout(() => setActiveEmotes(prev => prev.filter(e => e.id !== id)), 3000);
    };
    socket.on(SocketEvents.RECEIVE_EMOTE, handleReceiveEmote);
    return () => { socket.off(SocketEvents.RECEIVE_EMOTE, handleReceiveEmote); };
  }, []);

  const sortedHand = useMemo(() => sortCards(myHand), [myHand]);
  const myIndex = gameState.players.findIndex(p => p.id === myId);

  useEffect(() => {
    if (!isMyTurn || !gameState.turnEndTime) {
      setTimeLeft(0);
      return;
    }
    const update = () => {
      const remaining = Math.max(0, Math.ceil((gameState.turnEndTime! - Date.now()) / 1000));
      setTimeLeft(remaining);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [isMyTurn, gameState.turnEndTime]);

  const noMovesPossible = useMemo(() => {
    if (!isMyTurn) return false;
    return !canPlayAnyMove(myHand, gameState.currentPlayPile, !!gameState.isFirstTurnOfGame);
  }, [isMyTurn, myHand, gameState.currentPlayPile, gameState.isFirstTurnOfGame]);

  const validationResult = useMemo(() => {
    if (selectedCardIds.size === 0) return { isValid: false, reason: '' };
    const cards = myHand.filter(c => selectedCardIds.has(c.id));
    return validateMove(cards, gameState.currentPlayPile, !!gameState.isFirstTurnOfGame);
  }, [selectedCardIds, myHand, gameState.currentPlayPile, gameState.isFirstTurnOfGame]);

  const combosByGroup = useMemo<Record<string, CardType[][]>>(() => {
    if (!isMyTurn || selectedCardIds.size === 0) return {};
    const pivotId = Array.from(selectedCardIds).pop() as string;
    return findAllValidCombos(myHand, pivotId, gameState.currentPlayPile, !!gameState.isFirstTurnOfGame);
  }, [selectedCardIds, myHand, gameState.currentPlayPile, isMyTurn, gameState.isFirstTurnOfGame]);

  const sendEmote = (triggerCode: string) => {
    if (Date.now() - lastEmoteSentAt.current < EMOTE_COOLDOWN) return;
    lastEmoteSentAt.current = Date.now();
    socket.emit(SocketEvents.EMOTE_SENT, { roomId: gameState.roomId, emote: triggerCode });
    setShowEmotePicker(false);
    const id = Math.random().toString();
    setActiveEmotes(prev => [...prev, { id, playerId: myId, emote: triggerCode }]);
    audioService.playEmote();
    setTimeout(() => setActiveEmotes(prev => prev.filter(e => e.id !== id)), 3000);
  };

  const getPlayerPosition = (index: number) => {
    const relativeIndex = (index - myIndex + gameState.players.length) % gameState.players.length;
    switch(relativeIndex) {
      case 0: return 'bottom';
      case 1: return 'left';
      case 2: return 'top';
      case 3: return 'right';
      default: return 'unknown';
    }
  };

  const opponents = useMemo(() => {
    return gameState.players
      .map((p, i) => ({ player: p, index: i, position: getPlayerPosition(i) }))
      .filter(o => o.position !== 'bottom');
  }, [gameState.players, myId, myIndex]);

  const toggleCard = (id: string) => {
    if (!isMyTurn) return;
    const next = new Set(selectedCardIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedCardIds(next);
  };

  const handlePlay = () => {
    if (selectedCardIds.size === 0 || !isMyTurn) return;
    const cards = myHand.filter(c => selectedCardIds.has(c.id));
    if (validateMove(cards, gameState.currentPlayPile, !!gameState.isFirstTurnOfGame).isValid) {
      onPlayCards(cards);
      if (handRows === 2 && myHand.length - cards.length < 8) setHandRows(1);
    }
  };

  const handleManualPass = () => {
    if (!isMyTurn || isLeader) return;
    setSelectedCardIds(new Set()); // Ensure cards are lowered visually when passing
    onPassTurn();
  };

  const handleClear = () => setSelectedCardIds(new Set());

  const hasSelection = selectedCardIds.size > 0;
  const lastTurn = gameState.currentPlayPile.length > 0 ? gameState.currentPlayPile[gameState.currentPlayPile.length - 1] : null;

  const cycleComboType = (type: string) => {
    const list = combosByGroup[type];
    if (!list || list.length === 0) return;
    const currentIndex = list.findIndex(combo => combo.length === selectedCardIds.size && combo.every(c => selectedCardIds.has(c.id)));
    const nextIndex = (currentIndex + 1) % list.length;
    setSelectedCardIds(new Set(list[nextIndex].map(c => c.id)));
    audioService.playExpandHand(); 
  };

  const spacing = {
    landscape: selectedCardIds.size > 0 ? 'landscape:-space-x-12 sm:landscape:-space-x-14' : 'landscape:-space-x-14 sm:landscape:-space-x-16',
    portrait: selectedCardIds.size > 0 ? 'portrait:-space-x-[8vw] sm:portrait:-space-x-10' : 'portrait:-space-x-[11vw] sm:portrait:-space-x-14'
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-[#030303] overflow-hidden select-none">
      <BoardSurface themeId={backgroundTheme} />
      {showInstructions && <InstructionsModal onClose={() => setShowInstructions(false)} />}

      {activeEmotes.map(ae => {
        const playerIdx = gameState.players.findIndex(p => p.id === ae.playerId);
        if (playerIdx === -1) return null;
        return <EmoteBubble key={ae.id} emote={ae.emote} remoteEmotes={remoteEmotes} position={getPlayerPosition(playerIdx) as any} />;
      })}

      {isMyTurn && hasSelection && (
          <div className="fixed top-4 left-4 z-[200] flex flex-col gap-2 animate-in slide-in-from-left-4 duration-500 max-w-[160px]">
              <div className="bg-black/60 backdrop-blur-xl border border-white/10 p-2 rounded-[1.5rem] shadow-2xl">
                  <div className="flex items-center gap-2 mb-2 px-2 border-b border-white/5 pb-1.5">
                      <span className="w-1 h-1 rounded-full bg-yellow-500 animate-pulse"></span>
                      <span className="text-[8px] font-black text-yellow-500/80 uppercase tracking-widest">VALID COMBOS</span>
                  </div>
                  <div className="flex flex-col gap-2">
                      {(Object.entries(combosByGroup) as [string, CardType[][]][]).map(([type, lists]) => {
                          if (lists.length === 0) return null;
                          const currentIndex = lists.findIndex(combo => combo.length === selectedCardIds.size && combo.every(c => selectedCardIds.has(c.id)));
                          const isTypeSelected = currentIndex !== -1;
                          return (
                              <button key={type} onClick={() => cycleComboType(type)} className={`w-full py-2.5 px-3 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all text-left flex flex-col group/btn relative overflow-hidden ${isTypeSelected ? 'bg-yellow-500 text-black border-yellow-400' : 'bg-white/[0.04] text-white/60 border-white/5 hover:bg-white/10 hover:text-white'}`}>
                                  <div className="flex justify-between items-center w-full z-10 gap-3">
                                      <span className="truncate">{type === 'RUN' ? 'Straight' : type}</span>
                                      <span className={`text-[8px] opacity-70 whitespace-nowrap ${isTypeSelected ? 'text-black/70' : 'text-yellow-500/70'}`}>
                                        {isTypeSelected ? `${currentIndex + 1}/${lists.length}` : `${lists.length}`}
                                      </span>
                                  </div>
                              </button>
                          );
                      })}
                  </div>
              </div>
          </div>
      )}

      <div className="absolute top-4 right-4 sm:top-8 sm:right-8 landscape:top-2 landscape:right-4 z-[150] flex portrait:flex-col landscape:flex-row items-center gap-3 sm:gap-4">
        <div className="relative">
          <button onClick={() => setShowEmotePicker(!showEmotePicker)} className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-black/40 backdrop-blur-2xl border border-white/10 flex items-center justify-center transition-all shadow-xl hover:scale-110 ${showEmotePicker ? 'text-yellow-400 border-yellow-500/40 bg-black/60' : 'text-white/50 hover:text-white'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
          </button>
          {showEmotePicker && (
            <div className="absolute top-full right-0 mt-3 p-3 bg-black/80 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl z-[300] grid grid-cols-3 gap-2 min-w-[160px] animate-in fade-in zoom-in-95 duration-200">
               {unlockedAvatars.map(emoji => (
                 <button key={emoji} onClick={() => sendEmote(emoji)} className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/15 transition-all flex items-center justify-center p-1"><VisualEmote trigger={emoji} remoteEmotes={remoteEmotes} size="sm" /></button>
               ))}
            </div>
          )}
        </div>
        <button onClick={onOpenSettings} className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-black/40 backdrop-blur-2xl border border-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all shadow-xl hover:scale-110"><SettingsIcon /></button>
        <button onClick={() => setShowInstructions(true)} className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-black/40 backdrop-blur-2xl border border-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all shadow-xl hover:scale-110"><span className="text-lg font-black">?</span></button>
      </div>

      <div className="absolute inset-0 p-4 sm:p-12 landscape:p-4 grid grid-cols-3 grid-rows-3 pointer-events-none z-10">
        <div className="col-start-2 row-start-1 flex justify-center items-start pt-2">{opponents.find(o => o.position === 'top') && (<PlayerSlot player={opponents.find(o => o.position === 'top')!.player} position="top" isTurn={gameState.currentPlayerId === opponents.find(o => o.position === 'top')!.player.id} remoteEmotes={remoteEmotes} coverStyle={cardCoverStyle} turnEndTime={gameState.turnEndTime} />)}</div>
        <div className="col-start-1 row-start-2 flex justify-start items-center pl-2">{opponents.find(o => o.position === 'left') && (<PlayerSlot player={opponents.find(o => o.position === 'left')!.player} position="left" isTurn={gameState.currentPlayerId === opponents.find(o => o.position === 'left')!.player.id} remoteEmotes={remoteEmotes} coverStyle={cardCoverStyle} turnEndTime={gameState.turnEndTime} />)}</div>
        <div className="col-start-3 row-start-2 flex justify-end items-center pr-2">{opponents.find(o => o.position === 'right') && (<PlayerSlot player={opponents.find(o => o.position === 'right')!.player} position="right" isTurn={gameState.currentPlayerId === opponents.find(o => o.position === 'right')!.player.id} remoteEmotes={remoteEmotes} coverStyle={cardCoverStyle} turnEndTime={gameState.turnEndTime} />)}</div>
      </div>

      <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-700 ease-in-out ${isMyTurn ? 'portrait:-translate-y-28' : 'portrait:-translate-y-12'}`}>
        <div className="relative flex flex-col items-center">
          {lastTurn ? (
            <div className="flex flex-col items-center gap-6 animate-in zoom-in duration-300 scale-90 sm:scale-125 landscape:scale-[0.8]">
               <div className="flex -space-x-12">{lastTurn.cards.map((c, i) => (<div key={c.id} style={{ transform: `rotate(${(i - 1) * 8}deg) translateY(${i % 2 === 0 ? '-15px' : '0px'})` }}><Card card={c} className="shadow-2xl ring-1 ring-white/10" /></div>))}</div>
               <div className="mt-4 flex flex-col items-center opacity-0 animate-[fadeInLabel_0.5s_0.3s_forwards] pointer-events-none z-[100]">
                  <span className="text-[12px] font-black text-yellow-500 uppercase tracking-[0.6em] drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] whitespace-nowrap">{gameState.players.find(p => p.id === lastTurn.playerId)?.name || 'PLAYER'}'S MOVE</span>
                  <div className="h-[2px] w-20 bg-yellow-500/40 mt-1 rounded-full shadow-[0_0_12px_rgba(234,179,8,0.5)]"></div>
               </div>
            </div>
          ) : (<div className="opacity-10 border-2 border-dashed border-white/40 rounded-[3rem] p-24"><div className="text-white text-base font-black uppercase tracking-[1em]">Arena</div></div>)}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 w-full p-2 sm:p-6 flex flex-col items-center bg-gradient-to-t from-black via-black/40 to-transparent z-40">
        <div className={`mb-4 flex flex-col items-center gap-2 transition-all duration-700 pointer-events-none ${isMyTurn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
           <div className={`px-6 py-2.5 rounded-full border-2 backdrop-blur-md flex items-center gap-3 transition-colors ${timeLeft <= 3 && timeLeft > 0 ? 'bg-rose-600/90 border-rose-400' : 'bg-emerald-600/90 border-emerald-400'}`}>
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white">{isLeader ? 'Leader (No Pass)' : 'Your Turn'}</span>
              {timeLeft > 0 && (<><div className="w-[1px] h-4 bg-white/20"></div><span className={`text-sm font-black italic text-white ${timeLeft <= 3 ? 'animate-pulse' : ''}`}>{timeLeft}s</span></>)}
           </div>
           {noMovesPossible && !hasSelection && (<div className="bg-rose-600/90 text-white px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-[0.3em] shadow-[0_0_20px_rgba(225,29,72,0.3)] animate-bounce border border-rose-400/20 backdrop-blur-md">No Moves Possible</div>)}
        </div>

        <div className={`flex flex-row items-stretch justify-center gap-3 w-full max-w-sm mb-4 transition-all duration-500 h-16 ${isMyTurn ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0 pointer-events-none'}`}>
          <button onClick={handleManualPass} disabled={isLeader} className={`flex-1 flex items-center justify-center border-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 bg-black/40 ${isLeader ? 'opacity-20 border-white/5 text-white/20 grayscale cursor-not-allowed' : 'border-rose-600/60 text-rose-500 hover:bg-rose-950/20'}`}>Pass</button>
          <button onClick={handleClear} disabled={!hasSelection} className={`flex-1 flex items-center justify-center border-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 ${hasSelection ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'opacity-20 border-white/5 text-white/20 grayscale cursor-not-allowed'}`}>Clear</button>
          <button onClick={handlePlay} disabled={!validationResult.isValid} className={`flex-[2] flex items-center justify-center rounded-2xl font-black uppercase tracking-[0.25em] text-[11px] shadow-[0_20px_50px_rgba(0,0,0,0.6)] transition-all active:scale-95 ${validationResult.isValid ? 'bg-gradient-to-r from-emerald-600 to-green-500 text-white' : 'bg-white/5 text-white/20 border border-white/5 grayscale'}`}>Play Cards</button>
        </div>

        <div className="relative flex items-center justify-center w-full max-w-[96vw]">
           <div className={`flex transition-all duration-800 landscape:scale-[0.55] landscape:sm:scale-[0.75] ${spacing.landscape} portrait:pt-4 portrait:pb-16 portrait:scale-[0.9] ${handRows === 2 ? 'portrait:flex-wrap portrait:justify-center portrait:-space-x-10 portrait:max-w-[340px]' : `portrait:flex-nowrap ${spacing.portrait} portrait:max-w-full`}`}>
            {sortedHand.map((c) => (<Card key={c.id} card={c} selected={selectedCardIds.has(c.id)} onClick={() => toggleCard(c.id)} className={`transform transition-all duration-300 ${isMyTurn ? 'cursor-pointer active:scale-110 sm:hover:-translate-y-12' : 'cursor-default opacity-80'} ${handRows === 2 ? 'portrait:m-0.5' : ''}`} />))}
           </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `@keyframes emoteFly { 0% { transform: var(--start-pos); opacity: 0; filter: blur(15px); } 10% { opacity: 1; filter: blur(0px); } 15% { transform: var(--focus-pos); opacity: 1; filter: blur(0px); } 80% { transform: var(--focus-pos); opacity: 1; filter: blur(0px); } 100% { transform: var(--end-pos); opacity: 0; filter: blur(10px); } } .animate-emote-fly { animation: emoteFly 3.2s cubic-bezier(0.19, 1, 0.22, 1) forwards; } @keyframes fadeInLabel { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }` }} />
    </div>
  );
};
