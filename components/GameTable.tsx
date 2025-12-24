
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

// Icons for the Row Toggle
const OneRowIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-80">
    <rect x="5" y="4" width="14" height="16" rx="2" />
  </svg>
);

const TwoRowIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-80">
    <rect x="4" y="2" width="10" height="9" rx="1.5" />
    <rect x="10" y="13" width="10" height="9" rx="1.5" />
  </svg>
);

const EmoteBubble: React.FC<{ emote: string; remoteEmotes: Emote[]; position: 'bottom' | 'left' | 'top' | 'right' }> = ({ emote, remoteEmotes, position }) => {
  // Define coordinate paths based on player position for a refined middle-ground feel
  const paths: Record<string, { start: string; focus: string; end: string }> = {
    bottom: {
      start: "translate(0, 45vh) scale(0.2)",
      focus: "translate(0, 15vh) scale(1.9)",
      end: "translate(0, -15vh) scale(1.7)"
    },
    left: {
      start: "translate(-45vw, 0) scale(0.2)",
      focus: "translate(-25vw, -15vh) scale(1.9)", // Floats right and up from profile
      end: "translate(-20vw, -45vh) scale(1.7)"
    },
    right: {
      start: "translate(45vw, 0) scale(0.2)",
      focus: "translate(25vw, -15vh) scale(1.9)", // Floats left and up from profile
      end: "translate(20vw, -45vh) scale(1.7)"
    },
    top: {
      start: "translate(0, -45vh) scale(0.2)",
      focus: "translate(15vw, -35vh) scale(1.9)", // Floats to the right of top profile
      end: "translate(18vw, -65vh) scale(1.7)" // Floats up
    }
  };

  const path = paths[position];

  return (
    <div className="fixed inset-0 z-[400] pointer-events-none flex items-center justify-center">
      <div 
        className="animate-emote-fly bg-black/95 border-2 border-yellow-500/40 p-2.5 rounded-[2.5rem] shadow-[0_20px_80px_rgba(0,0,0,1)] backdrop-blur-3xl ring-4 ring-yellow-500/10 w-24 h-24 sm:w-32 sm:h-32 flex items-center justify-center overflow-hidden"
        style={{ 
          '--start-pos': path.start,
          '--focus-pos': path.focus,
          '--end-pos': path.end
        } as any}
      >
        <VisualEmote trigger={emote} remoteEmotes={remoteEmotes} size="xl" />
      </div>
    </div>
  );
};

