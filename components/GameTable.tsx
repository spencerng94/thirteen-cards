
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

interface ActiveEmote {
  id: string;
  playerId: string;
  emote: string;
}

const EMOTE_COOLDOWN = 2000;

const SettingsIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3.5" fill="currentColor" fillOpacity="0.2" />
  </svg>
);

const RankBadge: React.FC<{ rank: number }> = ({ rank }) => {
  const configs: Record<number, { emoji: string; bg: string; text: string; label: string }> = {
    1: { emoji: '🥇', bg: 'bg-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.8)]', text: 'text-black', label: 'WINNER' },
    2: { emoji: '🥈', bg: 'bg-gray-300 shadow-[0_0_15px_rgba(209,213,219,0.6)]', text: 'text-black', label: 'ELITE' },
    3: { emoji: '🥉', bg: 'bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.5)]', text: 'text-black', label: 'HONOR' },
    4: { emoji: '💀', bg: 'bg-red-900 shadow-[0_0_10px_rgba(153,27,27,0.4)]', text: 'text-white', label: 'VOID' },
  };

  const config = configs[rank] || configs[4];

  return (
    <div className={`absolute -top-3 -right-3 z-[60] flex flex-col items-center animate-in zoom-in-50 duration-500`}>
      <div className={`w-10 h-10 rounded-full ${config.bg} flex items-center justify-center text-xl border-2 border-white/20 relative group`}>
        <div className="absolute inset-0 rounded-full animate-ping bg-inherit opacity-20"></div>
        {config.emoji}
      </div>
      <span className={`text-[7px] font-black uppercase tracking-widest mt-1 px-1.5 py-0.5 rounded ${config.bg} ${config.text} scale-90`}>{config.label}</span>
    </div>
  );
};

