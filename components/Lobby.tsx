
import React, { useState, useEffect, useMemo } from 'react';
import { GameState, SocketEvents, BackgroundTheme, AiDifficulty, Emote } from '../types';
import { socket } from '../services/socket';
import { SignOutButton } from './SignOutButton';
import { BoardSurface } from './UserHub';
import { VisualEmote } from './VisualEmote';
import { fetchEmotes } from '../services/supabase';

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
}

const MAX_PLAYERS = 4;

const BackgroundWrapper: React.FC<{ children: React.ReactNode; theme: BackgroundTheme }> = ({ children, theme }) => {
  return (
    <div className="min-h-screen w-full relative overflow-hidden flex flex-col items-center justify-center p-4">
        <BoardSurface themeId={theme} />
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-10" style={{ 
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`, 
            backgroundSize: '60px 60px' 
        }}></div>
        {children}
    </div>
  );
};

const GlassPanel: React.FC<{ children: React.ReactNode; className?: string; isLight?: boolean }> = ({ children, className = '', isLight = false }) => (
  <div className={`relative ${isLight ? 'bg-white/60' : 'bg-black/40'} backdrop-blur-3xl border ${isLight ? 'border-pink-200/50' : 'border-white/10'} shadow-[0_0_80px_rgba(0,0,0,${isLight ? '0.2' : '0.8'})] rounded-[2.5rem] overflow-hidden ${className}`}>
      <div className="absolute inset-0 rounded-[2.5rem] ring-1 ring-inset ${isLight ? 'ring-white/80' : 'ring-white/5'} pointer-events-none"></div>
      {children}
  </div>
);

const RecycleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 2v6h-6"/>
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
    <path d="M3 22v-6h6"/>
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
  </svg>
);

const ReturnHomeButton: React.FC<{ onClick: () => void; className?: string }> = ({ onClick, className = '' }) => (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl border transition-all duration-500 active:scale-95 shadow-[0_15px_30px_rgba(0,0,0,0.5)] border-white/10 shadow-black/40 ${className}`}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a1a] via-[#333] to-[#1a1a1a] group-hover:scale-110 transition-transform duration-1000"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-[#333] via-[#555] to-[#222] opacity-90 transition-opacity duration-500 group-hover:opacity-100"></div>
      <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)] bg-[length:250%_250%] animate-[homeShimmer_4s_infinite] pointer-events-none opacity-30"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>
      <div className="relative z-10 flex flex-col items-center justify-center px-4 py-3 min-h-[50px] sm:min-h-[60px]">
        <div className="flex items-center gap-2">
          <span className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.25em] font-serif text-white drop-shadow-md">Return Home</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white group-hover:-translate-x-1 transition-transform">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
        <span className="text-[7px] font-black opacity-60 tracking-[0.3em] uppercase font-serif mt-1 text-white">Withdraw to HQ</span>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `@keyframes homeShimmer { 0% { background-position: -100% 0; } 100% { background-position: 100% 0; } }` }} />
    </button>
);

