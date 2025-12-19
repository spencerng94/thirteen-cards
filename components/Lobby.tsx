
import React, { useState, useEffect } from 'react';
import { GameState, SocketEvents, BackgroundTheme } from '../types';
import { socket } from '../services/socket';

interface LobbyProps {
  playerName: string;
  gameState: GameState | null;
  error: string | null;
  playerAvatar?: string;
  initialRoomCode?: string | null;
  backgroundTheme: BackgroundTheme;
  onBack?: () => void;
}

const MAX_PLAYERS = 4;

// --- Helper Components ---

const BackgroundWrapper: React.FC<{ children: React.ReactNode; theme: BackgroundTheme }> = ({ children, theme }) => {
  let bgBase = '';
  let orb1 = '';
  let orb2 = '';

  switch (theme) {
    case 'CYBER_BLUE':
      bgBase = 'bg-slate-950';
      orb1 = 'bg-cyan-500/20';
      orb2 = 'bg-blue-600/20';
      break;
    case 'CRIMSON_VOID':
      bgBase = 'bg-[#0a0000]';
      orb1 = 'bg-red-600/20';
      orb2 = 'bg-rose-900/20';
      break;
    case 'GREEN':
    default:
      bgBase = 'bg-green-900';
      orb1 = 'bg-green-500/10';
      orb2 = 'bg-emerald-400/10';
      break;
  }

  return (
    <div className={`min-h-screen w-full ${bgBase} relative overflow-hidden flex flex-col items-center justify-center p-4 transition-colors duration-1000`}>
        {/* Ambient Gradients */}
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-96 ${orb1} blur-[100px] rounded-full pointer-events-none transition-colors duration-1000`}></div>
        <div className={`absolute bottom-0 right-0 w-96 h-96 ${orb2} blur-[80px] rounded-full pointer-events-none transition-colors duration-1000`}></div>
        {/* Grain Overlay */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
        
        {children}
    </div>
  );
};

const GlassPanel: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`relative bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl rounded-3xl overflow-hidden ${className}`}>
      {/* Inner Glow */}
      <div className="absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/5 pointer-events-none"></div>
      {children}
  </div>
);

// --- Main Component ---

export const Lobby: React.FC<LobbyProps> = ({ 
  playerName, 
  gameState, 
  error, 
  playerAvatar, 
  initialRoomCode,
  backgroundTheme,
  onBack 
}) => {
  const [roomIdInput, setRoomIdInput] = useState(initialRoomCode || '');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (initialRoomCode) setRoomIdInput(initialRoomCode);
  }, [initialRoomCode]);

  const createRoom = () => {
    socket.emit(SocketEvents.CREATE_ROOM, { name: playerName, avatar: playerAvatar });
  };

  const joinRoom = () => {
    if (!roomIdInput.trim()) return;
    socket.emit(SocketEvents.JOIN_ROOM, { roomId: roomIdInput.trim().toUpperCase(), name: playerName, avatar: playerAvatar });
  };

  const addBot = () => {
    if (!gameState) return;
    socket.emit(SocketEvents.ADD_BOT, { roomId: gameState.roomId });
  };

  const startGame = () => {
    if (!gameState) return;
    socket.emit(SocketEvents.START_GAME, { roomId: gameState.roomId });
  };

  const copyInviteLink = () => {
    if (!gameState) return;
    const url = `${window.location.origin}?room=${gameState.roomId}`;
    navigator.clipboard.writeText(url);
    setCopyFeedback('Link Copied!');
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  if (gameState) {
     const emptySlots = Math.max(0, MAX_PLAYERS - gameState.players.length);
     const isHost = gameState.players.find(p => p.id === socket.id)?.isHost;

     return (
       <BackgroundWrapper theme={backgroundTheme}>
        <GlassPanel className="w-full max-w-lg p-6 md:p-8 flex flex-col gap-6 z-10">
            
            <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-bold uppercase tracking-widest mb-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    Live Lobby
                </div>
                
                <h2 className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em]">Room Access Code</h2>
                <div 
                    className="text-6xl md:text-7xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 tracking-widest drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] select-all cursor-pointer relative group"
                    onClick={() => navigator.clipboard.writeText(gameState.roomId)}
                >
                    {gameState.roomId}
                </div>

                <button 
                  onClick={copyInviteLink}
                  className="mx-auto mt-2 flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs font-bold uppercase tracking-wider text-gray-300 transition-all hover:scale-105 active:scale-95"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  {copyFeedback || "Copy Invite Link"}
                </button>
            </div>

            <div className="grid grid-cols-2 gap-3 md:gap-4 my-2">
                {gameState.players.map((p) => (
                    <div key={p.id} className="relative group">
                        <div className={`flex flex-col items-center p-4 rounded-2xl border transition-all duration-300 ${p.id === socket.id ? 'bg-gradient-to-br from-white/10 to-transparent border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.1)]' : 'bg-black/30 border-white/5'}`}>
                             <div className="relative">
                                 <div className="text-4xl md:text-5xl mb-2 drop-shadow-md transform group-hover:scale-110 transition-transform">{p.avatar || '😊'}</div>
                                 {p.isHost && (
                                     <div className="absolute -top-1 -right-2 bg-yellow-500 text-black text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wide shadow-lg">Host</div>
                                 )}
                                 {p.isBot && (
                                     <div className="absolute -top-1 -right-2 bg-emerald-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wide shadow-lg">CPU</div>
                                 )}
                             </div>
                             <div className="text-white font-bold text-sm tracking-wide truncate max-w-full">{p.name} {p.id === socket.id && '(You)'}</div>
                        </div>
                    </div>
                ))}
                
                {Array.from({ length: emptySlots }).map((_, i) => (
                    <div key={`empty-${i}`} className="flex flex-col items-center justify-center p-4 rounded-2xl bg-black/20 border border-white/5 border-dashed">
                        {isHost ? (
                          <button 
                            onClick={addBot}
                            className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center mb-2 transition-all hover:scale-110 active:scale-90 border border-white/5"
                          >
                            <span className="text-white text-2xl">+</span>
                          </button>
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-2 animate-pulse">
                            <span className="text-white/20 text-xl">?</span>
                          </div>
                        )}
                        <span className="text-white/20 text-[10px] font-bold uppercase tracking-widest text-center">
                          {isHost ? "Add AI Player" : "Waiting..."}
                        </span>
                    </div>
                ))}
            </div>
            
            <div className="mt-2 flex flex-col gap-2">
                {isHost ? (
                    <button
                        onClick={startGame}
                        disabled={gameState.players.length < 2}
                        className="w-full relative group overflow-hidden py-4 rounded-xl font-black text-lg uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-green-900/20"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-500 group-hover:scale-105 transition-transform duration-300"></div>
                        <span className="relative z-10 text-white drop-shadow-md flex items-center justify-center gap-2">
                           Start Match <span className="text-xl">🚀</span>
                        </span>
                    </button>
                ) : (
                    <div className="flex items-center justify-center gap-3 py-4 bg-white/5 rounded-xl border border-white/5">
                        <div className="w-5 h-5 border-2 border-white/20 border-t-yellow-500 rounded-full animate-spin"></div>
                        <span className="text-gray-400 text-sm font-bold tracking-wide">Waiting for Host...</span>
                    </div>
                )}
                
                 {onBack && (
                  <button 
                    onClick={onBack}
                    className="w-full py-2 bg-red-900/10 hover:bg-red-900/30 border border-red-500/20 rounded-xl text-red-400 text-[10px] font-bold uppercase tracking-widest transition-all"
                  >
                    Leave Lobby
                  </button>
                )}
            </div>
        </GlassPanel>
       </BackgroundWrapper>
     );
  }

  return (
    <BackgroundWrapper theme={backgroundTheme}>
      <GlassPanel className="w-full max-w-md p-8 z-10">
        <div className="text-center mb-8">
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-gray-200 to-gray-500 uppercase tracking-tighter mb-2">
                Arena
            </h1>
            <div className="h-1 w-16 bg-gradient-to-r from-transparent via-green-500 to-transparent mx-auto rounded-full"></div>
        </div>

        <div className="space-y-8">
           <div className="space-y-3">
             <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Host Game</p>
                <span className="text-[10px] text-green-500/80 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">ONLINE</span>
             </div>
             <button 
               onClick={createRoom}
               className="w-full group relative overflow-hidden py-4 rounded-xl bg-blue-600 hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/40 active:scale-95"
             >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:animate-[shimmer_1s_infinite]"></div>
                <span className="relative z-10 text-white font-black uppercase tracking-widest">Create New Room</span>
             </button>
           </div>

           <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-transparent px-4 text-gray-600 font-black tracking-widest">OR</span></div>
           </div>

           <div className="space-y-3">
             <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Join Game</p>
             <div className="flex gap-2">
                <input 
                  type="text" 
                  value={roomIdInput}
                  onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())}
                  placeholder="CODE"
                  maxLength={4}
                  className="w-1/3 bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-center text-white font-mono font-bold tracking-[0.3em] focus:outline-none focus:border-green-500/50 transition-all"
                />
                <button 
                  onClick={joinRoom}
                  className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-black uppercase tracking-widest transition-all active:scale-95"
                >
                  Join Room
                </button>
             </div>
           </div>

           {onBack && (
              <button 
                onClick={onBack}
                className="w-full py-2 text-gray-500 hover:text-gray-300 text-[10px] font-bold uppercase tracking-widest transition-colors mt-4"
              >
                Back to Menu
              </button>
           )}
        </div>
      </GlassPanel>
    </BackgroundWrapper>
  );
};
