import React, { useState, useEffect, useMemo, useRef, useCallback, memo } from 'react';
import { Card as CardType, GameState, Player, Suit, Rank, PlayTurn, BackgroundTheme, AiDifficulty, GameStatus, SocketEvents, UserProfile, Emote, HubTab } from '../types';
import { Card, CardCoverStyle } from './Card';
import { BoardSurface } from './UserHub';
import { audioService } from '../services/audio';
import { sortCards, validateMove, getComboType, findAllValidCombos, canPlayAnyMove } from '../utils/gameLogic';
import { socket } from '../services/socket';
import { DEFAULT_AVATARS, fetchEmotes, fetchChatPresets, ChatPreset, getFriends } from '../services/supabase';
import { VisualEmote } from './VisualEmote';
import { PlayerProfileModal } from './PlayerProfileModal';
import { QuickChatWheel } from './QuickChatWheel';
import { ChatBubble, ChatStyle } from './ChatBubble';
import { SocialFilter } from './GameSettings';
import { QuickMoveReward } from './QuickMoveReward';

interface ActiveEmote {
  id: string;
  playerId: string;
  emote: string;
}

interface ActiveChat {
  id: string;
  playerId: string;
  phrase: string;
  style: ChatStyle;
}

interface QuickMoveRewardData {
  id: string;
  playerId: string;
  gold: number;
  xp: number;
  isStreak: boolean;
}

const EMOTE_COOLDOWN = 2000;

const SettingsIcon = ({ className = "w-[22px] h-[22px]" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3.5" fill="currentColor" fillOpacity="0.2" />
  </svg>
);

const RankBadge: React.FC<{ rank: number | undefined | null }> = ({ rank }) => {
  // SVG SAFETY: Protect against undefined rank during Ghost Session initialization
  if (rank === undefined || rank === null || !Number.isInteger(rank) || rank < 1) {
    return null; // Don't render badge if rank is invalid
  }

  const configs: Record<number, { emoji: string; bg: string; text: string; label: string }> = {
    1: { emoji: '🥇', bg: 'bg-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.8)]', text: 'text-black', label: 'WINNER' },
    2: { emoji: '🥈', bg: 'bg-gray-300 shadow-[0_0_15px_rgba(209,213,219,0.6)]', text: 'text-black', label: 'ELITE' },
    3: { emoji: '🥉', bg: 'bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.5)]', text: 'text-black', label: 'HONOR' },
    4: { emoji: '💀', bg: 'bg-red-900 shadow-[0_0_10px_rgba(153,27,27,0.4)]', text: 'text-white', label: 'VOID' },
  };

  const config = configs[rank] || configs[4];

  return (
    <div className={`absolute -top-3 -right-3 z-[60] flex flex-col items-center animate-in zoom-in-50 duration-300`}>
      <div className={`w-10 h-10 rounded-full ${config.bg} flex items-center justify-center text-xl border-2 border-white/20 relative group`}>
        <div className="absolute inset-0 rounded-full animate-ping bg-inherit opacity-20"></div>
        {config.emoji}
      </div>
      <span className={`text-[7px] font-black uppercase tracking-widest mt-1 px-1.5 py-0.5 rounded ${config.bg} ${config.text} scale-90`}>{config.label}</span>
    </div>
  );
};

const PlayerSlotComponent: React.FC<{ player: Player; position: 'bottom' | 'top' | 'left' | 'right'; isTurn: boolean; remoteEmotes: Emote[]; coverStyle: CardCoverStyle; turnEndTime?: number; turnDuration?: number; sleeveEffectsEnabled?: boolean; className?: string; onPlayerClick?: (player: Player) => void; isCurrentPlayer?: boolean; onCurrentPlayerClick?: () => void; isMuted?: boolean; getValidatedSleeve?: (player: Player | undefined) => CardCoverStyle }> = ({ player, position, isTurn, remoteEmotes, coverStyle, turnEndTime, turnDuration, sleeveEffectsEnabled, className = '', onPlayerClick, isCurrentPlayer = false, onCurrentPlayerClick, isMuted = false, getValidatedSleeve }) => {
  const isFinished = !!player.finishedRank;
  const [timeLeft, setTimeLeft] = useState(0);
  const [progress, setProgress] = useState(100);
  const lastTickTime = useRef<number>(0);
  const wasInWarningPhase = useRef<boolean>(false);

  useEffect(() => {
    if (!isTurn || !turnEndTime || isFinished || !turnDuration) {
      setTimeLeft(0);
      setProgress(100);
      wasInWarningPhase.current = false;
      return;
    }
    const update = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((turnEndTime - now) / 1000));
      const elapsed = turnDuration - (turnEndTime - now);
      const progressPercent = Math.max(0, Math.min(100, (elapsed / turnDuration) * 100));
      setTimeLeft(remaining);
      setProgress(progressPercent);
      
      // Play ticking sound when in warning phase (5 seconds or less)
      if (remaining <= 5 && remaining > 0) {
        const isNowInWarningPhase = true;
        if (!wasInWarningPhase.current) {
          wasInWarningPhase.current = true;
          audioService.playTicking();
        }
        // Play ticking sound every second in warning phase
        if (now - lastTickTime.current >= 1000) {
          audioService.playTicking();
          lastTickTime.current = now;
        }
      } else {
        wasInWarningPhase.current = false;
      }
    };
    update();
    const interval = setInterval(update, 50); // Update more frequently for smoother animation
    return () => clearInterval(interval);
  }, [isTurn, turnEndTime, isFinished, turnDuration]);
  
  const getGlowClass = () => {
    if (!isFinished) return '';
    switch(player.finishedRank) {
      case 1: return 'shadow-[0_0_40px_rgba(234,179,8,0.4)] border-yellow-400 ring-2 ring-yellow-400/20';
      case 2: return 'shadow-[0_0_30px_rgba(209,213,219,0.3)] border-gray-300 ring-2 ring-yellow-400/10';
      case 3: return 'shadow-[0_0_20px_rgba(249,115,22,0.2)] border-orange-500 ring-2 ring-orange-500/10';
      default: return 'shadow-[0_0_15px_rgba(153,27,27,0.2)] border-red-900 opacity-50 grayscale';
    }
  };

  const showTimer = isTurn && !isFinished && timeLeft > 0 && !!turnDuration;
  const isWarningPhase = showTimer && timeLeft <= 5;

  return (
    <div className={`relative flex transition-all duration-200 ease-[cubic-bezier(0.19,1,0.22,1)] ${isFinished ? 'scale-100' : 'opacity-100'} 
      ${position === 'top' ? 'flex-row items-center justify-center gap-3 sm:gap-8' : 
        (position === 'left' ? 'flex-col landscape:flex-row md:portrait:flex-row items-center justify-center gap-6 sm:gap-8 landscape:gap-4 md:portrait:gap-4' :
         position === 'right' ? 'flex-col landscape:flex-row-reverse md:portrait:flex-row-reverse items-center justify-center gap-6 sm:gap-8 landscape:gap-4 md:portrait:gap-4' :
         'flex-col items-center justify-center gap-6 sm:gap-8')} ${className} ${!isCurrentPlayer && !player.isBot && onPlayerClick ? 'pointer-events-auto' : ''}`}>
        
        <div className="relative flex flex-col items-center shrink-0">
            <div className="relative w-16 h-16 sm:w-24 sm:h-24 md:portrait:w-28 md:portrait:h-28 lg:portrait:w-36 lg:portrait:h-36 landscape:w-24 landscape:h-24 lg:landscape:w-40 lg:landscape:h-40 player-avatar-container">
                {isTurn && !isFinished && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className={`absolute inset-[-12px] landscape:inset-[-10px] rounded-full border-2 ${isWarningPhase ? 'border-rose-500' : 'border-yellow-500/60 shadow-[0_0_15px_rgba(234,179,8,0.4)]'} animate-turn-ping-slow`}></div>
                    <div className={`absolute inset-[-12px] landscape:inset-[-10px] rounded-full border-2 ${isWarningPhase ? 'border-rose-500/50' : 'border-yellow-500/30'} animate-turn-ping-slow [animation-delay:1.5s]`}></div>
                  </div>
                )}
                
                {/* Circular Progress Bar SVG */}
                {showTimer && (
                  <svg 
                    className="absolute inset-0 w-full h-full transform -rotate-90 pointer-events-none"
                    viewBox="0 0 100 100"
                  >
                    {/* Background circle */}
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="rgba(255,255,255,0.1)"
                      strokeWidth="8"
                    />
                    {/* Progress circle */}
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke={isWarningPhase ? '#ef4444' : '#eab308'}
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 45}`}
                      strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
                      className={`transition-all duration-100 ease-linear ${isWarningPhase ? 'drop-shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-timer-pulse' : ''}`}
                    />
                  </svg>
                )}
                
                <div 
                  className={`w-full h-full aspect-square rounded-full border-2 transition-all duration-200 ease-out overflow-hidden bg-black/60 shadow-2xl flex items-center justify-center shrink-0 ${isTurn ? (isWarningPhase ? 'border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.5)]' : 'border-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.4)]') + ' scale-110' : player.isBot ? 'border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'border-white/10'} ${getGlowClass()} ${(isCurrentPlayer && onCurrentPlayerClick) || (!isCurrentPlayer && !player.isBot && onPlayerClick) ? 'cursor-pointer hover:scale-105 hover:border-white/30' : ''} ${isWarningPhase ? 'animate-timer-pulse' : ''}`}
                  onClick={() => {
                    if (isCurrentPlayer && onCurrentPlayerClick) {
                      onCurrentPlayerClick();
                    } else if (!isCurrentPlayer && !player.isBot && onPlayerClick) {
                      onPlayerClick(player);
                    }
                  }}
                >
                    <VisualEmote trigger={player.avatar} remoteEmotes={remoteEmotes} size="lg" />
                    {player.isBot && (
                      <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 bg-cyan-500/90 text-white text-[6px] sm:text-[7px] font-black uppercase tracking-wider px-1.5 py-0 leading-none rounded-full border border-cyan-400/50 shadow-lg whitespace-nowrap z-20 flex items-center justify-center pb-[1px] h-fit self-center flex-none md:portrait:hidden">
                        CPU
                      </div>
                    )}
                </div>

                {isFinished && player.finishedRank && <RankBadge rank={player.finishedRank} />}

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
                {player.isAfk && !isFinished && (
                    <div className="absolute inset-0 bg-red-900/60 backdrop-blur-[2px] rounded-full flex items-center justify-center z-10 border-2 border-red-600/50">
                        <span className="text-[8px] font-black text-red-300 uppercase tracking-tighter text-center leading-none shadow-lg">AFK</span>
                    </div>
                )}
            </div>

            <div className={`bg-black/60 backdrop-blur-md px-3 py-0.5 sm:px-4 sm:py-1 md:portrait:px-5 md:portrait:py-1.5 lg:portrait:px-6 lg:portrait:py-2 rounded-full border min-w-[75px] min-[428px]:w-[90px] sm:w-auto sm:min-w-[95px] md:portrait:min-w-[120px] lg:portrait:min-w-[140px] landscape:w-24 lg:landscape:w-40 landscape:min-w-0 landscape:px-0 text-center shadow-lg mt-1.5 transition-all duration-300 player-info-container
              ${isFinished ? 'opacity-40 border-white/20' : 
                player.isOffline ? 'border-amber-500/50' : 
                player.isBot ? 'border-cyan-500/40 bg-cyan-950/30' :
                (isTurn ? 'border-yellow-500/50 bg-yellow-950/40 shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'border-white/5')}`}>
                <div className={`text-[8px] sm:text-[10px] md:portrait:text-xs lg:portrait:text-sm font-black uppercase tracking-widest transition-colors duration-300 flex items-center justify-center gap-1 leading-none
                  ${player.isOffline ? 'text-amber-500' : 
                    player.isBot ? 'text-cyan-400' :
                    (isTurn && !isFinished ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]' : 'text-white/90')}`}>
                  <span className="truncate max-w-[65px] min-[428px]:max-w-[90px] sm:max-w-[85px] md:portrait:max-w-[110px] lg:portrait:max-w-[130px] landscape:max-w-[88px] lg:landscape:max-w-[150px]">{player.name}</span>
                  {isMuted && !isCurrentPlayer && (
                    <span className="text-[10px] sm:text-xs lg:landscape:text-sm flex-shrink-0" title="Muted">🔇</span>
                  )}
                </div>
            </div>
        </div>

        {!isFinished && position !== 'bottom' && (
            <div className={`relative animate-in slide-in-from-bottom-2 duration-400 shrink-0 transition-transform landscape:scale-[0.7] mx-auto md:portrait:rotate-180`}>
                <Card faceDown coverStyle={getValidatedSleeve ? getValidatedSleeve(player) : coverStyle} activeTurn={isTurn} small className="!w-10 !h-14 sm:!w-14 sm:!h-20 shadow-xl opacity-90 border-white/20" disableEffects={!sleeveEffectsEnabled} />
                <div className="absolute -top-2.5 -right-2.5 bg-yellow-500 text-black text-[10px] font-black w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center border-2 border-black shadow-lg ring-1 ring-yellow-400/50 md:portrait:rotate-180">
                    {player.cardCount}
                </div>
            </div>
        )}
    </div>
  );
};

