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
  currentDifficulty?: AiDifficulty;
  onChangeDifficulty?: (d: AiDifficulty) => void;
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;
  playAnimationsEnabled?: boolean;
  onOpenSettings: () => void;
  profile?: UserProfile | null;
}

interface ActiveEmote {
  id: string;
  playerId: string;
  emote: string;
}

const EMOTE_COOLDOWN = 2000;

const SettingsIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
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
                    <div className={`absolute inset-[-12px] landscape:inset-[-10px] rounded-full border-2 ${timeLeft <= 3 && timeLeft > 0 ? 'border-rose-500' : 'border-emerald-500/50'} animate-ping`}></div>
                )}
                
                <div className={`w-full h-full aspect-square rounded-full border-2 transition-all duration-150 ease-out overflow-hidden bg-black/60 shadow-2xl flex items-center justify-center shrink-0 ${isTurn ? (timeLeft <= 3 && timeLeft > 0 ? 'border-rose-500' : 'border-emerald-400') + ' scale-110' : 'border-white/10'} ${getGlowClass()}`}>
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

            <div className={`bg-black/60 backdrop-blur-md px-3 py-0.5 sm:px-4 sm:py-1 rounded-full border min-w-[75px] sm:min-w-[95px] landscape:w-24 landscape:min-w-0 landscape:px-0 text-center shadow-lg mt-1.5 transition-colors ${player.isOffline ? 'border-amber-500/50' : 'border-white/5'} ${isFinished ? 'opacity-40 border-white/20' : ''}`}>
                <span className={`text-[8px] sm:text-[10px] font-black uppercase tracking-widest truncate max-w-[65px] sm:max-w-[85px] landscape:max-w-[88px] inline-block ${player.isOffline ? 'text-amber-500' : 'text-white/90'}`}>
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

