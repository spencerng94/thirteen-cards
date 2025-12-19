import React from 'react';
import { Player } from '../types';

interface VictoryScreenProps {
  players: Player[];
  myId: string;
  onPlayAgain: () => void;
  onGoHome: () => void;
}

export const VictoryScreen: React.FC<VictoryScreenProps> = ({ players, myId, onPlayAgain, onGoHome }) => {
  const sortedPlayers = [...players].sort((a, b) => {
    const rankA = a.finishedRank || 99;
    const rankB = b.finishedRank || 99;
    return rankA - rankB;
  });

  const me = players.find(p => p.id === myId);
  const myRank = me?.finishedRank || 4;
  const isWinner = myRank === 1;

  const getMedal = (rank: number) => {
    switch(rank) {
      case 1: return '🏆';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '💩';
    }
  };

  const getRankColor = (rank: number) => {
    switch(rank) {
      case 1: return 'from-yellow-400 via-yellow-200 to-yellow-600';
      case 2: return 'from-gray-300 via-white to-gray-500';
      case 3: return 'from-orange-400 via-orange-200 to-orange-700';
      default: return 'from-gray-700 to-gray-900';
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 relative overflow-hidden flex flex-col items-center justify-center p-4 transition-all duration-1000">
      {/* Dynamic Background Gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-green-900/20 via-slate-950 to-black pointer-events-none"></div>
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

      {/* Extreme Winner Spotlight Glow */}
      {isWinner && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-5xl aspect-square bg-yellow-500/10 blur-[180px] animate-pulse pointer-events-none"></div>
      )}

      <div className="max-w-md w-full z-10 flex flex-col items-center gap-6">
        
        {/* Header Section */}
        <div className="text-center space-y-2">
          <div className="relative inline-block">
            {isWinner ? (
              <div className="text-8xl mb-4 drop-shadow-[0_0_40px_rgba(234,179,8,0.8)] animate-bounce">👑</div>
            ) : (
              <div className="text-8xl mb-4 grayscale opacity-40">🏁</div>
            )}
            {/* Crown shine for winner */}
            {isWinner && (
              <div className="absolute -top-4 -right-4 w-12 h-12 bg-white/20 blur-2xl rounded-full animate-ping"></div>
            )}
          </div>
          
          <h1 className="text-5xl font-black tracking-tighter uppercase italic">
            <span className="block text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-yellow-500 to-yellow-700 drop-shadow-[0_4px_12px_rgba(0,0,0,1)]">
              Match
            </span>
            <span className="block text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] -mt-2">
              Complete
            </span>
          </h1>
          <p className="text-[11px] font-black uppercase tracking-[0.4em] text-yellow-500/60 flex items-center justify-center gap-2">
            <span className="w-8 h-[1px] bg-yellow-500/20"></span>
            Match Results
            <span className="w-8 h-[1px] bg-yellow-500/20"></span>
          </p>
        </div>

        {/* Leaderboard Section */}
        <div className="w-full space-y-3">
          {sortedPlayers.map((p, idx) => {
            const rank = idx + 1;
            const isMe = p.id === myId;
            const rankColor = getRankColor(rank);
            const isFirst = rank === 1;

            return (
              <div 
                key={p.id}
                className={`
                  relative group overflow-hidden transition-all duration-500 rounded-2xl border
                  ${isMe ? 'scale-105 z-20 shadow-[0_10px_40px_rgba(0,0,0,0.5)]' : 'scale-100 opacity-90'}
                  ${isFirst ? 'border-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.25)] ring-1 ring-yellow-400/20' : 'border-white/5 shadow-lg'}
                `}
              >
                {/* Winner's Special Background Halo */}
                {isFirst && (
                  <div className="absolute inset-0 bg-yellow-500/5 animate-pulse"></div>
                )}
                
                {/* Glassmorphism Background */}
                <div className={`absolute inset-0 bg-black/60 backdrop-blur-2xl`}></div>
                
                {/* Accent Bar */}
                {rank <= 3 && (
                   <div className={`absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b ${rankColor} shadow-[0_0_10px_rgba(255,255,255,0.1)]`}></div>
                )}

                <div className="relative p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative flex items-center justify-center">
                      <div className="text-4xl filter drop-shadow-md group-hover:scale-110 transition-transform duration-300">{p.avatar || '😊'}</div>
                      <div className="absolute -top-3 -left-3 text-2xl filter drop-shadow-[0_0_8px_rgba(0,0,0,0.5)]">{getMedal(rank)}</div>
                    </div>
                    
                    <div className="flex flex-col">
                      <span className={`font-black text-base uppercase tracking-widest ${isMe ? 'text-green-400' : 'text-gray-100'}`}>
                        {p.name} {isMe && <span className="text-[10px] text-green-500/80 ml-1 opacity-80">(YOU)</span>}
                      </span>
                      {/* Removed PLAYER UNIT text as requested */}
                    </div>
                  </div>

                  <div className={`text-right ${isFirst ? 'scale-110' : ''}`}>
                    <div className={`text-xs font-black uppercase tracking-[0.15em] bg-clip-text text-transparent bg-gradient-to-r ${rankColor} ${isFirst ? 'drop-shadow-[0_0_8px_rgba(234,179,8,0.4)]' : ''}`}>
                       {isFirst ? 'Grand Winner' : `${rank}${rank === 2 ? 'nd' : rank === 3 ? 'rd' : 'th'} Place`}
                    </div>
                  </div>
                </div>
                
                {/* Premium Sweep Effect for top ranks */}
                {rank <= 3 && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] transition-transform duration-1000 pointer-events-none"></div>
                )}
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="w-full space-y-3 mt-4">
          <button 
            onClick={onPlayAgain}
            className="w-full group relative overflow-hidden py-4 rounded-xl transition-all duration-300 active:scale-95 shadow-2xl"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-600 group-hover:scale-110 transition-transform"></div>
            <span className="relative z-10 text-white font-black uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-3">
              Start New Game <span className="text-xl group-hover:rotate-12 transition-transform">⚔️</span>
            </span>
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
          </button>
          
          <button 
            onClick={onGoHome}
            className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white font-black text-[11px] uppercase tracking-[0.3em] rounded-xl transition-all active:scale-95 flex items-center justify-center gap-3 backdrop-blur-md"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Return to Menu
          </button>
        </div>
      </div>
    </div>
  );
};
