import React, { useState, useEffect } from 'react';
import { GameState, SocketEvents, BackgroundTheme } from '../types';
import { socket } from '../services/socket';
import { AdBanner } from './AdBanner';

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

  // Auto-fill input if prop changes
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

  // --- In-Lobby View ---
  if (gameState) {
     const emptySlots = Math.max(0, MAX_PLAYERS - gameState.players.length);

     return (
       <BackgroundWrapper theme={backgroundTheme}>
        <GlassPanel className="w-full max-w-lg p-6 md:p-8 flex flex-col gap-6 z-10">
            
            {/* Header / Room Code */}
            <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-bold uppercase tracking-widest mb-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    Live Lobby
                </div>
                
                <h2 className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em]">Room Access Code</h2>
                <div 
                    className="text-6xl md:text-7xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 tracking-widest drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] select-all cursor-pointer relative group"
                    onClick={() => navigator.clipboard.writeText(gameState.roomId)}
                    title="Click to copy code"
                >
                    {gameState.roomId}
                </div>

                {/* Invite Link Button */}
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

            {/* Player Grid */}
            <div className="grid grid-cols-2 gap-3 md:gap-4 my-2">
                {gameState.players.map((p) => (
                    <div key={p.id} className="relative group">
                        <div className={`flex flex-col items-center p-4 rounded-2xl border transition-all duration-300 ${p.id === socket.id ? 'bg-gradient-to-br from-white/10 to-transparent border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.1)]' : 'bg-black/30 border-white/5'}`}>
                             <div className="relative">
                                 <div className="text-4xl md:text-5xl mb-2 drop-shadow-md transform group-hover:scale-110 transition-transform">{p.avatar || '😊'}</div>
                                 {p.isHost && (
                                     <div className="absolute -top-1 -right-2 bg-yellow-500 text-black text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wide shadow-lg">Host</div>
                                 )}
                             </div>
                             <div className="text-white font-bold text-sm tracking-wide truncate max-w-full">{p.name} {p.id === socket.id && '(You)'}</div>
                             <div className="text-[10px] text-green-400 font-mono mt-1 uppercase">Ready</div>
                        </div>
                    </div>
                ))}
                
                {/* Empty Slots */}
                {Array.from({ length: emptySlots }).map((_, i) => (
                    <div key={`empty-${i}`} className="flex flex-col items-center justify-center p-4 rounded-2xl bg-black/20 border border-white/5 border-dashed">
                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-2 animate-pulse">
                            <span className="text-white/20 text-xl">?</span>
                        </div>
                        <span className="text-white/20 text-[10px] font-bold uppercase tracking-widest text-center">Waiting...</span>
                    </div>
                ))}
            </div>
            
            <AdBanner />

            {/* Actions */}
            <div className="mt-2 flex flex-col gap-2">
                {gameState.players.find(p => p.id === socket.id)?.isHost ? (
                    <button
                        onClick={startGame}
                        disabled={gameState.players.length < 2}
                        className="w-full relative group overflow-hidden py-4 rounded-xl font-black text-lg uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-500 group-hover:scale-105 transition-transform duration-300"></div>
                        <span className="relative z-10 text-white drop-shadow-md flex items-center justify-center gap-2">
                           Start Match <span className="text-xl">🚀</span>
                        </span>
                    </button>
                ) : (
                    <div className="flex items-center justify-center gap-3 py-4 bg-white/5 rounded-xl border border-white/5">
                        <div className="w-5 h-5 border-2 border-white/20 border-t-yellow-500 rounded-full animate-spin"></div>
                        <span className="text-gray-400 text-sm font-bold tracking-wide">Waiting for Host to start...</span>
                    </div>
                )}
                
                 {/* Leave Lobby Button */}
                 {onBack && (
                  <button 
                    onClick={onBack}
                    className="w-full py-2 bg-red-900/20 hover:bg-red-900/40 border border-red-500/30 rounded-xl text-red-400 text-xs font-bold uppercase tracking-widest transition-all"
                  >
                    Leave Lobby
                  </button>
                )}
            </div>
        </GlassPanel>
       </BackgroundWrapper>
     );
  }

  // --- Join/Create View ---
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
           {/* Create Room */}
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
                <span className="font-bold text-white uppercase tracking-wider flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create New Room
                </span>
             </button>
           </div>
           
           <div className="relative flex items-center">
             <div className="flex-grow border-t border-white/10"></div>
             <span className="flex-shrink-0 mx-4 text-gray-600 text-[10px] font-black uppercase tracking-[0.2em]">OR</span>
             <div className="flex-grow border-t border-white/10"></div>
           </div>

           {/* Join Room */}
           <div className="space-y-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Join Existing</p>
              <div className="flex gap-3">
                 <div className="relative flex-1">
                     <input
                        type="text"
                        value={roomIdInput}
                        onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())}
                        maxLength={4}
                        className="w-full px-4 py-4 rounded-xl bg-black/50 border border-white/10 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 focus:outline-none text-white placeholder-gray-700 font-mono text-lg uppercase tracking-[0.3em] text-center transition-all shadow-inner"
                        placeholder="CODE"
                     />
                 </div>
                 <button 
                   onClick={joinRoom}
                   disabled={roomIdInput.length !== 4}
                   className="px-6 bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-gray-800 disabled:to-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-xl shadow-lg shadow-purple-900/30 transition-all active:scale-95"
                 >
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                   </svg>
                 </button>
              </div>
           </div>
           
            {onBack && (
              <div className="pt-4 border-t border-white/10">
                <button 
                  onClick={onBack}
                  className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 text-xs font-bold uppercase tracking-widest rounded-xl transition-all"
                >
                  Return to Menu
                </button>
              </div>
            )}
        </div>

        {error && (
            <div className="mt-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center gap-2 animate-shake">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-red-400 text-[10px] font-bold uppercase tracking-wide">{error}</span>
            </div>
        )}
      </GlassPanel>
      
      <div className="absolute bottom-4 text-[10px] text-gray-600 font-bold uppercase tracking-widest opacity-50">
        v1.0.0 • Connected
      </div>
    </BackgroundWrapper>
  );
};