export const GameTable: React.FC<GameTableProps> = ({ 
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
  const [timeLeft, setTimeLeft] = useState(0);

  const isMyTurn = gameState.currentPlayerId === myId;
  const me = gameState.players.find(p => p.id === myId);
  const isFinished = !!me?.finishedRank;
  const isLeader = !gameState.currentPlayPile || gameState.currentPlayPile.length === 0;
  const sleeveEffectsEnabled = profile?.sleeve_effects_enabled !== false;

  useEffect(() => {
    if (!isMyTurn) {
      setHandRows(1);
    }
  }, [isMyTurn]);

  const lastMove = gameState.currentPlayPile && gameState.currentPlayPile.length > 0 ? gameState.currentPlayPile[gameState.currentPlayPile.length - 1] : null;
  
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
  }, [lastMove?.cards.length, lastMove?.playerId, lastMove?.comboType]);

  const unlockedAvatars = useMemo(() => {
    const unlocked = profile?.unlocked_avatars || [];
    return Array.from(new Set([...DEFAULT_AVATARS, ...unlocked]));
  }, [profile]);

  useEffect(() => { if (!isMyTurn) setSelectedCardIds(new Set()); }, [isMyTurn]);
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
    if (!isMyTurn || !gameState.turnEndTime) { setTimeLeft(0); return; }
    const update = () => { const remaining = Math.max(0, Math.ceil((gameState.turnEndTime! - Date.now()) / 1000)); setTimeLeft(remaining); };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [isMyTurn, gameState.turnEndTime]);

  const noMovesPossible = useMemo(() => { 
    if (!isMyTurn) return false; 
    return !canPlayAnyMove(myHand, gameState.currentPlayPile || [], !!gameState.isFirstTurnOfGame); 
  }, [isMyTurn, myHand, gameState.currentPlayPile, gameState.isFirstTurnOfGame]);

  const validationResult = useMemo(() => { 
    if (selectedCardIds.size === 0) return { isValid: false, reason: '' }; 
    const cards = myHand.filter(c => selectedCardIds.has(c.id)); 
    return validateMove(cards, gameState.currentPlayPile || [], !!gameState.isFirstTurnOfGame, myHand); 
  }, [selectedCardIds, myHand, gameState.currentPlayPile, gameState.isFirstTurnOfGame]);

  const combosByGroup = useMemo<Record<string, CardType[][]>>(() => { 
    if (!isMyTurn || selectedCardIds.size === 0) return {}; 
    const pivotId = Array.from(selectedCardIds).pop() as string; 
    return findAllValidCombos(myHand, pivotId, gameState.currentPlayPile || [], !!gameState.isFirstTurnOfGame); 
  }, [selectedCardIds, myHand, gameState.currentPlayPile, isMyTurn, gameState.isFirstTurnOfGame]);

  const hasValidCombos = useMemo(() => {
    return Object.values(combosByGroup).some(list => list.length > 0);
  }, [combosByGroup]);

  const sendEmote = (triggerCode: string) => { if (Date.now() - lastEmoteSentAt.current < EMOTE_COOLDOWN) return; lastEmoteSentAt.current = Date.now(); socket.emit(SocketEvents.EMOTE_SENT, { roomId: gameState.roomId, emote: triggerCode }); setShowEmotePicker(false); const id = Math.random().toString(); setActiveEmotes(prev => [...prev, { id, playerId: myId, emote: triggerCode }]); audioService.playEmote(); setTimeout(() => setActiveEmotes(prev => prev.filter(e => e.id !== id)), 3000); };

  const getPlayerPosition = (index: number) => { const relativeIndex = (index - myIndex + gameState.players.length) % gameState.players.length; switch(relativeIndex) { case 0: return 'bottom'; case 1: return 'left'; case 2: return 'top'; case 3: return 'right'; default: return 'bottom'; } };

  const opponents = useMemo(() => { return gameState.players.map((p, i) => ({ player: p, index: i, position: getPlayerPosition(i) })).filter(o => o.position !== 'bottom'); }, [gameState.players, myId, myIndex]);

  const toggleCard = (id: string) => { if (!isMyTurn) return; const next = new Set(selectedCardIds); if (next.has(id)) next.delete(id); else next.add(id); setSelectedCardIds(next); };

  const handlePlay = () => { 
    if (selectedCardIds.size === 0 || !isMyTurn) return; 
    const cards = myHand.filter(c => selectedCardIds.has(c.id)); 
    const res = validateMove(cards, gameState.currentPlayPile || [], !!gameState.isFirstTurnOfGame, myHand);
    if (res.isValid) { 
      onPlayCards(cards); 
    } 
  };

  const handleDynamicAction = () => {
    if (!isMyTurn) return;
    if (selectedCardIds.size === 0) {
      if (!isLeader) onPassTurn();
    } else {
      setSelectedCardIds(new Set());
    }
  };

  const cycleComboType = (type: string) => {
    const list = combosByGroup[type];
    if (!list || list.length === 0) return;
    let targetIndex = list.findIndex(combo => 
      combo.length === selectedCardIds.size && 
      combo.every(c => selectedCardIds.has(c.id))
    );
    
    if (targetIndex !== -1) {
      targetIndex = (targetIndex + 1) % list.length;
    } else {
      targetIndex = 0;
    }
    
    setSelectedCardIds(new Set(list[targetIndex].map(c => c.id)));
    audioService.playExpandHand(); 
  };

  const spacing = { 
    landscape: handRows >= 2 
        ? '-space-x-4 sm:-space-x-8 lg:-space-x-10 xl:-space-x-4' 
        : (selectedCardIds.size > 0 
            ? 'landscape:-space-x-8 sm:landscape:-space-x-10 xl:landscape:-space-x-4' 
            : 'landscape:-space-x-10 sm:landscape:-space-x-12 xl:landscape:-space-x-6'), 
    portrait: handRows >= 2 
        ? '-space-x-6 sm:-space-x-10' 
        : (selectedCardIds.size > 0 
            ? 'portrait:-space-x-[8vw] sm:portrait:-space-x-10' 
            : 'portrait:-space-x-[11vw] sm:portrait:-space-x-14')
  };

  const topOpponent = opponents.find(o => o.position === 'top');
  const leftOpponent = opponents.find(o => o.position === 'left');
  const rightOpponent = opponents.find(o => o.position === 'right');

  const iHave3Spades = useMemo(() => myHand.some(c => c.rank === Rank.Three && c.suit === Suit.Spades), [myHand]);

  const lastMovePlayerPosition = useMemo(() => {
    if (!lastMove) return null;
    const idx = gameState.players.findIndex(p => p.id === lastMove.playerId);
    return getPlayerPosition(idx);
  }, [lastMove, gameState.players, myIndex]);

  const arrivalAnimationClass = useMemo(() => {
    if (!lastMovePlayerPosition || !playAnimationsEnabled) return '';
    switch(lastMovePlayerPosition) {
        case 'bottom': return 'animate-play-from-bottom';
        case 'top': return 'animate-play-from-top';
        case 'left': return 'animate-play-from-left';
        case 'right': return 'animate-play-from-right';
        default: return '';
    }
  }, [lastMovePlayerPosition, playAnimationsEnabled]);

  const turnIndicatorUI = (
    <div className={`flex flex-col items-center gap-2 transition-all duration-700 pointer-events-none ${isMyTurn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className={`px-6 py-2 rounded-full border-2 backdrop-blur-md flex items-center gap-3 transition-colors ${timeLeft <= 3 && timeLeft > 0 ? 'bg-rose-600/90 border-rose-400' : 'bg-emerald-600/90 border-emerald-400'}`}>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white">
            {isLeader && gameState.isFirstTurnOfGame && iHave3Spades ? '3♠ YOUR TURN' : (isLeader ? 'YOUR LEAD' : 'Your Turn')}
            </span>
            {timeLeft > 0 && (<><div className="w-[1px] h-4 bg-white/20"></div><span className={`text-sm font-black italic text-white ${timeLeft <= 3 ? 'animate-pulse' : ''}`}>{timeLeft}s</span></>)}
        </div>
        {noMovesPossible && selectedCardIds.size === 0 && (<div className="bg-rose-600/90 text-white px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-[0.3em] shadow-[0_0_20px_rgba(225,29,72,0.3)] animate-bounce border border-rose-400/20 backdrop-blur-md">No Moves Possible</div>)}
    </div>
  );

  const passButtonUI = (
    <button 
      onClick={handleDynamicAction} 
      disabled={selectedCardIds.size === 0 && isLeader}
      className={`w-full h-full flex flex-col items-center justify-center border-2 rounded-2xl shadow-xl transition-all active:scale-95 bg-black/40 ${selectedCardIds.size === 0 ? (isLeader ? 'opacity-20 border-white/5 text-white/20 grayscale cursor-not-allowed' : 'border-rose-600/60 text-rose-500 hover:bg-rose-950/20') : 'border-zinc-700 text-zinc-300 bg-zinc-900/60'}`}
    >
      <span className="text-[10px] font-black uppercase tracking-widest">{selectedCardIds.size === 0 ? 'Pass' : 'Clear'}</span>
      <span className="text-[6px] font-bold opacity-40 uppercase tracking-[0.2em] mt-1">{selectedCardIds.size === 0 ? 'Skip Turn' : `${selectedCardIds.size} Selected`}</span>
    </button>
  );

  const playButtonUI = (
    <button 
      onClick={handlePlay} 
      disabled={!validationResult.isValid} 
      className={`w-full h-full flex flex-col items-center justify-center rounded-2xl font-black uppercase tracking-[0.25em] text-[11px] shadow-[0_20px_50px_rgba(0,0,0,0.6)] transition-all active:scale-95 ${validationResult.isValid ? 'bg-gradient-to-r from-emerald-600 to-green-500 text-white' : 'bg-white/5 text-white/20 border border-white/5 grayscale'}`}
    >
      <span>Play Cards</span>
      {validationResult.isValid && <span className="text-[6.5px] opacity-70 tracking-widest mt-0.5">{validationResult.reason}</span>}
    </button>
  );

  const expandButtonUI = (
    <button 
      onClick={() => { setHandRows(r => (r === 1 ? 2 : 1)); audioService.playExpandHand(); }} 
      className="w-full h-full flex flex-col items-center justify-center border-2 border-white/10 bg-black/40 rounded-2xl text-white/40 hover:text-white transition-all active:scale-95"
    >
      <div className="mb-1 text-current">
        {handRows === 1 ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 9V2m0 0l-3 3m3-3l3 3" />
            <path d="M12 15v7m0 0l-3-3m3 3l3-3" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v7m0 0l-3-3m3 3l3-3" />
            <path d="M12 22v-7m0 0l-3 3m3-3l3 3" />
          </svg>
        )}
      </div>
      <span className="text-[7px] font-black uppercase tracking-widest">{handRows === 1 ? '1 ROW' : 'MULTI ROW'}</span>
    </button>
  );

  return (
    <div className={`fixed inset-0 w-full h-full bg-[#030303] overflow-hidden select-none ${isShaking ? 'animate-shake' : ''}`}>
      <BoardSurface themeId={backgroundTheme} />
      <BombOverlay active={showBombEffect} />
      {showInstructions && <InstructionsModal onClose={() => setShowInstructions(false)} />}

      {activeEmotes.map(ae => { const playerIdx = gameState.players.findIndex(p => p.id === ae.playerId); if (playerIdx === -1) return null; return <EmoteBubble key={ae.id} emote={ae.emote} remoteEmotes={remoteEmotes} position={getPlayerPosition(playerIdx) as any} />; })}

      {isMyTurn && selectedCardIds.size > 0 && hasValidCombos && (
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
                        const typeLabel = type === 'RUN' ? 'STRAIGHT' : type === '4_PAIRS' ? '4 PAIRS' : type;
                        const displayIndex = isTypeSelected ? currentIndex + 1 : 1;
                        
                        return ( 
                          <button 
                            key={type} 
                            onClick={() => cycleComboType(type)} 
                            className={`w-full py-2.5 px-3 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all duration-300 text-left flex flex-col group/btn relative overflow-hidden ${isTypeSelected ? 'bg-yellow-500 text-black border-yellow-400' : 'bg-white/[0.04] text-white/60 border-white/10 hover:bg-white/10 hover:text-white'}`}
                          > 
                            <div className="flex justify-between items-center w-full z-10 gap-2"> 
                              <span className="truncate">{typeLabel}</span> 
                              <span className={`text-[8px] opacity-70 whitespace-nowrap ${isTypeSelected ? 'text-black/70' : 'text-yellow-500/70'}`}> 
                                {displayIndex}/{lists.length}
                              </span> 
                            </div> 
                          </button> 
                        ); 
                      })}
                  </div>
              </div>
          </div>
      )}

      {/* Control Nodes (Landscape Only) */}
      <div className="fixed bottom-4 left-4 z-[200] hidden landscape:block w-24 h-16 pointer-events-auto">
          {isMyTurn && passButtonUI}
      </div>

      {/* Local Player Profile (Landscape Only - Pinned flush above PASS button) */}
      <div className="fixed bottom-[80px] left-4 z-[200] hidden landscape:block pointer-events-none transition-all duration-500 w-24 flex justify-center">
          <div className={`${isMyTurn ? 'opacity-100 translate-y-0' : (isFinished ? 'opacity-60 scale-90 translate-y-4' : 'opacity-0 translate-y-20')}`}>
            {me && (
                <PlayerSlot player={me} position="bottom" isTurn={isMyTurn} remoteEmotes={remoteEmotes} coverStyle={cardCoverStyle} sleeveEffectsEnabled={sleeveEffectsEnabled} className="landscape:scale-75" />
            )}
          </div>
      </div>

      {/* Left Opponent (Landscape Only - Stacked parallel above Local Player Profile) */}
      <div className="fixed bottom-[180px] left-4 z-[200] hidden landscape:block pointer-events-none transition-all duration-500 w-24 flex justify-center">
          {leftOpponent && (
              <PlayerSlot player={leftOpponent.player} position="left" isTurn={gameState.currentPlayerId === leftOpponent.player.id} remoteEmotes={remoteEmotes} coverStyle={cardCoverStyle} turnEndTime={gameState.turnEndTime} sleeveEffectsEnabled={sleeveEffectsEnabled} className="landscape:scale-75" />
          )}
      </div>

      <div className="fixed bottom-4 right-4 z-[200] hidden landscape:block w-24 h-16 pointer-events-auto">
          {isMyTurn && playButtonUI}
      </div>

      <div className="fixed bottom-24 right-4 z-[200] hidden landscape:block w-24 h-16 pointer-events-auto">
          {isMyTurn && expandButtonUI}
      </div>

      {/* Right Opponent (Landscape Only - Pinned parallel above Row Expander) */}
      <div className="fixed bottom-[180px] right-4 z-[200] hidden landscape:block pointer-events-none transition-all duration-500 w-24 flex justify-center">
          {rightOpponent && (
              <PlayerSlot player={rightOpponent.player} position="right" isTurn={gameState.currentPlayerId === rightOpponent.player.id} remoteEmotes={remoteEmotes} coverStyle={cardCoverStyle} turnEndTime={gameState.turnEndTime} sleeveEffectsEnabled={sleeveEffectsEnabled} className="landscape:scale-75" />
          )}
      </div>

      <div className="absolute top-4 right-4 sm:top-8 sm:right-8 landscape:top-2 landscape:right-4 z-[150] flex portrait:flex-col landscape:flex-row items-center gap-3 sm:gap-4">
        <div className="flex portrait:flex-col landscape:flex-row items-center gap-3 sm:gap-4">
            <div className="relative">
            <button onClick={() => setShowEmotePicker(!showEmotePicker)} className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-black/40 backdrop-blur-2xl border border-white/10 flex items-center justify-center transition-all shadow-xl hover:scale-110 ${showEmotePicker ? 'text-yellow-400 border-yellow-500/40 bg-black/60' : 'text-white/50 hover:text-white'}`}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg></button>
            {showEmotePicker && ( 
                <div className="absolute top-full right-0 mt-3 p-4 bg-black/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-2xl z-[300] grid grid-cols-3 gap-3 min-w-[200px] sm:min-w-[240px] animate-in fade-in zoom-in-95 duration-200"> 
                {unlockedAvatars.map(emoji => ( 
                    <button 
                    key={emoji} 
                    onClick={() => sendEmote(emoji)} 
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/5 hover:bg-white/15 transition-all flex items-center justify-center p-2 group/emote-btn overflow-hidden"
                    >
                    <VisualEmote trigger={emoji} remoteEmotes={remoteEmotes} size="md" className="group-hover/emote-btn:scale-110 transition-transform duration-300" />
                    </button> 
                ))} 
                </div> 
            )}
            </div>
            <button onClick={onOpenSettings} className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-black/40 backdrop-blur-2xl border border-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all shadow-xl hover:scale-110"><SettingsIcon /></button>
            <button onClick={() => setShowInstructions(true)} className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-black/40 backdrop-blur-2xl border border-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all shadow-xl hover:scale-110"><span className="text-lg font-black">?</span></button>
        </div>

        <div className="hidden landscape:block absolute top-14 right-0 min-w-max transition-all duration-700">
            {turnIndicatorUI}
        </div>
      </div>

      {/* Opponent Grid */}
      <div className="absolute inset-0 p-4 sm:p-12 landscape:p-4 grid grid-cols-3 grid-rows-3 pointer-events-none z-10">
        <div className={`col-start-2 row-start-1 flex justify-center items-start pt-2 landscape:pt-0 landscape:fixed landscape:top-1 landscape:left-1/2 landscape:-translate-x-1/2 transition-transform duration-150 ease-[0.2,0,0,1] ${gameState.currentPlayerId === topOpponent?.player.id ? 'translate-y-8 landscape:translate-y-0' : ''}`}>
          {topOpponent && (<PlayerSlot player={topOpponent.player} position="top" isTurn={gameState.currentPlayerId === topOpponent.player.id} remoteEmotes={remoteEmotes} coverStyle={cardCoverStyle} turnEndTime={gameState.turnEndTime} sleeveEffectsEnabled={sleeveEffectsEnabled} className="landscape:scale-75" />)}
        </div>
        
        <div className={`col-start-1 row-start-2 flex justify-start items-center pl-2 transition-transform duration-150 ease-[0.2,0,0,1] ${isMyTurn ? '-translate-y-32 z-[60]' : (gameState.currentPlayerId === leftOpponent?.player.id ? '-translate-y-16 z-[60]' : '')} landscape:hidden`}>
          {leftOpponent && (<PlayerSlot player={leftOpponent.player} position="left" isTurn={gameState.currentPlayerId === leftOpponent.player.id} remoteEmotes={remoteEmotes} coverStyle={cardCoverStyle} turnEndTime={gameState.turnEndTime} sleeveEffectsEnabled={sleeveEffectsEnabled} />)}
        </div>
        
        <div className={`col-start-3 row-start-2 flex justify-end items-center pr-2 transition-transform duration-150 ease-[0.2,0,0,1] ${gameState.currentPlayerId === rightOpponent?.player.id ? '-translate-y-12' : ''} landscape:hidden`}>
          {rightOpponent && (<PlayerSlot player={rightOpponent.player} position="right" isTurn={gameState.currentPlayerId === rightOpponent.player.id} remoteEmotes={remoteEmotes} coverStyle={cardCoverStyle} turnEndTime={gameState.turnEndTime} sleeveEffectsEnabled={sleeveEffectsEnabled} />)}
        </div>
      </div>

      <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-700 ease-in-out ${isMyTurn ? 'portrait:-translate-y-28 landscape:translate-y-2' : 'portrait:-translate-y-12 landscape:translate-y-2'}`}>
        <div className="relative flex flex-col items-center">
          {lastMove ? (
            <div 
              key={lastMove.playerId + lastMove.cards.map(c => c.id).join('')}
              className={`flex flex-col items-center gap-6 scale-90 sm:scale-125 landscape:scale-[0.65] ${arrivalAnimationClass}`}
            >
               <div className="flex -space-x-12">
                {lastMove.cards.map((c, i) => (
                  <div 
                    key={c.id} 
                    style={{ 
                        transform: `rotate(${(i - 1) * 8}deg) translateY(${i % 2 === 0 ? '-15px' : '0px'})`,
                        animationDelay: playAnimationsEnabled ? `${i * 0.05}s` : '0s'
                    } as any}
                    className={playAnimationsEnabled ? "animate-play-bounce" : ""}
                  >
                    <Card 
                      card={c} 
                      coverStyle={lastMove.playerId === myId ? cardCoverStyle : 'BLUE'} 
                      className="shadow-2xl ring-1 ring-white/10" 
                      disableEffects={!sleeveEffectsEnabled}
                      activeTurn={gameState.currentPlayerId === lastMove.playerId}
                    />
                  </div>
                ))}
               </div>
               <div className="mt-4 landscape:mt-0 flex flex-col items-center opacity-0 animate-[fadeInLabel_0.5s_0.3s_forwards] pointer-events-none z-[100]">
                  <span className="text-[12px] font-black text-yellow-500 uppercase tracking-[0.6em] drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] whitespace-nowrap">{gameState.players.find(p => p.id === lastMove.playerId)?.name || 'PLAYER'}'S MOVE</span>
                  <div className="h-[2px] w-20 bg-yellow-500/40 mt-1 rounded-full shadow-[0_0_12px_rgba(234,179,8,0.5)]"></div>
               </div>
            </div>
          ) : (<div className="opacity-10 border-2 border-dashed border-white/40 rounded-[3rem] p-24"><div className="text-white text-base font-black uppercase tracking-[1em]">Arena</div></div>)}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 w-full p-2 sm:p-4 flex flex-col items-center bg-gradient-to-t from-black via-black/40 to-transparent z-40">
        <div className="mb-3 flex flex-col items-center gap-2 landscape:hidden">
            {turnIndicatorUI}
        </div>

        <div className="relative w-full flex flex-col items-center">
            <div className={`absolute left-4 origin-bottom-left pointer-events-none z-50 transition-all duration-500 landscape:hidden
                ${isMyTurn ? '-top-[95px]' : (isFinished ? '-top-[55px]' : 'top-20 opacity-0')}`}>
              {me && (
                  <PlayerSlot player={me} position="bottom" isTurn={isMyTurn} remoteEmotes={remoteEmotes} coverStyle={cardCoverStyle} sleeveEffectsEnabled={sleeveEffectsEnabled} />
              )}
            </div>

            <div className={`flex flex-row items-stretch justify-center gap-3 w-full max-w-sm mb-3 transition-all duration-500 h-16 ${isMyTurn ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0 pointer-events-none'}`}>
              <div className="relative flex-1 landscape:hidden">
                {passButtonUI}
              </div>

              <div className="flex-[2] landscape:hidden">
                {playButtonUI}
              </div>

              <div className="flex-1 landscape:hidden">
                {expandButtonUI}
              </div>
            </div>
        </div>

        <div className="relative flex items-center justify-center w-full max-w-[96vw] landscape:px-32 sm:landscape:px-12 xl:landscape:px-0">
           <div className={`flex transition-all duration-800 landscape:scale-[0.46] landscape:sm:scale-[0.75] xl:landscape:scale-[0.85] ${spacing.landscape} portrait:pt-2 portrait:scale-[0.9] ${handRows >= 2 ? `flex-wrap justify-center max-w-[340px] sm:max-w-[600px] xl:max-w-[800px] pb-4` : `flex-nowrap ${spacing.portrait} portrait:pb-16 max-w-full`}`}>
            {sortedHand.map((c) => (
              <Card 
                key={c.id} 
                card={c} 
                coverStyle={cardCoverStyle}
                selected={selectedCardIds.has(c.id)} 
                onClick={() => toggleCard(c.id)} 
                disableEffects={!sleeveEffectsEnabled}
                activeTurn={isMyTurn}
                className={`transform transition-all duration-300 ${isMyTurn ? 'cursor-pointer active:scale-110 sm:hover:-translate-y-12' : 'cursor-default opacity-80'} ${handRows >= 2 ? 'm-0.5 sm:m-1' : ''}`} 
              />
            ))}
           </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes rewardingEmote { 
          0% { transform: translate(0, 0) scale(0.5); opacity: 0; filter: blur(10px); } 
          20% { transform: translate(var(--tx), var(--ty)) scale(2.2); opacity: 1; filter: blur(0px); } 
          35% { transform: translate(var(--tx), var(--ty)) scale(2.3); opacity: 1; } 
          75% { transform: translate(var(--tx), calc(var(--ty) - 30px)) scale(2.2); opacity: 1; filter: blur(0px); } 
          100% { transform: translate(var(--tx), calc(var(--ty) - 150px)) scale(2); opacity: 0; filter: blur(20px); } 
        } 
        .animate-rewarding-emote { animation: rewardingEmote 3.8s cubic-bezier(0.19, 1, 0.22, 1) forwards; } 
        @keyframes fadeInLabel { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } } 
        @keyframes shake { 0%, 100% { transform: translate(0,0); } 10%, 30%, 50%, 70%, 90% { transform: translate(-10px, -10px); } 20%, 40%, 60%, 80% { transform: translate(10px, 10px); } } 
        .animate-shake { animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both; }
        
        @keyframes playFromBottom {
          0% { transform: translateY(50vh) rotate(15deg) scale(0.5); opacity: 0; filter: blur(15px); }
          100% { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; filter: blur(0); }
        }
        @keyframes playFromTop {
          0% { transform: translateY(-50vh) rotate(-15deg) scale(0.5); opacity: 0; filter: blur(15px); }
          100% { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; filter: blur(0); }
        }
        @keyframes playFromLeft {
          0% { transform: translateX(-50vw) rotate(-90deg) scale(0.5); opacity: 0; filter: blur(15px); }
          100% { transform: translateX(0) rotate(0deg) scale(1); opacity: 1; filter: blur(0); }
        }
        @keyframes playFromRight {
          0% { transform: translateX(50vw) rotate(90deg) scale(0.5); opacity: 0; filter: blur(15px); }
          100% { transform: translateX(0) rotate(0deg) scale(1); opacity: 1; filter: blur(0); }
        }
        @keyframes playBounce {
          0% { transform: scale(0.8); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }

        .animate-play-from-bottom { animation: playFromBottom 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .animate-play-from-top { animation: playFromTop 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .animate-play-from-left { animation: playFromLeft 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .animate-play-from-right { animation: playFromRight 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .animate-play-bounce { animation: playBounce 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
      ` }} />
    </div>
  );
};