export const Lobby: React.FC<LobbyProps> = ({ 
  playerName, 
  gameState, 
  error, 
  playerAvatar, 
  initialRoomCode,
  backgroundTheme,
  onBack,
  onSignOut,
  myId
}) => {
  const [roomIdInput, setRoomIdInput] = useState(initialRoomCode || '');
  const [roomNameInput, setRoomNameInput] = useState(`${playerName.toUpperCase()}'S MATCH`);
  const [isPublic, setIsPublic] = useState(true);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [remoteEmotes, setRemoteEmotes] = useState<Emote[]>([]);
  const [publicRooms, setPublicRooms] = useState<PublicRoom[]>([]);
  const [activeTab, setActiveTab] = useState<'DIRECTORY' | 'ENTRY'>('DIRECTORY');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [syncTimer, setSyncTimer] = useState(0);

  const isLightTheme = backgroundTheme === 'HIGH_ROLLER'; 

  useEffect(() => {
    if (initialRoomCode) {
      setRoomIdInput(initialRoomCode);
    }
    fetchEmotes().then(setRemoteEmotes);
  }, [initialRoomCode]);

  useEffect(() => {
    const handleRoomsList = (list: PublicRoom[]) => {
      setPublicRooms(list);
      setIsRefreshing(false);
    };
    socket.on(SocketEvents.PUBLIC_ROOMS_LIST, handleRoomsList);
    
    // Always request current rooms on mount if not in a game
    if (!gameState) {
      refreshRooms();
    }

    return () => {
      socket.off(SocketEvents.PUBLIC_ROOMS_LIST, handleRoomsList);
    };
  }, [gameState]);

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

  const refreshRooms = () => {
    setIsRefreshing(true);
    socket.emit(SocketEvents.GET_PUBLIC_ROOMS);
  };

  const forceResync = () => {
    socket.emit(SocketEvents.REQUEST_SYNC, { playerId: myId });
  };

  const createRoom = () => {
    socket.emit(SocketEvents.CREATE_ROOM, { 
      name: playerName, 
      avatar: playerAvatar,
      playerId: myId,
      isPublic,
      roomName: roomNameInput.trim() || `${playerName.toUpperCase()}'S MATCH`
    });
  };

  const joinRoom = (code?: string) => {
    const targetCode = code || roomIdInput.trim().toUpperCase();
    if (!targetCode) return;
    socket.emit(SocketEvents.JOIN_ROOM, { 
      roomId: targetCode, 
      name: playerName, 
      avatar: playerAvatar,
      playerId: myId 
    });
  };

  const addBot = () => {
    if (!gameState) return;
    socket.emit(SocketEvents.ADD_BOT, { roomId: gameState.roomId, playerId: myId });
  };

  const removeBot = (botId: string) => {
    if (!gameState) return;
    socket.emit(SocketEvents.REMOVE_BOT, { roomId: gameState.roomId, botId, playerId: myId });
  };

  const updateBotDifficulty = (botId: string, difficulty: AiDifficulty) => {
    if (!gameState) return;
    console.log(`Lobby: Requesting difficulty change for ${botId} to ${difficulty}`);
    socket.emit(SocketEvents.UPDATE_BOT_DIFFICULTY, { roomId: gameState.roomId, botId, difficulty, playerId: myId });
  };

  const startGame = () => {
    if (!gameState) return;
    socket.emit(SocketEvents.START_GAME, { roomId: gameState.roomId, playerId: myId });
  };

  const copyInviteLink = () => {
    if (!gameState) return;
    const url = `${window.location.origin}?room=${gameState.roomId}`;
    navigator.clipboard.writeText(url);
    setCopyFeedback('Link Copied!');
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  const getDifficultyColor = (d: AiDifficulty, active: boolean) => {
    if (!active) return isLightTheme ? "text-gray-400 bg-black/[0.05]" : "text-gray-600 hover:text-gray-400 bg-white/[0.02]";
    switch (d) {
      case 'EASY':
        return "bg-green-600/90 text-white shadow-[0_0_12px_rgba(22,163,74,0.4)] ring-1 ring-green-400/30";
      case 'MEDIUM':
        return "bg-yellow-500 text-black shadow-[0_0_12px_rgba(234,179,8,0.4)] ring-1 ring-yellow-300/30";
      case 'HARD':
        return "bg-red-600/90 text-white shadow-[0_0_12px_rgba(220,38,38,0.4)] ring-1 ring-red-400/30";
      default:
        return "bg-emerald-600 text-white";
    }
  };

  // Determine current identity
  const me = useMemo(() => gameState?.players.find(p => p.id === myId), [gameState, myId]);
  const isHost = !!me?.isHost;
  const isIdentified = !!me;

  if (gameState) {
     const emptySlots = Math.max(0, MAX_PLAYERS - gameState.players.length);

     return (
       <BackgroundWrapper theme={backgroundTheme}>
        <GlassPanel isLight={isLightTheme} className="w-full max-w-xl p-6 md:p-10 flex flex-col gap-8 z-20">
            
            <div className="flex flex-col items-center gap-4">
                <div className={`flex items-center gap-3 px-4 py-1.5 rounded-full ${isLightTheme ? 'bg-black/[0.05]' : 'bg-white/[0.03]'} border ${isLightTheme ? 'border-black/10' : 'border-white/10'}`}>
                    <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse [animation-delay:0.2s]"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse [animation-delay:0.4s]"></span>
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${isLightTheme ? 'text-black/60' : 'text-white/60'}`}>Arena Secure</span>
                </div>
                
                <div className="text-center relative">
                    <h2 className={`${isLightTheme ? 'text-pink-600/80' : 'text-yellow-500/80'} text-[10px] font-black uppercase tracking-[0.6em] mb-1`}>
                      {gameState.roomName || 'MULTIPLAYER LOBBY'}
                    </h2>
                    <div 
                        className={`text-7xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b ${isLightTheme ? 'from-pink-900 via-pink-700 to-pink-500' : 'from-white via-white/90 to-white/40'} tracking-[0.15em] drop-shadow-[0_0_20px_rgba(255,255,255,0.1)] cursor-pointer active:scale-95 transition-transform`}
                        onClick={copyInviteLink}
                    >
                        {gameState.roomId}
                    </div>
                    <div className={`absolute top-1/2 left-0 w-full h-[1px] ${isLightTheme ? 'bg-black/5' : 'bg-white/5'} pointer-events-none`}></div>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={copyInviteLink}
                    className={`group flex items-center gap-3 px-6 py-2.5 ${isLightTheme ? 'bg-black/5 hover:bg-black/10' : 'bg-white/[0.02] hover:bg-white/[0.05]'} border ${isLightTheme ? 'border-black/5' : 'border-white/5'} hover:border-white/20 rounded-full transition-all duration-300`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${isLightTheme ? 'text-pink-400' : 'text-gray-500'} group-hover:text-yellow-500 transition-colors`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1M8 5a2 2 0 0 0 2 2h2a2 2 0 0 0-2-2M8 5a2 2 0 0 0 2 2h2a2 2 0 0 0-2-2M8 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m0 0h2a2 2 0 0 1 2 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isLightTheme ? 'text-black/60' : 'text-gray-400'} group-hover:text-white transition-colors`}>{copyFeedback || "Copy Link"}</span>
                  </button>
                  <div className={`flex items-center px-4 py-2 rounded-full ${gameState.isPublic ? 'bg-emerald-600/10 border-emerald-500/20' : 'bg-white/5 border-white/10'} border`}>
                    <span className={`text-[8px] font-black uppercase tracking-widest ${gameState.isPublic ? 'text-emerald-500' : 'text-white/40'}`}>
                      {gameState.isPublic ? 'Public Battle' : 'Private Match'}
                    </span>
                  </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 md:gap-6">
                {gameState.players.map((p) => (
                    <div key={p.id} className="relative group">
                        <div className={`
                            relative flex flex-col items-center p-5 rounded-[2rem] border transition-all duration-500 h-full
                            ${p.id === myId 
                                ? `${isLightTheme ? 'bg-pink-50 border-pink-200/50' : 'bg-white/[0.05] border-yellow-500/20'} shadow-[0_15px_30px_rgba(0,0,0,0.3)]` 
                                : `${isLightTheme ? 'bg-black/[0.03] border-black/5' : 'bg-black/30 border-white/5'}`}
                        `}>
                             {p.isBot && isHost && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); removeBot(p.id); }}
                                    className="absolute top-3 right-3 w-7 h-7 rounded-full bg-red-600/90 text-white flex items-center justify-center border border-white/20 shadow-xl hover:bg-red-500 active:scale-90 transition-all z-20"
                                    title="Remove Bot"
                                >
                                    <span className="text-xs font-black">✕</span>
                                </button>
                             )}

                             <div className="relative mb-4">
                                 <div className={`absolute inset-[-10px] blur-xl rounded-full opacity-0 group-hover:opacity-20 transition-opacity ${p.isBot ? 'bg-emerald-500' : 'bg-yellow-500'}`}></div>
                                 <div className={`relative w-20 h-20 md:w-24 md:h-24 ${isLightTheme ? 'bg-white' : 'bg-gradient-to-br from-white/[0.03] to-white/[0.01]'} rounded-full flex items-center justify-center border ${isLightTheme ? 'border-pink-100' : 'border-white/10'} shadow-inner group-hover:scale-105 transition-transform duration-500 overflow-hidden`}>
                                     <VisualEmote trigger={p.avatar || ':smile:'} remoteEmotes={remoteEmotes} size="lg" />
                                 </div>
                                 {p.isHost && (
                                     <div className={`absolute -top-1 -right-2 ${isLightTheme ? 'bg-pink-600 text-white' : 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-black'} text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest shadow-lg ring-2 ${isLightTheme ? 'ring-white' : 'ring-black/50'}`}>Host</div>
                                 )}
                                 {p.isBot && (
                                     <div className="absolute -top-1 -right-2 bg-gradient-to-br from-emerald-500 to-teal-700 text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest shadow-[0_4px_10px_rgba(16,185,129,0.3)] ring-2 ring-black/50">CPU</div>
                                 )}
                             </div>

                             <div className="text-center w-full">
                                <div className={`${isLightTheme ? 'text-gray-900' : 'text-white'} font-black text-sm uppercase tracking-widest truncate px-2 mb-1`}>
                                    {p.name} {p.id === myId && <span className={`${isLightTheme ? 'text-pink-600' : 'text-yellow-500/80'}`}>(Me)</span>}
                                </div>
                             </div>
                             
                             {p.isBot && (
                                 <div className="mt-4 w-full">
                                     <div className={`flex gap-1.5 p-1 ${isLightTheme ? 'bg-black/5' : 'bg-black/40'} rounded-xl border ${isLightTheme ? 'border-black/5' : 'border-white/5'}`}>
                                         {(['EASY', 'MEDIUM', 'HARD'] as AiDifficulty[]).map((d) => (
                                             <button
                                                 key={d}
                                                 disabled={!isHost}
                                                 onClick={(e) => {
                                                     e.stopPropagation();
                                                     updateBotDifficulty(p.id, d);
                                                 }}
                                                 className={`
                                                     flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all duration-300
                                                     ${getDifficultyColor(d, (p.difficulty || 'MEDIUM') === d)}
                                                     ${!isHost ? 'opacity-40 cursor-not-allowed' : 'hover:scale-[1.03] active:scale-95'}
                                                 `}
                                              >
                                                 {d[0]}
                                             </button>
                                          ))}
                                     </div>
                                 </div>
                             )}
                        </div>
                    </div>
                 ))}
                
                {Array.from({ length: emptySlots }).map((_, i) => (
                    <div key={`empty-${i}`} className={`flex flex-col items-center justify-center p-6 rounded-[2rem] ${isLightTheme ? 'bg-black/[0.02]' : 'bg-black/20'} border ${isLightTheme ? 'border-black/[0.05]' : 'border-white/[0.02]'} border-dashed group transition-all hover:bg-white/[0.02] hover:border-white/10`}>
                        {isHost ? (
                          <button 
                            onClick={addBot}
                            className={`w-16 h-16 rounded-full ${isLightTheme ? 'bg-black/[0.03] hover:bg-black/[0.08]' : 'bg-white/[0.02] hover:bg-white/[0.05]'} border ${isLightTheme ? 'border-black/5' : 'border-white/5'} flex items-center justify-center mb-4 transition-all hover:scale-110 active:scale-90 shadow-lg`}
                           >
                            <span className={`${isLightTheme ? 'text-pink-600' : 'text-white/40'} group-hover:text-white text-3xl font-light transition-colors`}>+</span>
                          </button>
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-white/[0.01] flex items-center justify-center mb-4">
                            <div className={`w-2 h-2 rounded-full ${isLightTheme ? 'bg-pink-400' : 'bg-white/10'} animate-ping`}></div>
                          </div>
                        )}
                        <span className={`${isLightTheme ? 'text-black/20' : 'text-white/20'} text-[9px] font-black uppercase tracking-[0.3em] text-center`}>
                          {isHost ? "Recruit Bot" : "Awaiting..."}
                        </span>
                    </div>
                 ))}
            </div>
            
            <div className="flex flex-col gap-4 mt-2">
                {!isIdentified ? (
                   <div className="space-y-4">
                      <div className={`flex items-center justify-center gap-4 py-5 ${isLightTheme ? 'bg-black/5' : 'bg-white/[0.03]'} rounded-[1.5rem] border ${isLightTheme ? 'border-black/5' : 'border-white/5'}`}>
                          <div className="relative w-5 h-5">
                              <div className={`absolute inset-0 border-2 ${isLightTheme ? 'border-black/10' : 'border-white/10'} rounded-full`}></div>
                              <div className={`absolute inset-0 border-t-2 ${isLightTheme ? 'border-pink-600' : 'border-yellow-500'} rounded-full animate-spin`}></div>
                          </div>
                          <span className={`${isLightTheme ? 'text-gray-900/60' : 'text-gray-400'} text-[11px] font-black uppercase tracking-[0.2em]`}>Claiming Station...</span>
                      </div>
                      <button 
                          onClick={forceResync}
                          className="w-full py-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-500 text-[9px] font-black uppercase tracking-[0.4em] hover:bg-yellow-500/20 transition-all animate-pulse"
                        >
                          Manual Identity Claim
                      </button>
                   </div>
                ) : isHost ? (
                    <button
                        onClick={startGame}
                        disabled={gameState.players.length < 2}
                        className="w-full group relative overflow-hidden py-5 rounded-[1.5rem] font-black text-lg uppercase tracking-[0.3em] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_15px_40px_rgba(0,0,0,0.4)]"
                     >
                        <div className={`absolute inset-0 bg-gradient-to-r ${isLightTheme ? 'from-pink-600 via-pink-400 to-pink-600' : 'from-emerald-600 via-green-500 to-emerald-600'} group-hover:scale-110 transition-transform duration-500`}></div>
                        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_3s_infinite] pointer-events-none"></div>
                        <span className="relative z-10 text-white flex items-center justify-center gap-4 drop-shadow-md">
                           Start Game <span className="text-2xl group-hover:rotate-12 transition-transform">🚀</span>
                        </span>
                    </button>
                ) : (
                    <div className={`flex items-center justify-center gap-4 py-5 ${isLightTheme ? 'bg-black/5' : 'bg-white/[0.03]'} rounded-[1.5rem] border ${isLightTheme ? 'border-black/5' : 'border-white/5'}`}>
                        <div className="relative w-4 h-4 rounded-full border-2 border-emerald-500/50 animate-pulse"></div>
                        <span className={`${isLightTheme ? 'text-gray-900/60' : 'text-gray-400'} text-[11px] font-black uppercase tracking-[0.2em]`}>Waiting for Commander...</span>
                    </div>
                )}
                
                <div className="flex flex-col gap-3">
                  {onBack && (
                    <ReturnHomeButton onClick={onBack} className="w-full" />
                  )}
                  <SignOutButton onSignOut={onSignOut} className="w-full" />
                </div>
            </div>
        </GlassPanel>

        <style dangerouslySetInnerHTML={{ __html: `
            @keyframes shimmer {
                0% { background-position: -100% 0; }
                100% { background-position: 100% 0; }
            }
        `}} />
       </BackgroundWrapper>
     );
  }

  return (
    <BackgroundWrapper theme={backgroundTheme}>
      <GlassPanel isLight={isLightTheme} className="w-full max-w-2xl min-h-[640px] flex flex-col z-20">
        
        {/* Header Section */}
        <div className="p-8 md:p-10 pb-4">
          <div className="flex justify-between items-start mb-8">
            <div className="flex flex-col">
              <h1 className={`text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br ${isLightTheme ? 'from-pink-900 via-pink-700 to-pink-500' : 'from-white via-white/80 to-gray-500'} uppercase tracking-tighter italic leading-none`}>
                The Arena
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <p className={`text-[8px] font-black uppercase tracking-[0.6em] ${isLightTheme ? 'text-pink-600/60' : 'text-emerald-500/80'}`}>Global Network Link Active</p>
              </div>
            </div>
            {onBack && (
              <button 
                onClick={onBack}
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${isLightTheme ? 'bg-black/5 text-gray-900' : 'bg-white/5 text-white'} border border-white/5 hover:bg-white/10 transition-all shadow-lg active:scale-90`}
              >
                ✕
              </button>
            )}
          </div>

          {/* Navigation Tabs - Refined Consistency */}
          <div className={`flex gap-2 p-2 ${isLightTheme ? 'bg-black/5' : 'bg-black/40'} rounded-[1.5rem] border border-white/5 w-full`}>
            <button 
              onClick={() => setActiveTab('DIRECTORY')}
              className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.3em] transition-all duration-300 ${activeTab === 'DIRECTORY' ? 'bg-yellow-500 text-black shadow-lg scale-[1.02]' : 'text-white/40 hover:text-white/70 hover:bg-white/[0.03]'}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <span className="hidden xs:inline">Public Lobbies</span>
              <span className="xs:inline hidden">Directory</span>
              <span className="xs:hidden">Public</span>
            </button>
            <button 
              onClick={() => setActiveTab('ENTRY')}
              className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.3em] transition-all duration-300 ${activeTab === 'ENTRY' ? 'bg-yellow-500 text-black shadow-lg scale-[1.02]' : 'text-white/40 hover:text-white/70 hover:bg-white/[0.03]'}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
              <span className="hidden xs:inline">Create Lobby</span>
              <span className="xs:inline hidden">Initialize</span>
              <span className="xs:hidden">Create</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 md:p-10 pt-2 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          
          {activeTab === 'DIRECTORY' ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
               {/* Join Private Lobby Section */}
               <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30">Join Private Lobby</span>
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>
                  </div>
                  <div className="flex gap-3">
                      <input 
                        type="text" 
                        value={roomIdInput}
                        onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())}
                        placeholder="CODE"
                        maxLength={4}
                        className={`w-1/3 ${isLightTheme ? 'bg-white' : 'bg-black/60'} border ${isLightTheme ? 'border-pink-200' : 'border-white/10'} rounded-2xl px-4 py-5 text-center ${isLightTheme ? 'text-gray-900' : 'text-white'} font-mono font-black text-xl tracking-[0.4em] focus:outline-none focus:border-yellow-500/50 transition-all placeholder:text-white/40`}
                      />
                      <button 
                        onClick={() => joinRoom()}
                        disabled={!roomIdInput || roomIdInput.length < 4}
                        className={`flex-1 ${isLightTheme ? 'bg-black/5 hover:bg-black/10 text-gray-900' : 'bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400'} border border-emerald-500/20 rounded-2xl font-black uppercase tracking-[0.25em] text-[10px] transition-all active:scale-95 disabled:opacity-30`}
                      >
                        Enter 4-Letter Code
                      </button>
                  </div>
               </div>

              <div className="flex justify-between items-center px-1">
                <span className={`text-[9px] font-black uppercase tracking-[0.4em] ${isLightTheme ? 'text-black/40' : 'text-white/30'}`}>
                  Open DeployMENTS ({publicRooms.length})
                </span>
                <button 
                  onClick={refreshRooms}
                  disabled={isRefreshing}
                  className={`w-11 h-11 flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] transition-all active:scale-90 ${isRefreshing ? 'opacity-50 grayscale' : 'text-yellow-500'}`}
                  title="Refresh Lobbies"
                >
                  <div className={isRefreshing ? 'animate-spin' : ''}>
                    <RecycleIcon />
                  </div>
                </button>
              </div>

              {/* Tactical Lobbies Section */}
              <div className={`relative min-h-[300px] rounded-[2rem] border border-white/5 bg-black/40 overflow-hidden p-6 ${publicRooms.length === 0 ? 'flex flex-col items-center justify-center' : ''}`}>
                 <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(255,255,255,0.02)_100%)]"></div>
                 
                 {publicRooms.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4 w-full relative z-10">
                      {publicRooms.map(room => (
                        <div key={room.id} className="group relative overflow-hidden bg-white/[0.02] border border-white/5 hover:border-emerald-500/30 rounded-[1.5rem] p-5 flex items-center gap-5 transition-all hover:translate-x-1">
                            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/[0.02] to-emerald-500/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none"></div>
                            
                            <div className="relative w-14 h-14 rounded-full border border-white/10 bg-black/40 overflow-hidden flex items-center justify-center shrink-0">
                              <VisualEmote trigger={room.hostAvatar} remoteEmotes={remoteEmotes} size="md" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[7px] font-black text-yellow-500/60 uppercase tracking-widest px-2 py-0.5 rounded-full bg-yellow-500/5 border border-yellow-500/10">ID: {room.id}</span>
                                <span className={`text-[7px] font-black uppercase tracking-widest ${room.playerCount >= 4 ? 'text-rose-500' : 'text-emerald-500'}`}>{room.playerCount}/4 STATIONS</span>
                              </div>
                              <h3 className="text-white font-black uppercase tracking-widest truncate">{room.name}</h3>
                              <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest">COMMANDER {room.hostName.toUpperCase()}</p>
                            </div>

                            <button 
                              onClick={() => joinRoom(room.id)}
                              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest transition-all shadow-lg hover:scale-105 active:scale-95 shrink-0"
                            >
                              DEPLOY
                            </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="relative z-10 flex flex-col items-center opacity-30 text-center py-10">
                      <div className="w-16 h-16 rounded-full border border-dashed border-white/20 flex items-center justify-center mb-6">
                        <div className="w-2 h-2 rounded-full bg-white animate-ping"></div>
                      </div>
                      <p className="text-[10px] font-black uppercase tracking-[0.4em]">Tactical Silence</p>
                      <p className="text-[8px] font-bold uppercase tracking-[0.2em] mt-2">No Open Arenas Detected in Sector</p>
                    </div>
                  )}
              </div>
            </div>
          ) : (
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30">Lobby Configuration</span>
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent"></div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <p className="text-[8px] font-black uppercase text-white/40 tracking-[0.2em] ml-1">Battle Callsign</p>
                      <input 
                        type="text" 
                        value={roomNameInput}
                        onChange={(e) => setRoomNameInput(e.target.value.toUpperCase())}
                        maxLength={20}
                        placeholder="ARENA NAME"
                        className="w-full bg-black/60 border border-white/10 rounded-2xl px-5 py-4 text-white font-black text-sm tracking-widest focus:border-yellow-500/50 outline-none transition-all placeholder:text-white/10"
                      />
                    </div>

                    <div className="space-y-3">
                      <p className="text-[8px] font-black uppercase text-white/40 tracking-[0.2em] ml-1">Visibility Status</p>
                      <div className="flex p-1.5 bg-black/60 rounded-2xl border border-white/5 w-full">
                        <button 
                          onClick={() => setIsPublic(true)}
                          className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${isPublic ? 'bg-emerald-600 text-white shadow-lg' : 'text-white/20 hover:text-white/40'}`}
                        >
                          Public
                        </button>
                        <button 
                          onClick={() => setIsPublic(false)}
                          className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${!isPublic ? 'bg-rose-600 text-white shadow-lg' : 'text-white/20 hover:text-white/40'}`}
                        >
                          Private
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Initialize Arena Premium Emerald Button */}
                  <button 
                    onClick={createRoom}
                    className="group w-full relative overflow-hidden rounded-3xl border border-emerald-500/30 transition-all duration-500 active:scale-95 shadow-[0_20px_50px_rgba(0,0,0,0.6)] shadow-emerald-950/40"
                  >
                    <div className="absolute inset-0 bg-gradient-to-b from-[#064e3b] via-[#065f46] to-[#064e3b] group-hover:scale-110 transition-transform duration-1000"></div>
                    <div className="absolute inset-0 bg-gradient-to-b from-[#065f46] via-[#10b981] to-[#047857] opacity-90 transition-opacity duration-500 group-hover:opacity-100"></div>
                    <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:250%_250%] animate-[initShimmer_4s_infinite] pointer-events-none opacity-30"></div>
                    <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>

                    <div className="relative z-10 flex flex-col items-center justify-center py-6">
                        <div className="flex items-center gap-4">
                            <span className="text-[12px] sm:text-[14px] font-black uppercase tracking-[0.4em] font-serif text-white drop-shadow-md">
                                Initialize Arena
                            </span>
                            <span className="text-xl group-hover:rotate-12 transition-transform duration-500">⚔️</span>
                        </div>
                        <span className="text-[8px] font-black opacity-60 tracking-[0.3em] uppercase font-serif mt-1.5 text-white">
                            DEPLOY SESSION
                        </span>
                    </div>
                  </button>
               </div>
            </div>
          )}

        </div>

        {/* Footer Actions: Updated Return Home and Sign Out to be full-width vertical rows */}
        <div className="px-10 py-8 border-t border-white/5 bg-black/40 flex flex-col gap-3 mt-auto">
          {onBack && (
            <ReturnHomeButton onClick={onBack} className="w-full" />
          )}
          <SignOutButton onSignOut={onSignOut} className="w-full !min-h-0" />
        </div>

      </GlassPanel>

       <style dangerouslySetInnerHTML={{ __html: `
            @keyframes initShimmer {
                0% { background-position: -100% 0; }
                100% { background-position: 100% 0; }
            }
        `}} />
    </BackgroundWrapper>
  );
};