// Memoize PlayerSlot to prevent unnecessary re-renders
const PlayerSlot = memo(PlayerSlotComponent, (prevProps, nextProps) => {
  return (
    prevProps.player.id === nextProps.player.id &&
    prevProps.player.cardCount === nextProps.player.cardCount &&
    prevProps.player.hasPassed === nextProps.player.hasPassed &&
    prevProps.player.finishedRank === nextProps.player.finishedRank &&
    prevProps.player.isOffline === nextProps.player.isOffline &&
    prevProps.isTurn === nextProps.isTurn &&
    prevProps.position === nextProps.position &&
    prevProps.coverStyle === nextProps.coverStyle &&
    prevProps.sleeveEffectsEnabled === nextProps.sleeveEffectsEnabled &&
    prevProps.turnEndTime === nextProps.turnEndTime &&
    prevProps.turnDuration === nextProps.turnDuration
  );
});

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
        @keyframes rewarding-emote {
          0% {
            transform: translateY(-20px) translateX(0);
            opacity: 1;
          }
          100% {
            transform: translateY(-120px) translateX(0);
            opacity: 0;
          }
        }
        .animate-rewarding-emote {
          animation: rewarding-emote 2s ease-out forwards;
          will-change: transform, opacity;
        }
      `}} />
    </div>
  );
};

const EmoteBubble: React.FC<{ emote: string; remoteEmotes: Emote[]; position: 'bottom' | 'top' | 'left' | 'right' }> = ({ emote, remoteEmotes, position }) => {
  const screenPos = {
    bottom: 'bottom-32 left-1/2 -translate-x-1/2',
    top: 'top-32 left-1/2 -translate-x-1/2',
    left: 'left-32 top-1/2 -translate-y-1/2',
    right: 'right-32 top-1/2 -translate-y-1/2'
  };

  return (
    <div 
      className={`fixed z-[400] ${screenPos[position]} animate-rewarding-emote pointer-events-none`}
    >
      <div className="bg-black/50 backdrop-blur-3xl border-2 border-white/20 p-2 rounded-full shadow-[0_0_60px_rgba(255,255,255,0.1)] flex items-center justify-center scale-[1.3] ring-1 ring-white/10">
        <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
            <VisualEmote trigger={emote} remoteEmotes={remoteEmotes} size="lg" />
        </div>
      </div>
    </div>
  );
};

interface GameTableProps {
  gameState: GameState;
  myId: string;
  myHand: CardType[];
  onPlayCards: (cards: CardType[]) => void;
  onPassTurn: () => void;
  cardCoverStyle: CardCoverStyle;
  backgroundTheme: BackgroundTheme;
  onOpenSettings: () => void;
  profile: UserProfile | null;
  playAnimationsEnabled?: boolean;
  autoPassEnabled?: boolean;
  socialFilter?: SocialFilter;
  sessionMuted?: string[];
  setSessionMuted?: (muted: string[]) => void;
}

export const GameTable: React.FC<GameTableProps> = ({ 
  gameState, myId, myHand, onPlayCards, onPassTurn, cardCoverStyle, backgroundTheme, onOpenSettings, profile, playAnimationsEnabled = true, autoPassEnabled = false, socialFilter = 'UNMUTED', sessionMuted = [], setSessionMuted
}) => {
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const [showEmotePicker, setShowEmotePicker] = useState(false);
  const [activeEmotes, setActiveEmotes] = useState<ActiveEmote[]>([]);
  const [remoteEmotes, setRemoteEmotes] = useState<Emote[]>([]);
  const [handRows, setHandRows] = useState<1 | 2>(1);
  const [showBombEffect, setShowBombEffect] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const lastEmoteSentAt = useRef<number>(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedPlayerProfile, setSelectedPlayerProfile] = useState<Player | null>(null);
  const [showChatWheel, setShowChatWheel] = useState(false);
  const [chatPresets, setChatPresets] = useState<ChatPreset[]>([]);
  const [activeChats, setActiveChats] = useState<ActiveChat[]>([]);
  const lastChatSentAt = useRef<number>(0);
  const [friendsList, setFriendsList] = useState<string[]>([]);
  const [quickMoveRewards, setQuickMoveRewards] = useState<QuickMoveRewardData[]>([]);
  const lastPlayPileLengthRef = useRef<number>(0);
  const lastPlayPlayerIdRef = useRef<string | null>(null);
  const [showNoMovesPopup, setShowNoMovesPopup] = useState(false);
  const autoPassTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Track emote usage for statistics
  const trackEmoteUsage = useCallback((emote: string) => {
    try {
      const stored = localStorage.getItem('emote_usage_stats');
      const stats: Record<string, number> = stored ? JSON.parse(stored) : {};
      stats[emote] = (stats[emote] || 0) + 1;
      localStorage.setItem('emote_usage_stats', JSON.stringify(stats));
    } catch (e) {
      console.error('Failed to track emote usage:', e);
    }
  }, []);

  const isMyTurn = gameState.currentPlayerId === myId;
  const me = gameState.players.find((p) => p.id === myId);
  const isFinished = !!me?.finishedRank;
  
  const playPile: PlayTurn[] = (gameState.currentPlayPile as PlayTurn[]) || [];
  const isLeader = playPile.length === 0;
  
  const lastMove: PlayTurn | null = playPile.length > 0 ? playPile[playPile.length - 1] : null;
  const sleeveEffectsEnabled = profile?.sleeve_effects_enabled !== false;

  // Helper function to get validated sleeve for a player
  // Validates that the player owns the sleeve in their inventory, defaults to 'RED' if invalid
  const getValidatedSleeveForPlayer = useCallback((player: Player | undefined): CardCoverStyle => {
    if (!player || !player.selected_sleeve_id) {
      return 'RED'; // Default to Standard Red
    }

    // For the current player, validate against their own profile
    if (player.id === myId && profile) {
      const unlockedSleeves = profile.unlocked_sleeves || [];
      // Check if the sleeve is in unlocked_sleeves (inventory check)
      if (unlockedSleeves.includes(player.selected_sleeve_id)) {
        return player.selected_sleeve_id as CardCoverStyle;
      }
      // If not owned, fallback to RED
      return 'RED';
    }

    // For other players, we trust the server data but still validate format
    // In a production system, the server would validate ownership, but for now we accept it
    // and only validate that it's a valid CardCoverStyle
    const validSleeves: CardCoverStyle[] = ['BLUE', 'RED', 'PATTERN', 'GOLDEN_IMPERIAL', 'VOID_ONYX', 'ROYAL_JADE', 'CRYSTAL_EMERALD', 'DRAGON_SCALE', 'NEON_CYBER', 'PIXEL_CITY_LIGHTS', 'AMETHYST_ROYAL', 'CHERRY_BLOSSOM_NOIR', 'AETHER_VOID', 'DIVINE_ROYAL', 'EMPERORS_HUBRIS', 'WITS_END', 'SOVEREIGN_SPADE', 'SOVEREIGN_CLUB', 'SOVEREIGN_DIAMOND', 'SOVEREIGN_HEART', 'ROYAL_CROSS'];
    if (validSleeves.includes(player.selected_sleeve_id as CardCoverStyle)) {
      return player.selected_sleeve_id as CardCoverStyle;
    }

    // Invalid sleeve ID, default to RED
    return 'RED';
  }, [myId, profile]);

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
  }, [lastMove?.cards?.length || 0, lastMove?.playerId, lastMove?.comboType]);

  // Play sound when other players play cards in online games
  useEffect(() => {
    const currentPlayPileLength = playPile.length;
    const currentLastPlayerId = lastMove?.playerId || null;
    
    // Detect when a new card play happens (playPile length increases)
    // and it's not the local player who just played (we already played sound for that)
    if (
      currentPlayPileLength > lastPlayPileLengthRef.current &&
      currentLastPlayerId &&
      currentLastPlayerId !== myId
    ) {
      // Only play sound if it's not a bomb/quad (those have their own sound)
      // Also check that this is a new play (different player or playPile was reset)
      const isNewPlay = currentLastPlayerId !== lastPlayPlayerIdRef.current || 
                        lastPlayPileLengthRef.current === 0;
      
      if (isNewPlay && (!lastMove || !['QUAD', 'BOMB', '4_PAIRS'].includes(lastMove.comboType))) {
        audioService.playPlay();
      }
    }
    
    // Update refs
    lastPlayPileLengthRef.current = currentPlayPileLength;
    lastPlayPlayerIdRef.current = currentLastPlayerId;
  }, [playPile.length, lastMove?.playerId, myId, lastMove]);

  const unlockedAvatars = useMemo(() => {
    const unlocked = (profile?.unlocked_avatars || []).filter(avatar => avatar !== ':smile:');
    const defaultAvatarsFiltered = DEFAULT_AVATARS.filter(avatar => avatar !== ':smile:');
    // Filter out problematic avatars that fail to load (400 errors)
    const problematicTriggers = [':doge_focus:', ':game_over:', ':lunar_new_year:', ':the_mooner:'];
    const allAvatars = Array.from(new Set([...defaultAvatarsFiltered, ...unlocked]))
      .filter(avatar => avatar !== ':smile:')
      .filter(avatar => !problematicTriggers.includes(avatar.toLowerCase()));
    return allAvatars;
  }, [profile]);

  useEffect(() => { if (!isMyTurn) setSelectedCardIds(new Set()); }, [isMyTurn]);
  useEffect(() => { 
    setSelectedCardIds(prev => { 
      const next = new Set<string>(); 
      prev.forEach(id => { if (myHand.some((c) => c.id === id)) next.add(id); }); 
      return next; 
    }); 
  }, [myHand]);
  // FETCH GUARD: Ensure fetchEmotes, fetchChatPresets only run once
  // Remove AbortControllers - let Supabase requests finish even if component re-renders
  const hasFetchedEmotes = useRef(false);
  const hasFetchedChatPresets = useRef(false);
  
  useEffect(() => { 
    if (hasFetchedEmotes.current) return;
    if (typeof fetchEmotes === 'function') {
      hasFetchedEmotes.current = true;
      fetchEmotes().then(setRemoteEmotes).catch((err) => {
        console.error('GameTable: Error fetching emotes:', err);
        setRemoteEmotes([]);
      });
    }
  }, []);
  
  useEffect(() => { 
    if (hasFetchedChatPresets.current) return;
    if (typeof fetchChatPresets === 'function') {
      hasFetchedChatPresets.current = true;
      fetchChatPresets().then(setChatPresets).catch((err) => {
        console.error('GameTable: Error fetching chat presets:', err);
        setChatPresets([]);
      });
    }
  }, []);

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

  // Fetch friends list for Friends Only filter
  useEffect(() => {
    const loadFriends = async () => {
      if (myId && myId !== 'guest' && myId !== 'me' && profile) {
        try {
          const friends = await getFriends(myId);
          const friendIds = friends.map(f => f.friend_id);
          setFriendsList(friendIds);
        } catch (e) {
          console.error('Error loading friends:', e);
        }
      }
    };
    if (socialFilter === 'FRIENDS_ONLY') {
      loadFriends();
    }
  }, [myId, profile, socialFilter]);

  // Combine sessionMuted with AFK-muted players from game state
  const allMutedPlayers = useMemo(() => {
    const afkMuted = gameState.players.filter(p => p.mutedByAfk).map(p => p.id);
    return Array.from(new Set([...sessionMuted, ...afkMuted]));
  }, [sessionMuted, gameState.players]);

  // Filter existing chats when mute settings change
  useEffect(() => {
    setActiveChats(prev => prev.filter(chat => {
      // Check if player is muted (session mute or AFK mute)
      if (allMutedPlayers.includes(chat.playerId)) {
        return false;
      }
      
      // Check global social filter
      if (socialFilter === 'MUTED') {
        return false;
      }
      
      if (socialFilter === 'FRIENDS_ONLY') {
        if (!friendsList.includes(chat.playerId)) {
          return false;
        }
      }
      
      return true;
    }));
  }, [allMutedPlayers, socialFilter, friendsList]);

  useEffect(() => {
    const handleReceiveChat = ({ playerId, phrase, style }: { playerId: string; phrase: string; style: ChatStyle }) => {
      // Filter based on mute settings
      // Check if player is muted (session mute or AFK mute)
      if (allMutedPlayers.includes(playerId)) {
        return; // Don't show chat from muted player
      }
      
      // Check global social filter
      if (socialFilter === 'MUTED') {
        return; // Don't show any chats
      }
      
      if (socialFilter === 'FRIENDS_ONLY') {
        if (!friendsList.includes(playerId)) {
          return; // Don't show chat from non-friends
        }
      }
      
      const id = Math.random().toString();
      setActiveChats(prev => [...prev, { id, playerId, phrase, style }]);
      if (style === 'wiggle') {
        audioService.playSqueakyToy();
      }
      setTimeout(() => setActiveChats(prev => prev.filter(c => c.id !== id)), 3000);
    };
    socket.on(SocketEvents.RECEIVE_CHAT, handleReceiveChat);
    return () => { socket.off(SocketEvents.RECEIVE_CHAT, handleReceiveChat); };
  }, [allMutedPlayers, socialFilter, friendsList]);

  // Listen for quick move rewards
  useEffect(() => {
    const handleQuickMoveReward = ({ gold, xp, isStreak }: { gold: number; xp: number; isStreak: boolean }) => {
      const id = Math.random().toString();
      setQuickMoveRewards(prev => [...prev, { id, playerId: myId, gold, xp, isStreak }]);
      // Play sounds
      audioService.playCoinClink();
      audioService.playXpRising();
    };
    socket.on(SocketEvents.QUICK_MOVE_REWARD, handleQuickMoveReward);
    return () => { socket.off(SocketEvents.QUICK_MOVE_REWARD, handleQuickMoveReward); };
  }, [myId]);

  const sortedHand = useMemo(() => sortCards(myHand), [myHand]);
  const myIndex = gameState.players.findIndex((p) => p.id === myId);

  // Calculate card distribution for 2-row layout (max difference of 1)
  const cardDistribution = useMemo(() => {
    if (handRows < 2) {
      return { topRow: sortedHand, bottomRow: [] };
    }
    const totalCards = sortedHand.length;
    const topRowCount = Math.ceil(totalCards / 2);
    return {
      topRow: sortedHand.slice(0, topRowCount),
      bottomRow: sortedHand.slice(topRowCount)
    };
  }, [sortedHand, handRows]);

  useEffect(() => {
    if (!isMyTurn || !gameState.turnEndTime || !gameState.turnDuration) { setTimeLeft(0); return; }
    const update = () => { const remaining = Math.max(0, Math.ceil((gameState.turnEndTime! - Date.now()) / 1000)); setTimeLeft(remaining); };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [isMyTurn, gameState.turnEndTime, gameState.turnDuration]);

  const noMovesPossible = useMemo(() => { 
    if (!isMyTurn) return false; 
    return !canPlayAnyMove(myHand, playPile, !!gameState.isFirstTurnOfGame); 
  }, [isMyTurn, myHand, playPile, gameState.isFirstTurnOfGame]);

  // Auto-Pass logic: Check at the start of every turn
  useEffect(() => {
    // Clear any existing timeout
    if (autoPassTimeoutRef.current) {
      clearTimeout(autoPassTimeoutRef.current);
      autoPassTimeoutRef.current = null;
    }
    setShowNoMovesPopup(false);

    // Only auto-pass if:
    // - It's my turn
    // - Auto-pass is enabled
    // - No moves are possible
    // - Not the leader (can't pass when leading)
    // - Not finished
    if (isMyTurn && autoPassEnabled && noMovesPossible && !isLeader && !isFinished) {
      // Show "No Moves!" popup
      setShowNoMovesPopup(true);
      
      // Auto-pass after 800ms delay
      autoPassTimeoutRef.current = setTimeout(() => {
        setShowNoMovesPopup(false);
        audioService.playPass();
        onPassTurn();
      }, 800);
    }

    return () => {
      if (autoPassTimeoutRef.current) {
        clearTimeout(autoPassTimeoutRef.current);
        autoPassTimeoutRef.current = null;
      }
    };
  }, [isMyTurn, autoPassEnabled, noMovesPossible, isLeader, isFinished, onPassTurn]);

  const validationResult = useMemo(() => { 
    if (selectedCardIds.size === 0) return { isValid: false, reason: '' }; 
    const cards = myHand.filter((c) => selectedCardIds.has(c.id)); 
    return validateMove(cards, playPile, !!gameState.isFirstTurnOfGame, myHand); 
  }, [selectedCardIds, myHand, playPile, gameState.isFirstTurnOfGame]);

  const combosByGroup = useMemo<Record<string, CardType[][]>>(() => { 
    if (!isMyTurn || selectedCardIds.size === 0) return {}; 
    const pivotId = Array.from(selectedCardIds).pop() as string; 
    return findAllValidCombos(myHand, pivotId, playPile, !!gameState.isFirstTurnOfGame); 
  }, [selectedCardIds, myHand, playPile, isMyTurn, gameState.isFirstTurnOfGame]);

  const hasValidCombos = useMemo(() => {
    return (Object.values(combosByGroup) as CardType[][][]).some(list => list.length > 0);
  }, [combosByGroup]);

  const sendEmote = useCallback((triggerCode: string) => { 
    if (Date.now() - lastEmoteSentAt.current < EMOTE_COOLDOWN) return; 
    lastEmoteSentAt.current = Date.now(); 
    socket.emit(SocketEvents.EMOTE_SENT, { roomId: gameState.roomId, emote: triggerCode }); 
    setShowEmotePicker(false); 
    const id = Math.random().toString(); 
    setActiveEmotes(prev => [...prev, { id, playerId: myId, emote: triggerCode }]); 
    audioService.playEmote(); 
    // Track emote usage
    trackEmoteUsage(triggerCode);
    setTimeout(() => setActiveEmotes(prev => prev.filter(e => e.id !== id)), 3000); 
  }, [gameState.roomId, myId, trackEmoteUsage]);

  const handleSelectChatPhrase = useCallback((preset: ChatPreset) => {
    if (Date.now() - lastChatSentAt.current < 2000) return;
    lastChatSentAt.current = Date.now();
    
    socket.emit(SocketEvents.SEND_CHAT, { 
      roomId: gameState.roomId, 
      phrase: preset.phrase, 
      style: preset.style 
    });
    
    // Show locally
    const id = Math.random().toString();
    setActiveChats(prev => [...prev, { id, playerId: myId, phrase: preset.phrase, style: preset.style }]);
    if (preset.style === 'wiggle') {
      audioService.playSqueakyToy();
    }
    setTimeout(() => setActiveChats(prev => prev.filter(c => c.id !== id)), 3000);
  }, [gameState.roomId, myId]);

  const handleAvatarClick = useCallback(() => {
    if (isMyTurn && !isFinished) {
      setShowChatWheel(true);
    }
  }, [isMyTurn, isFinished]);

  const getPlayerPosition = useCallback((index: number) => { 
    const relativeIndex = (index - myIndex + gameState.players.length) % gameState.players.length; 
    switch(relativeIndex) { 
      case 0: return 'bottom'; 
      case 1: return 'left'; 
      case 2: return 'top'; 
      case 3: return 'right'; 
      default: return 'bottom'; 
    } 
  }, [myIndex, gameState.players.length]);

  const opponents = useMemo(() => { 
    return gameState.players.map((p, i: number) => ({ player: p, index: i, position: getPlayerPosition(i) })).filter((o) => o.position !== 'bottom'); 
  }, [gameState.players, getPlayerPosition]);

  const toggleCard = useCallback((id: string) => { 
    if (!isMyTurn) return; 
    setSelectedCardIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, [isMyTurn]);

  const handlePlay = useCallback(() => { 
    if (selectedCardIds.size === 0 || !isMyTurn) return; 
    const cards = myHand.filter((c) => selectedCardIds.has(c.id)); 
    const res = validateMove(cards, playPile, !!gameState.isFirstTurnOfGame, myHand);
    if (res.isValid) { 
      // Cancel auto-pass if user manually plays
      if (autoPassTimeoutRef.current) {
        clearTimeout(autoPassTimeoutRef.current);
        autoPassTimeoutRef.current = null;
      }
      setShowNoMovesPopup(false);
      audioService.playPlay();
      onPlayCards(cards); 
    } 
  }, [selectedCardIds, isMyTurn, myHand, playPile, gameState.isFirstTurnOfGame, onPlayCards]);

  const handleDynamicAction = useCallback(() => {
    if (!isMyTurn) return;
    if (selectedCardIds.size === 0) {
      if (!isLeader) {
        // Cancel auto-pass if user manually passes
        if (autoPassTimeoutRef.current) {
          clearTimeout(autoPassTimeoutRef.current);
          autoPassTimeoutRef.current = null;
        }
        setShowNoMovesPopup(false);
        audioService.playPass();
        onPassTurn();
      }
    } else {
      setSelectedCardIds(new Set());
    }
  }, [isMyTurn, selectedCardIds.size, isLeader, onPassTurn]);

  const cycleComboType = useCallback((type: string) => {
    const list = combosByGroup[type] || [];
    if (list.length === 0) return;
    
    let targetIndex = list.findIndex((combo) => {
      return combo.length === selectedCardIds.size && combo.every((item) => selectedCardIds.has(item.id));
    });
    
    if (targetIndex !== -1) {
      targetIndex = (targetIndex + 1) % list.length;
    } else {
      targetIndex = 0;
    }
    
    const nextCombo = list[targetIndex];
    if (nextCombo) {
      setSelectedCardIds(new Set(nextCombo.map((c) => c.id)));
      audioService.playExpandHand(); 
    }
  }, [combosByGroup, selectedCardIds]);

  // Calculate spacing to allow overlapping when cards don't fit, with symmetrical padding
  // Portrait: uses centered layout with negative spacing for overlap
  // Landscape: uses justify-evenly to spread cards evenly across the width

  const spacing = { 
    landscape: handRows >= 2 
        ? '' 
        : (selectedCardIds.size > 0 
            ? 'lg:landscape:-space-x-[3vw] xl:landscape:-space-x-[4vw]' 
            : 'lg:landscape:-space-x-[4vw] xl:landscape:-space-x-[5vw]'), 
    portrait: handRows >= 2 
        ? '' 
        : (selectedCardIds.size > 0 
            ? 'portrait:-space-x-[14vw] sm:portrait:-space-x-16 md:portrait:-space-x-[8vw] lg:portrait:-space-x-[6vw]' 
            : 'portrait:-space-x-[15vw] sm:portrait:-space-x-[100px] md:portrait:-space-x-[9vw] lg:portrait:-space-x-[7vw]')
  };

  const topOpponent = opponents.find((o) => o.position === 'top');
  const leftOpponent = opponents.find((o) => o.position === 'left');
  const rightOpponent = opponents.find((o) => o.position === 'right');

  const iHave3Spades = useMemo(() => myHand.some((c) => c.rank === Rank.Three && c.suit === Suit.Spades), [myHand]);

  const lastMovePlayerPosition = useMemo(() => {
    if (!lastMove) return null;
    const idx = gameState.players.findIndex((p) => p.id === lastMove.playerId);
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

  const showMyTimer = isMyTurn && timeLeft > 0 && !!gameState.turnDuration;
  const isMyWarningPhase = showMyTimer && timeLeft <= 5;

  const turnIndicatorUI = (
    <div className={`flex flex-col items-center gap-2 transition-all duration-300 pointer-events-none w-full max-w-sm sm:max-w-none iphone-14-pro-max-turn-indicator ${isMyTurn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className={`portrait:w-[calc((100%-0.75rem)*0.5)] portrait:max-w-[180px] min-[428px]:w-[180px] sm:portrait:w-[240px] px-6 py-2 rounded-full border-2 backdrop-blur-md flex items-center justify-center gap-3 transition-colors duration-200 ${isMyWarningPhase ? 'bg-rose-600/90 border-rose-400' : 'bg-emerald-600/90 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)] animate-satisfying-turn-glow'}`}>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white whitespace-nowrap">
            {isLeader && gameState.isFirstTurnOfGame && iHave3Spades ? '3♠ YOUR TURN' : (isLeader ? 'YOUR LEAD' : 'Your Turn')}
            </span>
            {showMyTimer && (<><div className="w-[1px] h-4 bg-white/20"></div><span className={`text-sm font-black italic text-white ${isMyWarningPhase ? 'animate-pulse' : ''}`}>{timeLeft}s</span></>)}
        </div>
        {noMovesPossible && selectedCardIds.size === 0 && !showNoMovesPopup && (<div className="portrait:w-[calc((100%-0.75rem)*0.5)] portrait:max-w-[180px] sm:portrait:w-[240px] bg-rose-600/90 text-white px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-[0.3em] shadow-[0_0_20px_rgba(225,29,72,0.3)] animate-bounce border border-rose-400/20 backdrop-blur-md text-center">No Moves Possible</div>)}
        {showNoMovesPopup && (
          <div className="portrait:w-[calc((100%-0.75rem)*0.5)] portrait:max-w-[180px] sm:portrait:w-[240px] bg-rose-600/95 text-white px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.4em] shadow-[0_0_30px_rgba(225,29,72,0.5)] animate-pulse border-2 border-rose-400/40 backdrop-blur-md text-center">
            No Moves!
          </div>
        )}
    </div>
  );

  const passButtonUI = (
    <button 
      onClick={handleDynamicAction} 
      disabled={selectedCardIds.size === 0 && isLeader}
      className={`w-full h-full flex flex-col items-center justify-center border-2 rounded-2xl md:portrait:rounded-3xl shadow-xl transition-all duration-200 active:scale-95 bg-black/40 ${selectedCardIds.size === 0 ? (isLeader ? 'opacity-20 border-white/5 text-white/20 grayscale cursor-not-allowed' : `border-rose-600/60 text-rose-500 hover:bg-rose-950/20 ${noMovesPossible ? 'shadow-[0_0_20px_rgba(225,29,72,0.45)]' : ''}`) : 'border-zinc-700 text-zinc-300 bg-zinc-900/60'}`}
    >
      <span className="text-[10px] md:portrait:text-sm lg:portrait:text-lg lg:landscape:text-xl font-black uppercase tracking-widest">{selectedCardIds.size === 0 ? 'Pass' : 'Clear'}</span>
      <span className="text-[6px] md:portrait:text-[9px] lg:portrait:text-xs lg:landscape:text-xs font-bold opacity-40 uppercase tracking-[0.2em] mt-1">{selectedCardIds.size === 0 ? 'Skip Turn' : `${selectedCardIds.size} Selected`}</span>
    </button>
  );

  const playButtonUI = (
    <button 
      onClick={handlePlay} 
      disabled={!validationResult.isValid} 
      className={`w-full h-full flex flex-col items-center justify-center rounded-2xl md:portrait:rounded-3xl font-black uppercase tracking-[0.25em] text-[11px] md:portrait:text-base lg:portrait:text-xl lg:landscape:text-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] transition-all duration-200 active:scale-95 ${validationResult.isValid ? 'bg-gradient-to-r from-emerald-600 to-green-500 text-white' : 'bg-white/5 text-white/20 border border-white/5 grayscale'}`}
    >
      <span>Play Cards</span>
      {validationResult.isValid && <span className="text-[6.5px] md:portrait:text-[10px] lg:portrait:text-xs lg:landscape:text-xs opacity-70 tracking-widest mt-0.5">{validationResult.reason}</span>}
    </button>
  );

  const expandButtonUI = (
    <button 
      onClick={() => { setHandRows(r => (r === 1 ? 2 : 1)); audioService.playExpandHand(); }} 
      className="w-full h-full flex flex-col items-center justify-center border-2 border-white/10 bg-black/40 rounded-2xl md:portrait:rounded-3xl text-white/40 hover:text-white transition-all duration-200 active:scale-95"
    >
      <div className="mb-1 md:portrait:mb-1.5 text-current">
        {handRows === 1 ? (
          <svg className="w-5 h-5 md:portrait:w-6 md:portrait:h-6 lg:portrait:w-10 lg:portrait:h-10 lg:landscape:w-10 lg:landscape:h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 9V2m0 0l-3 3m3-3l3 3" />
            <path d="M12 15v7m0 0l-3-3m3 3l3-3" />
          </svg>
        ) : (
          <svg className="w-5 h-5 md:portrait:w-6 md:portrait:h-6 lg:portrait:w-10 lg:portrait:h-10 lg:landscape:w-10 lg:landscape:h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v7m0 0l-3-3m3 3l3-3" />
            <path d="M12 22v-7m0 0l-3 3m3-3l3 3" />
          </svg>
        )}
      </div>
      <span className="text-[7px] md:portrait:text-xs lg:portrait:text-base lg:landscape:text-base font-black uppercase tracking-widest">{handRows === 1 ? 'EXPAND' : 'COLLAPSE'}</span>
    </button>
  );

  return (
    <div className={`fixed inset-0 w-full h-full bg-[#030303] overflow-hidden select-none ${isShaking ? 'animate-shake' : ''}`} style={{ height: '100dvh' }}>
      <BoardSurface themeId={backgroundTheme} />
      <BombOverlay active={showBombEffect} />

      {/* Player Profile Modal */}
      {selectedPlayerProfile && profile && !selectedPlayerProfile.isBot && (
        <PlayerProfileModal
          playerId={selectedPlayerProfile.id}
          playerName={selectedPlayerProfile.name}
          playerAvatar={selectedPlayerProfile.avatar}
          currentUserId={myId}
          onClose={() => setSelectedPlayerProfile(null)}
          onRefreshProfile={() => {}}
          isMuted={allMutedPlayers.includes(selectedPlayerProfile.id)}
          onToggleMute={(playerId) => {
            if (setSessionMuted) {
              // Only allow toggling session mutes, not AFK mutes
              const isAfkMuted = gameState.players.find(p => p.id === playerId)?.mutedByAfk;
              if (isAfkMuted) return; // Can't unmute AFK players manually
              
              setSessionMuted(
                sessionMuted.includes(playerId)
                  ? sessionMuted.filter(id => id !== playerId)
                  : [...sessionMuted, playerId]
              );
            }
          }}
        />
      )}

      {activeEmotes.map(ae => { const playerIdx = gameState.players.findIndex((p) => p.id === ae.playerId); if (playerIdx === -1) return null; return <EmoteBubble key={ae.id} emote={ae.emote} remoteEmotes={remoteEmotes} position={getPlayerPosition(playerIdx) as any} />; })}

      {/* Quick Move Rewards */}
      {quickMoveRewards.map(reward => {
        const playerIdx = gameState.players.findIndex((p) => p.id === reward.playerId);
        if (playerIdx === -1) return null;
        return (
          <QuickMoveReward
            key={reward.id}
            gold={reward.gold}
            xp={reward.xp}
            isStreak={reward.isStreak}
            position={getPlayerPosition(playerIdx) as any}
            onComplete={() => setQuickMoveRewards(prev => prev.filter(r => r.id !== reward.id))}
          />
        );
      })}

      {/* Chat Bubbles */}
      {activeChats.map(ac => {
        const playerIdx = gameState.players.findIndex((p) => p.id === ac.playerId);
        if (playerIdx === -1) return null;
        return (
          <ChatBubble
            key={ac.id}
            text={ac.phrase}
            style={ac.style}
            position={getPlayerPosition(playerIdx) as any}
            isVisible={true}
          />
        );
      })}

      {/* Quick Chat Wheel */}
      {showChatWheel && (
        <QuickChatWheel
          isOpen={showChatWheel}
          onClose={() => setShowChatWheel(false)}
          onSelectPhrase={handleSelectChatPhrase}
          presets={chatPresets}
          unlockedBundles={[]} // TODO: Extract from profile when bundle system is implemented
          unlockedPhrases={profile?.unlocked_phrases || []}
          lastUsedAt={lastChatSentAt.current}
        />
      )}

      <div className="fixed left-4 z-[250] hidden landscape:flex flex-col gap-4 pointer-events-none items-start" style={{ top: 'calc(env(safe-area-inset-top, 20px) + 1rem)', paddingTop: 'env(safe-area-inset-top, 0px)', paddingLeft: 'env(safe-area-inset-left, 0px)' }}>
          {lastMove && (
             <div className="flex flex-col items-center animate-in slide-in-from-left-4 duration-300">
                <span className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.4em] whitespace-nowrap">
                    {gameState.players.find((p) => p.id === lastMove.playerId)?.name || 'PLAYER'}'S MOVE
                </span>
                <div className="h-[2px] w-12 bg-yellow-500/40 mt-1.5 rounded-full shadow-[0_0_12px_rgba(234,179,8,0.5)]"></div>
             </div>
          )}
          
          {isMyTurn && selectedCardIds.size > 0 && hasValidCombos && (
              <div className="flex flex-col gap-2 animate-in slide-in-from-left-4 duration-300 max-w-[160px] lg:landscape:max-w-[220px] pointer-events-auto mt-3" style={{ marginTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}>
                  <div className="bg-black/60 backdrop-blur-xl border border-white/10 p-2 lg:landscape:p-3 rounded-[1.5rem] shadow-2xl">
                      <div className="flex items-center gap-2 mb-2 px-2 border-b border-white/5 pb-1.5 lg:landscape:mb-3">
                          <span className="w-1 h-1 lg:landscape:w-1.5 lg:landscape:h-1.5 rounded-full bg-yellow-500 animate-pulse"></span>
                          <span className="text-[8px] lg:landscape:text-[10px] font-black text-yellow-500/80 uppercase tracking-widest">VALID COMBOS</span>
                      </div>
                      <div className="flex flex-col gap-2 lg:landscape:gap-3">
                          {(Object.entries(combosByGroup) as [string, CardType[][]][]).map(([type, lists]) => { 
                            if (lists.length === 0) return null; 
                            const currentIndex = lists.findIndex((combo) => {
                              return combo.length === selectedCardIds.size && combo.every((item) => selectedCardIds.has(item.id));
                            }); 
                            const isTypeSelected = currentIndex !== -1; 
                            const typeLabel = type === 'RUN' ? 'STRAIGHT' : type === '4_PAIRS' ? '4 PAIRS' : type;
                            const displayIndex = isTypeSelected ? currentIndex + 1 : 1;
                            
                            return ( 
                              <button 
                                key={type} 
                                onClick={() => cycleComboType(type)} 
                                className={`w-full py-2.5 px-3 lg:landscape:py-3.5 lg:landscape:px-4 rounded-xl border text-[9px] lg:landscape:text-xs font-black uppercase tracking-wider transition-all duration-200 text-left flex flex-col group/btn relative overflow-hidden ${isTypeSelected ? 'bg-yellow-500 text-black border-yellow-400' : 'bg-white/[0.04] text-white/60 border-white/10 hover:bg-white/10 hover:text-white'}`}
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
      </div>

      {isMyTurn && selectedCardIds.size > 0 && hasValidCombos && (
          <div className="fixed left-4 sm:left-8 z-[200] flex flex-col gap-2 md:portrait:gap-3 animate-in slide-in-from-left-4 duration-300 max-w-[160px] md:portrait:max-w-[260px] landscape:hidden" style={{ top: 'calc(env(safe-area-inset-top, 20px) + 1rem)' }}>
              <div className="bg-black/60 backdrop-blur-xl border border-white/10 p-2 md:portrait:p-4 rounded-[1.5rem] md:portrait:rounded-[2rem] shadow-2xl">
                  <div className="flex items-center gap-2 mb-2 px-2 border-b border-white/5 pb-1.5 md:portrait:pb-2 md:portrait:mb-3">
                      <span className="w-1 h-1 md:portrait:w-1.5 md:portrait:h-1.5 rounded-full bg-yellow-500 animate-pulse"></span>
                      <span className="text-[8px] md:portrait:text-xs font-black text-yellow-500/80 uppercase tracking-widest">VALID COMBOS</span>
                  </div>
                  <div className="flex flex-col gap-2 md:portrait:gap-3">
                      {(Object.entries(combosByGroup) as [string, CardType[][]][]).map(([type, lists]) => { 
                        if (lists.length === 0) return null; 
                        const currentIndex = lists.findIndex((combo) => {
                          return combo.length === selectedCardIds.size && combo.every((item) => selectedCardIds.has(item.id));
                        }); 
                        const isTypeSelected = currentIndex !== -1; 
                        const typeLabel = type === 'RUN' ? 'STRAIGHT' : type === '4_PAIRS' ? '4 PAIRS' : type;
                        const displayIndex = isTypeSelected ? currentIndex + 1 : 1;
                        
                        return ( 
                          <button 
                            key={type} 
                            onClick={() => cycleComboType(type)} 
                            className={`w-full py-2.5 px-3 md:portrait:py-3.5 md:portrait:px-5 rounded-xl md:portrait:rounded-2xl border text-[9px] md:portrait:text-sm font-black uppercase tracking-wider transition-all duration-200 text-left flex flex-col group/btn relative overflow-hidden ${isTypeSelected ? 'bg-yellow-500 text-black border-yellow-400' : 'bg-white/[0.04] text-white/60 border-white/10 hover:bg-white/10 hover:text-white'}`}
                          > 
                            <div className="flex justify-between items-center w-full z-10 gap-2"> 
                              <span className="truncate">{typeLabel}</span> 
                              <span className={`text-[8px] md:portrait:text-xs opacity-70 whitespace-nowrap ${isTypeSelected ? 'text-black/70' : 'text-yellow-500/70'}`}> 
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

      <div className="fixed bottom-4 left-4 z-[200] hidden landscape:block w-24 h-16 lg:landscape:w-40 lg:landscape:h-24 pointer-events-auto">
          {isMyTurn && passButtonUI}
      </div>

      <div className="fixed bottom-[80px] left-4 z-[200] hidden landscape:block pointer-events-none transition-all duration-300 w-24 landscape:w-auto flex flex-col items-center ipad-pro-user-slot">
          <div className={`${isMyTurn ? 'opacity-100 translate-y-0' : (isFinished ? 'opacity-60 scale-90 translate-y-4' : 'opacity-0 translate-y-20')} flex flex-col items-center`}>
            {me && (
                <PlayerSlot player={me} position="bottom" isTurn={isMyTurn} remoteEmotes={remoteEmotes} coverStyle={cardCoverStyle} turnEndTime={gameState.turnEndTime} turnDuration={gameState.turnDuration} sleeveEffectsEnabled={sleeveEffectsEnabled} className="landscape:scale-75" isCurrentPlayer={true} onCurrentPlayerClick={handleAvatarClick} isMuted={false} getValidatedSleeve={getValidatedSleeveForPlayer} />
            )}
          </div>
      </div>

      <div className={`fixed left-4 top-[40%] lg:landscape:top-1/2 -translate-y-1/2 z-[200] hidden landscape:block transition-all duration-300 w-24 landscape:w-auto flex flex-col items-center ${leftOpponent && !leftOpponent.player.isBot ? 'pointer-events-auto' : 'pointer-events-none'}`}>
          {leftOpponent && (
              <PlayerSlot player={leftOpponent.player} position="left" isTurn={gameState.currentPlayerId === leftOpponent.player.id} remoteEmotes={remoteEmotes} coverStyle={cardCoverStyle} turnEndTime={gameState.turnEndTime} turnDuration={gameState.turnDuration} sleeveEffectsEnabled={sleeveEffectsEnabled} className="landscape:scale-75" onPlayerClick={setSelectedPlayerProfile} isCurrentPlayer={false} isMuted={allMutedPlayers.includes(leftOpponent.player.id)} getValidatedSleeve={getValidatedSleeveForPlayer} />
          )}
      </div>

      <div className="fixed bottom-4 right-4 z-[200] hidden landscape:block w-24 h-16 lg:landscape:w-40 lg:landscape:h-24 pointer-events-auto">
          {isMyTurn && playButtonUI}
      </div>

      <div className="fixed bottom-24 right-4 z-[200] hidden landscape:block w-24 h-16 lg:landscape:w-40 lg:landscape:h-24 lg:landscape:bottom-32 pointer-events-auto">
          {isMyTurn && expandButtonUI}
      </div>

      <div className={`fixed right-4 top-[40%] lg:landscape:top-1/2 -translate-y-1/2 z-[200] hidden landscape:block transition-all duration-300 w-24 landscape:w-auto flex justify-center items-center ${rightOpponent && !rightOpponent.player.isBot ? 'pointer-events-auto' : 'pointer-events-none'}`}>
          {rightOpponent && (
              <PlayerSlot player={rightOpponent.player} position="right" isTurn={gameState.currentPlayerId === rightOpponent.player.id} remoteEmotes={remoteEmotes} coverStyle={cardCoverStyle} turnEndTime={gameState.turnEndTime} turnDuration={gameState.turnDuration} sleeveEffectsEnabled={sleeveEffectsEnabled} className="landscape:scale-75" onPlayerClick={setSelectedPlayerProfile} isCurrentPlayer={false} isMuted={allMutedPlayers.includes(rightOpponent.player.id)} getValidatedSleeve={getValidatedSleeveForPlayer} />
          )}
      </div>

      <div 
        className="fixed z-[200] flex flex-col landscape:flex-row items-end landscape:items-center gap-2 landscape:gap-2 ipad-pro-top-right-buttons" 
        style={{ 
          top: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)',
          right: 'max(env(safe-area-inset-right, 0px), 1rem)'
        }}
      >
        {/* Quick Chat Button */}
        <div className="relative">
          <button 
            onClick={() => setShowChatWheel(true)} 
            className={`w-10 h-10 sm:w-11 sm:h-11 md:portrait:w-16 md:portrait:h-16 rounded-2xl bg-black/40 backdrop-blur-2xl border border-white/10 flex items-center justify-center transition-all duration-300 shadow-xl hover:scale-105 ${showChatWheel ? 'text-yellow-400 border-yellow-500/40 bg-black/60' : 'text-white/50 hover:text-white'}`}
            title="Quick Chat"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 md:portrait:h-8 md:portrait:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </button>
        </div>
        
        {/* Emote Button */}
        <div className="relative">
          <button 
            onClick={() => setShowEmotePicker(!showEmotePicker)} 
            className={`w-10 h-10 sm:w-11 sm:h-11 md:portrait:w-16 md:portrait:h-16 rounded-2xl bg-black/40 backdrop-blur-2xl border border-white/10 flex items-center justify-center transition-all duration-300 shadow-xl hover:scale-105 ${showEmotePicker ? 'text-yellow-400 border-yellow-500/40 bg-black/60' : 'text-white/50 hover:text-white'}`}
            title="Emotes"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 md:portrait:h-8 md:portrait:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          {showEmotePicker && ( 
            <div className="absolute top-full right-0 mt-3 p-4 bg-black/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-2xl z-[300] grid grid-cols-3 gap-3 min-w-[200px] sm:min-w-[240px] animate-in fade-in zoom-in-95 duration-150"> 
              {unlockedAvatars.map(emoji => ( 
                <button 
                  key={emoji} 
                  onClick={() => sendEmote(emoji)} 
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/5 hover:bg-white/15 transition-all duration-150 flex items-center justify-center p-2 group/emote-btn overflow-hidden"
                >
                  <VisualEmote trigger={emoji} remoteEmotes={remoteEmotes} size="md" className="group-hover/emote-btn:scale-105 transition-transform duration-200" />
                </button> 
              ))} 
            </div> 
          )}
        </div>
        
        {/* Settings Button */}
        <button 
          onClick={onOpenSettings} 
          className="w-10 h-10 sm:w-11 sm:h-11 md:portrait:w-16 md:portrait:h-16 rounded-2xl bg-black/40 backdrop-blur-2xl border border-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all duration-300 shadow-xl hover:scale-105"
          title="Settings"
        >
          <SettingsIcon className="h-5 w-5 sm:h-6 sm:w-6 md:portrait:h-8 md:portrait:w-8" />
        </button>

        {/* Landscape Turn Indicator */}
        <div className="hidden landscape:block absolute top-[calc(100%+0.5rem)] right-0 min-w-max transition-all duration-300 ipad-pro-turn-indicator">
            {turnIndicatorUI}
        </div>
      </div>

      <div className="absolute inset-0 p-4 sm:p-12 landscape:p-4 grid grid-cols-3 grid-rows-3 pointer-events-none z-10">
        <div className={`col-start-2 row-start-1 flex justify-center items-start portrait:pt-0 landscape:pt-0 landscape:fixed landscape:-top-1 landscape:left-1/2 landscape:-translate-x-1/2 transition-transform duration-200 ease-[cubic-bezier(0.19,1,0.22,1)] ${gameState.currentPlayerId === topOpponent?.player.id ? 'translate-y-8 landscape:translate-y-0' : ''} ${topOpponent && !topOpponent.player.isBot ? 'pointer-events-auto' : ''}`} style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)' }}>
          {topOpponent && (<PlayerSlot player={topOpponent.player} position="top" isTurn={gameState.currentPlayerId === topOpponent.player.id} remoteEmotes={remoteEmotes} coverStyle={cardCoverStyle} turnEndTime={gameState.turnEndTime} turnDuration={gameState.turnDuration} sleeveEffectsEnabled={sleeveEffectsEnabled} className="landscape:scale-75" onPlayerClick={setSelectedPlayerProfile} isCurrentPlayer={false} isMuted={allMutedPlayers.includes(topOpponent.player.id)} getValidatedSleeve={getValidatedSleeveForPlayer} />)}
        </div>
        
        <div className={`col-start-1 row-start-2 flex justify-start items-center ml-0 sm:ml-0 sm:fixed sm:left-12 min-[428px]:fixed min-[428px]:left-6 min-[428px]:top-[40%] min-[428px]:-translate-y-1/2 sm:bottom-[44px] sm:top-auto sm:-translate-y-1/2 md:portrait:fixed md:portrait:left-12 md:portrait:top-[calc(50%-220px)] md:portrait:-translate-y-1/2 md:portrait:translate-x-0 md:portrait:translate-y-0 md:portrait:bottom-auto transition-transform duration-200 ease-[cubic-bezier(0.19,1,0.22,1)] ${isMyTurn ? '-translate-y-[136px] sm:translate-y-0 md:portrait:translate-y-0 z-[60]' : (gameState.currentPlayerId === leftOpponent?.player.id ? '-translate-y-[72px] sm:translate-y-0 md:portrait:translate-y-0 z-[60]' : '-translate-y-[24px] sm:translate-y-0 md:portrait:translate-y-0')} landscape:hidden ${leftOpponent && !leftOpponent.player.isBot ? 'pointer-events-auto' : ''}`}>
          {leftOpponent && (<PlayerSlot player={leftOpponent.player} position="left" isTurn={gameState.currentPlayerId === leftOpponent.player.id} remoteEmotes={remoteEmotes} coverStyle={cardCoverStyle} turnEndTime={gameState.turnEndTime} turnDuration={gameState.turnDuration} sleeveEffectsEnabled={sleeveEffectsEnabled} onPlayerClick={setSelectedPlayerProfile} isCurrentPlayer={false} isMuted={allMutedPlayers.includes(leftOpponent.player.id)} getValidatedSleeve={getValidatedSleeveForPlayer} />)}
        </div>
      </div>

      <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-400 ease-in-out ipad-cards-in-play-container ${isMyTurn ? 'portrait:-translate-y-24 min-[428px]:portrait:-translate-y-32 md:portrait:-translate-y-56 landscape:translate-y-4' : 'portrait:-translate-y-8 landscape:translate-y-6'}`}>
        <div className="relative flex flex-col items-center">
          {lastMove ? (
            <div 
              key={lastMove.playerId + lastMove.cards.map((c) => c.id).join('')}
              className={`flex flex-col items-center gap-4 scale-90 sm:scale-125 md:portrait:scale-[1.25] lg:portrait:scale-[1.6] landscape:scale-[0.8] lg:landscape:scale-[1.2] ipad-cards-in-play ${arrivalAnimationClass}`}
            >
               <div className="flex -space-x-8">
                {lastMove.cards.map((c, i: number) => {
                  const movePlayer = gameState.players.find((p) => p.id === lastMove!.playerId);
                  const playerSleeve = getValidatedSleeveForPlayer(movePlayer);
                  return (
                    <div 
                      key={c.id} 
                      style={{ 
                          transform: `rotate(${(i - 1) * 8}deg) translateY(${i % 2 === 0 ? '-15px' : '0px'})`,
                          animationDelay: playAnimationsEnabled ? `${i * 0.05}s` : '0s'
                      } as any}
                      className={`transform-gpu will-change-transform ${playAnimationsEnabled ? "animate-play-bounce" : ""}`}
                    >
                      <Card 
                        card={c} 
                        coverStyle={playerSleeve} 
                        className="shadow-2xl ring-1 ring-white/10" 
                        disableEffects={!sleeveEffectsEnabled}
                        activeTurn={gameState.currentPlayerId === lastMove!.playerId}
                      />
                    </div>
                  );
                })}
               </div>
               <div className="mt-3 flex flex-col items-center animate-in fade-in slide-in-from-top-2 duration-300 delay-200 pointer-events-none z-[100] portrait:scale-x-90 landscape:hidden">
                  <span className="text-[12px] font-black text-yellow-500 uppercase tracking-[0.6em] drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] whitespace-nowrap">{gameState.players.find((p) => p.id === lastMove.playerId)?.name || 'PLAYER'}'S MOVE</span>
                  <div className="h-[2px] w-20 bg-yellow-500/40 mt-1 rounded-full shadow-[0_0_12px_rgba(234,179,8,0.5)]"></div>
               </div>
            </div>
          ) : (<div className="opacity-10 border-2 border-dashed border-white/40 rounded-[3rem] p-24"><div className="text-white text-base font-black uppercase tracking-[1em]">Arena</div></div>)}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 w-full flex flex-col items-center bg-gradient-to-t from-black via-black/40 to-transparent z-40 pt-2 pb-2 sm:pt-4 sm:pb-4 md:portrait:pb-2 md:portrait:pt-16">
        {/* Reserve fixed height for indicator area to prevent play pile shifting - increased for iPhone 14 Pro Max */}
        {/* Use fixed height instead of min-height to ensure consistent spacing - always reserve space even when indicator is hidden */}
        <div className="mb-3 flex flex-col items-center gap-2 landscape:hidden px-4 sm:px-12 w-full md:portrait:mb-0 h-[50px] min-[428px]:h-[60px] relative pointer-events-none">
            {/* Mobile: full width centered, iPad: hidden here, shown above PLAY CARDS button */}
            {/* Use absolute positioning to overlay indicators without affecting document flow */}
            {/* Portrait-only: Align indicator bottom with user's name container (GUEST pill) bottom */}
            {/* Landscape: Maintain default centered positioning to avoid overlapping card Arena */}
            {/* User's PlayerSlot is at bottom-[44px] with -translate-y-1/2 (centered) */}
            {/* Name container bottom aligns approximately at 12-14px from bottom in portrait */}
            <div className="md:portrait:hidden w-full absolute left-0 right-0 flex flex-col items-center portrait:items-end px-4 sm:px-12 pointer-events-none portrait-turn-indicator-container">
            {turnIndicatorUI}
            </div>
        </div>

        <div className={`fixed right-4 top-[40%] -translate-y-1/2 bottom-auto min-[428px]:right-6 sm:right-12 sm:bottom-[108px] sm:top-auto sm:translate-y-0 md:portrait:fixed md:portrait:right-12 md:portrait:top-[calc(50%-230px)] md:portrait:-translate-y-1/2 md:portrait:translate-y-0 md:portrait:bottom-auto pointer-events-none z-30 transition-all duration-300 landscape:hidden flex flex-col items-end ${rightOpponent && !rightOpponent.player.isBot ? 'pointer-events-auto' : ''}`}>
          {rightOpponent && (
              <PlayerSlot player={rightOpponent.player} position="right" isTurn={gameState.currentPlayerId === rightOpponent.player.id} remoteEmotes={remoteEmotes} coverStyle={cardCoverStyle} turnEndTime={gameState.turnEndTime} turnDuration={gameState.turnDuration} sleeveEffectsEnabled={sleeveEffectsEnabled} onPlayerClick={setSelectedPlayerProfile} isCurrentPlayer={false} isMuted={allMutedPlayers.includes(rightOpponent.player.id)} getValidatedSleeve={getValidatedSleeveForPlayer} />
          )}
        </div>

        <div className="relative w-full flex flex-col items-center px-4 sm:px-12 landscape:px-0">
            <div className={`absolute left-4 sm:left-12 min-[428px]:left-6 md:portrait:left-[60px] lg:portrait:left-24 bottom-[44px] md:portrait:bottom-[136px] md:portrait:top-auto md:portrait:translate-y-0 pointer-events-none z-50 transition-all duration-300 landscape:hidden flex flex-col items-start -translate-y-1/2
                ${isMyTurn ? 'opacity-100' : (isFinished ? 'opacity-100' : 'opacity-0')}`}>
              {me && (
                  <PlayerSlot player={me} position="bottom" isTurn={isMyTurn} remoteEmotes={remoteEmotes} coverStyle={cardCoverStyle} turnEndTime={gameState.turnEndTime} turnDuration={gameState.turnDuration} sleeveEffectsEnabled={sleeveEffectsEnabled} isCurrentPlayer={true} onCurrentPlayerClick={handleAvatarClick} isMuted={false} getValidatedSleeve={getValidatedSleeveForPlayer} />
              )}
            </div>

            {/* iPad Portrait: Button layout with YOUR TURN above PLAY CARDS */}
            <div className={`hidden md:portrait:flex md:portrait:flex-col md:portrait:items-center md:portrait:mb-3 md:portrait:w-full md:portrait:px-6 ipad-button-container md:portrait:gap-3 transition-all duration-300 ${isMyTurn ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0 pointer-events-none'}`}>
              {/* YOUR TURN indicator centered above buttons - Reserve fixed height to prevent play pile shifting */}
              <div className="mb-2 w-full flex flex-col items-center min-h-[60px] relative">
                <div className={`absolute top-0 left-0 right-0 flex flex-col items-center gap-2 w-full pointer-events-none ${isMyTurn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                  <div className={`px-8 py-3 md:portrait:px-10 md:portrait:py-3.5 rounded-full border-2 backdrop-blur-md flex items-center justify-center gap-3 transition-colors duration-200 ${isMyWarningPhase ? 'bg-rose-600/90 border-rose-400' : 'bg-emerald-600/90 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)] animate-satisfying-turn-glow'}`}>
                    <span className="text-xs md:portrait:text-base font-black uppercase tracking-[0.4em] text-white whitespace-nowrap">
                      {isLeader && gameState.isFirstTurnOfGame && iHave3Spades ? '3♠ YOUR TURN' : (isLeader ? 'YOUR LEAD' : 'Your Turn')}
                    </span>
                    {showMyTimer && (<><div className="w-[1px] h-4 md:portrait:h-5 bg-white/20"></div><span className={`text-sm md:portrait:text-lg font-black italic text-white ${isMyWarningPhase ? 'animate-pulse' : ''}`}>{timeLeft}s</span></>)}
                  </div>
                  {noMovesPossible && selectedCardIds.size === 0 && !showNoMovesPopup && (<div className="bg-rose-600/90 text-white px-5 py-2 md:portrait:px-6 md:portrait:py-2.5 rounded-full text-[9px] md:portrait:text-xs font-black uppercase tracking-[0.3em] shadow-[0_0_20px_rgba(225,29,72,0.3)] animate-bounce border border-rose-400/20 backdrop-blur-md text-center">No Moves Possible</div>)}
                  {showNoMovesPopup && (
                    <div className="bg-rose-600/95 text-white px-6 py-2.5 md:portrait:px-7 md:portrait:py-3 rounded-full text-[10px] md:portrait:text-sm font-black uppercase tracking-[0.4em] shadow-[0_0_30px_rgba(225,29,72,0.5)] animate-pulse border-2 border-rose-400/40 backdrop-blur-md text-center">
                      No Moves!
                    </div>
                  )}
                </div>
              </div>
              {/* Button row: PASS | PLAY CARDS | ROW */}
              <div className="flex flex-row items-stretch justify-center gap-4 md:portrait:gap-5 w-full h-16 md:portrait:h-20 ipad-button-row">
                <div className="relative flex-1">
                {passButtonUI}
                </div>
                <div className="relative flex-[2]">
                  {playButtonUI}
                </div>
                <div className="relative flex-1">
                  {expandButtonUI}
                </div>
              </div>
              </div>

            {/* Mobile/Non-iPad: Original button layout */}
            <div className={`flex flex-row items-stretch justify-center gap-3 w-full max-w-sm mb-3 sm:mb-0 sm:absolute sm:bottom-[44px] sm:-translate-y-1/2 transition-all duration-300 h-16 sm:max-w-none sm:w-full sm:left-0 sm:right-0 sm:px-0 md:portrait:hidden ${isMyTurn ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0 pointer-events-none'}`}>
              <div className="relative flex-1 landscape:hidden sm:absolute sm:left-12 sm:w-auto">
                {passButtonUI}
              </div>
              <div className="flex-[2] landscape:hidden sm:absolute sm:left-1/2 sm:-translate-x-1/2 sm:w-[240px]">
                {playButtonUI}
              </div>
              <div className="relative flex-1 landscape:hidden sm:absolute sm:right-12 sm:w-auto">
                {expandButtonUI}
              </div>
            </div>
        </div>

        {/* Player Hand Container - Stretches from left edge of PASS button (left-4) to right edge of EXPAND button (right-4) in landscape */}
        <div className="relative flex items-center portrait:justify-center landscape:justify-start w-full max-w-[100vw] portrait:overflow-visible landscape:overflow-visible landscape:absolute landscape:left-4 landscape:right-4 landscape:bottom-0 lg:landscape:bottom-6 landscape:px-0 px-6 sm:portrait:px-12 md:portrait:pb-4 md:portrait:pt-32 md:portrait:overflow-visible">
           {/* Inner flex container: stretches cards to button edges in landscape, centered with overlap in portrait */}
           {handRows >= 2 ? (
             <div className={`flex flex-col items-center justify-center gap-y-4 transition-all duration-500 landscape:scale-[0.46] landscape:sm:scale-[0.75] lg:landscape:scale-[1.1] xl:landscape:scale-[1.25] portrait:pt-2 portrait:scale-[0.9] sm:portrait:scale-[1] md:portrait:scale-[1.1] lg:portrait:scale-[1.3] landscape-hand-container w-full portrait:max-w-full landscape:w-full landscape:min-w-full landscape:max-w-none portrait:overflow-visible landscape:overflow-visible portrait:px-2 sm:portrait:px-3 md:portrait:pb-8 ipad-hand-container multi-row-hand pb-4 max-h-[340px] sm:max-h-[380px] landscape:max-h-[200px] sm:landscape:max-h-[220px] xl:landscape:max-h-[240px] md:portrait:max-h-[400px] lg:portrait:max-h-[450px]`}>
               {/* Top Row */}
               <div className="flex flex-nowrap items-center justify-center gap-2 multi-row-top-row">
                 {cardDistribution.topRow.map((c, index) => {
                   const is3Spades = c.rank === Rank.Three && c.suit === Suit.Spades;
                   const showHint = isMyTurn && isLeader && gameState.isFirstTurnOfGame && is3Spades && !selectedCardIds.has(c.id);
                   const isSelected = selectedCardIds.has(c.id);
                   const handleCardClick = () => toggleCard(c.id);
                   const isRightmost = index === cardDistribution.topRow.length - 1 && cardDistribution.bottomRow.length === 0;
                   const hideCenterSymbol = !isRightmost;
                   return (
                     <Card 
                       key={c.id} 
                       card={c} 
                       coverStyle={cardCoverStyle}
                       selected={isSelected} 
                       onClick={handleCardClick} 
                       disableEffects={!sleeveEffectsEnabled}
                       activeTurn={isMyTurn}
                       className={`hand-card transform-gpu will-change-transform transition-all duration-200 flex-shrink-0 ${isMyTurn ? 'cursor-pointer active:scale-105 sm:hover:-translate-y-12' : 'cursor-default opacity-80'} ${hideCenterSymbol ? 'hide-center-symbol' : ''}`} 
                     />
                   );
                 })}
               </div>
               {/* Bottom Row */}
               {cardDistribution.bottomRow.length > 0 && (
                 <div className="flex flex-nowrap items-center justify-center gap-2 multi-row-bottom-row">
                   {cardDistribution.bottomRow.map((c, index) => {
                     const is3Spades = c.rank === Rank.Three && c.suit === Suit.Spades;
                     const showHint = isMyTurn && isLeader && gameState.isFirstTurnOfGame && is3Spades && !selectedCardIds.has(c.id);
                     const isSelected = selectedCardIds.has(c.id);
                     const handleCardClick = () => toggleCard(c.id);
                     const isRightmost = index === cardDistribution.bottomRow.length - 1;
                     const hideCenterSymbol = !isRightmost;
                     return (
                       <Card 
                         key={c.id} 
                         card={c} 
                         coverStyle={cardCoverStyle}
                         selected={isSelected} 
                         onClick={handleCardClick} 
                         disableEffects={!sleeveEffectsEnabled}
                         activeTurn={isMyTurn}
                         className={`hand-card transform-gpu will-change-transform transition-all duration-200 flex-shrink-0 ${isMyTurn ? 'cursor-pointer active:scale-105 sm:hover:-translate-y-12' : 'cursor-default opacity-80'} ${hideCenterSymbol ? 'hide-center-symbol' : ''}`} 
                       />
                     );
                   })}
                 </div>
               )}
             </div>
           ) : (
             <div className={`flex transition-all duration-500 landscape:scale-[0.46] landscape:sm:scale-[0.75] lg:landscape:scale-[1.1] xl:landscape:scale-[1.25] portrait:pt-2 portrait:scale-[0.9] sm:portrait:scale-[1] md:portrait:scale-[1.1] lg:portrait:scale-[1.3] items-center portrait:justify-center landscape:justify-between lg:landscape:justify-center landscape-hand-container w-full portrait:max-w-full landscape:w-full landscape:min-w-full landscape:max-w-none portrait:overflow-visible landscape:overflow-visible portrait:px-2 sm:portrait:px-3 md:portrait:pb-8 ipad-hand-container flex-nowrap ${spacing.portrait} ${spacing.landscape} portrait:pb-16 md:portrait:pb-24`}>
               {sortedHand.map((c, index) => {
                 const is3Spades = c.rank === Rank.Three && c.suit === Suit.Spades;
                 const showHint = isMyTurn && isLeader && gameState.isFirstTurnOfGame && is3Spades && !selectedCardIds.has(c.id);
                 const isSelected = selectedCardIds.has(c.id);
                 const handleCardClick = () => toggleCard(c.id);
                 const isRightmost = index === sortedHand.length - 1;
                 const hideCenterSymbol = !isRightmost;
                 return (
                   <Card 
                     key={c.id} 
                     card={c} 
                     coverStyle={cardCoverStyle}
                     selected={isSelected} 
                     onClick={handleCardClick} 
                     disableEffects={!sleeveEffectsEnabled}
                     activeTurn={isMyTurn}
                     className={`hand-card transform-gpu will-change-transform transition-all duration-200 flex-shrink-0 ${isMyTurn ? 'cursor-pointer active:scale-105 sm:hover:-translate-y-12' : 'cursor-default opacity-80'} ${hideCenterSymbol ? 'hide-center-symbol' : ''}`} 
                   />
                 );
               })}
             </div>
           )}
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        /* Smooth card animations from player positions */
        @keyframes playFromBottom {
          0% {
            transform: translateY(40vh) scale(0.3) rotate(5deg);
            opacity: 0;
          }
          60% {
            transform: translateY(-5vh) scale(1.05) rotate(-2deg);
            opacity: 0.9;
          }
          100% {
            transform: translateY(0) scale(1) rotate(0deg);
            opacity: 1;
          }
        }
        @keyframes playFromTop {
          0% {
            transform: translateY(-40vh) scale(0.3) rotate(-5deg);
            opacity: 0;
          }
          60% {
            transform: translateY(5vh) scale(1.05) rotate(2deg);
            opacity: 0.9;
          }
          100% {
            transform: translateY(0) scale(1) rotate(0deg);
            opacity: 1;
          }
        }
        @keyframes playFromLeft {
          0% {
            transform: translateX(-40vw) scale(0.3) rotate(-10deg);
            opacity: 0;
          }
          60% {
            transform: translateX(5vw) scale(1.05) rotate(2deg);
            opacity: 0.9;
          }
          100% {
            transform: translateX(0) scale(1) rotate(0deg);
            opacity: 1;
          }
        }
        @keyframes playFromRight {
          0% {
            transform: translateX(40vw) scale(0.3) rotate(10deg);
            opacity: 0;
          }
          60% {
            transform: translateX(-5vw) scale(1.05) rotate(-2deg);
            opacity: 0.9;
          }
          100% {
            transform: translateX(0) scale(1) rotate(0deg);
            opacity: 1;
          }
        }
        .animate-play-from-bottom {
          animation: playFromBottom 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          will-change: transform, opacity;
        }
        .animate-play-from-top {
          animation: playFromTop 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          will-change: transform, opacity;
        }
        .animate-play-from-left {
          animation: playFromLeft 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          will-change: transform, opacity;
        }
        .animate-play-from-right {
          animation: playFromRight 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          will-change: transform, opacity;
        }
      `}} />
      {sortedHand.length > 0 && (
        <style dangerouslySetInnerHTML={{ __html: `
          /* Multi-row hand - spread cards out naturally for easier selection */
          .multi-row-top-row > .hand-card:not(:first-child),
          .multi-row-bottom-row > .hand-card:not(:first-child) {
            margin-left: 0 !important;
          }
          
          /* Portrait - spread cards out with minimal overlap */
          @media (orientation: portrait) {
            .multi-row-top-row > .hand-card:not(:first-child) {
              margin-left: -2vw !important; /* Minimal overlap for natural spread */
            }
            .multi-row-bottom-row > .hand-card:not(:first-child) {
              margin-left: -2vw !important; /* Minimal overlap for natural spread */
            }
            /* Smaller screens - slightly more overlap to fit */
            @media (max-width: 375px) {
              .multi-row-top-row > .hand-card:not(:first-child),
              .multi-row-bottom-row > .hand-card:not(:first-child) {
                margin-left: -3vw !important;
              }
            }
            /* Larger screens - spread out more */
            @media (min-width: 428px) {
              .multi-row-top-row > .hand-card:not(:first-child),
              .multi-row-bottom-row > .hand-card:not(:first-child) {
                margin-left: -1vw !important;
              }
            }
            @media (min-width: 768px) {
              .multi-row-top-row > .hand-card:not(:first-child),
              .multi-row-bottom-row > .hand-card:not(:first-child) {
                margin-left: 0.5rem !important; /* Positive spacing for larger screens */
              }
            }
          }
          
          /* Landscape - spread cards out with minimal overlap */
          @media (orientation: landscape) {
            .multi-row-top-row > .hand-card:not(:first-child),
            .multi-row-bottom-row > .hand-card:not(:first-child) {
              margin-left: 0.5rem !important; /* Positive spacing for natural spread */
            }
            /* Smaller landscape screens - minimal overlap */
            @media (max-width: 667px) {
              .multi-row-top-row > .hand-card:not(:first-child),
              .multi-row-bottom-row > .hand-card:not(:first-child) {
                margin-left: 0.25rem !important;
              }
            }
            /* Larger landscape screens - more spacing */
            @media (min-width: 1024px) {
              .multi-row-top-row > .hand-card:not(:first-child),
              .multi-row-bottom-row > .hand-card:not(:first-child) {
                margin-left: 1rem !important; /* More spacing for easier selection */
              }
            }
          }
          
          /* Single row hand styles */
          /* iPhone SE Landscape - Fix overlaps and alignment */
          @media (orientation: landscape) and (max-height: 375px) {
            /* Align YOUR TURN indicator right edge with settings button right edge */
            div[class*="hidden"][class*="landscape:block"][class*="absolute"][class*="top-14"][class*="right-0"] {
              right: 0.25rem !important; /* Move slightly right to align with settings button right edge */
              left: auto !important;
            }
            .iphone-14-pro-max-turn-indicator {
              width: 144px !important; /* Match button group width (3 buttons + 2 gaps) */
              max-width: 144px !important;
              min-width: 144px !important;
              margin-left: 0 !important;
            }
            .iphone-14-pro-max-turn-indicator > div {
              width: 100% !important;
            }
            .iphone-14-pro-max-turn-indicator > div > div[class*="rounded-full"] {
              width: 100% !important;
              max-width: 100% !important;
            }
            .landscape-hand-container {
              scale: 0.9 !important;
              bottom: 40px !important;
              padding-left: 110px !important;
              padding-right: 110px !important;
              justify-content: center !important;
            }
            .landscape-hand-container > .hand-card:not(:first-child) {
              margin-left: -16vw !important;
            }
            /* Restore original play pile size and move them down slightly */
            .ipad-cards-in-play {
              transform: translateY(24px) scale(0.8) !important;
            }
            /* Left player vertically aligned with user and just above */
            div[class*="fixed"][class*="left-4"][class*="top-[40%]"] {
              left: 2.7rem !important;
              top: auto !important;
              bottom: 210px !important;
              transform: none !important;
            }
            /* Right player vertically aligned with ROW button and just above */
            div[class*="fixed"][class*="right-4"][class*="top-[40%]"] {
              right: 2.2rem !important;
              top: auto !important;
              bottom: 160px !important;
              transform: none !important;
            }
          }

          /* iPhone 12 Pro Landscape - Move left player up more vertically */
          @media (orientation: landscape) and (min-height: 385px) and (max-height: 395px) {
            /* Move left player up more vertically */
            div[class*="fixed"][class*="left-4"][class*="top-[40%]"] {
              left: 0.5rem !important; /* Move slightly left */
              top: auto !important;
              bottom: 220px !important; /* Position higher above user icon */
              transform: none !important;
            }
          }

          /* iPhone XR, iPhone 12 Pro Max, iPhone 14 Pro Max Landscape - Move left player up vertically */
          @media (orientation: landscape) and (min-height: 410px) and (max-height: 435px) {
            /* Move left player up vertically */
            div[class*="fixed"][class*="left-4"][class*="top-[40%]"] {
              left: 0.5rem !important; /* Move slightly left */
              top: auto !important;
              bottom: 200px !important; /* Position well above user icon */
              transform: none !important;
            }
          }

          @media (orientation: landscape) and (max-width: 1024px) {
            /* Only apply the wide "justify-between" spread on narrow landscape devices (phones/tablets)
               so desktop/laptop browsers keep the cards centered and overlapped. */
            .landscape-hand-container {
              width: 100% !important;
              max-width: none !important;
              display: flex !important;
              flex-direction: row !important;
              justify-content: center !important;
              align-items: center !important;
              padding-left: 0 !important;
              padding-right: 0 !important;
            }
            .landscape-hand-container > .hand-card {
              flex-shrink: 0 !important;
              flex-grow: 0 !important;
              margin-left: 0 !important;
              margin-right: 0 !important;
            }
            /* Add larger spacing between cards for iPhone 14 Pro Max and similar large screens */
            .landscape-hand-container > .hand-card:not(:first-child) {
              margin-left: -5vw !important;
            }
            /* Ensure first card aligns to container start */
            .landscape-hand-container > .hand-card:first-child {
              margin-left: 0 !important;
            }
            /* Ensure last card aligns to container end */
            .landscape-hand-container > .hand-card:last-child {
              margin-right: 0 !important;
            }
          }
          @media (orientation: landscape) and (min-width: 640px) and (max-width: 1024px) {
            .landscape-hand-container > .hand-card:not(:first-child) {
              margin-left: -4vw !important;
            }
          }
          @media (orientation: landscape) and (min-width: 1024px) and (max-width: 1024px) {
            .landscape-hand-container > .hand-card:not(:first-child) {
              margin-left: -3vw !important;
            }
          }
          /* Specific spacing override for iPhone 14 Pro Max (430px) - keep as is */
          @media (orientation: portrait) and (min-width: 430px) and (max-width: 431px) {
            .relative.flex.items-center[class*="px-6"] {
              padding-left: 1rem !important;
              padding-right: 1rem !important;
            }
            .flex.flex-nowrap[class*="portrait:px"] {
              padding-left: 0.5rem !important;
              padding-right: 0.5rem !important;
            }
            .flex.flex-nowrap > .hand-card:not(:first-child) {
              margin-left: -12vw !important;
            }
          }


          /* Portrait: Align YOUR TURN indicator bottom with user's name container (GUEST pill) bottom */
          /* Landscape: No changes - maintain default positioning to avoid overlapping card Arena */
          @media (orientation: portrait) {
            /* Target the turn indicator container - align its bottom with name container bottom */
            /* User's PlayerSlot is centered at bottom-[44px] with -translate-y-1/2 */
            /* Name container bottom aligns slightly below viewport bottom edge */
            .portrait-turn-indicator-container {
              bottom: -2px !important;
              align-items: flex-end !important; /* Ensure items-end is applied to align indicator to container bottom */
            }
            /* Responsive adjustment for larger portrait screens */
            @media (min-width: 428px) {
              .portrait-turn-indicator-container {
                bottom: 0px !important;
              }
            }
            /* Ensure PLAY CARDS button (at bottom-[44px] centered) doesn't overlap - button bottom is ~12px, so indicator at 10-12px is safe */
            /* Turn indicator height is ~32-40px, so its top will be at ~42-52px, well above button center at 44px */
          }

          /* iPhone 12 Pro Max / 14 Pro Max - Vertically align YOUR TURN with PLAY CARDS */
          @media (orientation: portrait) and (min-width: 426px) and (max-width: 431px) {
            .iphone-14-pro-max-turn-indicator {
              margin-left: 1.5vw !important;
            }
          }

          /* iPhone 14 Pro Max only (430px) - Shift YOUR TURN indicator left to align with PLAY CARDS button */
          /* iPhone 12 Pro Max (428px) and XR/SE remain unchanged - they are perfect */
          @media (orientation: portrait) and (min-width: 430px) and (max-width: 431px) {
            .iphone-14-pro-max-turn-indicator {
              margin-left: -3.5vw !important; /* Move left moderately to center with PLAY CARDS button (overrides the 1.5vw from broader query) */
            }
            /* Adjust container padding to fine-tune positioning */
            .portrait-turn-indicator-container {
              padding-right: 1.5rem !important;
              padding-left: 1.5rem !important;
            }
          }

          /* Galaxy S8+ (360px) - Specific override to prevent overflow */
          @media (orientation: portrait) and (min-width: 358px) and (max-width: 362px) {
            /* Keep padding adjustments to maximize width */
            .relative.flex.items-center[class*="px-6"] {
              padding-left: 1rem !important;
              padding-right: 1rem !important;
            }
            .flex.flex-nowrap[class*="portrait:px"] {
              padding-left: 0.5rem !important;
              padding-right: 0.5rem !important;
            }
            /* Tighten overlap significantly to fit screen */
            .flex.flex-nowrap > .hand-card:not(:first-child) {
              margin-left: -16vw !important;
            }
          }

          /* iPhone XR (414px), iPhone 12 Pro Max (428px) - Align cards with PASS/ROW buttons */
          @media (orientation: portrait) and (min-width: 412px) and (max-width: 416px),
                 (orientation: portrait) and (min-width: 426px) and (max-width: 429px) {
            /* Add padding to align with PASS button (left) and ROW button (right) edges */
            .relative.flex.items-center[class*="px-6"] {
              padding-left: 1rem !important;
              padding-right: 1rem !important;
            }
            /* Add inner container padding to align cards with button edges */
            .flex.flex-nowrap[class*="portrait:px"] {
              padding-left: 0.5rem !important;
              padding-right: 0.5rem !important;
            }
            /* Spread cards out - reduce overlap from -15vw to -12vw to align with button edges */
            .flex.flex-nowrap > .hand-card:not(:first-child) {
              margin-left: -12vw !important;
            }
          }
          /* Make player's hand cards same size as cards in play and stretch them out on iPad portrait */
          @media (orientation: portrait) and (min-width: 768px) {
            /* Ensure buttons are above cards with proper spacing - push hand down */
            div[class*="relative"][class*="flex"][class*="items-center"][class*="portrait:justify-center"] {
              margin-top: 6rem !important;
              padding-top: 0 !important;
            }
            /* Make both hand cards and cards in play the SAME size - use same scale */
            .ipad-hand-container.flex-nowrap {
              transform: scale(1.5) !important;
              z-index: 10 !important;
            }
            /* Make cards in play match - same scale as hand container */
            .ipad-cards-in-play {
              transform: scale(1.5) !important;
            }
            /* Stretch cards out more to align with PASS and ROW buttons - reduce overlap */
            .ipad-hand-container.flex-nowrap > .hand-card:not(:first-child) {
              margin-left: -6vw !important;
            }
            /* Adjust container padding to align with button edges */
            .ipad-hand-container {
              padding-left: 1rem !important;
              padding-right: 1rem !important;
              padding-bottom: 2rem !important;
              margin-bottom: 0.5rem !important;
            }
            /* Ensure parent container has enough bottom padding */
            div[class*="absolute"][class*="bottom-0"] {
              padding-bottom: 3rem !important;
            }
            /* Ensure buttons stay above cards */
            div[class*="hidden"][class*="md:portrait:flex"] {
              position: relative !important;
              z-index: 50 !important;
            }
            /* Make button container match the width of the full hand cards - match hand container padding */
            .ipad-button-container {
              width: 100% !important;
              max-width: none !important;
              padding-left: 0 !important;
              padding-right: 0 !important;
            }
            .ipad-button-row {
              width: 100% !important;
              max-width: none !important;
              padding-left: 1.5rem !important;
              padding-right: 1.5rem !important;
            }
            @media (min-width: 1024px) {
              /* Restore larger margin for Pro screens */
              div[class*="relative"][class*="flex"][class*="items-center"][class*="portrait:justify-center"] {
                margin-top: 6rem !important;
              }
              .ipad-button-container {
                padding-left: 0 !important;
                padding-right: 0 !important;
              }
              .ipad-button-row {
                padding-left: 1.5rem !important;
                padding-right: 1.5rem !important;
              }
              .ipad-hand-container.flex-nowrap {
                transform: scale(1.7) !important;
              }
              .ipad-cards-in-play {
                transform: scale(1.7) !important;
              }
              /* Stretch out even more on larger iPads to reach button edges */
              .ipad-hand-container.flex-nowrap > .hand-card:not(:first-child) {
                margin-left: -3.8vw !important;
              }
              .ipad-hand-container {
                padding-left: 1rem !important;
                padding-right: 1rem !important;
              }
            }
          /* Lower the cards in play pile so <PLAYER'S> MOVE sits just above YOUR TURN */
          .ipad-cards-in-play-container {
            transform: translateY(-80px) !important;
          }

          /* Move left and right players up while keeping them horizontally aligned */
          div[class*="col-start-1"][class*="row-start-2"][class*="md:portrait:fixed"] {
            top: calc(50% - 230px) !important;
            transform: translateY(-50%) !important;
            bottom: auto !important;
          }
            /* Right player container - target by md:portrait:right- or any right positioning */
            div[class*="fixed"][class*="md:portrait:right-"] {
              top: calc(50% - 230px) !important;
              transform: translateY(-50%) !important;
              bottom: auto !important;
            }
            /* Ensure bottom (user) and left player icons are vertically aligned on larger iPads */
            div[class*="absolute"][class*="left-"][class*="bottom-[44px]"] {
              bottom: 136px !important;
              top: auto !important;
              transform: none !important;
            }
          }
          
          /* iPad Pro Landscape specifically (and other high-res large landscape screens) */
          @media (orientation: landscape) and (min-width: 1366px) {
            .ipad-cards-in-play {
              transform: scale(2.0) !important; /* Larger for better visibility (relative to 0.8 base) */
            }
            /* Override parent container bottom position for iPad Pro */
            div[class*="landscape:absolute"][class*="landscape:left-4"][class*="landscape:right-4"] {
              bottom: 40px !important; /* Move cards up more from button bottom */
            }
            .ipad-hand-container {
              transform: scale(1.5) !important; /* Further reduced to ensure they stay on screen */
              bottom: 0 !important; /* Position at parent's bottom */
            }
            .ipad-hand-container > .hand-card:not(:first-child) {
              margin-left: -3vw !important; /* Slightly tighter than -2vw to prevent side overflow */
            }
            /* Move user icon to align vertically (same left position) with PASS button - same size as other players */
            .ipad-pro-user-slot {
              left: 1rem !important; /* Align with PASS button (left-4 = 1rem) */
              bottom: 120px !important; /* Position above PASS button (button is 96px tall at bottom-4, so icon at 120px sits above it) */
              transform: none !important; /* Remove scale to match other players (they all use landscape:scale-75) */
            }
            /* Enlarge top right buttons */
            .ipad-pro-top-right-buttons button[class*="rounded-2xl"] {
              width: 3.5rem !important;
              height: 3.5rem !important;
            }
            .ipad-pro-top-right-buttons button[class*="rounded-2xl"] svg,
            .ipad-pro-top-right-buttons button[class*="rounded-2xl"] > svg,
            .ipad-pro-top-right-buttons button[class*="rounded-2xl"] > * {
              width: 1.75rem !important;
              height: 1.75rem !important;
            }
            /* Move YOUR TURN indicator down to add space between it and buttons */
            .ipad-pro-turn-indicator {
              top: 5.5rem !important; /* Move down from top-14 (56px) to 88px to add vertical space */
            }
          }

          /* iPad Air and iPad Mini Landscape - Move user icon up so name is above PASS button */
          @media (orientation: landscape) and (min-width: 768px) and (max-width: 1365px) {
            .ipad-pro-user-slot {
              bottom: 100px !important; /* Move up so name sits above PASS button */
            }
          }

          /* Landscape view - Constrain YOUR TURN indicator width */
          @media (orientation: landscape) {
            .ipad-pro-turn-indicator {
              width: 120px !important; /* Reduced width for a more compact indicator */
              max-width: 120px !important;
            }
            .ipad-pro-turn-indicator > div {
              width: 100% !important;
            }
            .ipad-pro-turn-indicator > div > div[class*="rounded-full"] {
              width: 100% !important;
              max-width: 100% !important;
            }
          }
          
          /* Multi-row hand - overlapping cards that fit viewport */
          .multi-row-top-row > .hand-card:not(:first-child),
          .multi-row-bottom-row > .hand-card:not(:first-child) {
            margin-left: 0 !important;
          }
          
          /* Portrait - overlapping cards for multi-row */
          @media (orientation: portrait) {
            .multi-row-top-row > .hand-card:not(:first-child) {
              margin-left: -12vw !important;
            }
            .multi-row-bottom-row > .hand-card:not(:first-child) {
              margin-left: -12vw !important;
            }
            /* Smaller screens need more overlap */
            @media (max-width: 375px) {
              .multi-row-top-row > .hand-card:not(:first-child),
              .multi-row-bottom-row > .hand-card:not(:first-child) {
                margin-left: -14vw !important;
              }
            }
            /* Larger screens can have less overlap */
            @media (min-width: 428px) {
              .multi-row-top-row > .hand-card:not(:first-child),
              .multi-row-bottom-row > .hand-card:not(:first-child) {
                margin-left: -10vw !important;
              }
            }
            @media (min-width: 768px) {
              .multi-row-top-row > .hand-card:not(:first-child),
              .multi-row-bottom-row > .hand-card:not(:first-child) {
                margin-left: -6vw !important;
              }
            }
          }
          
          /* Landscape - overlapping cards for multi-row */
          @media (orientation: landscape) {
            .multi-row-top-row > .hand-card:not(:first-child),
            .multi-row-bottom-row > .hand-card:not(:first-child) {
              margin-left: -4vw !important;
            }
            /* Smaller landscape screens need more overlap */
            @media (max-width: 667px) {
              .multi-row-top-row > .hand-card:not(:first-child),
              .multi-row-bottom-row > .hand-card:not(:first-child) {
                margin-left: -5vw !important;
              }
            }
            /* Larger landscape screens can have less overlap */
            @media (min-width: 1024px) {
              .multi-row-top-row > .hand-card:not(:first-child),
              .multi-row-bottom-row > .hand-card:not(:first-child) {
                margin-left: -3vw !important;
              }
            }
          }
        `}} />
      )}
    </div>
  );
};
