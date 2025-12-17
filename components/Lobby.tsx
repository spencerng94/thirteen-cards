import React, { useState } from 'react';
import { GameState, SocketEvents } from '../types';
import { socket } from '../services/socket';
import { AdPlaceholder } from './AdPlaceholder';

interface LobbyProps {
  playerName: string;
  gameState: GameState | null;
  error: string | null;
  playerAvatar?: string;
}

export const Lobby: React.FC<LobbyProps> = ({ playerName, gameState, error, playerAvatar }) => {
  const [roomIdInput, setRoomIdInput] = useState('');

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

  if (gameState) {
     return (
       <div className="min-h-screen bg-gradient-to-br from-green-900 to-black text-white flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-md p-6 rounded-3xl shadow-2xl border border-white/20 flex flex-col gap-4">
            
            {/* Ad Space */}
            <AdPlaceholder />

            <div className="text-center mt-2">
                <div className="text-sm text-gray-400 font-bold uppercase tracking-wider">Room Code</div>
                <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-300 to-yellow-600 tracking-widest my-2 drop-shadow-sm select-all">
                    {gameState.roomId}
                </div>
                <div className="inline-block px-3 py-1 bg-blue-600/20 border border-blue-500/50 text-blue-300 rounded-full text-xs font-bold uppercase tracking-wide">
                  {gameState.players.length} / 4 Players
                </div>
            </div>

            <div className="bg-black/20 rounded-xl p-4 border border-white/5 max-h-64 overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between mb-2 px-1">
                   <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Lobby Members</p>
                </div>
                <div className="space-y-2">
                  {gameState.players.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3 bg-black/40 rounded-lg border border-white/5">
                      <div className="flex items-center gap-3">
                          <span className="text-2xl filter drop-shadow">{p.avatar || '😊'}</span>
                          <div className="flex flex-col">
                             <span className="font-bold text-sm text-white">{p.name} {p.id === socket.id ? '(You)' : ''}</span>
                             {p.isHost && <span className="text-[10px] text-yellow-500 font-bold uppercase tracking-wide">Host</span>}
                          </div>
                      </div>
                    </div>
                  ))}
                </div>
            </div>
            
            {error && <div className="text-red-400 text-xs text-center font-bold bg-red-900/20 py-2 rounded border border-red-500/20">{error}</div>}

            <div className="mt-2">
                {gameState.players.find(p => p.id === socket.id)?.isHost ? (
                    <button
                    onClick={startGame}
                    disabled={gameState.players.length < 2}
                    className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-gray-700 disabled:to-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-black text-lg rounded-xl shadow-lg transition-all active:scale-95 uppercase tracking-wide"
                    >
                    Start Game
                    </button>
                ) : (
                    <div className="text-center text-gray-400 animate-pulse bg-white/5 py-4 rounded-xl text-sm font-bold border border-white/10">
                        Waiting for host to start...
                    </div>
                )}
            </div>
        </div>
      </div>
     );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 to-black text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/10 backdrop-blur-md p-8 rounded-3xl shadow-2xl border border-white/20">
        <h1 className="text-3xl font-black text-center mb-1 text-white uppercase tracking-tighter">Multiplayer</h1>
        <p className="text-center text-gray-400 text-xs uppercase tracking-widest mb-8">Join the Arena</p>
        
        <div className="space-y-8">
           {/* Create Room Section */}
           <div className="bg-black/30 p-5 rounded-2xl border border-white/5 relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
             </div>
             <p className="text-xs font-bold text-gray-400 uppercase mb-3">Host a Game</p>
             <button 
               onClick={createRoom}
               className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-900/50 transition-all active:scale-95"
             >
               CREATE NEW ROOM
             </button>
           </div>
           
           <div className="relative flex items-center py-2">
             <div className="flex-grow border-t border-gray-700"></div>
             <span className="flex-shrink-0 mx-4 text-gray-500 text-xs font-bold uppercase">OR</span>
             <div className="flex-grow border-t border-gray-700"></div>
           </div>

           {/* Join Room Section */}
           <div className="bg-black/30 p-5 rounded-2xl border border-white/5">
              <p className="text-xs font-bold text-gray-400 uppercase mb-3">Join a Friend</p>
              <div className="flex gap-2">
                 <input
                    type="text"
                    value={roomIdInput}
                    onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())}
                    maxLength={4}
                    className="flex-1 px-4 py-3 rounded-xl bg-black/50 border border-gray-600 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 focus:outline-none text-white placeholder-gray-600 font-mono text-xl uppercase tracking-widest text-center transition-all"
                    placeholder="CODE"
                 />
                 <button 
                   onClick={joinRoom}
                   disabled={roomIdInput.length !== 4}
                   className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-black font-black rounded-xl shadow-lg shadow-yellow-900/20 transition-all active:scale-95"
                 >
                   JOIN
                 </button>
              </div>
           </div>

           <AdPlaceholder />
        </div>
        
        {error && (
            <div className="mt-6 p-3 bg-red-500/10 border border-red-500/50 rounded-xl flex items-center justify-center gap-2">
                <span className="text-red-400 text-xs font-bold uppercase">{error}</span>
            </div>
        )}
      </div>
    </div>
  );
};