const PlayerSlot: React.FC<{ player: Player; position: 'bottom' | 'top' | 'left' | 'right'; isTurn: boolean; remoteEmotes: Emote[]; coverStyle: CardCoverStyle; turnEndTime?: number; sleeveEffectsEnabled?: boolean; className?: string }> = ({ player, position, isTurn, remoteEmotes, coverStyle, turnEndTime, sleeveEffectsEnabled, className = '' }) => {
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
  
  const getGlowClass = () => {
    if (!isFinished) return '';
    switch(player.finishedRank) {
      case 1: return 'shadow-[0_0_40px_rgba(234,179,8,0.4)] border-yellow-400 ring-2 ring-yellow-400/20';
      case 2: return 'shadow-[0_0_30px_rgba(209,213,219,0.3)] border-gray-300 ring-2 ring-yellow-400/10';
      case 3: return 'shadow-[0_0_20px_rgba(249,115,22,0.2)] border-orange-500 ring-2 ring-orange-500/10';
      default: return 'shadow-[0_0_15px_rgba(153,27,27,0.2)] border-red-900 opacity-50 grayscale';
    }
  };

  return (
    <div className={`relative flex transition-all duration-150 ease-[0.2,0,0,1] ${isFinished ? 'scale-100' : 'opacity-100'} 
      ${position === 'top' ? 'flex-row items-center gap-3 sm:gap-8' : 
        (position === 'left' ? 'flex-col landscape:flex-row items-center gap-6 sm:gap-8 landscape:gap-4' :
         position === 'right' ? 'flex-col landscape:flex-row-reverse items-center gap-6 sm:gap-8 landscape:gap-4' :
         'flex-col items-center gap-6 sm:gap-8')} ${className}`}>
        
        <div className="relative flex flex-col items-center shrink-0">
            <div className="relative w-16 h-16 sm:w-24 sm:h-24 landscape:w-24 landscape:h-24">
                {isTurn && !isFinished && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className={`absolute inset-[-12px] landscape:inset-[-10px] rounded-full border-2 ${timeLeft <= 3 && timeLeft > 0 ? 'border-rose-500' : 'border-yellow-500/60 shadow-[0_0_15px_rgba(234,179,8,0.4)]'} animate-turn-ping-slow`}></div>
                    <div className={`absolute inset-[-12px] landscape:inset-[-10px] rounded-full border-2 ${timeLeft <= 3 && timeLeft > 0 ? 'border-rose-500/50' : 'border-yellow-500/30'} animate-turn-ping-slow [animation-delay:1.5s]`}></div>
                  </div>
                )}
                
                <div className={`w-full h-full aspect-square rounded-full border-2 transition-all duration-150 ease-out overflow-hidden bg-black/60 shadow-2xl flex items-center justify-center shrink-0 ${isTurn ? (timeLeft <= 3 && timeLeft > 0 ? 'border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.5)]' : 'border-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.4)]') + ' scale-110' : 'border-white/10'} ${getGlowClass()}`}>
                    <VisualEmote trigger={player.avatar} remoteEmotes={remoteEmotes} size="lg" />
                    {isTurn && !isFinished && timeLeft > 0 && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <span className={`text-2xl font-black italic ${timeLeft <= 3 ? 'text-rose-500 animate-pulse' : 'text-white'}`}>{timeLeft}</span>
                        </div>
                    )}
                </div>

                {isFinished && <RankBadge rank={player.finishedRank!} />}

                {player.hasPassed && !isFinished && (
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px] rounded-full flex items-center justify-center z-10">
                        <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest text-center leading-none shadow-lg">Passed</span>
                    </div>
                )}
                {player.isOffline && !isFinished && (
                    <div className="absolute inset-0 bg-amber-600/40 backdrop-blur-[2px] rounded-full flex items-center justify-center z-10 animate-pulse border-2 border-amber-500/50">
                        <span className="text-[8px] font-black text-white uppercase tracking-tighter text-center leading-none shadow-lg">Offline</span>
                    </div>
                )}
            </div>

            <div className={`bg-black/60 backdrop-blur-md px-3 py-0.5 sm:px-4 sm:py-1 rounded-full border min-w-[75px] sm:min-w-[95px] landscape:w-24 landscape:min-w-0 landscape:px-0 text-center shadow-lg mt-1.5 transition-all duration-500 
              ${isFinished ? 'opacity-40 border-white/20' : 
                player.isOffline ? 'border-amber-500/50' : 
                (isTurn ? 'border-yellow-500/50 bg-yellow-950/40 shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'border-white/5')}`}>
                <span className={`text-[8px] sm:text-[10px] font-black uppercase tracking-widest truncate max-w-[65px] sm:max-w-[85px] landscape:max-w-[88px] inline-block transition-colors duration-500
                  ${player.isOffline ? 'text-amber-500' : 
                    (isTurn && !isFinished ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]' : 'text-white/90')}`}>
                  {player.name}
                </span>
            </div>
        </div>

        {!isFinished && position !== 'bottom' && (
            <div className={`relative animate-in slide-in-from-bottom-2 duration-700 shrink-0 transition-transform landscape:scale-[0.7]`}>
                <Card faceDown coverStyle={coverStyle} activeTurn={isTurn} small className="!w-10 !h-14 sm:!w-14 sm:!h-20 shadow-xl opacity-90 border-white/20" disableEffects={!sleeveEffectsEnabled} />
                <div className="absolute -top-2.5 -right-2.5 bg-yellow-500 text-black text-[10px] font-black w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center border-2 border-black shadow-lg ring-1 ring-yellow-400/50">
                    {player.cardCount}
                </div>
            </div>
        )}
    </div>
  );
};

