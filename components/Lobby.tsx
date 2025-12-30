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
  turnTimerSetting: number;
}

const MAX_PLAYERS = 4;

const BackgroundWrapper: React.FC<{ children: React.ReactNode; theme: BackgroundTheme }> = ({ children, theme }) => {
  return (
    <div className="min-h-screen w-full relative overflow-hidden flex flex-col items-center justify-center p-4 sm:p-8">
        <BoardSurface themeId={theme} />
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none z-10" style={{ 
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1.5px, transparent 1.5px), linear-gradient(90deg, rgba(255,255,255,0.1) 1.5px, transparent 1.5px)`, 
            backgroundSize: '80px 80px' 
        }}></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)] pointer-events-none z-[11]"></div>
        {children}
    </div>
  );
};

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
            className={`group relative overflow-hidden rounded-[2rem] border transition-all duration-500 active:scale-95 shadow-2xl ${theme.border} ${className}`}
        >
            <div className={`absolute inset-0 bg-gradient-to-b ${theme.bg} group-hover:scale-110 transition-transform duration-1000`}></div>
            <div className={`absolute inset-0 bg-gradient-to-b ${theme.highlight} opacity-90 transition-opacity duration-500 group-hover:opacity-100`}></div>
            <div className="relative z-10 flex flex-col items-center justify-center p-5 sm:p-6 text-center">
                <div className="flex items-center gap-3">
                    <span className={`text-xs sm:text-sm font-black uppercase tracking-[0.3em] font-serif ${theme.text} drop-shadow-md`}>{label}</span>
                    <div className={`${theme.text} group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500`}>{icon}</div>
                </div>
                <span className={`text-[8px] font-black opacity-60 tracking-[0.4em] uppercase font-serif mt-2 ${theme.text}`}>{sublabel}</span>
            </div>
        </button>
    );
};

export const Lobby: React.FC<LobbyProps> = ({ 
  playerName, 
  gameState, 
  error, 
  playerAvatar, 
  initialRoomCode,
  backgroundTheme,
  onBack,
  onSignOut,
  myId,
  turnTimerSetting
}) => {
  const [roomIdInput, setRoomIdInput] = useState(initialRoomCode || '');
  const [roomNameInput, setRoomNameInput] = useState(`${playerName.toUpperCase()}'S MATCH`);
  const [isPublic, setIsPublic] = useState(true);
  const [localTurnTimer, setLocalTurnTimer] = useState(turnTimerSetting);
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
      roomName: roomNameInput.trim() || `${playerName.toUpperCase()}'S MATCH`,
      turnTimer: localTurnTimer
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

  const isHost = useMemo(() => {
    return gameState?.players.find(p => p.id === myId)?.isHost;
  }, [gameState?.players, myId]);

  return (
    <BackgroundWrapper theme={backgroundTheme}>
      <div className="relative z-20 w-full max-w-5xl flex flex-col items-center">
        
        {error && (
          <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[100] px-8 py-4 bg-rose-600/90 backdrop-blur-xl border-2 border-rose-400 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-2xl animate-in slide-in-from-top-4">
             SYSTEM ERROR: {error}
          </div>
        )}

        {!gameState ? (
          <div className="w-full space-y-8 animate-in fade-in zoom-in-95 duration-700 flex flex-col items-center">
            <div className="flex flex-col items-center text-center space-y-4 mb-4">
              <div className="relative inline-block max-w-full overflow-visible">
                <div className="absolute inset-0 bg-yellow-500/10 blur-[80px] rounded-full"></div>
                <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black text-white uppercase italic tracking-tighter drop-shadow-[0_15px_30px_rgba(0,0,0,0.8)] font-serif relative z-10 leading-none px-4">
                    ONLINE <span className="text-transparent bg-clip-text bg-gradient-to-b from-yellow-500 to-yellow-800">MULTIPLAYER</span>
                </h1>
              </div>
              <div className="flex items-center gap-6">
                <div className="h-[1px] w-12 sm:w-24 bg-gradient-to-r from-transparent to-white/10"></div>
                <p className="text-[9px] sm:text-[11px] font-black uppercase tracking-[0.6em] sm:tracking-[1em] text-white/30 whitespace-nowrap">ONLINE MATCH</p>
                <div className="h-[1px] w-12 sm:w-24 bg-gradient-to-l from-transparent to-white/10"></div>
              </div>
            </div>

            <GlassPanel className="w-full flex flex-col min-h-[600px]">
                {/* Refined Integrated Tab Bar with Sliding Animation */}
                <div className="p-3 border-b border-white/5 bg-white/[0.02] flex justify-center">
                    <div className="bg-black/40 p-1.5 rounded-[2.5rem] flex relative w-full max-w-xl shadow-inner border border-white/5 overflow-hidden">
                        {/* Animated Slider Background */}
                        <div 
                          className={`
                            absolute top-1.5 bottom-1.5 left-1.5 w-[calc(50%-6px)] 
                            bg-white/10 border border-white/10 rounded-[2.2rem] shadow-xl 
                            transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                            ${activeTab === 'PUBLIC' ? 'translate-x-0' : 'translate-x-[calc(100%+6px)]'}
                          `}
                        >
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-[2px] bg-yellow-500/50 rounded-full blur-[1px]"></div>
                        </div>

                        {(['PUBLIC', 'CREATE'] as const).map(tab => (
                            <button 
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`
                                    flex-1 relative z-10 flex items-center justify-center gap-3 py-4 rounded-[2rem] transition-all duration-500
                                    ${activeTab === tab ? 'text-yellow-500' : 'text-white/30 hover:text-white/50'}
                                `}
                            >
                                <div className="flex items-center justify-center transition-all duration-500">
                                    {tab === 'PUBLIC' ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="opacity-90"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="opacity-90"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                    )}
                                </div>
                                <span className="text-xs font-black uppercase tracking-[0.2em]">
                                    {tab === 'PUBLIC' ? 'FIND LOBBY' : 'CREATE LOBBY'}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 p-6 sm:p-12 overflow-hidden flex flex-col">
                    {activeTab === 'PUBLIC' ? (
                        <div className="h-full flex flex-col space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className="space-y-4">
                                <label className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30 italic px-2">JOIN VIA 4-LETTER ROOM CODE</label>
                                <div className="flex items-center gap-4 bg-black/40 p-3 rounded-[2rem] border border-white/5 shadow-inner focus-within:border-yellow-500/30 transition-all">
                                    <input 
                                        type="text" 
                                        placeholder="CODE" 
                                        value={roomIdInput}
                                        maxLength={4}
                                        onChange={e => setRoomIdInput(e.target.value.toUpperCase())}
                                        className="flex-1 bg-transparent border-none outline-none text-3xl sm:text-5xl font-serif font-black tracking-[0.3em] text-yellow-500 placeholder:text-white/5 px-6 py-2"
                                    />
                                    <button 
                                        onClick={() => joinRoom()} 
                                        className="h-16 px-10 sm:px-14 bg-gradient-to-br from-yellow-500 to-yellow-700 hover:from-yellow-400 hover:to-yellow-600 text-black rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-[0_10px_20px_rgba(234,179,8,0.2)]"
                                    >
                                        INTERCEPT
                                    </button>
                                </div>
                            </div>

                            <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

                            <div className="flex-1 flex flex-col min-h-0">
                                <div className="flex justify-between items-center px-2 mb-6">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white italic">PUBLIC LOBBIES</span>
                                        <span className="text-[7px] font-bold text-white/20 uppercase tracking-widest mt-1">Found {publicRooms.length} discoverable arenas</span>
                                    </div>
                                    <button 
                                        onClick={refreshRooms} 
                                        disabled={isRefreshing} 
                                        className={`w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center transition-all active:scale-90 ${isRefreshing ? 'opacity-50' : 'hover:bg-white/10 hover:text-yellow-500'}`}
                                    >
                                        <div className={isRefreshing ? 'animate-spin' : ''}><RecycleIcon /></div>
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto pr-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                    {publicRooms.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-center opacity-30 py-12">
                                            <div className="w-20 h-20 rounded-[2rem] border-2 border-dashed border-white/20 flex items-center justify-center mb-6">
                                                <span className="text-4xl italic font-serif">?</span>
                                            </div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.6em]">NO PUBLIC LOBBIES FOUND</p>
                                            <p className="text-[8px] font-bold uppercase tracking-[0.3em] text-white/40 mt-3">Try creating a match to start a session</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {publicRooms.map(room => (
                                                <div 
                                                    key={room.id} 
                                                    onClick={() => joinRoom(room.id)}
                                                    className="group relative bg-white/[0.03] border border-white/5 rounded-[2.5rem] p-6 hover:bg-white/[0.08] hover:border-yellow-500/30 transition-all cursor-pointer shadow-xl flex flex-col gap-6"
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <div className="w-14 h-14 rounded-3xl bg-black/40 border border-white/10 flex items-center justify-center overflow-hidden shadow-inner group-hover:scale-110 transition-transform duration-500">
                                                            <VisualEmote trigger={room.hostAvatar} remoteEmotes={remoteEmotes} size="sm" />
                                                        </div>
                                                        <div className="bg-yellow-500/10 border border-yellow-500/30 px-4 py-1.5 rounded-full">
                                                            <span className="text-[10px] font-black text-yellow-500 font-mono">{room.playerCount}/4 UNIT</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-black text-white uppercase tracking-widest truncate">{room.name}</span>
                                                        <span className="text-[8px] font-bold text-white/30 uppercase tracking-[0.4em] mt-1 italic">HQ: {room.hostName}</span>
                                                    </div>
                                                    <div className="absolute bottom-6 right-6 w-10 h-10 rounded-2xl bg-yellow-500 text-black flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all shadow-xl">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="m12.14 8.753-5.482 4.796c-.646.566-1.658.106-1.658-.753V3.204a1 1 0 0 1 1.659-.753l5.48 4.796a1 1 0 0 1 0 1.506z"/></svg>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col justify-center space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500 max-w-xl mx-auto w-full">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 italic block px-2">LOBBY NAME</label>
                                <input 
                                    type="text" 
                                    value={roomNameInput}
                                    onChange={e => setRoomNameInput(e.target.value.toUpperCase())}
                                    maxLength={24}
                                    placeholder="ENTER LOBBY NAME"
                                    className="w-full bg-black/40 border border-white/10 px-8 py-6 rounded-[2rem] text-white font-black uppercase tracking-[0.2em] text-xl focus:border-yellow-500/50 outline-none transition-all shadow-inner placeholder:text-white/5"
                                />
                            </div>

                            <div className="bg-white/[0.02] p-8 rounded-[2.5rem] border border-white/5 space-y-8">
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-xs font-black text-white uppercase tracking-widest">PUBLIC LOBBY</span>
                                        <span className="text-[8px] font-bold text-white/30 uppercase tracking-tight">LOBBY WILL BE PUBLIC FOR ANYONE TO JOIN</span>
                                    </div>
                                    <button 
                                        onClick={() => setIsPublic(!isPublic)}
                                        className={`w-14 h-7 rounded-full relative transition-all duration-500 p-1 flex items-center ${isPublic ? 'bg-emerald-600 shadow-[0_0_40px_rgba(16,185,129,0.3)]' : 'bg-white/10'}`}
                                    >
                                        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-500 ${isPublic ? 'translate-x-7' : 'translate-x-0'}`}></div>
                                    </button>
                                </div>

                                <div className="h-[1px] w-full bg-white/5"></div>

                                <div className="space-y-4">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-xs font-black text-white uppercase tracking-widest">TURN TIMER</span>
                                        <span className="text-[8px] font-bold text-white/30 uppercase tracking-tight">DURATION PER MOVE BEFORE AUTOMATIC PASS</span>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2 p-1 bg-black/40 rounded-2xl border border-white/5 shadow-inner">
                                        {[0, 30, 60, 90].map(val => (
                                            <button 
                                                key={val} 
                                                onClick={() => setLocalTurnTimer(val)}
                                                className={`py-2.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${localTurnTimer === val ? 'bg-yellow-500 text-black shadow-lg' : 'text-white/20 hover:text-white/40'}`}
                                            >
                                                {val === 0 ? 'OFF' : `${val}S`}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <LuxuryActionTile 
                                onClick={createRoom} 
                                label="CREATE NEW LOBBY" 
                                sublabel="Establish Arena Session" 
                                variant="emerald"
                                className="w-full"
                                icon={<span className="text-2xl">⚔️</span>}
                            />
                        </div>
                    )}
                </div>
            </GlassPanel>

            {/* Withdraw Button moved to bottom */}
            <div className="w-full max-w-xl mt-4">
                <LuxuryActionTile 
                    onClick={onBack!} 
                    label="WITHDRAW TO HQ" 
                    sublabel="Return to Main Menu" 
                    variant="rose"
                    className="w-full"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>}
                />
            </div>
          </div>
        ) : (
          <div className="w-full max-w-4xl space-y-8 animate-in fade-in zoom-in-95 duration-700">
            <div className="flex flex-col items-center text-center">
              <div className="bg-emerald-500/10 border border-emerald-500/30 px-8 py-2 rounded-full mb-6">
                <span className="text-[10px] font-black uppercase tracking-[0.8em] text-emerald-500 animate-pulse">DEPLOYMENT STANDBY</span>
              </div>
              <h1 className="text-4xl sm:text-6xl font-black text-white uppercase italic tracking-tighter drop-shadow-2xl font-serif">
                {gameState.roomName}
              </h1>
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
                        onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?room=${gameState.roomId}`);
                        setCopyFeedback('LINK SECURED');
                        setTimeout(() => setCopyFeedback(null), 2000);
                        }}
                        className={`
                            w-full py-5 rounded-2xl transition-all flex items-center justify-center gap-4 active:scale-95 border-2
                            ${copyFeedback ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400' : 'bg-white/[0.03] border-white/5 text-white/60 hover:text-white hover:bg-white/10'}
                        `}
                    >
                        <span className="text-[10px] font-black uppercase tracking-widest">{copyFeedback || 'DISTRIBUTE INVITE'}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    </button>

                    <div className="bg-black/40 p-5 rounded-2xl border border-white/5">
                        <div className="flex justify-between items-center mb-1">
                             <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Occupancy</span>
                             <span className="text-[10px] font-black text-yellow-500">{gameState.players.length}/4</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-yellow-500 transition-all duration-1000" style={{ width: `${(gameState.players.length / 4) * 100}%` }}></div>
                        </div>
                    </div>
                  </GlassPanel>

                  <LuxuryActionTile 
                    onClick={onBack!} 
                    label="ABORT MISSION" 
                    sublabel="Terminate Session" 
                    variant="rose"
                    className="w-full"
                    icon={<span className="text-xl">🛑</span>}
                  />
              </div>

              <div className="lg:col-span-8 space-y-6">
                <GlassPanel className="p-8 sm:p-10">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {gameState.players.map(p => {
                            const isMe = p.id === myId;
                            return (
                            <div key={p.id} className={`relative group flex items-center justify-between p-5 rounded-[2.5rem] bg-black/40 border-2 transition-all ${isMe ? 'border-yellow-500/40 shadow-[inset_0_0_30px_rgba(234,179,8,0.05)]' : 'border-white/5 hover:border-white/10'}`}>
                                <div className="flex items-center gap-5">
                                    <div className="relative">
                                        <div className="w-16 h-16 rounded-[1.5rem] bg-black border border-white/10 flex items-center justify-center overflow-hidden shadow-2xl group-hover:scale-105 transition-transform duration-500">
                                            <VisualEmote trigger={p.avatar} remoteEmotes={remoteEmotes} size="md" />
                                        </div>
                                        {p.isHost && (
                                        <div className="absolute -top-2 -left-2 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-xs border-4 border-black shadow-lg z-10">👑</div>
                                        )}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className={`text-sm font-black uppercase tracking-[0.15em] truncate ${isMe ? 'text-yellow-500' : 'text-white'}`}>{p.name}</span>
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className={`w-1.5 h-1.5 rounded-full ${p.isOffline ? 'bg-rose-500' : 'bg-emerald-500'} animate-pulse`}></div>
                                            <span className="text-[8px] font-bold text-white/20 uppercase tracking-[0.2em]">{p.isBot ? 'CPU RECON' : (isMe ? 'LOCAL AGENT' : 'LINKED AGENT')}</span>
                                        </div>
                                    </div>
                                </div>

                                {p.isBot && isHost && (
                                    <div className="flex flex-col items-end gap-2 pr-2">
                                        <div className="flex gap-1 bg-black/60 p-1.5 rounded-2xl border border-white/5">
                                            {(['EASY', 'MEDIUM', 'HARD'] as AiDifficulty[]).map(d => {
                                                const active = (p.difficulty || 'MEDIUM') === d;
                                                const colors = d === 'EASY' ? 'bg-emerald-600' : d === 'MEDIUM' ? 'bg-yellow-500 text-black' : 'bg-rose-600';
                                                return (
                                                    <button 
                                                        key={d} 
                                                        onClick={() => updateBotDifficulty(p.id, d)}
                                                        className={`w-7 h-7 rounded-xl text-[10px] font-black transition-all ${active ? `${colors} scale-110 shadow-lg` : 'text-white/20 hover:text-white/40'}`}
                                                        title={`Combat Difficulty: ${d}`}
                                                    >
                                                        {d[0]}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <button 
                                            onClick={() => removeBot(p.id)}
                                            className="px-4 py-1 bg-rose-600/10 hover:bg-rose-600 border border-rose-500/30 text-rose-500 hover:text-white text-[7px] font-black uppercase tracking-widest rounded-full transition-all"
                                        >
                                            DEACTIVATE
                                        </button>
                                    </div>
                                )}
                            </div>
                            );
                        })}
                        
                        {Array.from({ length: MAX_PLAYERS - gameState.players.length }).map((_, i) => {
                            if (isHost && i === 0) {
                            return (
                                <button 
                                    key={`add-cpu-${i}`}
                                    onClick={addBot}
                                    className="flex items-center gap-5 p-5 rounded-[2.5rem] border-2 border-dashed border-white/5 bg-white/[0.01] hover:bg-white/[0.04] hover:border-yellow-500/40 transition-all group h-[100px]"
                                >
                                    <div className="w-16 h-16 rounded-[1.5rem] border-2 border-dashed border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform group-hover:border-yellow-500/40 group-hover:bg-yellow-500/5">
                                        <span className="text-3xl font-black text-white/10 group-hover:text-yellow-500 transition-colors">+</span>
                                    </div>
                                    <div className="flex flex-col items-start text-left">
                                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 group-hover:text-white transition-colors">ALLOCATE UNIT</span>
                                        <span className="text-[7px] font-bold uppercase tracking-widest text-white/5 group-hover:text-yellow-500/40 mt-1">Combat Support Available</span>
                                    </div>
                                </button>
                            );
                            }
                            return (
                            <div key={`empty-${i}`} className="flex items-center gap-5 p-5 rounded-[2.5rem] border-2 border-dashed border-white/[0.03] bg-white/[0.01] opacity-20 h-[100px]">
                                <div className="w-16 h-16 rounded-[1.5rem] border-2 border-dashed border-white/10"></div>
                                <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/10">SECTOR OPEN</span>
                            </div>
                            );
                        })}
                    </div>

                    <div className="mt-12">
                        {isHost ? (
                            <button 
                                onClick={startGame}
                                disabled={gameState.players.length < 2}
                                className={`
                                    w-full py-8 rounded-[2.5rem] font-black uppercase tracking-[0.5em] text-sm transition-all shadow-[0_30px_80px_rgba(0,0,0,0.6)] group relative overflow-hidden
                                    ${gameState.players.length < 2 ? 'bg-white/5 text-white/20 grayscale pointer-events-none' : 'bg-gradient-to-r from-emerald-700 via-green-500 to-emerald-700 text-white hover:scale-[1.02] active:scale-95'}
                                `}
                            >
                                <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_3s_infinite] pointer-events-none"></div>
                                <span className="relative z-10 flex items-center justify-center gap-4">
                                    INITIALIZE ARENA ⚔️
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
              <div className="w-full p-6 bg-amber-600/10 backdrop-blur-3xl border-2 border-amber-500/30 rounded-[2.5rem] flex items-center justify-between animate-in slide-in-from-top-4">
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
                    className="px-8 py-3 bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all shadow-lg active:scale-95"
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
      `}} />
    </BackgroundWrapper>
  );
};