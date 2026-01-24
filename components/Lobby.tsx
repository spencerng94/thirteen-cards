import React, { useState, useEffect, useCallback, memo, useRef } from 'react';
import { GameState, GameStatus, SocketEvents, BackgroundTheme, AiDifficulty, Emote } from '../types';
import { socket, connectSocket } from '../services/socket';
import { BoardSurface } from './UserHub';
import { VisualEmote } from './VisualEmote';
import { fetchEmotes } from '../services/supabase';
import { Toast } from './Toast';
import { localDiscoveryService } from '../services/localDiscovery';
import { containsProfanity } from '../utils/wordFilter';
import { useLobbySettings } from '../hooks/useLobbySettings';

interface PublicRoom {
  id: string;
  name: string;
  playerCount: number;
  hostName: string;
  hostAvatar: string;
}

interface LobbyProps {
  playerName: string;
  gameState: GameState | null;
  error: string | null;
  playerAvatar?: string;
  initialRoomCode?: string | null;
  backgroundTheme: BackgroundTheme;
  onBack?: () => void;
  onSignOut: () => void;
  myId?: string; // Persistent UUID
  turnTimerSetting: number;
  selected_sleeve_id?: string; // Card sleeve ID for this player
  initialTab?: 'PUBLIC' | 'CREATE' | 'LOCAL';
}

const MAX_PLAYERS = 4;