const BombOverlay: React.FC<{ active: boolean }> = ({ active }) => {
  if (!active) return null;
  return (
    <div className="fixed inset-0 z-[500] pointer-events-none flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-red-600/20 animate-bomb-flash"></div>
      <div className="relative flex flex-col items-center">
        <div className="text-8xl md:text-[12rem] font-black italic text-transparent bg-clip-text bg-gradient-to-b from-yellow-400 via-orange-500 to-red-600 uppercase tracking-tighter animate-bomb-text drop-shadow-[0_0_50px_rgba(220,38,38,0.8)]">
          BOMB!
        </div>
        <div className="absolute inset-0 flex items-center justify-center scale-0 animate-bomb-explosion">
          <div className="w-[100vw] h-[100vw] rounded-full bg-gradient-radial from-orange-500/40 via-red-600/20 to-transparent blur-3xl"></div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes bombFlash {
          0% { opacity: 0; }
          10%, 30% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes bombText {
          0% { transform: scale(0.2) rotate(-10deg); opacity: 0; filter: blur(20px); }
          15% { transform: scale(1.1) rotate(5deg); opacity: 1; filter: blur(0px); }
          25% { transform: scale(1) rotate(0deg); }
          80% { transform: scale(1) rotate(0deg); opacity: 1; filter: blur(0px); }
          100% { transform: scale(1.5); opacity: 0; filter: blur(40px); }
        }
        @keyframes bombExplosion {
          0% { transform: scale(0); opacity: 1; }
          40% { transform: scale(1.5); opacity: 1; }
          100% { transform: scale(3); opacity: 0; }
        }
        .animate-bomb-flash { animation: bombFlash 3s ease-out forwards; }
        .animate-bomb-text { animation: bombText 3s cubic-bezier(0.17, 0.67, 0.83, 0.67) forwards; }
        .animate-bomb-explosion { animation: bombExplosion 3s ease-out forwards; }
      `}} />
    </div>
  );
};

const EmoteBubble: React.FC<{ emote: string; remoteEmotes: Emote[]; position: 'bottom' | 'top' | 'left' | 'right' }> = ({ emote, remoteEmotes, position }) => {
  const translations = {
    bottom: { tx: '0', ty: '-28vh' },
    top: { tx: '0', ty: '28vh' },
    left: { tx: '28vw', ty: '0' },
    right: { tx: '-28vw', ty: '0' },
  };

  const trans = translations[position];
  const screenPos = {
    bottom: 'bottom-32 left-1/2 -translate-x-1/2',
    top: 'top-32 left-1/2 -translate-x-1/2',
    left: 'left-32 top-1/2 -translate-y-1/2',
    right: 'right-32 top-1/2 -translate-y-1/2'
  };

  return (
    <div 
      className={`fixed z-[400] ${screenPos[position]} animate-rewarding-emote pointer-events-none`}
      style={{ 
        '--tx': trans.tx,
        '--ty': trans.ty
      } as any}
    >
      <div className="bg-black/50 backdrop-blur-3xl border-2 border-white/20 p-2 rounded-full shadow-[0_0_60px_rgba(255,255,255,0.1)] flex items-center justify-center scale-[1.3] ring-1 ring-white/10">
        <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
            <VisualEmote trigger={emote} remoteEmotes={remoteEmotes} size="lg" />
        </div>
      </div>
    </div>
  );
};

export const GameTable: React.FC<any> = ({ 
  gameState, myId, myHand, onPlayCards, onPassTurn, cardCoverStyle, backgroundTheme, onOpenSettings, profile, playAnimationsEnabled = true
}) => {
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const [showEmotePicker, setShowEmotePicker] = useState(false);
  const [activeEmotes, setActiveEmotes] = useState<ActiveEmote[]>([]);
  const [remoteEmotes, setRemoteEmotes] = useState<Emote[]>([]);
  const [showInstructions, setShowInstructions] = useState(false);
  const [handRows, setHandRows] = useState<1 | 2>(1);
  const [showBombEffect, setShowBombEffect] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const lastEmoteSentAt = useRef<number>(0);

  const isMyTurn = gameState.currentPlayerId === myId;
  const me = gameState.players.find((p: any) => p.id === myId);
  const isFinished = !!me?.finishedRank;
  // Fix: Explicitly cast gameState to any to handle potential inference issues with length property on currentPlayPile
  const isLeader = !(gameState as any).currentPlayPile || (gameState as any).currentPlayPile.length === 0;
  // Fix: Explicitly cast gameState to any to handle potential inference issues with length property on currentPlayPile
  const lastMove = (gameState as any).currentPlayPile && (gameState as any).currentPlayPile.length > 0 ? (gameState as any).currentPlayPile[(gameState as any).currentPlayPile.length - 1] : null;
  const sleeveEffectsEnabled = profile?.sleeve_effects_enabled !== false;

  useEffect(() => {
    if (!isMyTurn) {
      setHandRows(1);
    }
  }, [isMyTurn]);

  useEffect(() => {
    if (lastMove && ['QUAD', 'BOMB', '4_PAIRS'].includes(lastMove.comboType)) {
      setShowBombEffect(true);
      setIsShaking(true);
      audioService.playBomb();
      const t1 = setTimeout(() => setShowBombEffect(false), 3000);
      const t2 = setTimeout(() => setIsShaking(false), 500);
      return () => { 
        clearTimeout(t1); 
        clearTimeout(t2); 
      };
    } else {
      setShowBombEffect(false);
    }
    // Fix: Explicitly check for length property access on potentially 'unknown' type 'cards' using proper type casting by using any for safer access
  }, [((lastMove as any)?.cards as any[])?.length, (lastMove as any)?.playerId, (lastMove as any)?.comboType]);

  const unlockedAvatars = useMemo(() => {
    const unlocked = profile?.unlocked_avatars || [];
    return Array.from(new Set([...DEFAULT_AVATARS, ...unlocked]));
  }, [profile]);

  useEffect(() => { if (!isMyTurn) setSelectedCardIds(new Set()); }, [isMyTurn]);
  useEffect(() => { 
    setSelectedCardIds(prev => { 
      const next = new Set<string>(); 
      prev.forEach(id => { if (myHand.some((c: any) => c.id === id)) next.add(id); }); 
      return next; 
    }); 
  }, [myHand]);
  useEffect(() => { fetchEmotes().then(setRemoteEmotes); }, []);

  // Fix: Reconstructed truncated handleReceiveEmote useEffect and fixed missing setActiveEmotes name
  useEffect(() => {
    const handleReceiveEmote = ({ playerId, emote }: { playerId: string; emote: string }) => {
      const id = Math.random().toString();
      setActiveEmotes(prev => [...prev, { id, playerId, emote }]);
      audioService.playEmote();
      setTimeout(() => {
        setActiveEmotes(prev => prev.filter(e => e.id !== id));
      }, 4000);
    };

    socket.on(SocketEvents.RECEIVE_EMOTE, handleReceiveEmote);
    return () => {
      socket.off(SocketEvents.RECEIVE_EMOTE, handleReceiveEmote);
    };
  }, []);

  const handleToggleCard = (id: string) => {
    if (!isMyTurn || isFinished) return;
    setSelectedCardIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handlePlayClick = () => {
    if (!isMyTurn || isFinished || selectedCardIds.size === 0) return;
    const cardsToPlay = myHand.filter((c: any) => selectedCardIds.has(c.id));
    onPlayCards(cardsToPlay);
  };

  const handlePassClick = () => {
    if (!isMyTurn || isFinished || isLeader) return;
    onPassTurn();
  };

  const handleEmoteSelect = (emoteCode: string) => {
    const now = Date.now();
    if (now - lastEmoteSentAt.current < EMOTE_COOLDOWN) return;
    lastEmoteSentAt.current = now;
    socket.emit(SocketEvents.EMOTE_SENT, { roomId: gameState.roomId, emote: emoteCode });
    setShowEmotePicker(false);
  };

  const playersInOrder = useMemo(() => {
    const myIndex = gameState.players.findIndex((p: any) => p.id === myId);
    if (myIndex === -1) return gameState.players;
    const ordered = [];
    for (let i = 0; i < gameState.players.length; i++) {
      ordered.push(gameState.players[(myIndex + i) % gameState.players.length]);
    }
    return ordered;
  }, [gameState.players, myId]);

  const pBottom = playersInOrder[0];
  const pLeft = playersInOrder[1];
  const pTop = playersInOrder[2];
  const pRight = playersInOrder[3];

  const getEmotePosition = (playerId: string) => {
    if (pBottom?.id === playerId) return 'bottom';
    if (pLeft?.id === playerId) return 'left';
    if (pTop?.id === playerId) return 'top';
    if (pRight?.id === playerId) return 'right';
    return 'bottom';
  };

  const canPlaySelected = useMemo(() => {
    if (selectedCardIds.size === 0) return false;
    const cards = myHand.filter((c: any) => selectedCardIds.has(c.id));
    return validateMove(cards, gameState.currentPlayPile, !!gameState.isFirstTurnOfGame, myHand).isValid;
  }, [selectedCardIds, myHand, gameState.currentPlayPile, gameState.isFirstTurnOfGame]);

  return (
    <div className={`fixed inset-0 overflow-hidden select-none transition-transform duration-500 ${isShaking ? 'animate-shake' : ''}`}>
      <BoardSurface themeId={backgroundTheme} />
      
      {showBombEffect && <BombOverlay active={true} />}
      {showInstructions && <InstructionsModal onClose={() => setShowInstructions(false)} />}

      {activeEmotes.map(ae => (
        <EmoteBubble key={ae.id} emote={ae.emote} remoteEmotes={remoteEmotes} position={getEmotePosition(ae.playerId)} />
      ))}

      {/* Arena Grid */}
      <div className="absolute inset-0 grid grid-cols-12 grid-rows-12 p-4 sm:p-8">
        
        {/* Top Player */}
        <div className="col-start-4 col-end-10 row-start-1 row-end-3 flex justify-center items-start pt-4">
          {pTop && <PlayerSlot player={pTop} position="top" isTurn={gameState.currentPlayerId === pTop.id} remoteEmotes={remoteEmotes} coverStyle={cardCoverStyle} turnEndTime={gameState.turnEndTime} sleeveEffectsEnabled={sleeveEffectsEnabled} />}
        </div>

        {/* Left Player */}
        <div className="col-start-1 col-end-3 row-start-4 row-end-9 flex flex-col justify-center items-start pl-4">
          {pLeft && <PlayerSlot player={pLeft} position="left" isTurn={gameState.currentPlayerId === pLeft.id} remoteEmotes={remoteEmotes} coverStyle={cardCoverStyle} turnEndTime={gameState.turnEndTime} sleeveEffectsEnabled={sleeveEffectsEnabled} />}
        </div>

        {/* Right Player */}
        <div className="col-start-11 col-end-13 row-start-4 row-end-9 flex flex-col justify-center items-end pr-4">
          {pRight && <PlayerSlot player={pRight} position="right" isTurn={gameState.currentPlayerId === pRight.id} remoteEmotes={remoteEmotes} coverStyle={cardCoverStyle} turnEndTime={gameState.turnEndTime} sleeveEffectsEnabled={sleeveEffectsEnabled} />}
        </div>

        {/* Play Pile - Center */}
        <div className="col-start-3 col-end-11 row-start-3 row-end-10 flex items-center justify-center relative">
          <div className="w-full h-full flex items-center justify-center pointer-events-none">
            {gameState.currentPlayPile.map((turn: PlayTurn, turnIdx: number) => {
                const isLastTurn = turnIdx === gameState.currentPlayPile.length - 1;
                return (
                  <div key={turnIdx} className={`absolute transition-all duration-700 ${isLastTurn ? 'z-20 scale-100' : 'z-10 scale-90 opacity-40 -translate-y-4'} ${playAnimationsEnabled ? 'animate-card-toss' : ''}`}>
                    <div className="flex -space-x-12 sm:-space-x-16">
                      {turn.cards.map((c, i) => (
                        <div key={c.id} style={{ 
                            transform: `rotate(${(i - (turn.cards.length-1)/2) * 5}deg) translateY(${Math.abs(i - (turn.cards.length-1)/2) * 4}px)`,
                            zIndex: i 
                        }}>
                          <Card card={c} coverStyle={cardCoverStyle} disableEffects={!sleeveEffectsEnabled} activeTurn={true} small={turn.cards.length > 5} />
                        </div>
                      ))}
                    </div>
                  </div>
                );
            })}
            
            {isLeader && !isFinished && (
               <div className="bg-white/5 border border-white/10 px-8 py-4 rounded-3xl backdrop-blur-xl animate-pulse flex flex-col items-center">
                  <span className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.6em] mb-1">Sector Clear</span>
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Waiting for Deployment</span>
               </div>
            )}
          </div>
        </div>

        {/* Bottom Control Area */}
        <div className="col-start-1 col-end-13 row-start-10 row-end-13 flex flex-col items-center justify-end gap-4 sm:gap-6 pb-2 sm:pb-8">
            
            {/* User Hand */}
            {!isFinished && (
              <div className="relative w-full max-w-5xl px-4 flex flex-col items-center">
                  {isMyTurn && !isFinished && (
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/40 backdrop-blur-xl border border-white/10 px-6 py-2 rounded-full shadow-2xl animate-in slide-in-from-bottom-2">
                       <span className="text-[9px] font-black text-yellow-500 uppercase tracking-[0.4em]">Combat Active</span>
                       <div className="w-2 h-2 rounded-full bg-yellow-500 animate-ping"></div>
                    </div>
                  )}

                  <div className={`flex flex-wrap justify-center items-end ${handRows === 2 ? 'gap-y-4 gap-x-2' : '-space-x-10 sm:-space-x-14'} transition-all duration-300`}>
                      {sortCards(myHand).map((c: any, i) => (
                        <div key={c.id} className="relative transition-transform duration-200">
                           <Card 
                            card={c} 
                            selected={selectedCardIds.has(c.id)} 
                            onClick={() => handleToggleCard(c.id)} 
                            coverStyle={cardCoverStyle}
                            disableEffects={!sleeveEffectsEnabled}
                            activeTurn={isMyTurn}
                           />
                        </div>
                      ))}
                  </div>
              </div>
            )}

            {/* Action HUD */}
            <div className="flex items-center gap-3 sm:gap-6 w-full max-w-3xl px-4">
                <button 
                  onClick={onOpenSettings}
                  className="w-12 h-12 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 text-white/60 hover:text-white flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-lg"
                >
                  <SettingsIcon />
                </button>

                <div className="flex-1 flex gap-2 sm:gap-4 p-1.5 bg-black/60 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl">
                    <button 
                      onClick={handlePassClick}
                      disabled={!isMyTurn || isLeader || isFinished}
                      className={`flex-1 py-3 sm:py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs transition-all ${!isMyTurn || isLeader || isFinished ? 'opacity-20 grayscale' : 'bg-red-950/40 text-red-500 border border-red-500/20 hover:bg-red-900/60 active:scale-95'}`}
                    >
                      Pass Turn
                    </button>
                    <button 
                      onClick={handlePlayClick}
                      disabled={!isMyTurn || isFinished || !canPlaySelected}
                      className={`flex-[1.5] py-3 sm:py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs transition-all ${!isMyTurn || isFinished || !canPlaySelected ? 'opacity-20 grayscale' : 'bg-gradient-to-r from-emerald-700 via-green-500 to-emerald-700 text-white shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:scale-105 active:scale-95'}`}
                    >
                      Strike Arena ⚔️
                    </button>
                </div>

                <div className="relative">
                  <button 
                    onClick={() => setShowEmotePicker(!showEmotePicker)}
                    className={`w-12 h-12 rounded-2xl bg-black/60 backdrop-blur-xl border flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-lg ${showEmotePicker ? 'border-yellow-500 text-yellow-500' : 'border-white/10 text-white/60 hover:text-white'}`}
                  >
                    <span className="text-2xl">💬</span>
                  </button>

                  {showEmotePicker && (
                    <div className="absolute bottom-16 right-0 bg-black/80 backdrop-blur-2xl border border-white/10 p-3 rounded-3xl shadow-2xl grid grid-cols-4 gap-2 animate-in slide-in-from-bottom-4 duration-200 z-50">
                        {unlockedAvatars.map(emote => (
                          <button key={emote} onClick={() => handleEmoteSelect(emote)} className="w-10 h-10 hover:bg-white/10 rounded-xl transition-all flex items-center justify-center overflow-hidden">
                             <VisualEmote trigger={emote} remoteEmotes={remoteEmotes} size="sm" />
                          </button>
                        ))}
                    </div>
                  )}
                </div>
            </div>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes turn-ping-slow {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        @keyframes card-toss {
          0% { transform: scale(1.5) translateY(100px); opacity: 0; filter: blur(10px); }
          100% { transform: scale(1) translateY(0); opacity: 1; filter: blur(0); }
        }
        @keyframes rewarding-emote {
          0% { transform: translate(0, 0) scale(0); opacity: 0; }
          15% { transform: translate(0, 0) scale(1.2); opacity: 1; }
          25% { transform: translate(0, 0) scale(1); }
          75% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
        }
        @keyframes shake {
          0%, 100% { transform: translate(0, 0); }
          10%, 30%, 50%, 70%, 90% { transform: translate(-5px, -5px); }
          20%, 40%, 60%, 80% { transform: translate(5px, 5px); }
        }
        .animate-turn-ping-slow { animation: turn-ping-slow 3s ease-out infinite; }
        .animate-card-toss { animation: card-toss 0.4s cubic-bezier(0.17, 0.67, 0.83, 0.67) forwards; }
        .animate-rewarding-emote { animation: rewarding-emote 4s cubic-bezier(0.17, 0.67, 0.83, 0.67) forwards; }
        .animate-shake { animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both; }
      `}} />
    </div>
  );
};
