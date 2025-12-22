
import React, { useState, useEffect } from 'react';
import { GameState, SocketEvents, BackgroundTheme, AiDifficulty } from '../types';
import { socket } from '../services/socket';
import { SignOutButton } from './SignOutButton';

interface LobbyProps {
  playerName: string;
  gameState: GameState | null;
  error: string | null;
  playerAvatar?: string;
  initialRoomCode?: string | null;
  backgroundTheme: BackgroundTheme;
  onBack?: () => void;
  onSignOut: () => void;
}

const MAX_PLAYERS = 4;

// --- Helper Components ---

const BackgroundWrapper: React.FC<{ children: React.ReactNode; theme: BackgroundTheme }> = ({ children, theme }) => {
  let bgBase = '';
  let orb1 = '';
  let orb2 = '';

  switch (theme) {
    case 'CYBER_BLUE':
      bgBase = 'bg-[#020617]';
      orb1 = 'bg-blue-600/10';
      orb2 = 'bg-cyan-500/10';
      break;
    case 'CRIMSON_VOID':
      bgBase = 'bg-[#0a0000]';
      orb1 = 'bg-red-950/30';
      orb2 = 'bg-rose-900/10';
      break;
    case 'EMERALD':
    default:
      bgBase = 'bg-[#051109]';
      orb1 = 'bg-green-600/10';
      orb2 = 'bg-emerald-500/10';
      break;
  }

  return (
    <div className={`min-h-screen w-full ${bgBase} relative overflow-hidden flex flex-col items-center justify-center p-4 transition-colors duration-1000`}>
        {/* Dynamic Ambient Orbs */}
        <div className={`absolute top-[-10%] left-[-10%] w-[50%] aspect-square ${orb1} blur-[120px] rounded-full animate-pulse`}></div>
        <div className={`absolute bottom-[-10%] right-[-10%] w-[50%] aspect-square ${orb2} blur-[120px] rounded-full animate-pulse [animation-delay:2s]`}></div>
        
        {/* Technical Grid Overlay */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }}></div>
        
        {children}
    </div>
  );
};