const BackgroundWrapperComponent: React.FC<{ children: React.ReactNode; theme: BackgroundTheme }> = ({ children, theme }) => {
  return (
    <div className="min-h-[100dvh] w-full relative overflow-hidden flex flex-col items-center justify-center p-4 sm:p-8" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <BoardSurface themeId={theme} />
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none z-10" style={{ 
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1.5px, transparent 1.5px), linear-gradient(90deg, rgba(255,255,255,0.1) 1.5px, transparent 1.5px)`, 
            backgroundSize: '80px 80px' 
        }}></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,_rgba(0,0,0,0.6)_100%)] pointer-events-none z-[11]"></div>
        {children}
    </div>
  );
};

const BackgroundWrapper = memo(BackgroundWrapperComponent, (prevProps, nextProps) => prevProps.theme === nextProps.theme);

// Memoized PlayerSlot component to prevent unnecessary re-renders
interface PlayerSlotProps {
  index: number;
  player: any | null;
  isHost: boolean;
  myId: string | undefined;
  remoteEmotes: Emote[];
  onRemoveBot: (botId: string) => void;
  onUpdateDifficulty: (botId: string, difficulty: AiDifficulty) => void;
  onAddBot: () => void;
  gameState: GameState | null;
}

const PlayerSlot = memo(({ index, player, isHost, myId, remoteEmotes, onRemoveBot, onUpdateDifficulty, onAddBot, gameState }: PlayerSlotProps) => {
  if (player) {
    const isMe = player.id === myId;
    const currentPlayer = gameState?.players?.find(p => p.id === player.id);
    const currentDifficulty = currentPlayer?.difficulty || player.difficulty || 'MEDIUM';
    
    return (
      <div className="player-slot transition-all duration-200 ease-in-out">
        <div className={`relative group flex flex-col p-4 sm:p-5 rounded-[2.5rem] bg-black/40 border-2 transition-all duration-200 overflow-visible min-h-[140px] ${player.id === myId ? 'border-yellow-500/40 shadow-[inset_0_0_30px_rgba(234,179,8,0.05)]' : player.isBot ? 'border-cyan-500/40 shadow-[inset_0_0_20px_rgba(6,182,212,0.1)]' : 'border-white/5 hover:border-white/10'}`}>
          <div className="flex items-center gap-4 sm:gap-5 flex-1 min-w-0 relative">
            <div className="relative flex-shrink-0">
              <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-[1.5rem] bg-black border flex items-center justify-center overflow-hidden shadow-2xl group-hover:scale-105 transition-transform duration-200 ${player.isBot ? 'border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'border-white/10'}`}>
                <VisualEmote trigger={player.avatar} remoteEmotes={remoteEmotes} size="md" />
                {player.isBot && (
                  <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 bg-cyan-500/90 text-white text-[6px] font-black uppercase tracking-wider px-1 py-0.5 rounded-full border border-cyan-400/50 shadow-lg whitespace-nowrap">
                    CPU
                  </div>
                )}
              </div>
              {player.isHost && (
                <div className="absolute -top-2 -left-2 w-6 h-6 sm:w-8 sm:h-8 bg-yellow-500 rounded-full flex items-center justify-center text-xs border-4 border-black shadow-lg z-10">👑</div>
              )}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className={`text-xs sm:text-sm font-black uppercase tracking-[0.15em] truncate ${player.id === myId ? 'text-yellow-500' : player.isBot ? 'text-cyan-400' : 'text-white'}`}>{player.name}</span>
            </div>
            
            {player.isBot && isHost && (
              <button 
                onClick={() => onRemoveBot(player.id)}
                className="absolute -top-6 -right-6 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-rose-600/90 hover:bg-rose-600 border-2 border-rose-500 text-white hover:text-white transition-all duration-150 flex items-center justify-center flex-shrink-0 z-20 shadow-lg"
                title="Remove Bot"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            )}
          </div>

          {player.isBot && isHost && (
            <div className="mt-3 pt-3 border-t border-white/5">
              <div className="flex items-center justify-center">
                <div className="flex gap-1 bg-black/60 p-1 rounded-xl border border-white/5">
                  {(['EASY', 'MEDIUM', 'HARD'] as AiDifficulty[]).map(d => {
                    const active = currentDifficulty === d;
                    const colors = d === 'EASY' ? 'bg-emerald-600' : d === 'MEDIUM' ? 'bg-yellow-500 text-black' : 'bg-rose-600';
                    return (
                      <button 
                        key={`${player.id}-${d}`}
                        onClick={() => onUpdateDifficulty(player.id, d)}
                        className={`w-7 h-7 rounded-lg text-[10px] font-black transition-all duration-150 flex items-center justify-center ${active ? `${colors} scale-110 shadow-lg` : 'text-white/20 hover:text-white/40 bg-white/5'}`}
                        title={`Combat Difficulty: ${d}`}
                      >
                        {d[0]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
  
  // Empty slot
  return (
    <div className="slot-empty min-h-[140px] transition-all duration-200 ease-in-out">
      {isHost && (gameState?.players?.length || 0) < 4 ? (
        <button 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onAddBot();
          }}
          disabled={(gameState?.players?.length || 0) >= 4}
          className="flex items-center gap-5 p-5 rounded-[2.5rem] border-2 border-dashed border-white/5 bg-white/[0.01] hover:bg-white/[0.04] hover:border-yellow-500/40 transition-all duration-200 group w-full min-h-[140px] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <div className="w-16 h-16 rounded-[1.5rem] border-2 border-dashed border-white/10 flex items-center justify-center group-hover:scale-105 transition-transform duration-200 group-hover:border-yellow-500/40 group-hover:bg-yellow-500/5">
            <span className="text-3xl font-black text-white/10 group-hover:text-yellow-500 transition-colors duration-200">+</span>
          </div>
          <div className="flex flex-col items-start text-left">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 group-hover:text-white transition-colors duration-200">ADD CPU</span>
            <span className="text-[7px] font-bold uppercase tracking-widest text-white/5 group-hover:text-yellow-500/40 mt-1 transition-colors duration-200">Slot {index + 1}</span>
          </div>
        </button>
      ) : (
        <div className="flex items-center gap-5 p-5 rounded-[2.5rem] border-2 border-dashed border-white/[0.03] bg-white/[0.01] opacity-20 min-h-[140px] w-full">
          <div className="w-16 h-16 rounded-[1.5rem] border-2 border-dashed border-white/10"></div>
          <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/10">WAITING...</span>
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for memo
  const prevPlayer = prevProps.player;
  const nextPlayer = nextProps.player;
  
  // If both are null/undefined, they're equal
  if (!prevPlayer && !nextPlayer) return true;
  
  // If one is null and the other isn't, they're different
  if (!prevPlayer || !nextPlayer) return false;
  
  // Compare player properties that matter
  return (
    prevPlayer.id === nextPlayer.id &&
    prevPlayer.name === nextPlayer.name &&
    prevPlayer.avatar === nextPlayer.avatar &&
    prevPlayer.difficulty === nextPlayer.difficulty &&
    prevPlayer.isBot === nextPlayer.isBot &&
    prevPlayer.isHost === nextPlayer.isHost &&
    prevProps.isHost === nextProps.isHost &&
    prevProps.index === nextProps.index &&
    prevProps.gameState?.players?.length === nextProps.gameState?.players?.length
  );
});

PlayerSlot.displayName = 'PlayerSlot';

const GlassPanel: React.FC<{ children: React.ReactNode; className?: string; isLight?: boolean }> = ({ children, className = '', isLight = false }) => (
  <div className={`relative ${isLight ? 'bg-white/60' : 'bg-black/60'} backdrop-blur-3xl border ${isLight ? 'border-white/40' : 'border-white/10'} shadow-[0_40px_100px_rgba(0,0,0,0.8)] rounded-[3rem] overflow-hidden ${className}`}>
      <div className={`absolute inset-0 rounded-[3rem] ring-1 ring-inset ${isLight ? 'ring-white/80' : 'ring-white/5'} pointer-events-none`}></div>
      {children}
  </div>
);

const RecycleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 2v6h-6"/>
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
    <path d="M3 22v-6h6"/>
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
  </svg>
);

// Memoized Tab Content Components
interface PublicTabProps {
  roomIdInput: string;
  setRoomIdInput: (value: string) => void;
  joinRoom: (roomId?: string) => void;
  publicRooms: PublicRoom[];
  remoteEmotes: Emote[];
  isRefreshing: boolean;
  refreshRooms: () => void;
  socketConnected: boolean;
}

const PublicTabContent: React.FC<PublicTabProps> = ({ 
  roomIdInput, 
  setRoomIdInput, 
  joinRoom, 
  publicRooms, 
  remoteEmotes,
  isRefreshing,
  refreshRooms,
  socketConnected
}) => {
  // Track minimum search time to prevent flicker
  const [searchStartTime, setSearchStartTime] = useState<number | null>(null);
  const [showSearching, setShowSearching] = useState(false);
  
  // Debug: Log when publicRooms changes
  useEffect(() => {
    console.log('📋 PublicTabContent: publicRooms updated', publicRooms.length, 'rooms', publicRooms.map(r => r.id));
  }, [publicRooms]);
  
  // Track search start time when isRefreshing becomes true
  useEffect(() => {
    if (isRefreshing) {
      setSearchStartTime(Date.now());
      setShowSearching(true);
    } else if (searchStartTime !== null) {
      // Ensure "Searching..." shows for at least 400ms max (reduced from 1000ms for snappier UI)
      const elapsed = Date.now() - searchStartTime;
      const remaining = Math.max(0, 400 - elapsed);
      const timeout = setTimeout(() => {
        setShowSearching(false);
        setSearchStartTime(null);
      }, remaining);
      return () => clearTimeout(timeout);
    }
  }, [isRefreshing, searchStartTime]);

  // CRITICAL DEBUG: Log on every render to confirm props are being received
  console.log("DEBUG: PublicTabContent received rooms:", publicRooms.length, {
    rooms: publicRooms,
    roomIds: publicRooms.map(r => r.id),
    isRefreshing,
    socketConnected
  });

  return (
    <div className="h-full flex flex-col space-y-6 sm:space-y-8">
      <div className="space-y-3">
        <label className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-white/50 px-2">Join with Room Code</label>
        <div className="flex items-stretch gap-2 sm:gap-3 bg-gradient-to-br from-black/60 to-black/40 p-3 sm:p-4 rounded-2xl sm:rounded-[2rem] border-2 border-white/10 shadow-inner focus-within:border-yellow-500/50 focus-within:shadow-[0_0_30px_rgba(234,179,8,0.2)] transition-all duration-300">
          <input 
            type="text" 
            placeholder="ABCD" 
            value={roomIdInput}
            maxLength={4}
            onChange={e => setRoomIdInput(e.target.value.toUpperCase())}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                joinRoom();
              }
            }}
            className="flex-1 bg-transparent border-none outline-none text-2xl sm:text-4xl font-serif font-black tracking-[0.4em] text-yellow-400 placeholder:text-white/10 px-4 sm:px-6 py-2 min-w-0"
          />
          <button 
            onClick={() => joinRoom()} 
            disabled={!roomIdInput.trim()}
            className="h-auto min-h-[56px] sm:min-h-[64px] px-5 sm:px-8 bg-gradient-to-br from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed disabled:opacity-40 text-black rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all active:scale-95 shadow-[0_8px_20px_rgba(234,179,8,0.3)] hover:shadow-[0_12px_30px_rgba(234,179,8,0.4)] whitespace-nowrap flex items-center justify-center"
          >
            JOIN
          </button>
        </div>
      </div>

      <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex justify-between items-center px-2 mb-4 sm:mb-6">
          <div className="flex flex-col">
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">Public Matches</span>
            <span className="text-[9px] sm:text-[10px] font-semibold text-white/40 uppercase tracking-wider mt-0.5">{publicRooms.length} {publicRooms.length === 1 ? 'room' : 'rooms'} available</span>
          </div>
          <button 
            onClick={refreshRooms} 
            disabled={isRefreshing || (!socketConnected && !socket?.connected)} 
            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center transition-all duration-200 active:scale-90 ${isRefreshing || (!socketConnected && !socket?.connected) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/10 hover:border-yellow-500/30 hover:text-yellow-400'}`}
          >
            <div className={isRefreshing ? 'animate-spin' : ''}><RecycleIcon /></div>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 sm:pr-4 space-y-3 sm:space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {isRefreshing && publicRooms.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-12">
              <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mb-4"></div>
              <p className="text-xs sm:text-sm font-black uppercase tracking-wider text-white/60">Searching...</p>
            </div>
          ) : publicRooms.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-12">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-[2rem] border-2 border-dashed border-white/20 flex items-center justify-center mb-4 sm:mb-6 bg-white/[0.02]">
                <span className="text-3xl sm:text-4xl">🃏</span>
              </div>
              <p className="text-xs sm:text-sm font-black uppercase tracking-wider text-white/60">No matches found</p>
              <p className="text-[9px] sm:text-[10px] font-medium text-white/40 mt-2">Create your own room to get started!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {publicRooms && publicRooms.length > 0 && publicRooms.map(room => (
                <div 
                  key={room.id || room.roomId || `room-${room.name}-${room.hostName}`} 
                  onClick={() => joinRoom(room.id)}
                  className="group relative bg-gradient-to-br from-white/[0.04] to-white/[0.02] border-2 border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 hover:bg-gradient-to-br hover:from-yellow-500/10 hover:to-pink-500/10 hover:border-yellow-500/40 hover:shadow-[0_0_30px_rgba(234,179,8,0.2)] transition-all duration-300 cursor-pointer shadow-lg flex flex-col gap-4 sm:gap-5"
                >
                  <div className="flex justify-between items-start">
                    <div className="relative">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-black/60 to-black/40 border-2 border-white/10 flex items-center justify-center overflow-hidden shadow-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                        <VisualEmote trigger={room.hostAvatar} remoteEmotes={remoteEmotes} size="sm" />
                      </div>
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-black shadow-lg animate-pulse"></div>
                    </div>
                    <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border border-yellow-500/40 px-3 py-1.5 rounded-full shadow-lg">
                      <span className="text-[9px] sm:text-[10px] font-black text-yellow-400 font-mono">{room.playerCount}/4</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-base sm:text-lg font-black text-white uppercase tracking-tight truncate">{room.name}</span>
                    <div className="flex items-center gap-2">
                    <span className="text-[9px] sm:text-[10px] font-semibold text-white/50 uppercase tracking-wider">Host: {room.hostName}</span>
                      <span className="text-[9px] sm:text-[10px] font-mono font-black text-yellow-400/80 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/30">{room.id}</span>
                    </div>
                  </div>
                  <div className="absolute bottom-4 right-4 w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-br from-yellow-500 to-yellow-600 text-black flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:translate-x-1 group-hover:scale-110 transition-all duration-300 shadow-xl">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16"><path d="m12.14 8.753-5.482 4.796c-.646.566-1.658.106-1.658-.753V3.204a1 1 0 0 1 1.659-.753l5.48 4.796a1 1 0 0 1 0 1.506z"/></svg>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


interface LocalTabProps {
  localNetworkInfo: { isLocalNetwork: boolean; networkType: 'wifi' | 'hotspot' | 'unknown'; canHost: boolean };
  localRoomCode: string;
  setLocalRoomCode: (value: string) => void;
  isHostingLocal: boolean;
  setIsHostingLocal: (value: boolean) => void;
  joinRoom: (roomId: string) => void;
  playerName: string;
  playerAvatar?: string;
  localTurnTimer: number;
  myId?: string;
  selected_sleeve_id?: string;
  setErrorToast: (toast: { show: boolean; message: string }) => void;
}

const LocalTabContent: React.FC<LocalTabProps> = ({
  localNetworkInfo,
  localRoomCode,
  setLocalRoomCode,
  isHostingLocal,
  setIsHostingLocal,
  joinRoom,
  playerName,
  playerAvatar,
  localTurnTimer,
  myId,
  selected_sleeve_id,
  setErrorToast
}) => {
  return (
    <div className="h-full flex flex-col space-y-6 sm:space-y-8">
      {!localNetworkInfo.canHost ? (
        <div className="flex flex-col items-center justify-center text-center space-y-4 py-12">
          <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-white/20 flex items-center justify-center bg-white/[0.02]">
            <span className="text-3xl">📡</span>
          </div>
          <p className="text-sm font-black uppercase tracking-wider text-white/60">Local Network Required</p>
          <p className="text-xs font-medium text-white/40 max-w-sm">Connect to Wi-Fi or a hotspot to host local games with nearby friends.</p>
        </div>
      ) : (
        <>
          {/* Traveler's Guide Section */}
          <div className="bg-gradient-to-br from-amber-950/40 via-amber-900/30 to-amber-950/40 backdrop-blur-xl border-2 border-amber-700/40 rounded-2xl sm:rounded-3xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-700/30 to-amber-800/30 border border-amber-600/40 flex items-center justify-center">
                <span className="text-xl">✈️</span>
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-amber-400 border-b border-amber-600/50 pb-1">Traveler's Guide</h3>
              </div>
            </div>
            <ol className="text-xs font-medium text-zinc-400 leading-relaxed space-y-2 list-decimal list-inside">
              <li>Host starts Hotspot.</li>
              <li>Friends join Wi-Fi.</li>
              <li>Play anywhere—even mid-flight.</li>
            </ol>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {!isHostingLocal ? (
              <div className="space-y-3 sm:space-y-4">
                <label className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-white/50 px-2">Host a Local Table</label>
                <button
                  onClick={async () => {
                    try {
                      const code = await localDiscoveryService.hostRoom(playerName, playerAvatar || ':smile:');
                      setLocalRoomCode(code);
                      setIsHostingLocal(true);
                      // Create room via socket with the local code (only if socket is connected)
                      // LOCAL tab works independently - socket is optional
                      if (socket.connected) {
                        socket.emit(SocketEvents.CREATE_ROOM, {
                          name: playerName,
                          avatar: playerAvatar,
                          playerId: myId,
                          isPublic: false,
                          roomName: `${playerName.toUpperCase()}'S LOCAL TABLE`,
                          turnTimer: hookedTimer,
                          selected_sleeve_id: selected_sleeve_id
                        });
                      }
                    } catch (error: any) {
                      setErrorToast({ show: true, message: error.message || 'Failed to host local room' });
                    }
                  }}
                  className="w-full py-4 sm:py-5 bg-gradient-to-br from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-black uppercase tracking-wider text-xs sm:text-sm rounded-2xl sm:rounded-3xl transition-all duration-300 active:scale-95 shadow-lg"
                >
                  Start Hosting
                </button>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                <label className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-white/50 px-2">Your Local Code</label>
                <div className="bg-gradient-to-br from-amber-950/60 to-amber-900/40 border-2 border-amber-700/40 rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-center space-y-4">
                  <p className="text-2xl font-serif font-black text-amber-600 tracking-[0.2em]">{localRoomCode}</p>
                  <button
                    onClick={() => {
                      localDiscoveryService.stopHosting();
                      setIsHostingLocal(false);
                      setLocalRoomCode('');
                    }}
                    className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white/70 hover:text-white text-xs font-black uppercase tracking-wider transition-all duration-200"
                  >
                    Stop Hosting
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3 sm:space-y-4">
              <label className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-white/50 px-2">Join Local Room</label>
              <div className="flex items-stretch gap-2 bg-gradient-to-br from-black/60 to-black/40 p-3 sm:p-4 rounded-2xl sm:rounded-[2rem] border-2 border-white/10 shadow-inner focus-within:border-yellow-500/50 focus-within:shadow-[0_0_30px_rgba(234,179,8,0.2)] transition-all duration-300">
                <input
                  type="text"
                  placeholder="CODE"
                  value={localRoomCode}
                  maxLength={4}
                  onChange={e => setLocalRoomCode(e.target.value.toUpperCase())}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && localRoomCode.trim()) {
                      joinRoom(localRoomCode);
                    }
                  }}
                  className="flex-1 bg-transparent border-none outline-none text-xl sm:text-2xl font-serif font-black tracking-[0.4em] text-yellow-400 placeholder:text-white/10 px-4 py-2 min-w-0"
                />
                <button
                  onClick={() => joinRoom(localRoomCode)}
                  disabled={!localRoomCode.trim()}
                  className="h-auto min-h-[48px] px-4 sm:px-6 bg-gradient-to-br from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed disabled:opacity-40 text-black rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all active:scale-95 shadow-lg whitespace-nowrap flex items-center justify-center"
                >
                  JOIN
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const LuxuryActionTile: React.FC<{ 
    onClick: () => void; 
    label: string; 
    sublabel: string;
    icon: React.ReactNode;
    variant?: 'gold' | 'emerald' | 'ghost' | 'rose';
    className?: string;
}> = ({ onClick, label, sublabel, icon, variant = 'ghost', className = '' }) => {
    const themes = {
        gold: { bg: "from-[#3d280a] via-[#b8860b] to-[#3d280a]", highlight: "from-[#b8860b] via-[#fbf5b7] to-[#8b6508]", text: "text-black", border: "border-yellow-300/40" },
        emerald: { bg: "from-[#064e3b] via-[#059669] to-[#064e3b]", highlight: "from-[#059669] via-[#34d399] to-[#047857]", text: "text-white", border: "border-yellow-500/50" },
        ghost: { bg: "from-zinc-900 via-zinc-800 to-zinc-900", highlight: "from-zinc-800 via-zinc-700 to-zinc-900", text: "text-white", border: "border-white/10" },
        rose: { bg: "from-[#450a0a] via-[#991b1b] to-[#450a0a]", highlight: "from-[#991b1b] via-[#ef4444] to-[#7f1d1d]", text: "text-white", border: "border-rose-500/40" }
    };
    const theme = themes[variant];

    return (
        <button 
            onClick={onClick} 
            className={`group relative overflow-hidden rounded-[2rem] border transition-all duration-300 active:scale-95 shadow-2xl ${theme.border} ${className}`}
        >
            <div className={`absolute inset-0 bg-gradient-to-b ${theme.bg} group-hover:scale-110 transition-transform duration-700`}></div>
            <div className={`absolute inset-0 bg-gradient-to-b ${theme.highlight} opacity-90 transition-opacity duration-150 group-hover:opacity-100`}></div>
            <div className="relative z-10 flex flex-col items-center justify-center p-5 sm:p-6 text-center">
                <div className="flex items-center gap-3">
                    <span className={`text-xs sm:text-sm font-black uppercase tracking-[0.3em] font-serif ${theme.text} drop-shadow-md`}>{label}</span>
                    <div className={`${theme.text} group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300`}>{icon}</div>
                </div>
                <span className={`text-[8px] font-black opacity-60 tracking-[0.4em] uppercase font-serif mt-2 ${theme.text}`}>{sublabel}</span>
            </div>
        </button>
    );
};

function LobbyComponent({ 
  playerName, 
  gameState, 
  error, 
  playerAvatar, 
  initialRoomCode,
  selected_sleeve_id,
  backgroundTheme,
  onBack,
  onSignOut,
  myId,
  turnTimerSetting,
  initialTab = 'PUBLIC'
}: LobbyProps) {
  // Initialize hook at the very top to bypass closure issues
  const initialTimer = turnTimerSetting !== undefined && turnTimerSetting !== null ? turnTimerSetting : 30;
  const { timer: hookedTimer, setTimer: setHookedTimer, isPublic, setIsPublic } = useLobbySettings(initialTimer, true);
  
  // Instance ID tracking (logging removed for production)
  
  // State change tracking (logging removed for production)

  // DOM Force-Clear: Remove any loading spinners or splash screens that might be blocking
  useEffect(() => {
    document.querySelectorAll('.loading-spinner, #splash-screen, [class*="loading"], [id*="splash"], [id*="loading"]').forEach(el => {
      console.log('Removing ghost DOM element:', el);
      el.remove();
    });
  }, []);

  // CRITICAL: Force re-render when gameState prop changes
  // This ensures the component updates when App.tsx receives new game_state from server
  const [forceRenderKey, setForceRenderKey] = useState(0);
  
  useEffect(() => {
    if (gameState) {
      // Force re-render by updating key
      setForceRenderKey(prev => prev + 1);
    }
  }, [gameState]);

  
  const [roomIdInput, setRoomIdInput] = useState(initialRoomCode || '');
  const [roomNameInput, setRoomNameInput] = useState(() => {
    const name = playerName?.trim() || 'PLAYER';
    return `${name.toUpperCase()}'S MATCH`;
  });
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [remoteEmotes, setRemoteEmotes] = useState<Emote[]>([]);
  const [publicRooms, setPublicRooms] = useState<PublicRoom[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false); // Track if we've received at least one response
  const isFetchingRef = useRef(false); // Prevent multiple simultaneous fetches
  const hasInitialFetchRef = useRef(false); // Track if initial fetch has been called
  
  // Single source of truth for tab navigation - use initialTab prop if provided
  const [activeTab, setActiveTab] = useState<'PUBLIC' | 'CREATE' | 'LOCAL'>(initialTab);
  
  const [socketConnected, setSocketConnected] = useState(false);
  const [socketConnecting, setSocketConnecting] = useState(false);
  
  // Ref to prevent infinite loops on initial mount
  const isInitialMount = React.useRef(true);

  // Sync socketConnected state with actual socket connection status
  useEffect(() => {
    if (!socket) return;
    
    const onConnect = () => {
      console.log('📡 Lobby: Socket connected event received');
      setSocketConnected(true);
    };
    
    const onDisconnect = () => {
      console.log('📡 Lobby: Socket disconnected event received');
      setSocketConnected(false);
    };
    
    // Register event listeners
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    
    // Sync immediately if already connected - check both state and actual socket
    if (socket.connected) {
      console.log('📡 Lobby: Socket already connected on mount, syncing state');
      setSocketConnected(true);
      // CRITICAL: If socket is already connected and we're on PUBLIC tab, emit immediately
      // This prevents race condition where state hasn't updated yet
      // Note: Listener registration happens in separate useEffect, so we use a small delay
      // CRITICAL: Only run once using hasInitialFetchRef to prevent duplicate requests
      if (activeTab === 'PUBLIC' && !isFetchingRef.current && !hasInitialFetchRef.current) {
        console.log('📡 Lobby: Socket connected on mount, immediately fetching public rooms');
        hasInitialFetchRef.current = true;
        isFetchingRef.current = true;
        setIsRefreshing(true);
        // Small delay to ensure listener is registered (listener useEffect runs first)
        setTimeout(() => {
          if (socket?.connected) {
            socket.emit(SocketEvents.GET_PUBLIC_ROOMS);
          }
        }, 10);
      }
    } else {
      // Also sync if state says connected but socket says not (fix desync)
      setSocketConnected(socket.connected);
    }
    
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [socket, activeTab]);
  
  // Removed handleTabChange - using direct setState to avoid stale closures
  // Initialize with default object to prevent loading spinner from hanging
  const [localNetworkInfo, setLocalNetworkInfo] = useState<{ isLocalNetwork: boolean; networkType: 'wifi' | 'hotspot' | 'unknown'; canHost: boolean }>({ isLocalNetwork: true, networkType: 'unknown', canHost: true });
  const [localRoomCode, setLocalRoomCode] = useState<string>('');
  const [isHostingLocal, setIsHostingLocal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(true); // Start as true to show loading until first response
  const [syncTimer, setSyncTimer] = useState(0);
  const [errorToast, setErrorToast] = useState<{ show: boolean; message: string }>({ show: false, message: '' });
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [profanityToast, setProfanityToast] = useState<{ show: boolean; message: string }>({ show: false, message: '' });

  // Profanity check - removed useMemo to prevent caching issues
  const hasProfanity = containsProfanity(roomNameInput);

  // Initialize component data - decoupled from socket
  useEffect(() => {
    if (initialRoomCode) {
      setRoomIdInput(initialRoomCode);
    }
    fetchEmotes().then(setRemoteEmotes);
  }, [initialRoomCode]);

  // Initialize local network info when component mounts or when LOCAL tab becomes active
  useEffect(() => {
    // Always fetch network info on mount and when switching to LOCAL tab
    // The default object ensures UI doesn't hang, but we still want accurate detection
    localDiscoveryService.detectLocalNetwork()
      .then(setLocalNetworkInfo)
      .catch(() => {
        // Fallback: allow hosting even if detection fails (user can still try)
        setLocalNetworkInfo({ isLocalNetwork: true, networkType: 'unknown', canHost: true });
      });
  }, [activeTab === 'LOCAL']); // Re-run when switching to LOCAL tab

  // Socket initialization - completely decoupled from UI rendering
  useEffect(() => {
    let isMounted = true;
    let connectionTimeout: NodeJS.Timeout | null = null;

    const handleConnect = () => {
      if (isMounted) {
        setSocketConnected(true);
        setSocketConnecting(false);
      }
    };

    const handleDisconnect = () => {
      if (isMounted) {
        setSocketConnected(false);
        setSocketConnecting(false);
      }
    };

    const handleConnectError = () => {
      if (isMounted) {
        setSocketConnected(false);
        setSocketConnecting(false);
      }
    };

    const initializeSocket = () => {
      console.log('Initializing socket...', { 
        connected: socket.connected, 
        disconnected: socket.disconnected,
        isMounted 
      });
      
      if (socket.connected && isMounted) {
        console.log('Socket already connected on mount');
        setSocketConnected(true);
        setSocketConnecting(false);
        return;
      }
      
      if (!isMounted) {
        console.log('Component not mounted, skipping socket init');
        return;
      }
      
        try {
          setSocketConnecting(true);
        console.log('Socket not connected, setting up listeners and connecting...');
          
          // Register event listeners
          socket.on('connect', handleConnect);
          socket.on('disconnect', handleDisconnect);
        socket.on('connect_error', (error) => {
          console.log('Socket connect error:', error);
          handleConnectError();
        });
          
        // Attempt connection - try direct connect if connectSocket doesn't work
        console.log('Calling connectSocket()...');
      connectSocket();
          
        // Also try direct connect as fallback
        if (!socket.connected) {
          console.log('connectSocket() did not connect, trying direct socket.connect()...');
          try {
            socket.connect();
          } catch (err) {
            console.error('Direct socket.connect() failed:', err);
          }
        }
        
        // COMMENTED OUT: Socket timeout error handling to prevent infinite loops
        // connectionTimeout = setTimeout(() => {
        //   console.log('Socket connection timeout check', { 
        //     connected: socket.connected, 
        //     disconnected: socket.disconnected,
        //     isMounted 
        //   });
        //   if (isMounted && !socket.connected) {
        //     console.log('Socket connection timed out after 5 seconds');
        //     setSocketConnecting(false);
        //     setSocketConnected(false);
        //   }
        // }, 5000);
        } catch (error) {
        console.error('Error initializing socket:', error);
          if (isMounted) {
            setSocketConnecting(false);
            setSocketConnected(false);
          }
      }
    };

    initializeSocket();

    return () => {
      isMounted = false;
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
      }
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
    };
  }, []); // Only run once on mount - completely independent of UI state

  // Refs to prevent render loops when receiving server updates
  const lastReceivedTimer = React.useRef<number | null>(null);
  const lastReceivedIsPublic = React.useRef<boolean | null>(null);
  
  // Listen for room_created event - Always listen, not dependent on socketConnected
  useEffect(() => {
    if (!socket) return;
    
    const handleRoomCreated = (data: { roomId: string; settings?: any; hostId?: string }) => {
      console.log('🎉 SERVER REPLIED! Navigating to room:', data.roomId);
      console.log('🎉 Full response data:', data);
      // Clear the creating state
      setIsCreatingRoom(false);
      if ((window as any).__createRoomTimeout) {
        clearTimeout((window as any).__createRoomTimeout);
        delete (window as any).__createRoomTimeout;
      }
      // Navigate to the game room
      if (data.roomId) {
        window.location.href = `/game/${data.roomId}`;
      }
    };
    
    socket.on('room_created', handleRoomCreated);
    
    return () => {
      socket.off('room_created', handleRoomCreated);
    };
  }, [socket]); // Depend on socket to ensure listener is set up correctly

  // Listen for room settings updates from server (prevents state fighting)
  useEffect(() => {
    if (!socketConnected || !gameState?.roomId) return;
    
    const handleRoomSettingsUpdate = (data: { timer?: number; isPublic?: boolean }) => {
      // Only update if the incoming value is different from current state
      // This prevents render loops
      if (data.timer !== undefined && data.timer !== lastReceivedTimer.current) {
        console.log('SERVER UPDATE: timer', data.timer, 'current:', hookedTimer);
        lastReceivedTimer.current = data.timer;
        if (data.timer !== hookedTimer) {
          setHookedTimer(data.timer);
        }
      }
      if (data.isPublic !== undefined && data.isPublic !== lastReceivedIsPublic.current) {
        console.log('SERVER UPDATE: isPublic', data.isPublic, 'current:', isPublic);
        lastReceivedIsPublic.current = data.isPublic;
        if (data.isPublic !== isPublic) {
          setIsPublic(data.isPublic);
        }
      }
    };
    
    // CRITICAL: Do NOT listen to GAME_STATE here - App.tsx handles it
    // This listener was only updating room settings, but it could cause duplicate state updates
    // Removed to ensure App.tsx is the single source of truth for gameState
    
    // Also listen for dedicated room settings update event
    socket.on('room_settings_updated', handleRoomSettingsUpdate);
    
    return () => {
      // Removed GAME_STATE listener - App.tsx handles it
      socket.off('room_settings_updated');
    };
  }, [socketConnected, gameState?.roomId, hookedTimer, isPublic, setHookedTimer, setIsPublic]);

  // Deduplicate function to prevent duplicate rooms
  // Removed useCallback to prevent caching issues
  const deduplicateRooms = (list: PublicRoom[]): PublicRoom[] => {
    const seen = new Set<string>();
    return list.filter(room => {
      if (seen.has(room.id)) {
        return false;
      }
      seen.add(room.id);
      return true;
    });
  };

  const refreshRooms = useCallback(() => {
    // CRITICAL: Check socket.connected directly as fallback if local state is false
    // This prevents race condition where state hasn't updated yet
    const isConnected = socket?.connected || socketConnected;
    if (!isConnected) {
      console.warn('⚠️ Lobby: Cannot refresh rooms - socket not connected', {
        socketConnected,
        socketConnectedDirect: socket?.connected
      });
      setIsRefreshing(false);
      return;
    }
    // Prevent multiple simultaneous fetches
    if (isFetchingRef.current) {
      console.log('📋 Lobby: Already fetching rooms, skipping duplicate request');
      return;
    }
    console.log('🔄 Lobby: Refreshing public rooms list...', {
      socketConnected,
      socketConnectedDirect: socket?.connected
    });
    isFetchingRef.current = true;
    setIsRefreshing(true);
    socket.emit(SocketEvents.GET_PUBLIC_ROOMS);
    
    // CRITICAL: Add small delay before setting isRefreshing to false
    // This prevents "No matches found" flicker if server responds too instantly with empty list
    setTimeout(() => {
      // Only set to false if we haven't received data yet (handled in listener)
      // This is a safety timeout in case listener doesn't fire
    }, 500);
  }, [socketConnected, socket]); // Include socketConnected and socket in dependencies

  // Register socket listener - always register when socket exists
  useEffect(() => {
    if (!socket) return;
    
    const handleRoomsList = (list: any) => {
      // CRITICAL: Defensive check - ensure data is actually an array before mapping
      if (!Array.isArray(list)) {
        console.error("❌ Lobby: Received invalid room list format:", list, typeof list);
        
        // CRITICAL: If it's an object {}, manually convert it to an array
        if (list && typeof list === 'object' && list.constructor === Object) {
          console.warn("⚠️ Lobby: Converting object to array using Object.values");
          const convertedArray = Object.values(list);
          if (Array.isArray(convertedArray)) {
            // Recursively call with converted array
            handleRoomsList(convertedArray);
            return;
          }
        }
        
        // If conversion failed or it's not an object, set empty array and stop loading
        setPublicRooms([]);
        setIsRefreshing(false);
        setHasLoaded(true);
        isFetchingRef.current = false;
        return;
      }
      
      console.log('📋 Lobby: Received public rooms list', list.length, 'rooms', list.map((r: any) => r.id));
      // DEBUG: Log exactly what the server is returning
      console.log('📋 Lobby: [DEBUG] Server returned:', JSON.stringify(list, null, 2));
      // Deduplicate before setting state to prevent infinite duplicates
      const uniqueRooms = deduplicateRooms(list || []); // Ensure list is always an array
      console.log('📋 Lobby: After deduplication', uniqueRooms.length, 'unique rooms', uniqueRooms.map(r => r.id));
      // Set the rooms directly - deduplication should handle it
      // Use functional update to ensure we're using the latest state
      setPublicRooms(prevRooms => {
        console.log('📋 Lobby: setPublicRooms functional update', {
          prevRoomsLength: prevRooms.length,
          newRoomsLength: uniqueRooms.length,
          prevRoomIds: prevRooms.map(r => r.id),
          newRoomIds: uniqueRooms.map(r => r.id)
        });
        return uniqueRooms;
      });
      // CRITICAL: Add small delay before setting isRefreshing to false
      // This prevents "No matches found" flicker if server responds too instantly with empty list
      setTimeout(() => {
        setIsRefreshing(false);
        // CRITICAL: Mark as loaded when we receive data (even if empty array)
        setHasLoaded(true);
        // Clear the fetching flag to allow future fetches
        isFetchingRef.current = false;
        console.log("📋 Lobby: Fetch complete, isRefreshing set to false", { roomCount: uniqueRooms.length, hasLoaded: true });
      }, 500);
    };
    
    // Remove any existing listeners first to prevent duplicates
    socket.off(SocketEvents.PUBLIC_ROOMS_LIST, handleRoomsList);
    socket.on(SocketEvents.PUBLIC_ROOMS_LIST, handleRoomsList);

    // Cleanup: remove listener on unmount
    return () => {
      socket.off(SocketEvents.PUBLIC_ROOMS_LIST, handleRoomsList);
    };
  }, [socket]); // Re-register when socket changes

  // CRITICAL: Fetch rooms when socket connects AND when switching to PUBLIC tab
  // This handles both initial load (when socket connects while on PUBLIC tab) and tab switching
  // Use socket.connected as direct fallback to ensure emit fires even if state hasn't flipped yet
  useEffect(() => {
    // CRITICAL: Check socket.connected directly as fallback
    const isSocketReady = socket?.connected || socketConnected;
    if (activeTab === 'PUBLIC' && isSocketReady) {
      // Prevent multiple simultaneous fetches
      if (isFetchingRef.current) {
        console.log('📋 Lobby: Already fetching rooms, skipping duplicate request');
        return;
      }
      console.log('📋 Lobby: PUBLIC tab active and socket connected, fetching rooms', {
        activeTab,
        socketConnected,
        socketReady: socket?.connected,
        isSocketReady
      });
      // CRITICAL: Ensure listener is registered before emitting
      // The listener registration happens in the separate useEffect above
      // Emit directly using socket.connected as fallback to ensure it fires
      if (socket?.connected) {
        isFetchingRef.current = true;
        setIsRefreshing(true);
        // Small delay to ensure listener is registered (though it should already be)
        setTimeout(() => {
          if (socket?.connected) {
            socket.emit(SocketEvents.GET_PUBLIC_ROOMS);
          }
        }, 0);
      }
    }
  }, [activeTab, socketConnected, socket]);

  // Auto-sync: Trigger refreshRooms() once if socket.connected is true but publicRooms.length is 0
  // CRITICAL: Only run once on mount using hasInitialFetchRef
  useEffect(() => {
    if (socket?.connected && publicRooms.length === 0 && !isFetchingRef.current && activeTab === 'PUBLIC' && !hasInitialFetchRef.current) {
      console.log('📋 Lobby: Auto-syncing public rooms (socket connected but no rooms) - initial fetch');
      hasInitialFetchRef.current = true;
      refreshRooms();
    }
  }, [socket?.connected, publicRooms.length, activeTab, refreshRooms]);

  // Force refresh on mount if socket is already connected and we're on PUBLIC tab
  // This catches the case where the socket connected before the component mounted
  // CRITICAL: Only run once using hasInitialFetchRef to prevent duplicate requests
  useEffect(() => {
    if (activeTab === 'PUBLIC' && socket?.connected && !socketConnected && !hasInitialFetchRef.current) {
      // Small delay to ensure state is settled and avoid race conditions
      const timeoutId = setTimeout(() => {
        console.log('📋 Lobby: Force refresh on mount - socket already connected but state not synced');
        if (socket?.connected && !hasInitialFetchRef.current) {
          hasInitialFetchRef.current = true;
          socket.emit(SocketEvents.GET_PUBLIC_ROOMS);
        }
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, []); // Empty deps - only run on mount

  // Separate effect to refresh when exiting a game
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (!gameState && socketConnected) {
      // Refresh rooms when we exit a game (gameState becomes null)
      refreshRooms();
    }
  }, [gameState, socketConnected, refreshRooms]); // refreshRooms is now stable via useCallback

  useEffect(() => {
    let interval: any;
    if (gameState && !gameState.players.find(p => p.id === myId)) {
      interval = setInterval(() => {
        setSyncTimer(prev => prev + 1);
      }, 1000);
    } else {
      setSyncTimer(0);
    }
    return () => clearInterval(interval);
  }, [gameState, myId]);

  const forceResync = () => {
    socket.emit(SocketEvents.REQUEST_SYNC, { playerId: myId });
  };

  // Helper function to convert technical error messages to user-friendly ones
  const getUserFriendlyErrorMessage = (errorMessage: string): string => {
    const errorLower = errorMessage.toLowerCase();
    
    // Rate limiting errors
    if (errorLower.includes('rate limit') || errorLower.includes('too quickly')) {
      return 'You\'re doing that too fast. Please wait a moment and try again.';
    }
    
    // Network/connection errors
    if (errorLower.includes('unable to create') || errorLower.includes('could not create') || errorLower.includes('connection')) {
      return 'Unable to create room right now. Please check your connection and try again.';
    }
    
    // Server errors
    if (errorLower.includes('server') || errorLower.includes('internal')) {
      return 'Server error occurred. Please try again in a moment.';
    }
    
    // Room name errors
    if (errorLower.includes('name') || errorLower.includes('invalid')) {
      return 'Invalid room name. Please choose a different name.';
    }
    
    // Permission/authorization errors
    if (errorLower.includes('permission') || errorLower.includes('unauthorized') || errorLower.includes('auth')) {
      return 'You don\'t have permission to create a room. Please sign in and try again.';
    }
    
    // Return the original message if it's already user-friendly, otherwise generic message
    if (errorMessage.length < 100 && !errorMessage.includes('Error:') && !errorMessage.includes('error:')) {
      return errorMessage;
    }
    
    // Generic errors
    return 'Failed to create room. Please try again.';
  };

  // Listen for socket errors related to room creation
  useEffect(() => {
    if (isInitialMount.current) return;
    
    const handleError = (errorMessage: string) => {
      // Show toast for errors that might be related to room creation
      // We'll check if we're on the CREATE tab or if the error seems room-creation related
      if (activeTab === 'CREATE' || 
          errorMessage.toLowerCase().includes('create') || 
          errorMessage.toLowerCase().includes('room') ||
          errorMessage.toLowerCase().includes('rate limit') ||
          errorMessage.toLowerCase().includes('too quickly') ||
          errorMessage.toLowerCase().includes('failed') ||
          errorMessage.toLowerCase().includes('error')) {
        const friendlyMessage = getUserFriendlyErrorMessage(errorMessage);
        setErrorToast({ show: true, message: friendlyMessage });
        setIsCreatingRoom(false); // Reset creating state on error
      }
    };

    const handleCreateRoomError = (error: { message?: string; error?: string }) => {
      const errorMessage = error.message || error.error || 'Failed to create room';
      const friendlyMessage = getUserFriendlyErrorMessage(errorMessage);
      setErrorToast({ show: true, message: friendlyMessage });
      setIsCreatingRoom(false);
    };

    socket.on(SocketEvents.ERROR, handleError);
    socket.on('create_room_error', handleCreateRoomError);
    socket.on('room_creation_failed', handleCreateRoomError);

    return () => {
      socket.off(SocketEvents.ERROR, handleError);
      socket.off('create_room_error', handleCreateRoomError);
      socket.off('room_creation_failed', handleCreateRoomError);
    };
  }, [activeTab]);

  const createRoom = (e?: React.MouseEvent) => {
    // CRITICAL: Prevent any form submission or page refresh
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    // Prevent multiple simultaneous create room attempts
    if (isCreatingRoom) {
      return;
    }

    // Check for profanity in room name
    if (hasProfanity) {
      setProfanityToast({ show: true, message: "Please choose a more courtly name for your arena." });
      setTimeout(() => setProfanityToast({ show: false, message: '' }), 4000);
      return;
    }

    setIsCreatingRoom(true);

    const emitCreateRoom = () => {
      try {
        // Set up a timeout to show error if no response is received
        const responseTimeout = setTimeout(() => {
          setIsCreatingRoom(false);
          setErrorToast({ show: true, message: 'Room creation timed out. Please check your connection and try again.' });
        }, 10000); // 10 second timeout

        // Store timeout ID to clear it if we get a response
        (window as any).__createRoomTimeout = responseTimeout;

        const roomSettings = {
          name: playerName, 
          avatar: playerAvatar,
          playerId: myId,
          isPublic,
          roomName: roomNameInput.trim() || `${playerName.toUpperCase()}'S MATCH`,
          turnTimer: hookedTimer,
          selected_sleeve_id: selected_sleeve_id
        };
        
        console.log('🚀 Lobby: EMITTING create_room with settings:', { 
          timer: hookedTimer, 
          isPublic, 
          roomName: roomSettings.roomName,
          playerName: roomSettings.name,
          playerId: roomSettings.playerId,
          socketConnected: socket.connected
        });
        
        socket.emit(SocketEvents.CREATE_ROOM, roomSettings, (response: any) => {
          console.log('✅ Lobby: SERVER ACKNOWLEDGEMENT RECEIVED:', response);
          if (response?.error) {
            console.error('❌ Lobby: Room creation failed:', response.error);
            setIsCreatingRoom(false);
            setErrorToast({ show: true, message: response.error });
          } else if (response?.roomId) {
            console.log('✅ Lobby: Room created successfully:', response.roomId);
            // The server will send game_state event, which will update mpGameState
            // No need to manually update state here
          }
        });
        
        // Reset creating state after a delay to allow for server response
        // This will be cleared if we get an error response
        setTimeout(() => {
          if ((window as any).__createRoomTimeout) {
            clearTimeout((window as any).__createRoomTimeout);
            delete (window as any).__createRoomTimeout;
          }
          setIsCreatingRoom(false);
        }, 1000);
      } catch (error) {
        // Non-blocking socket error - only warn in development
        if (import.meta.env.DEV) {
          console.warn('Socket create_room error (non-blocking):', error);
        }
        setIsCreatingRoom(false);
        const errorMessage = error instanceof Error ? error.message : 'Failed to create room. Please try again.';
        const friendlyMessage = getUserFriendlyErrorMessage(errorMessage);
        setErrorToast({ show: true, message: friendlyMessage });
      }
    };

    // Check if socket is already connected
    if (socket.connected) {
      emitCreateRoom();
      return;
    }

    // Socket is not connected, set up connection handlers
    // COMMENTED OUT: Timeout error handling to prevent infinite loops
    // const timeout = setTimeout(() => {
    //   setIsCreatingRoom(false);
    //   setErrorToast({ show: true, message: 'Connection timeout. Please check your connection and try again.' });
    //   socket.off('connect', handleConnect);
    //   socket.off('connect_error', handleConnectError);
    // }, 5000);

    const handleConnect = () => {
      // clearTimeout(timeout); // Commented out - timeout disabled
      socket.off('connect', handleConnect);
      socket.off('connect_error', handleConnectError);
      emitCreateRoom();
    };

    const handleConnectError = () => {
      // clearTimeout(timeout); // Commented out - timeout disabled
      // COMMENTED OUT: Error handling to prevent infinite loops
      // setIsCreatingRoom(false);
      // setErrorToast({ show: true, message: 'Unable to connect to server. Please check your connection and try again.' });
      socket.off('connect', handleConnect);
      socket.off('connect_error', handleConnectError);
    };

    // Use once to automatically remove listeners after first event
    socket.once('connect', handleConnect);
    socket.once('connect_error', handleConnectError);
    
    // Try to connect if not already connected
    if (!socket.connected) {
      connectSocket();
    }
  };

  const joinRoom = (code?: string) => {
    const targetCode = code || roomIdInput.trim().toUpperCase();
    if (!targetCode) return;
    
    // Ensure socket is connected before emitting
    if (!socket.connected) {
      connectSocket();
      // COMMENTED OUT: Timeout error handling to prevent infinite loops
      // const timeout = setTimeout(() => {
      //   setErrorToast({ show: true, message: 'Connection timeout. Please check your connection and try again.' });
      // }, 5000);
      
      socket.once('connect', () => {
        // clearTimeout(timeout); // Commented out - timeout disabled
        socket.emit(SocketEvents.JOIN_ROOM, { 
          roomId: targetCode, 
          name: playerName, 
          avatar: playerAvatar, 
          playerId: myId,
          selected_sleeve_id: selected_sleeve_id
        });
      });
      
      socket.once('connect_error', () => {
        clearTimeout(timeout);
        setErrorToast({ show: true, message: 'Unable to connect to server. Please check your connection and try again.' });
      });
    } else {
      // Socket is already connected, emit immediately
      socket.emit(SocketEvents.JOIN_ROOM, { 
        roomId: targetCode, 
        name: playerName, 
        avatar: playerAvatar, 
        playerId: myId,
        selected_sleeve_id: selected_sleeve_id
      });
    }
  };

  const addBot = () => {
    // CRITICAL: Read gameState directly from props, not from closure
    if (!gameState) {
      console.error('❌ Lobby: Cannot add bot - gameState is null');
      return;
    }
    
    if (!gameState.roomId) {
      console.error('❌ Lobby: Cannot add bot - no roomId');
      return;
    }
    
    if (!myId) {
      console.error('❌ Lobby: Cannot add bot - no myId');
      return;
    }
    
    // CRITICAL: Read fresh gameState.players.length to avoid stale closure
    const currentPlayerCount = gameState.players?.length || 0;
    
    if (currentPlayerCount >= 4) {
      console.warn('⚠️ Lobby: Cannot add bot - room is full', { currentPlayerCount });
      return;
    }
    
    console.log('🤖 Lobby: Emitting add_bot event', { 
      roomId: gameState.roomId, 
      playerId: myId,
      currentPlayerCount: currentPlayerCount,
      socketConnected: socket.connected,
      players: gameState.players?.map(p => ({ id: p.id, name: p.name, isBot: p.isBot }))
    });
    
    // CRITICAL: Only emit the event - do NOT update local state
    // The server will broadcast game_state event, which App.tsx will receive and update mpGameState
    // This will cause the Lobby component to re-render with the updated gameState prop
    if (!socket.connected) {
      console.error('❌ Lobby: Cannot add bot - socket not connected');
      return;
    }
    
    socket.emit(SocketEvents.ADD_BOT, { roomId: gameState.roomId, playerId: myId }, (response: any) => {
      if (response && response.error) {
        console.error('❌ Lobby: add_bot error from server:', response.error);
      } else {
        console.log('✅ Lobby: add_bot acknowledged by server');
      }
    });
  };

  const removeBot = (botId: string) => {
    if (!gameState) {
      console.error('❌ Lobby: Cannot remove bot - gameState is null');
      return;
    }
    if (!gameState.roomId) {
      console.error('❌ Lobby: Cannot remove bot - no roomId');
      return;
    }
    if (!myId) {
      console.error('❌ Lobby: Cannot remove bot - no myId');
      return;
    }
    console.log('🗑️ Lobby: Removing bot', { roomId: gameState.roomId, botId, playerId: myId });
    socket.emit(SocketEvents.REMOVE_BOT, { roomId: gameState.roomId, botId, playerId: myId }, (response: any) => {
      if (response && response.error) {
        console.error('❌ Lobby: remove_bot error from server:', response.error);
        setToast({ show: true, message: response.error, type: 'error' });
      } else {
        console.log('✅ Lobby: Bot removed successfully (server confirmed)');
        setToast({ show: true, message: 'Bot removed from room!', type: 'success' });
      }
    });
  };

  const updateBotDifficulty = (botId: string, difficulty: AiDifficulty) => {
    if (!gameState) return;
    socket.emit(SocketEvents.UPDATE_BOT_DIFFICULTY, { roomId: gameState.roomId, botId, difficulty, playerId: myId });
  };

  const startGame = () => {
    if (!gameState) {
      console.error('❌ Lobby: Cannot start game - gameState is null');
      return;
    }
    console.log('🚀 Lobby: Starting game', { roomId: gameState.roomId, playerId: myId, status: gameState.status });
    socket.emit(SocketEvents.START_GAME, { roomId: gameState.roomId, playerId: myId });
  };

  // Check if current player is host using hostId from gameState
  // myId should be the persistent UUID from localStorage (e.g., 'fe3206bb-1987-4dda-ae3b-8549e6376b04')
  // Fallback: If hostId is "guest" and there's only one player, treat that player as host
  // Client-side safety net: If I am the only person in the room, I MUST be the host
  const humanPlayerCount = gameState?.players?.filter(p => !p.isBot).length || 0;
  const isHost = gameState?.hostId === myId || 
    (gameState?.hostId === 'guest' && gameState?.players?.length === 1 && gameState?.players[0]?.id === myId) ||
    (humanPlayerCount === 1 && gameState?.players?.some(p => p.id === myId && !p.isBot));
  
  // Debug: Log isHost status
  useEffect(() => {
    if (gameState) {
      console.log('👑 Lobby: isHost check', { 
        isHost, 
        myId, 
        gameStateHostId: gameState.hostId,
        playerName,
        allPlayers: gameState.players.map(p => ({ id: p.id, name: p.name, isHost: p.isHost })),
        playersLength: gameState.players.length
      });
    }
  }, [gameState, myId, playerName, isHost]);

  // REMOVED renderTimerButtons function - inlining directly in JSX to prevent stale closures

  // CRITICAL: Only render lobby interface when status is LOBBY
  // If status is PLAYING, App.tsx should handle switching to GAME_TABLE view
  if (gameState && gameState.status !== GameStatus.LOBBY) {
    // Status is not LOBBY - don't render lobby interface
    // This prevents showing empty game board when status transitions
    return (
      <BackgroundWrapper theme={backgroundTheme} key="lobby-main-container">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-yellow-400 text-lg">Preparing game...</div>
        </div>
      </BackgroundWrapper>
    );
  }

  return (
    <React.Fragment key={activeTab}>
    <>
      <BackgroundWrapper theme={backgroundTheme} key="lobby-main-container">
      <div className="lobby-viewport" key="lobby-viewport">
        
        {errorToast.show && (
          <Toast
            message={errorToast.message}
            type="error"
            onClose={() => setErrorToast({ show: false, message: '' })}
          />
        )}
        
        {profanityToast.show && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[500] pointer-events-none">
            <div className="bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a] backdrop-blur-xl border-2 border-amber-700/50 rounded-2xl px-6 py-4 shadow-[0_20px_60px_rgba(146,64,14,0.4)] transition-all duration-500 opacity-100 translate-y-0 scale-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-900/30 border border-amber-700/50 flex items-center justify-center">
                  <svg 
                    className="w-6 h-6 text-amber-600" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2.5} 
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                    />
                  </svg>
                </div>
                <span className="text-sm font-black text-amber-200 uppercase tracking-wider font-serif">Please choose a more courtly name for your arena.</span>
              </div>
            </div>
          </div>
        )}
        
        {error && (
          <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[100] px-8 py-4 bg-rose-600/90 backdrop-blur-xl border-2 border-rose-400 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-2xl animate-in slide-in-from-top-4 duration-200">
             SYSTEM ERROR: {error}
          </div>
        )}

        {!gameState ? (
          <div className="w-full space-y-6 sm:space-y-8 flex flex-col items-center">
            {/* Static Header - Always Visible, Outside Animated Container */}
            <div className="flex flex-col items-center text-center space-y-3 sm:space-y-4 mb-2 sm:mb-4" style={{ opacity: 1, visibility: 'visible' }}>
              <div className="relative inline-block max-w-full overflow-visible">
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 via-pink-500/20 to-yellow-500/20 blur-[100px] rounded-full animate-pulse"></div>
                <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white uppercase italic tracking-tighter drop-shadow-[0_15px_30px_rgba(0,0,0,0.8)] font-serif relative z-10 leading-none px-4">
                    PLAY <span className="text-transparent bg-clip-text bg-gradient-to-br from-yellow-400 via-pink-400 to-yellow-600">WITH FRIENDS</span>
                </h1>
              </div>
              <p className="text-[10px] sm:text-xs font-medium text-yellow-400/70 uppercase tracking-wider" style={{ 
                opacity: 1, 
                visibility: 'visible', 
                display: 'block',
                position: 'relative',
                zIndex: 10
              }}>
                Challenge friends • Join public matches • Create your own room
              </p>
            </div>

            {/* Animated Content Area - Only Tab Content is Animated */}
            <div className="w-full animate-in fade-in zoom-in-95 duration-400">
            <GlassPanel className="w-full flex flex-col min-h-[500px] sm:min-h-[600px]">
              <nav className="tab-switcher p-4 sm:p-6 border-b border-white/10 bg-gradient-to-r from-white/[0.03] via-transparent to-white/[0.03] flex justify-center">
                    <div className="bg-black/60 backdrop-blur-sm p-1.5 rounded-[2.5rem] flex relative w-full max-w-2xl shadow-inner border border-white/10 overflow-hidden">
                        <div 
                          className={`
                            absolute top-1.5 bottom-1.5 left-1.5 w-[calc(33.333%-6px)] 
                            bg-gradient-to-br from-yellow-500/20 to-pink-500/20 border border-yellow-500/30 rounded-[2.2rem] shadow-xl 
                      transition-all duration-300 ease-[cubic-bezier(0.19,1,0.22,1)] pointer-events-none z-10
                            ${activeTab === 'PUBLIC' ? 'translate-x-0' : activeTab === 'CREATE' ? 'translate-x-[calc(100%+6px)]' : 'translate-x-[calc(200%+12px)]'}
                          `}
                        >
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-[2px] bg-gradient-to-r from-transparent via-yellow-400 to-transparent rounded-full blur-[2px]"></div>
                        </div>

                        {(['PUBLIC', 'CREATE', 'LOCAL'] as const).map(tab => {
                            const tabConfig = {
                                PUBLIC: { 
                                    label: 'Find Match', 
                                    icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>
                                },
                                CREATE: { 
                                    label: 'Create Room', 
                                    icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                },
                                LOCAL: { 
                                    label: 'Local', 
                                    icon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                                }
                            };
                            const config = tabConfig[tab];
                            
                            return (
                                <button 
                                    key={tab}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setActiveTab(tab);
                        }}
                                    className={`
                          flex-1 relative z-30 flex items-center justify-center gap-1.5 sm:gap-2 py-3 sm:py-4 rounded-[2rem] transition-all duration-200 touch-manipulation cursor-pointer
                                        ${activeTab === tab ? 'text-yellow-400' : 'text-white/40 hover:text-white/60'}
                                        ${tab === 'CREATE' ? 'gap-1 sm:gap-1.5' : ''}
                                    `}
                        style={{ pointerEvents: 'auto', WebkitTapHighlightColor: 'transparent', position: 'relative' }}
                        type="button"
                                >
                                    {config.icon}
                        <span className="text-[11px] sm:text-xs font-black uppercase tracking-[0.15em] pointer-events-none">
                                        {config.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
              </nav>

                {/* Subpage Description Subheader */}
                <div className="px-4 sm:px-6 pt-3 sm:pt-4 pb-2 sm:pb-3 border-b border-white/5">
                    <p className="text-[10px] sm:text-xs text-zinc-400 text-center font-medium leading-relaxed">
                  {activeTab === 'PUBLIC' && 'Connect to global arenas or use a lobby code.'}
                  {activeTab === 'CREATE' && 'Host your own table for public or private play.'}
                  {activeTab === 'LOCAL' && 'Play offline via Personal Hotspot—perfect for travel.'}
                    </p>
                </div>

              <main className="tab-area flex-1 p-4 sm:p-6 sm:p-8 overflow-hidden flex flex-col">
                {/* Tab Content - Smooth Transitions */}
                <div className="tab-content flex-1 overflow-hidden relative">
                  {/* Public Tab */}
                  <div 
                    className={`absolute inset-0 overflow-y-auto transition-all duration-300 ease-in-out ${
                      activeTab === 'PUBLIC' 
                        ? 'opacity-100 pointer-events-auto translate-y-0 z-10 visible' 
                        : 'opacity-0 pointer-events-none translate-y-2 z-0 invisible'
                    }`}
                  >
                    {activeTab === 'PUBLIC' && (
                      !socketConnected ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="flex flex-col items-center gap-4">
                            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <p className="text-sm font-black uppercase tracking-wider text-white/60">Connecting to server...</p>
                          </div>
                        </div>
                      ) : (
                    <PublicTabContent
                          key={`public-tab-${publicRooms.length}-${isRefreshing}-${socketConnected}`}
                      roomIdInput={roomIdInput}
                      setRoomIdInput={setRoomIdInput}
                      joinRoom={joinRoom}
                      publicRooms={publicRooms}
                      remoteEmotes={remoteEmotes}
                      isRefreshing={isRefreshing}
                      refreshRooms={refreshRooms}
                      socketConnected={socketConnected}
                                />
                      )
                    )}
                            </div>

                  {/* Create Tab */}
                  <div 
                    className={`absolute inset-0 overflow-y-auto transition-all duration-200 ease-in-out ${
                      activeTab === 'CREATE' 
                        ? 'opacity-100 translate-y-0 z-10 pointer-events-auto' 
                        : 'opacity-0 pointer-events-none translate-y-2 z-0'
                    }`}
                    style={{ paddingTop: '1rem', paddingBottom: '2rem', touchAction: 'pan-y' }}
                  >
                    {activeTab === 'CREATE' && (
                        <div className="h-full flex flex-col space-y-6 sm:space-y-8 max-w-xl mx-auto w-full py-4 sm:py-6 pb-8 sm:pb-10" style={{ touchAction: 'pan-y' }}>
                        <div className="space-y-3" style={{ position: 'relative', zIndex: 10000, pointerEvents: 'auto' }}>
                          <label className="text-xs sm:text-sm font-black uppercase tracking-wider text-white/60 block px-2">Room Name</label>
                          <input 
                            id="room-name-input"
                            type="text" 
                            value={roomNameInput}
                            ref={(el) => {
                              if (el) {
                                el.style.position = 'relative';
                                el.style.zIndex = '10001';
                                el.style.pointerEvents = 'auto';
                                el.value = roomNameInput;
                                void el.offsetHeight; // Force reflow
                              }
                            }}
                            onChange={(e) => {
                              const newValue = e.target.value.toUpperCase();
                              setRoomNameInput(newValue);
                              requestAnimationFrame(() => {
                                const input = document.getElementById('room-name-input') as HTMLInputElement;
                                if (input) {
                                  input.value = newValue;
                                }
                              });
                            }}
                            onInput={(e) => {
                              e.stopPropagation();
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                            onFocus={(e) => {
                              e.stopPropagation();
                            }}
                            onKeyDown={(e) => {
                              e.stopPropagation();
                            }}
                            maxLength={24}
                            placeholder="Enter room name..."
                            className="w-full bg-gradient-to-br from-black/60 to-black/40 border-2 border-white/10 px-6 sm:px-8 py-4 sm:py-6 rounded-2xl sm:rounded-[2rem] text-white font-black uppercase tracking-wider text-lg sm:text-xl focus:border-yellow-500/50 focus:shadow-[0_0_30px_rgba(234,179,8,0.2)] outline-none transition-all duration-200 shadow-inner placeholder:text-white/10"
                            style={{ position: 'relative', zIndex: 10001, pointerEvents: 'auto', touchAction: 'manipulation' }}
                            autoComplete="off"
                            autoFocus={false}
                          />
                        </div>

                        <div className="bg-gradient-to-br from-white/[0.03] to-white/[0.01] p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-white/10 space-y-6 sm:space-y-8" style={{ position: 'relative', zIndex: 10000, pointerEvents: 'auto' }}>
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col gap-1">
                              <span className="text-sm font-black text-white uppercase tracking-wider">Public Room</span>
                              <span className="text-[10px] font-medium text-white/40 uppercase tracking-tight">Anyone can discover and join</span>
                            </div>
                            <button 
                              id="public-toggle-btn"
                              type="button"
                              ref={(el) => {
                                // Direct DOM manipulation to force paint
                                if (el) {
                                  el.style.position = 'relative';
                                  el.style.zIndex = '10001';
                                  el.style.pointerEvents = 'auto';
                                  const bgColor = isPublic ? 'linear-gradient(to right, rgb(16, 185, 129), rgb(5, 150, 105))' : 'rgba(255, 255, 255, 0.1)';
                                  el.style.background = bgColor;
                                  const toggle = el.querySelector('.toggle-slider') as HTMLElement;
                                  if (toggle) {
                                    toggle.style.transform = isPublic ? 'translateX(28px)' : 'translateX(0)';
                                  }
                                  // Force reflow
                                  void el.offsetHeight;
                                }
                              }}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onTouchStart={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsPublic((prev) => {
                                  const newState = !prev;
                                  // Emit socket event to update room settings
                                  if (gameState?.roomId && socketConnected) {
                                    socket.emit(SocketEvents.UPDATE_ROOM_SETTINGS, { 
                                      roomId: gameState.roomId, 
                                      timer: hookedTimer, 
                                      isPublic: newState,
                                      playerId: myId 
                                    });
                                    console.log('CLIENT EMIT: update_room_settings', { timer: hookedTimer, isPublic: newState });
                                  }
                                  // Force immediate DOM update
                                  requestAnimationFrame(() => {
                                    const btn = document.getElementById('public-toggle-btn');
                                    if (btn) {
                                      (btn as HTMLElement).style.background = newState 
                                        ? 'linear-gradient(to right, rgb(16, 185, 129), rgb(5, 150, 105))' 
                                        : 'rgba(255, 255, 255, 0.1)';
                                      const toggle = btn.querySelector('.toggle-slider') as HTMLElement;
                                      if (toggle) {
                                        toggle.style.transform = newState ? 'translateX(28px)' : 'translateX(0)';
                                      }
                                    }
                                  });
                                  return newState;
                                });
                              }}
                              className={`w-14 h-7 rounded-full relative transition-all duration-200 p-1 flex items-center ${isPublic ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'bg-white/10'}`}
                              style={{ position: 'relative', zIndex: 10001, pointerEvents: 'auto' }}
                            >
                              <div className={`toggle-slider absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-lg transition-transform duration-200 ${isPublic ? 'translate-x-7' : 'translate-x-0'}`}></div>
                            </button>
                          </div>

                          <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

                          <div className="space-y-3 sm:space-y-4">
                            <div className="flex flex-col gap-1">
                              <span className="text-sm font-black text-white uppercase tracking-wider">Turn Timer</span>
                              <span className="text-[10px] font-medium text-white/40 uppercase tracking-tight">Time per move before auto-pass</span>
                            </div>
                            <div 
                              className="grid grid-cols-4 gap-2 p-1 bg-zinc-950 rounded-xl sm:rounded-2xl border border-zinc-800/50 shadow-inner" 
                              onClick={(e) => e.stopPropagation()}
                              style={{ touchAction: 'pan-y' }}
                            >
                              {[0, 15, 30, 60].map((val) => {
                                const isActive = hookedTimer === val;
                                const buttonId = `timer-btn-${val}`;
                                
                                return (
                                  <button 
                                    id={buttonId}
                                    key={`${val}-${isActive}`}
                                    type="button"
                                    ref={(el) => {
                                      // Direct DOM manipulation to force paint
                                      if (el) {
                                        const bgColor = isActive ? 'rgba(251, 191, 36, 0.2)' : 'rgb(9, 9, 11)';
                                        const borderColor = isActive ? 'rgb(251, 191, 36)' : 'rgb(39, 39, 42)';
                                        const textColor = isActive ? 'rgb(251, 191, 36)' : 'rgb(113, 113, 122)';
                                        el.style.backgroundColor = bgColor;
                                        el.style.borderColor = borderColor;
                                        el.style.color = textColor;
                                        // Force reflow
                                        void el.offsetHeight;
                                      }
                                    }}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setHookedTimer(val);
                                      // Emit socket event to update room settings
                                      if (gameState?.roomId && socketConnected) {
                                        socket.emit(SocketEvents.UPDATE_ROOM_SETTINGS, { 
                                          roomId: gameState.roomId, 
                                          timer: val, 
                                          isPublic: isPublic,
                                          playerId: myId 
                                        });
                                        console.log('CLIENT EMIT: update_room_settings', { timer: val, isPublic });
                                      }
                                      // Force immediate DOM update for all buttons
                                      requestAnimationFrame(() => {
                                        [0, 15, 30, 60].forEach((v) => {
                                          const btn = document.getElementById(`timer-btn-${v}`);
                                          if (btn) {
                                            const active = v === val;
                                            (btn as HTMLElement).style.backgroundColor = active ? 'rgba(251, 191, 36, 0.2)' : 'rgb(9, 9, 11)';
                                            (btn as HTMLElement).style.borderColor = active ? 'rgb(251, 191, 36)' : 'rgb(39, 39, 42)';
                                            (btn as HTMLElement).style.color = active ? 'rgb(251, 191, 36)' : 'rgb(113, 113, 122)';
                                          }
                                        });
                                      });
                                    }} 
                                    className={`
                                      py-2.5 sm:py-3 rounded-lg sm:rounded-xl
                                      text-[9px] sm:text-[10px] font-black uppercase tracking-wider
                                      transition-all duration-200 cursor-pointer
                                      border-2
                                      ${isActive
                                        ? 'bg-amber-500/20 border-amber-400 text-amber-400 scale-105 shadow-[0_4px_12px_rgba(251,191,36,0.4)]'
                                        : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-400 scale-100'
                                      }
                                    `}
                                  >
                                    {val === 0 ? 'OFF' : `${val}S`}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        <button
                          id="create-room-btn"
                          type="button"
                          ref={(el) => {
                            if (el) {
                              el.style.position = 'relative';
                              el.style.zIndex = '10001';
                              el.style.pointerEvents = 'auto';
                              void el.offsetHeight; // Force reflow
                            }
                          }}
                          onMouseDown={(e) => {
                            console.log('CREATE ROOM MOUSEDOWN', { disabled: isCreatingRoom || !socketConnected, socketConnected, isCreatingRoom });
                            // Don't preventDefault - let click event fire
                          }}
                          onTouchStart={(e) => {
                            console.log('CREATE ROOM TOUCHSTART', { disabled: isCreatingRoom || !socketConnected, socketConnected, isCreatingRoom });
                            // Don't preventDefault - let click event fire
                          }}
                          onClick={(e) => {
                            console.log('CREATE ROOM BUTTON CLICKED', { socketConnected, isCreatingRoom, disabled: isCreatingRoom || !socketConnected });
                            e.preventDefault();
                            e.stopPropagation();
                            if (!socketConnected) {
                              console.log('BLOCKED: Socket not connected');
                              setErrorToast({ 
                                show: true, 
                                message: 'Unable to connect to server. Please check your connection and ensure the server is running.' 
                              });
                              setTimeout(() => setErrorToast({ show: false, message: '' }), 5000);
                              return;
                            }
                            if (isCreatingRoom) {
                              console.log('BLOCKED: Already creating room');
                              return;
                            }
                            console.log('CALLING createRoom()');
                            createRoom();
                            requestAnimationFrame(() => {
                              const btn = document.getElementById('create-room-btn');
                              if (btn) {
                                (btn as HTMLElement).style.pointerEvents = isCreatingRoom ? 'none' : 'auto';
                              }
                            });
                          }}
                          className={`w-full py-5 sm:py-6 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-500 to-emerald-600 hover:from-emerald-500 hover:via-emerald-400 hover:to-emerald-500 text-white font-black uppercase tracking-wider text-sm sm:text-base shadow-[0_10px_40px_rgba(16,185,129,0.3)] hover:shadow-[0_15px_50px_rgba(16,185,129,0.4)] transition-all duration-200 active:scale-95 relative overflow-hidden group ${isCreatingRoom || !socketConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
                          style={{ 
                            position: 'relative', 
                            zIndex: 10001, 
                            pointerEvents: 'auto',
                            cursor: (isCreatingRoom || !socketConnected) ? 'not-allowed' : 'pointer'
                          }}
                          title={!socketConnected ? 'Waiting for connection...' : isCreatingRoom ? 'Creating room...' : 'Create Room'}
                        >
                          <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_3s_infinite] pointer-events-none"></div>
                          <span className="relative z-10 flex items-center justify-center gap-3">
                            {isCreatingRoom ? (
                              <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                <span>Creating...</span>
                              </>
                            ) : (
                              <>
                                <span className="text-xl sm:text-2xl">🎮</span>
                                Create Room
                              </>
                            )}
                          </span>
                        </button>
                      </div>
                    )}
                            </div>

                  {/* Local Tab */}
                  <div 
                    className={`absolute inset-0 overflow-y-auto transition-all duration-300 ease-in-out ${
                      activeTab === 'LOCAL' 
                        ? 'opacity-100 pointer-events-auto translate-y-0 z-10 visible' 
                        : 'opacity-0 pointer-events-none translate-y-2 z-0 invisible'
                    }`}
                    style={{ paddingTop: '1rem', paddingBottom: '2rem', touchAction: 'pan-y' }}
                  >
                    {activeTab === 'LOCAL' && (
                      <LocalTabContent
                        localNetworkInfo={localNetworkInfo}
                        localRoomCode={localRoomCode}
                        setLocalRoomCode={setLocalRoomCode}
                        isHostingLocal={isHostingLocal}
                        setIsHostingLocal={setIsHostingLocal}
                        joinRoom={joinRoom}
                        playerName={playerName}
                        playerAvatar={playerAvatar}
                        localTurnTimer={hookedTimer}
                        myId={myId}
                        selected_sleeve_id={selected_sleeve_id}
                        setErrorToast={setErrorToast}
                      />
                    )}
                                            </div>
                                            </div>
              </main>
            </GlassPanel>
            </div>

            <div className="w-full max-w-xl mt-4 sm:mt-6 mb-4 sm:mb-6" style={{ position: 'relative', zIndex: 20 }}>
                <button
                    onClick={onBack!}
                    className="w-full py-4 sm:py-5 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border-2 border-white/10 hover:border-white/20 hover:bg-white/10 text-white font-black uppercase tracking-wider text-xs sm:text-sm transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 sm:gap-3 shadow-lg"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                    Back to Menu
                </button>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-4xl space-y-8 animate-in fade-in zoom-in-95 duration-400">
            <div className="flex flex-col items-center text-center">
              <div className="bg-emerald-500/10 border border-emerald-500/30 px-8 py-2 rounded-full mb-6">
                <span className="text-[10px] font-black uppercase tracking-[0.8em] text-emerald-500 animate-pulse">DEPLOYMENT STANDBY</span>
              </div>
              <h1 className="text-4xl sm:text-6xl font-black text-white uppercase italic tracking-tighter drop-shadow-2xl font-serif mb-4">
                {gameState.roomName}
              </h1>
              {/* Private/Public Match Indicator - Always show, default to private if undefined */}
              <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-full border-2 backdrop-blur-sm ${gameState.isPublic === true ? 'bg-cyan-500/20 border-cyan-500/60 shadow-[0_0_20px_rgba(6,182,212,0.3)]' : 'bg-amber-500/20 border-amber-500/60 shadow-[0_0_20px_rgba(234,179,8,0.3)]'}`}>
                {gameState.isPublic === true ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-300">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                    <span className="text-[10px] font-black uppercase tracking-widest text-cyan-300">PUBLIC MATCH</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-300">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-300">PRIVATE MATCH</span>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-4 space-y-6">
                  <GlassPanel className="p-8 space-y-8">
                    <div className="flex flex-col items-center text-center space-y-2">
                        <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.5em]">Sector Key</span>
                        <div className="text-5xl font-serif font-black text-yellow-500 tracking-[0.2em] drop-shadow-[0_0_15px_rgba(234,179,8,0.4)]">{gameState.roomId}</div>
                    </div>

                    <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

                    <button 
                        onClick={async () => {
                            if (!gameState?.roomId) {
                                setToast({ show: true, message: 'Cannot copy invite - no room ID', type: 'error' });
                                return;
                            }
                            
                            const inviteUrl = `${window.location.origin}/game/${gameState.roomId}`;
                            
                            try {
                                // Try modern clipboard API first
                                if (navigator.clipboard && navigator.clipboard.writeText) {
                                    await navigator.clipboard.writeText(inviteUrl);
                                    setToast({ show: true, message: 'Invite link copied to clipboard!', type: 'success' });
                                } else {
                                    // Fallback for older browsers
                                    const textArea = document.createElement('textarea');
                                    textArea.value = inviteUrl;
                                    textArea.style.position = 'fixed';
                                    textArea.style.left = '-999999px';
                                    textArea.style.top = '-999999px';
                                    document.body.appendChild(textArea);
                                    textArea.focus();
                                    textArea.select();
                                    try {
                                        document.execCommand('copy');
                                        setToast({ show: true, message: 'Invite link copied to clipboard!', type: 'success' });
                                    } catch (err) {
                                        setToast({ show: true, message: 'Failed to copy invite link', type: 'error' });
                                    }
                                    document.body.removeChild(textArea);
                                }
                            } catch (err) {
                                setToast({ show: true, message: 'Failed to copy invite link', type: 'error' });
                            }
                        }}
                        className="w-full py-5 rounded-2xl transition-all duration-200 flex items-center justify-center gap-4 active:scale-95 border-2 cursor-pointer bg-white/[0.03] border-white/5 text-white/60 hover:text-white hover:bg-white/10"
                    >
                        <span className="text-[10px] font-black uppercase tracking-widest">DISTRIBUTE INVITE</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    </button>

                    <div className="bg-black/40 p-5 rounded-2xl border border-white/5">
                        <div className="flex justify-between items-center mb-1">
                             <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Occupancy</span>
                             <span className="text-[10px] font-black text-yellow-500">{gameState.players.length}/4</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-yellow-500 transition-all duration-500" style={{ width: `${(gameState.players.length / 4) * 100}%` }}></div>
                        </div>
                    </div>
                  </GlassPanel>

                  <LuxuryActionTile 
                    onClick={onBack!} 
                    label="CLOSE LOBBY" 
                    sublabel="Terminate Session" 
                    variant="rose"
                    className="w-full"
                    icon={<span className="text-xl">🛑</span>}
                  />
              </div>

              <div className="lg:col-span-8 space-y-6">
                <GlassPanel className="p-8 sm:p-10">
                    {/* CRITICAL: Use gameState from props directly - NO local state for players */}
                    {/* Render 4 distinct slots using Array.from pattern - force direct access to gameState.players */}
                    {/* Use stable index-based keys to prevent React from unmounting/remounting on player changes */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* CRITICAL: Map exactly 4 slots, using gameState.players directly from props */}
                        {Array.from({ length: 4 }).map((_, i) => {
                            // CRITICAL: Use gameState from props - NO local state
                            // Force fresh read on every render
                            const p = gameState?.players?.[i];
                            
                                                return (
                                <PlayerSlot
                                    key={`slot-${i}`}
                                    index={i}
                                    player={p || null}
                                    isHost={isHost}
                                    myId={myId}
                                    remoteEmotes={remoteEmotes}
                                    onRemoveBot={removeBot}
                                    onUpdateDifficulty={updateBotDifficulty}
                                    onAddBot={addBot}
                                    gameState={gameState}
                                />
                                                );
                                            })}
                                        </div>
                    

                    <div className="mt-12">
                        {isHost ? (
                            <button 
                                onClick={startGame}
                                disabled={!gameState?.players || gameState.players.length < 2}
                                className={`
                                    w-full py-8 rounded-[2.5rem] font-black uppercase tracking-[0.5em] text-sm transition-all duration-300 shadow-[0_30px_80px_rgba(0,0,0,0.6)] group relative overflow-hidden active:scale-95
                                    ${!gameState?.players || gameState.players.length < 2 ? 'bg-white/5 text-white/20 grayscale pointer-events-none' : 'bg-gradient-to-r from-emerald-700 via-green-500 to-emerald-700 text-white hover:scale-[1.01]'}
                                `}
                            >
                                <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_3s_infinite] pointer-events-none"></div>
                                <span className="relative z-10 flex items-center justify-center gap-4">
                                    {gameState?.players?.length === 4 
                                        ? 'START MATCH ⚔️' 
                                        : gameState?.players?.length && gameState.players.length >= 2
                                        ? `START MATCH ⚔️ (${gameState.players.length}/4)`
                                        : 'WAITING FOR PLAYERS (MIN 2)'}
                                </span>
                            </button>
                        ) : (
                            <div className="w-full py-8 rounded-[2.5rem] bg-black/40 border-2 border-white/5 flex flex-col items-center justify-center gap-3">
                                <div className="flex gap-2">
                                    <div className="w-2 h-2 rounded-full bg-yellow-500 animate-bounce [animation-delay:-0.3s]"></div>
                                    <div className="w-2 h-2 rounded-full bg-yellow-500 animate-bounce [animation-delay:-0.15s]"></div>
                                    <div className="w-2 h-2 rounded-full bg-yellow-500 animate-bounce"></div>
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-[0.8em] text-white/20">Waiting for Host Activation</span>
                            </div>
                        )}
                    </div>
                </GlassPanel>
              </div>
            </div>
            
            {gameState && !gameState.players.find(p => p.id === myId) && syncTimer > 2 && (
              <div className="w-full p-6 bg-amber-600/10 backdrop-blur-3xl border-2 border-amber-500/30 rounded-[2.5rem] flex items-center justify-between animate-in slide-in-from-top-4 duration-300">
                 <div className="flex items-center gap-6">
                   <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full bg-amber-500 animate-ping"></div>
                   </div>
                   <div className="flex flex-col">
                        <span className="text-[11px] font-black text-amber-500 uppercase tracking-[0.3em]">LOCAL AGENT DESYNC</span>
                        <span className="text-[8px] font-bold text-amber-500/40 uppercase tracking-widest mt-0.5">Attempting to re-establish sector authority</span>
                   </div>
                 </div>
                 <button 
                    onClick={forceResync} 
                    className="px-8 py-3 bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all duration-150 shadow-lg active:scale-95"
                 >
                    FORCE HARD SYNC
                 </button>
              </div>
            )}
          </div>
        )}
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer {
          0% { background-position: -100% 0; }
          100% { background-position: 100% 0; }
        }
        @keyframes auric-shimmer {
          0% { transform: translateX(-100%) skewX(-15deg); }
          100% { transform: translateX(200%) skewX(-15deg); }
        }
        .animate-auric-shimmer {
          animation: auric-shimmer 3s ease-in-out infinite;
        }
      `}} />
    </BackgroundWrapper>
    {toast && toast.show && (
      <Toast 
        message={toast.message} 
        type={toast.type}
        onClose={() => {
          setToast(null);
        }}
      />
    )}
    </>
    </React.Fragment>
  );
};

// Temporarily remove React.memo to test if it's preventing re-renders
// React.memo should NOT prevent re-renders from internal state changes, but let's test
export const Lobby = LobbyComponent;