const PlayerSlot: React.FC<{ player: Player; position: 'top' | 'left' | 'right'; isTurn: boolean; remoteEmotes: Emote[]; coverStyle: CardCoverStyle }> = ({ player, position, isTurn, remoteEmotes, coverStyle }) => {
  const isFinished = !!player.finishedRank;
  
  return (
    <div className={`relative flex transition-all duration-500 ${isFinished ? 'opacity-30' : 'opacity-100'} 
      ${position === 'top' 
        ? 'flex-row items-center gap-3 sm:gap-8' 
        : 'flex-col items-center gap-2 sm:gap-4'}`}>
        
        <div className="relative flex flex-col items-center shrink-0">
            <div className="relative">
                {isTurn && !isFinished && (
                    <div className="absolute inset-[-12px] rounded-full border-2 border-emerald-500/50 animate-ping"></div>
                )}
                <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 transition-all duration-500 overflow-hidden bg-black/60 shadow-2xl flex items-center justify-center shrink-0 ${isTurn ? 'border-emerald-400 scale-110 shadow-emerald-500/40' : 'border-white/10'}`}>
                    <VisualEmote trigger={player.avatar} remoteEmotes={remoteEmotes} size="lg" />
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
            </div>

            <div className="bg-black/60 backdrop-blur-md px-3 py-1 sm:px-4 sm:py-1.5 rounded-full border border-white/5 min-w-[75px] sm:min-w-[95px] text-center shadow-lg mt-2.5">
                <span className="text-[8px] sm:text-[10px] font-black text-white/90 uppercase tracking-widest truncate max-w-[65px] sm:max-w-[85px] inline-block">{player.name}</span>
            </div>
        </div>

        {!isFinished && (
            <div className={`relative animate-in slide-in-from-bottom-2 duration-700 shrink-0 landscape:scale-90 transition-transform`}>
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

  const availableEmotes = useMemo(() => profile?.unlocked_avatars || DEFAULT_AVATARS, [profile]);

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

  // Revert rows to 1 if selection is empty or hand size falls below requirement
  useEffect(() => {
    if (handRows === 2 && (selectedCardIds.size === 0 || myHand.length < 9)) {
      setHandRows(1);
    }
  }, [selectedCardIds.size, myHand.length, handRows]);

  const sortedHand = useMemo(() => sortCards(myHand), [myHand]);
  const myIndex = gameState.players.findIndex(p => p.id === myId);
  const isMyTurn = gameState.currentPlayerId === myId;

  // New logic for checking if any moves are possible
  const noMovesPossible = useMemo(() => {
    if (!isMyTurn) return false;
    return !canPlayAnyMove(myHand, gameState.currentPlayPile, gameState.isFirstTurnOfGame);
  }, [isMyTurn, myHand, gameState.currentPlayPile, gameState.isFirstTurnOfGame]);

  const combosByGroup = useMemo(() => {
    if (!isMyTurn || selectedCardIds.size === 0) return {};
    const pivotId = Array.from(selectedCardIds).pop()!;
    return findAllValidCombos(myHand, pivotId, gameState.currentPlayPile, gameState.isFirstTurnOfGame);
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
    if (validateMove(cards, gameState.currentPlayPile, gameState.isFirstTurnOfGame).isValid) {
      onPlayCards(cards);
      setSelectedCardIds(new Set());
      setHandRows(1); // Explicitly reset to 1 row after playing
    }
  };

  const handleClear = () => {
    setSelectedCardIds(new Set());
    setHandRows(1); // Explicitly reset when clearing
  };

  const currentSelectionIsValid = useMemo(() => {
    if (selectedCardIds.size === 0) return false;
    const cards = myHand.filter(c => selectedCardIds.has(c.id));
    return validateMove(cards, gameState.currentPlayPile, gameState.isFirstTurnOfGame).isValid;
  }, [selectedCardIds, myHand, gameState.currentPlayPile, gameState.isFirstTurnOfGame]);

  const hasSelection = selectedCardIds.size > 0;
  const lastTurn = gameState.currentPlayPile[gameState.currentPlayPile.length - 1];

  return (
    <div className="fixed inset-0 w-full h-full bg-[#030303] overflow-hidden select-none">
      <BoardSurface themeId={backgroundTheme} />

      {showInstructions && <InstructionsModal onClose={() => setShowInstructions(false)} />}

      {/* RENDER EMOTES */}
      {activeEmotes.map(ae => {
        const playerIdx = gameState.players.findIndex(p => p.id === ae.playerId);
        if (playerIdx === -1) return null;
        const pos = getPlayerPosition(playerIdx);
        return <EmoteBubble key={ae.id} emote={ae.emote} remoteEmotes={remoteEmotes} position={pos as any} />;
      })}

      {/* Top Action Bar */}
      <div className="absolute top-4 right-4 sm:top-8 sm:right-8 landscape:top-2 landscape:right-4 z-[150] flex portrait:flex-col landscape:flex-row items-center gap-3 sm:gap-4">
        <button onClick={onOpenSettings} className="w-10 h-10 sm:w-11 sm:h-11 landscape:w-9 landscape:h-9 rounded-2xl landscape:rounded-xl bg-black/40 backdrop-blur-2xl border border-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all shadow-xl hover:scale-110">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 landscape:h-4 landscape:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        </button>

        <div className="relative">
          <button 
            onClick={() => setShowEmotePicker(!showEmotePicker)}
            className={`w-10 h-10 sm:w-11 sm:h-11 landscape:w-9 landscape:h-9 rounded-2xl landscape:rounded-xl bg-black/40 backdrop-blur-2xl border border-white/10 flex items-center justify-center text-xl sm:text-2xl landscape:text-lg transition-all shadow-xl hover:scale-110 active:scale-95 group ${showEmotePicker ? 'ring-2 ring-yellow-500 bg-black/80' : ''}`}
          >
            <span className="group-hover:rotate-12 transition-transform">😊</span>
          </button>
          {showEmotePicker && (
            <div className="absolute top-12 sm:top-14 landscape:top-10 right-0 bg-black/95 backdrop-blur-3xl border border-white/10 p-5 rounded-[2rem] sm:rounded-[2.5rem] shadow-[0_30px_100px_rgba(0,0,0,1)] animate-in zoom-in-95 duration-200 w-[240px] sm:w-[280px] grid grid-cols-4 gap-3 sm:gap-4 z-[200]">
               {availableEmotes.map(trigger => (
                 <button key={trigger} onClick={() => sendEmote(trigger)} className="aspect-square rounded-xl sm:rounded-2xl hover:bg-white/5 border border-transparent hover:border-white/10 flex items-center justify-center transition-all hover:scale-110">
                   <VisualEmote trigger={trigger} remoteEmotes={remoteEmotes} size="md" />
                 </button>
               ))}
            </div>
          )}
        </div>

        <button onClick={() => setShowInstructions(true)} className="w-10 h-10 sm:w-11 sm:h-11 landscape:w-9 landscape:h-9 rounded-2xl landscape:rounded-xl bg-black/40 backdrop-blur-2xl border border-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all shadow-xl hover:scale-110">
          <span className="text-lg font-black landscape:text-sm">?</span>
        </button>
      </div>

      <div className={`fixed z-[150] transition-all duration-700 pointer-events-none ${isMyTurn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} 
        landscape:top-12 landscape:right-4 landscape:left-auto landscape:bottom-auto
        portrait:hidden flex flex-col items-center gap-2`}>
        <div className="bg-emerald-600/90 text-white px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-[0.3em] shadow-[0_0_20px_rgba(16,185,129,0.3)] animate-pulse border border-emerald-400/20 backdrop-blur-md">
          Your Turn
        </div>
        {noMovesPossible && (
          <div className="bg-rose-600/90 text-white px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-[0.3em] shadow-[0_0_20px_rgba(225,29,72,0.3)] animate-bounce border border-rose-400/20 backdrop-blur-md">
            No Moves Possible
          </div>
        )}
      </div>

      <div className="fixed top-4 left-4 z-[150] flex flex-col items-start gap-4 transition-all duration-500">
          {lastTurn && (
            <div className={`bg-black/80 backdrop-blur-xl border border-white/10 px-4 py-1.5 rounded-full flex items-center gap-2 shadow-2xl transition-all duration-500
              landscape:opacity-100 portrait:hidden`}>
              <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">
                {gameState.players.find(p => p.id === lastTurn.playerId)?.name}'S MOVE
              </span>
            </div>
          )}

          {isMyTurn && hasSelection && Object.keys(combosByGroup).length > 0 && (
            <div className="flex flex-col gap-2 max-h-[45vh] overflow-y-auto no-scrollbar animate-in slide-in-from-left-4 fade-in duration-300">
               {Object.entries(combosByGroup).map(([type, variations]) => {
                  if (variations.length === 0) return null;
                  const currentIndex = variations.findIndex(v => 
                    v.length === selectedCardIds.size && v.every(c => selectedCardIds.has(c.id))
                  );
                  const isCurrentOfType = currentIndex !== -1;
                  const handleCycle = () => {
                    const nextIdx = (currentIndex + 1) % variations.length;
                    setSelectedCardIds(new Set(variations[nextIdx].map(c => c.id)));
                  };
                  return (
                    <button 
                      key={type}
                      onClick={handleCycle}
                      className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border shadow-lg whitespace-nowrap flex items-center gap-2
                        ${isCurrentOfType 
                          ? 'bg-yellow-500 text-black border-yellow-400 scale-105 shadow-yellow-500/30' 
                          : 'bg-black/80 text-yellow-500 border-yellow-500/40 hover:bg-yellow-500/10'}`}
                    >
                      <span>{type.replace('_', ' ')}</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[7px] ${isCurrentOfType ? 'bg-black/20 text-black' : 'bg-yellow-500/10 text-yellow-500/60'}`}>
                        {isCurrentOfType ? currentIndex + 1 : 0} / {variations.length}
                      </span>
                    </button>
                  );
               })}
            </div>
          )}
      </div>

      {/* Opponent Slots */}
      <div className="absolute inset-0 p-4 sm:p-12 landscape:p-4 grid grid-cols-3 grid-rows-3 pointer-events-none z-10">
        <div className="col-start-2 row-start-1 flex justify-center items-start pt-2">
          {opponents.find(o => o.position === 'top') && (
            <PlayerSlot player={opponents.find(o => o.position === 'top')!.player} position="top" isTurn={gameState.currentPlayerId === opponents.find(o => o.position === 'top')!.player.id} remoteEmotes={remoteEmotes} coverStyle={cardCoverStyle} />
          )}
        </div>
        <div className="col-start-1 row-start-2 flex justify-start items-center pl-2 landscape:pl-0">
          {opponents.find(o => o.position === 'left') && (
            <PlayerSlot player={opponents.find(o => o.position === 'left')!.player} position="left" isTurn={gameState.currentPlayerId === opponents.find(o => o.position === 'left')!.player.id} remoteEmotes={remoteEmotes} coverStyle={cardCoverStyle} />
          )}
        </div>
        <div className="col-start-3 row-start-2 flex justify-end items-center pr-2 landscape:pr-0">
          {opponents.find(o => o.position === 'right') && (
            <PlayerSlot player={opponents.find(o => o.position === 'right')!.player} position="right" isTurn={gameState.currentPlayerId === opponents.find(o => o.position === 'right')!.player.id} remoteEmotes={remoteEmotes} coverStyle={cardCoverStyle} />
          )}
        </div>
      </div>

      {/* Play Area */}
      <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-500 ${isMyTurn ? (handRows === 2 ? 'portrait:-translate-y-28' : 'portrait:-translate-y-20') : 'landscape:translate-y-0 portrait:-translate-y-12'}`}>
        <div className="relative flex flex-col items-center">
          {gameState.currentPlayPile.length > 0 ? (
            <div className="flex flex-col items-center gap-4 sm:gap-6 animate-in zoom-in duration-300 scale-90 sm:scale-125 landscape:scale-75">
               <div className="flex -space-x-12 sm:-space-x-14">
                {gameState.currentPlayPile[gameState.currentPlayPile.length - 1].cards.map((c, i) => (
                   <div key={c.id} style={{ transform: `rotate(${(i - 1) * 8}deg) translateY(${i % 2 === 0 ? '-15px' : '0px'})` }}>
                     <Card card={c} className="shadow-2xl ring-1 ring-white/10" />
                   </div>
                ))}
               </div>
               <div className="bg-black/80 backdrop-blur-xl border border-white/10 px-6 py-2 rounded-full flex items-center gap-2 shadow-2xl landscape:hidden">
                  <span className="text-[11px] font-black text-yellow-500 uppercase tracking-widest">
                    {gameState.players.find(p => p.id === lastTurn?.playerId)?.name}'S MOVE
                  </span>
               </div>
            </div>
          ) : (
            <div className="opacity-10 scale-75 sm:scale-100 border-2 border-dashed border-white/40 rounded-[3rem] p-24 sm:p-28 landscape:p-16">
               <div className="text-white text-base font-black uppercase tracking-[1em]">Arena</div>
            </div>
          )}
        </div>
      </div>

      {/* Landscape Controls */}
      <div className={`fixed inset-0 pointer-events-none z-[200] transition-all duration-500 ${isMyTurn ? 'opacity-100' : 'opacity-0'}`}>
          <div className="absolute bottom-6 left-6 landscape:flex hidden pointer-events-auto">
              <button 
                onClick={hasSelection ? handleClear : onPassTurn}
                disabled={!isMyTurn || (!hasSelection && gameState.currentPlayPile.length === 0)}
                className={`px-10 py-5 bg-transparent border-2 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-[0_20px_50px_rgba(0,0,0,0.6)] min-w-[140px]
                  ${hasSelection 
                    ? 'bg-zinc-800 border-zinc-700 text-zinc-300 active:bg-zinc-700 active:text-white' 
                    : !hasSelection && gameState.currentPlayPile.length === 0 
                      ? 'border-white/5 text-white/5 grayscale pointer-events-none' 
                      : 'border-rose-600/60 text-rose-500 active:bg-rose-600/10 active:border-rose-500'}`}
              >
                {hasSelection ? 'Clear' : 'Pass'}
              </button>
          </div>

          <div className="absolute bottom-6 right-6 landscape:flex hidden pointer-events-auto">
              <button 
                onClick={handlePlay}
                disabled={!isMyTurn || !currentSelectionIsValid}
                className={`px-12 py-5 rounded-2xl font-black uppercase tracking-[0.25em] text-[12px] transition-all shadow-[0_20px_50px_rgba(0,0,0,0.6)] active:scale-95 min-w-[180px] ${currentSelectionIsValid ? 'bg-gradient-to-r from-emerald-600 via-green-500 to-emerald-600 text-white border border-emerald-400/30' : 'bg-white/5 text-white/20 border border-white/5 grayscale pointer-events-none'}`}
              >
                Play Cards
              </button>
          </div>
      </div>

      {/* Hand & Mobile Controls */}
      <div className="absolute bottom-0 left-0 w-full p-2 sm:p-6 flex flex-col items-center bg-gradient-to-t from-black via-black/40 to-transparent z-40">
        <div className="relative z-[100] flex flex-col items-center gap-3 mb-2 sm:mb-4 w-full landscape:hidden">
          <div className={`portrait:flex hidden transition-all duration-700 pointer-events-none mb-1 ${isMyTurn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} flex-col items-center gap-2`}>
            <div className="bg-emerald-600/90 text-white px-7 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.4em] shadow-[0_0_30px_rgba(16,185,129,0.5)] animate-pulse border border-emerald-400/30 backdrop-blur-md">
              Your Turn
            </div>
            {noMovesPossible && (
              <div className="bg-rose-600/90 text-white px-7 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.4em] shadow-[0_0_30px_rgba(225,29,72,0.5)] animate-bounce border border-rose-400/30 backdrop-blur-md">
                No Moves Possible
              </div>
            )}
          </div>
          <div className={`flex flex-row items-center justify-center gap-3 w-full max-w-sm sm:max-w-none transition-all duration-500 ${isMyTurn ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0 pointer-events-none'}`}>
            <button 
              onClick={hasSelection ? handleClear : onPassTurn}
              disabled={!hasSelection && gameState.currentPlayPile.length === 0}
              className={`flex-1 sm:flex-none px-6 sm:px-8 py-3 bg-transparent border-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-xl min-w-[100px] sm:min-w-[120px]
                ${hasSelection 
                  ? 'bg-zinc-800 border-zinc-700 text-zinc-300 active:bg-zinc-700 active:text-white' 
                  : !hasSelection && gameState.currentPlayPile.length === 0 
                    ? 'border-white/5 text-white/5 grayscale pointer-events-none' 
                    : 'border-rose-600/60 text-rose-500 active:bg-rose-600/10 active:border-rose-500'}`}
            >
              {hasSelection ? 'Clear' : 'Pass'}
            </button>
            <button 
              onClick={handlePlay}
              disabled={!currentSelectionIsValid}
              className={`flex-[2] sm:flex-none px-6 sm:px-12 py-4 rounded-2xl font-black uppercase tracking-[0.25em] text-[11px] transition-all shadow-[0_20px_50px_rgba(0,0,0,0.6)] active:scale-95 min-w-[150px] sm:min-w-[180px] ${currentSelectionIsValid ? 'bg-gradient-to-r from-emerald-600 via-green-500 to-emerald-600 text-white border border-emerald-400/30' : 'bg-white/5 text-white/20 border border-white/5 grayscale pointer-events-none'}`}
            >
              Play Cards
            </button>
          </div>
        </div>
        <div className="relative group/hand flex items-center justify-center w-full max-w-[96vw] overflow-visible px-2 sm:px-4">
           {/* Smooth Hand Container with stable padding/gap transitions */}
           <div className={`
             flex transition-all duration-500 ease-in-out origin-bottom will-change-[max-width,gap,transform]
             landscape:py-2 landscape:scale-[0.6] landscape:sm:scale-[0.8] landscape:-space-x-14 landscape:sm:-space-x-16
             portrait:pt-4 portrait:pb-16 portrait:scale-[0.95] portrait:sm:scale-[1.2]
             ${handRows === 2 ? 'portrait:flex-wrap portrait:justify-center portrait:-space-x-10 portrait:max-w-[360px]' : 'portrait:flex-nowrap portrait:-space-x-[12vw] portrait:sm:-space-x-14 portrait:max-w-full'}
           `}>
            {sortedHand.map((c) => (
              <Card 
                key={c.id} 
                card={c} 
                selected={selectedCardIds.has(c.id)}
                onClick={() => toggleCard(c.id)}
                className={`transform transition-all duration-500 ease-in-out ${isMyTurn ? 'cursor-pointer active:scale-110 sm:hover:z-50 sm:hover:-translate-y-12' : 'cursor-default grayscale-[0.5] scale-95 opacity-80'} ${handRows === 2 ? 'portrait:m-0.5' : ''}`}
              />
            ))}
           </div>
        </div>
      </div>

      {/* Action Stack: Row Toggle ONLY (Bottom Right) */}
      <div className="absolute bottom-8 right-8 flex flex-col items-end gap-4 z-[200]">
        {/* Row Toggle Button - Conditionally rendered based on selection and hand size */}
        {selectedCardIds.size >= 1 && myHand.length >= 9 && (
          <button
            onClick={() => setHandRows(handRows === 1 ? 2 : 1)}
            className="portrait:flex landscape:hidden w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-black/40 backdrop-blur-md border border-white/10 items-center justify-center text-white/60 hover:text-white hover:bg-black/60 hover:scale-110 active:scale-95 shadow-xl transition-all animate-in zoom-in duration-300"
            title={handRows === 1 ? "Switch to 2 rows" : "Switch to 1 row"}
          >
            {handRows === 1 ? <TwoRowIcon /> : <OneRowIcon />}
          </button>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes emoteFly {
          0% { 
            transform: var(--start-pos); 
            opacity: 0; 
            filter: blur(15px);
          }
          10% {
            opacity: 1;
            filter: blur(0px);
          }
          /* Focus phase with refined middle-ground scale */
          15% { 
            transform: var(--focus-pos); 
            opacity: 1; 
            filter: blur(0px);
          }
          80% { 
            transform: var(--focus-pos); 
            opacity: 1;
            filter: blur(0px);
          }
          /* Final drift exit */
          100% { 
            transform: var(--end-pos); 
            opacity: 0; 
            filter: blur(10px);
          }
        }
        .animate-emote-fly {
          animation: emoteFly 3.2s cubic-bezier(0.19, 1, 0.22, 1) forwards;
        }
      `}} />
    </div>
  );
};