const GlassPanel: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`relative bg-black/40 backdrop-blur-2xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-[2.5rem] overflow-hidden ${className}`}>
      {/* Precision Inner Glow */}
      <div className="absolute inset-0 rounded-[2.5rem] ring-1 ring-inset ring-white/5 pointer-events-none"></div>
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
  onBack,
  onSignOut
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

  const removeBot = (botId: string) => {
    if (!gameState) return;
    socket.emit(SocketEvents.REMOVE_BOT, { roomId: gameState.roomId, botId });
  };

  const updateBotDifficulty = (botId: string, difficulty: AiDifficulty) => {
    if (!gameState) return;
    socket.emit(SocketEvents.UPDATE_BOT_DIFFICULTY, { roomId: gameState.roomId, botId, difficulty });
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

  const getDifficultyColor = (d: AiDifficulty, active: boolean) => {
    if (!active) return "text-gray-600 hover:text-gray-400 bg-white/[0.02]";
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

  if (gameState) {
     const emptySlots = Math.max(0, MAX_PLAYERS - gameState.players.length);
     const isHost = gameState.players.find(p => p.id === socket.id)?.isHost;

     return (
       <BackgroundWrapper theme={backgroundTheme}>
        <GlassPanel className="w-full max-w-xl p-6 md:p-10 flex flex-col gap-8 z-10">
            
            {/* Room Header Section */}
            <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/10">
                    <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse [animation-delay:0.2s]"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse [animation-delay:0.4s]"></span>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">Deployment Arena Ready</span>
                </div>
                
                <div className="text-center relative">
                    <h2 className="text-yellow-500/80 text-[10px] font-black uppercase tracking-[0.6em] mb-1">MULTIPLAYER LOBBY</h2>
                    <div 
                        className="text-7xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-white/90 to-white/40 tracking-[0.15em] drop-shadow-[0_0_20px_rgba(255,255,255,0.1)] cursor-pointer active:scale-95 transition-transform"
                        onClick={copyInviteLink}
                    >
                        {gameState.roomId}
                    </div>
                    {/* Decorative Scanner line */}
                    <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/5 pointer-events-none"></div>
                </div>

                <button 
                  onClick={copyInviteLink}
                  className="group flex items-center gap-3 px-6 py-2.5 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-white/20 rounded-full transition-all duration-300"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 group-hover:text-yellow-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 group-hover:text-white transition-colors">{copyFeedback || "Copy Link"}</span>
                </button>
            </div>

            {/* Players Grid */}
            <div className="grid grid-cols-2 gap-4 md:gap-6">
                {gameState.players.map((p) => (
                    <div key={p.id} className="relative group">
                        <div className={`
                            relative flex flex-col items-center p-5 rounded-[2rem] border transition-all duration-500 h-full
                            ${p.id === socket.id 
                                ? 'bg-white/[0.05] border-yellow-500/20 shadow-[0_15px_30px_rgba(0,0,0,0.3)]' 
                                : 'bg-black/30 border-white/5'}
                        `}>
                             {/* Remove Bot Button - Positioned in the absolute top-right of the card */}
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
                                 {/* Avatar Orbital Glow */}
                                 <div className={`absolute inset-[-10px] blur-xl rounded-full opacity-0 group-hover:opacity-20 transition-opacity ${p.isBot ? 'bg-emerald-500' : 'bg-yellow-500'}`}></div>
                                 
                                 <div className="relative w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-white/[0.03] to-white/[0.01] rounded-full flex items-center justify-center text-5xl md:text-6xl border border-white/10 shadow-inner group-hover:scale-105 transition-transform duration-500">
                                     {p.avatar || '😊'}
                                 </div>
                                 
                                 {p.isHost && (
                                     <div className="absolute -top-1 -right-2 bg-gradient-to-br from-yellow-400 to-yellow-600 text-black text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest shadow-[0_4px_10px_rgba(234,179,8,0.3)] ring-2 ring-black/50">Host</div>
                                 )}
                                 {p.isBot && (
                                     <div className="absolute -top-1 -right-2 bg-gradient-to-br from-emerald-500 to-teal-700 text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest shadow-[0_4px_10px_rgba(16,185,129,0.3)] ring-2 ring-black/50">CPU</div>
                                 )}
                             </div>

                             <div className="text-center w-full">
                                <div className="text-white font-black text-sm uppercase tracking-widest truncate px-2 mb-1">
                                    {p.name} {p.id === socket.id && <span className="text-yellow-500/80">(Me)</span>}
                                </div>
                             </div>
                             
                             {p.isBot && (
                                 <div className="mt-4 w-full">
                                     <div className="flex gap-1.5 p-1 bg-black/40 rounded-xl border border-white/5">
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
                    <div key={`empty-${i}`} className="flex flex-col items-center justify-center p-6 rounded-[2rem] bg-black/20 border border-white/[0.02] border-dashed group transition-all hover:bg-white/[0.02] hover:border-white/10">
                        {isHost ? (
                          <button 
                            onClick={addBot}
                            className="w-16 h-16 rounded-full bg-white/[0.02] group-hover:bg-white/[0.05] border border-white/5 flex items-center justify-center mb-4 transition-all hover:scale-110 active:scale-90 shadow-lg"
                          >
                            <span className="text-white/40 group-hover:text-white text-3xl font-light transition-colors">+</span>
                          </button>
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-white/[0.01] flex items-center justify-center mb-4">
                            <div className="w-2 h-2 rounded-full bg-white/10 animate-ping"></div>
                          </div>
                        )}
                        <span className="text-white/20 text-[9px] font-black uppercase tracking-[0.3em] text-center">
                          {isHost ? "Recruit Bot" : "Awaiting..."}
                        </span>
                    </div>
                ))}
            </div>
            
            {/* Footer Actions */}
            <div className="flex flex-col gap-4 mt-2">
                {isHost ? (
                    <button
                        onClick={startGame}
                        disabled={gameState.players.length < 2}
                        className="w-full group relative overflow-hidden py-5 rounded-[1.5rem] font-black text-lg uppercase tracking-[0.3em] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_15px_40px_rgba(0,0,0,0.4)]"
                    >
                        {/* Shimmering Gradient Background */}
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-green-500 to-emerald-600 group-hover:scale-110 transition-transform duration-500"></div>
                        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_3s_infinite] pointer-events-none"></div>
                        
                        <span className="relative z-10 text-white flex items-center justify-center gap-4 drop-shadow-md">
                           Start Game <span className="text-2xl group-hover:rotate-12 transition-transform">🚀</span>
                        </span>
                    </button>
                ) : (
                    <div className="flex items-center justify-center gap-4 py-5 bg-white/[0.03] rounded-[1.5rem] border border-white/5">
                        <div className="relative w-5 h-5">
                            <div className="absolute inset-0 border-2 border-white/10 rounded-full"></div>
                            <div className="absolute inset-0 border-t-2 border-yellow-500 rounded-full animate-spin"></div>
                        </div>
                        <span className="text-gray-400 text-[11px] font-black uppercase tracking-[0.2em]">Synchronizing with Host...</span>
                    </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  {onBack && (
                    <button 
                      onClick={onBack}
                      className="w-full py-3 bg-white/[0.01] hover:bg-red-500/[0.05] border border-white/5 hover:border-red-500/20 rounded-[1rem] text-gray-500 hover:text-red-400 text-[10px] font-black uppercase tracking-[0.4em] transition-all duration-300"
                    >
                      Quit Lobby
                    </button>
                  )}
                  <SignOutButton onSignOut={onSignOut} className="!py-3" />
                </div>
            </div>
        </GlassPanel>

        {/* Global Styles for Shimmer */}
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
      <GlassPanel className="w-full max-w-md p-10 z-10">
        <div className="text-center mb-10">
            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-gray-500 uppercase tracking-tighter mb-4 italic">
                The Arena
            </h1>
            <div className="h-[2px] w-20 bg-gradient-to-r from-transparent via-yellow-500 to-transparent mx-auto rounded-full"></div>
        </div>

        <div className="space-y-10">
           <div className="space-y-4">
             <div className="flex items-center justify-between px-1">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em]">Establish Link</p>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-[9px] font-black text-green-500 uppercase tracking-widest">Global Node Active</span>
                </div>
             </div>
             <button 
               onClick={createRoom}
               className="group w-full relative overflow-hidden py-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 transition-all shadow-[0_10px_30px_rgba(16,185,129,0.3)] active:scale-95"
             >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                <span className="relative z-10 text-white font-black uppercase tracking-[0.3em] text-xs">CREATE LOBBY</span>
             </button>
           </div>

           <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
              <div className="relative flex justify-center"><span className="bg-[#051109] px-4 text-[10px] text-gray-700 font-black tracking-[0.6em] uppercase">Interlink</span></div>
           </div>

           <div className="space-y-4">
             <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] px-1">MULTIPLAYER LOBBY</p>
             <div className="flex gap-3">
                <input 
                  type="text" 
                  value={roomIdInput}
                  onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())}
                  placeholder="CODE"
                  maxLength={4}
                  className="w-1/3 bg-black/40 border border-white/10 rounded-2xl px-4 py-5 text-center text-white font-mono font-black text-xl tracking-[0.4em] focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/30 transition-all placeholder:text-gray-800"
                />
                <button 
                  onClick={joinRoom}
                  className="flex-1 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/20 rounded-2xl text-white font-black uppercase tracking-[0.3em] text-xs transition-all active:scale-95"
                >
                  Join Arena
                </button>
             </div>
           </div>

           <div className="pt-4 flex flex-col gap-3">
             {onBack && (
                <button 
                  onClick={onBack}
                  className="w-full py-2 text-gray-600 hover:text-gray-300 text-[10px] font-black uppercase tracking-[0.5em] transition-colors"
                >
                  Go Back
                </button>
             )}
             <SignOutButton onSignOut={onSignOut} className="w-full" />
           </div>
        </div>
      </GlassPanel>

       <style dangerouslySetInnerHTML={{ __html: `
            @keyframes shimmer {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
            }
        `}} />
    </BackgroundWrapper>
  );
};
