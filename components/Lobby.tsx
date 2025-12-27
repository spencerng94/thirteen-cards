
import React, { useState, useEffect, useMemo } from 'react';
import { GameState, SocketEvents, BackgroundTheme, AiDifficulty, Emote } from '../types';
import { socket } from '../services/socket';
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
      {/* Cleaned up ring-1 and ring-inset usage to avoid duplicate attribute parsing errors */}
      <div className={`absolute inset-0 rounded-[2.5rem] ring-1 ring-inset ${isLight ? 'ring-white/80' : 'ring-white/5'} pointer-events-none`}></div>
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
  const [activeTab, setActiveTab] = useState<'PUBLIC' | 'CREATE'>('PUBLIC');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [syncTimer, setSyncTimer] = useState(0);

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
    socket.emit(SocketEvents.UPDATE_BOT_DIFFICULTY, { roomId: gameState.roomId, botId, difficulty, playerId: myId });
  };

  const startGame = () => {
    if (!gameState) return;
    socket.emit(SocketEvents.START_GAME, { roomId: gameState.roomId, playerId: myId });
  };

  /* FIXED: Completed Lobby component with missing return and JSX structure to resolve line 83 error */
  return (
    <BackgroundWrapper theme={backgroundTheme}>
      <div className="relative z-20 w-full max-w-4xl flex flex-col items-center">
        {/* Header and Error */}
        {error && (
          <div className="mb-6 px-6 py-3 bg-red-600/80 backdrop-blur-xl border border-red-400 text-white rounded-2xl font-black uppercase tracking-widest animate-bounce">
            {error}
          </div>
        )}

        {!gameState ? (
          /* NO GAME STATE: ROOM BROWSER / CREATOR */
          <div className="w-full space-y-6">
            <div className="flex flex-col items-center mb-8">
              <h1 className="text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-white/80 to-white/40 uppercase italic tracking-tighter drop-shadow-2xl">
                MULTIPLAYER ARENA
              </h1>
              <p className="text-[10px] font-black uppercase tracking-[0.8em] text-white/30 mt-2">Strategic Deployment Phase</p>
            </div>

            <GlassPanel className="w-full flex flex-col min-h-[500px]">
              {/* Tab Header */}
              <div className="flex border-b border-white/5 bg-white/[0.02]">
                <button 
                  onClick={() => setActiveTab('PUBLIC')}
                  className={`flex-1 py-5 text-[10px] font-black uppercase tracking-[0.3em] transition-all border-b-2 ${activeTab === 'PUBLIC' ? 'text-yellow-500 border-yellow-500 bg-white/5' : 'text-gray-500 border-transparent hover:text-white'}`}
                >
                  Active Lobbies
                </button>
                <button 
                  onClick={() => setActiveTab('CREATE')}
                  className={`flex-1 py-5 text-[10px] font-black uppercase tracking-[0.3em] transition-all border-b-2 ${activeTab === 'CREATE' ? 'text-yellow-500 border-yellow-500 bg-white/5' : 'text-gray-500 border-transparent hover:text-white'}`}
                >
                  Create Match
                </button>
              </div>

              {/* Tab Content */}
              <div className="flex-1 p-6 sm:p-10">
                {activeTab === 'PUBLIC' ? (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-4">
                        <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30 italic">Lobby Discovery</span>
                        <button onClick={refreshRooms} disabled={isRefreshing} className={`text-yellow-500/60 hover:text-yellow-500 transition-all ${isRefreshing ? 'animate-spin opacity-50' : ''}`}>
                          <RecycleIcon />
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-xl border border-white/5 shadow-inner">
                        <input 
                          type="text" 
                          placeholder="ROOM CODE" 
                          value={roomIdInput}
                          onChange={e => setRoomIdInput(e.target.value.toUpperCase())}
                          className="bg-transparent border-none outline-none text-[10px] font-black tracking-widest text-white placeholder:text-white/10 w-24"
                        />
                        <button onClick={() => joinRoom()} className="text-yellow-500 text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">JOIN</button>
                      </div>
                    </div>

                    <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                      {publicRooms.length === 0 ? (
                        <div className="py-20 flex flex-col items-center text-center opacity-30">
                          <div className="w-16 h-16 border-2 border-dashed border-white/20 rounded-full flex items-center justify-center mb-4">
                            <span className="text-2xl italic">?</span>
                          </div>
                          <p className="text-[10px] font-black uppercase tracking-[0.5em]">No Active Sectors Found</p>
                        </div>
                      ) : (
                        publicRooms.map(room => (
                          <div key={room.id} className="group relative flex items-center justify-between p-4 bg-white/[0.03] border border-white/5 rounded-3xl hover:bg-white/[0.08] hover:border-yellow-500/20 transition-all cursor-pointer" onClick={() => joinRoom(room.id)}>
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-black/40 flex items-center justify-center border border-white/10 overflow-hidden">
                                <VisualEmote trigger={room.hostAvatar} remoteEmotes={remoteEmotes} size="sm" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs font-black text-white uppercase tracking-widest">{room.name}</span>
                                <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest mt-0.5">HOST: {room.hostName}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-6">
                              <div className="flex flex-col items-end">
                                <span className="text-xs font-black text-yellow-500">{room.playerCount}/4</span>
                                <span className="text-[7px] font-black text-white/20 uppercase tracking-widest">Combatants</span>
                              </div>
                              <div className="w-8 h-8 rounded-full bg-yellow-500 text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="m12.14 8.753-5.482 4.796c-.646.566-1.658.106-1.658-.753V3.204a1 1 0 0 1 1.659-.753l5.48 4.796a1 1 0 0 1 0 1.506z"/></svg>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="space-y-4">
                      <label className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30 italic block px-2">Match Identifier</label>
                      <input 
                        type="text" 
                        value={roomNameInput}
                        onChange={e => setRoomNameInput(e.target.value.toUpperCase())}
                        maxLength={24}
                        placeholder="ENTER MATCH NAME"
                        className="w-full bg-black/40 border border-white/10 px-6 py-4 rounded-2xl text-white font-black uppercase tracking-widest text-lg focus:border-yellow-500/40 outline-none transition-all shadow-inner"
                      />
                    </div>

                    <div className="flex items-center justify-between bg-white/[0.02] p-5 rounded-3xl border border-white/5">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Public Lobby</span>
                        <span className="text-[7px] font-bold text-white/30 uppercase tracking-tight">Allow other players to discover this match</span>
                      </div>
                      <button 
                        onClick={() => setIsPublic(!isPublic)}
                        className={`w-14 h-7 rounded-full relative transition-all duration-500 ${isPublic ? 'bg-emerald-600 shadow-[0_0_100px_rgba(16,185,129,0.3)]' : 'bg-white/10'}`}
                      >
                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-500 ${isPublic ? 'translate-x-8' : 'translate-x-1'}`}></div>
                      </button>
                    </div>

                    <button 
                      onClick={createRoom}
                      className="w-full py-6 bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-600 rounded-3xl text-black font-black uppercase tracking-[0.4em] text-sm shadow-[0_20px_50px_rgba(0,0,0,0.4)] hover:scale-[1.02] active:scale-95 transition-all"
                    >
                      Establish Sector
                    </button>
                  </div>
                )}
              </div>
            </GlassPanel>

            <ReturnHomeButton onClick={onBack!} className="w-full" />
          </div>
        ) : (
          /* INSIDE LOBBY */
          <div className="w-full space-y-6">
            <div className="flex flex-col items-center mb-4">
              <h1 className="text-4xl sm:text-5xl font-black text-white uppercase italic tracking-tighter drop-shadow-2xl">
                MATCH STANDBY
              </h1>
              <div className="flex items-center gap-3 mt-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.6em]">{gameState.roomName}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Room Info */}
              <GlassPanel className="md:col-span-1 p-8 flex flex-col items-center justify-center text-center space-y-6">
                <div className="space-y-1">
                  <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.5em]">Sector Access</span>
                  <div className="text-4xl font-serif font-black text-yellow-500 tracking-widest">{gameState.roomId}</div>
                </div>
                
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?room=${gameState.roomId}`);
                    setCopyFeedback('COPIED!');
                    setTimeout(() => setCopyFeedback(null), 2000);
                  }}
                  className="px-6 py-2 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2"
                >
                  <span>{copyFeedback || 'COPY INVITE LINK'}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                </button>

                <div className="pt-4 border-t border-white/5 w-full">
                  {gameState.players.find(p => p.id === myId)?.isHost ? (
                    <div className="space-y-4">
                      <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">Tactical Support</p>
                      <button 
                        onClick={addBot}
                        disabled={gameState.players.length >= 4}
                        className="w-full py-3 rounded-2xl bg-white/5 border border-white/5 text-[9px] font-black uppercase tracking-widest text-white/60 hover:bg-white/10 hover:text-white transition-all disabled:opacity-20"
                      >
                        Enlist AI Combatant
                      </button>
                    </div>
                  ) : (
                    <div className="py-4">
                       <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.4em] animate-pulse">Awaiting Host Authorization</span>
                    </div>
                  )}
                </div>
              </GlassPanel>

              {/* Player List */}
              <GlassPanel className="md:col-span-2 p-8">
                <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
                   <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 italic">Combatant Roster</span>
                   <span className="text-[10px] font-black text-yellow-500">{gameState.players.length}/4</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {gameState.players.map(p => (
                    <div key={p.id} className={`flex items-center justify-between p-4 rounded-3xl bg-black/40 border transition-all ${p.id === myId ? 'border-yellow-500/40' : 'border-white/5'}`}>
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center border border-white/10 overflow-hidden shadow-inner">
                             <VisualEmote trigger={p.avatar} remoteEmotes={remoteEmotes} size="sm" />
                          </div>
                          {p.isHost && (
                            <div className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center text-[10px] border border-black shadow-lg">👑</div>
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className={`text-[11px] font-black uppercase tracking-widest truncate ${p.id === myId ? 'text-yellow-500' : 'text-white'}`}>{p.name}</span>
                          <span className="text-[7px] font-bold text-white/20 uppercase tracking-widest mt-0.5">{p.isBot ? `AI | ${p.difficulty}` : (p.id === myId ? 'YOU' : 'DEPLOYED')}</span>
                        </div>
                      </div>

                      {gameState.players.find(pl => pl.id === myId)?.isHost && p.id !== myId && (
                        <div className="flex items-center gap-2">
                          {p.isBot && (
                            <button 
                              onClick={() => {
                                const difficulties: AiDifficulty[] = ['EASY', 'MEDIUM', 'HARD'];
                                const curIdx = difficulties.indexOf(p.difficulty || 'MEDIUM');
                                const nextDiff = difficulties[(curIdx + 1) % difficulties.length];
                                updateBotDifficulty(p.id, nextDiff);
                              }}
                              className="w-8 h-8 rounded-xl bg-white/5 border border-white/5 text-white/40 hover:text-yellow-500 flex items-center justify-center transition-all"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3.5" /></svg>
                            </button>
                          )}
                          <button 
                            onClick={() => p.isBot ? removeBot(p.id) : null}
                            disabled={!p.isBot}
                            className="w-8 h-8 rounded-xl bg-red-600/10 border border-red-500/20 text-red-500/60 hover:text-red-400 hover:bg-red-600/20 flex items-center justify-center transition-all disabled:opacity-10"
                          >
                            <span className="text-lg font-black leading-none mt-[-2px]">×</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {Array.from({ length: 4 - gameState.players.length }).map((_, i) => (
                    <div key={`empty-${i}`} className="flex items-center gap-4 p-4 rounded-3xl border border-dashed border-white/5 opacity-20">
                      <div className="w-12 h-12 rounded-2xl border border-dashed border-white/20"></div>
                      <span className="text-[10px] font-black uppercase tracking-[0.3em]">Sector Open</span>
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex flex-col gap-4">
                  {gameState.players.find(p => p.id === myId)?.isHost ? (
                    <button 
                      onClick={startGame}
                      disabled={gameState.players.length < 2}
                      className={`w-full py-6 rounded-3xl font-black uppercase tracking-[0.4em] transition-all shadow-[0_20px_50px_rgba(0,0,0,0.6)] ${gameState.players.length < 2 ? 'bg-white/5 text-white/20 grayscale pointer-events-none' : 'bg-gradient-to-r from-emerald-600 via-green-500 to-emerald-600 text-white hover:scale-[1.02] active:scale-95'}`}
                    >
                      Initialize Arena ⚔️
                    </button>
                  ) : (
                    <div className="w-full py-6 rounded-3xl bg-white/[0.02] border border-white/5 flex items-center justify-center">
                       <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20 animate-pulse">Combat Sync in Progress</span>
                    </div>
                  )}

                  <button 
                    onClick={onBack!}
                    className="w-full py-4 bg-white/[0.02] hover:bg-red-600/10 border border-white/5 border-red-500/20 rounded-2xl text-gray-500 hover:text-red-400 text-[9px] font-black uppercase tracking-[0.4em] transition-all"
                  >
                    Withdraw to HQ
                  </button>
                </div>
              </GlassPanel>
            </div>
            
            {/* Sync Warning if user is not in the list but gameState is present */}
            {gameState && !gameState.players.find(p => p.id === myId) && syncTimer > 2 && (
              <div className="w-full p-4 bg-amber-600/20 border border-amber-500/40 rounded-2xl flex items-center justify-between animate-in slide-in-from-top-2">
                 <div className="flex items-center gap-3">
                   <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></div>
                   <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Connection Desync Detected</span>
                 </div>
                 <button onClick={forceResync} className="px-4 py-1.5 bg-amber-600 text-white text-[9px] font-black uppercase tracking-widest rounded-lg">Force Resync</button>
              </div>
            )}
          </div>
        )}
      </div>
    </BackgroundWrapper>
  );
};
