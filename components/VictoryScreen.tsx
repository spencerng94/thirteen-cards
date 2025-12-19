
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

      {/* Winner Spotlight Glow */}
      {isWinner && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl aspect-square bg-yellow-500/10 blur-[150px] animate-pulse pointer-events-none"></div>
      )}

      <div className="max-w-md w-full z-10 flex flex-col items-center gap-8">
        
        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="relative inline-block">
            {isWinner ? (
              <div className="text-8xl mb-4 drop-shadow-[0_0_30px_rgba(234,179,8,0.5)] animate-bounce">👑</div>
            ) : (
              <div className="text-8xl mb-4 grayscale opacity-50">🏁</div>
            )}
          </div>
          
          <h1 className="text-5xl font-black tracking-tighter uppercase italic">
            <span className="block text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-yellow-500 to-yellow-700 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
              Match
            </span>
            <span className="block text-white drop-shadow-lg -mt-2">
              Complete
            </span>
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500">Official Standings</p>
        </div>

        {/* Leaderboard Section */}
        <div className="w-full space-y-3">
          {sortedPlayers.map((p, idx) => {
            const rank = idx + 1;
            const isMe = p.id === myId;
            const rankColor = getRankColor(rank);

            return (
              <div 
                key={p.id}
                className={`
                  relative group overflow-hidden transition-all duration-500 rounded-2xl border
                  ${isMe ? 'scale-105 z-20 shadow-[0_0_30px_rgba(34,197,94,0.2)]' : 'scale-100 opacity-80'}
                  ${rank === 1 ? 'border-yellow-500/30' : 'border-white/5'}
                `}
              >
                {/* Glassmorphism Background */}
                <div className={`absolute inset-0 bg-black/40 backdrop-blur-xl`}></div>
                
                {/* Left Accent Bar for winners */}
                {rank <= 3 && (
                   <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${rankColor}`}></div>
                )}

                <div className="relative p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative flex items-center justify-center">
                      <div className="text-3xl filter drop-shadow-md group-hover:scale-110 transition-transform">{p.avatar || '😊'}</div>
                      <div className="absolute -top-2 -left-2 text-xl">{getMedal(rank)}</div>
                    </div>
                    
                    <div className="flex flex-col">
                      <span className={`font-black text-sm uppercase tracking-widest ${isMe ? 'text-green-400' : 'text-gray-200'}`}>
                        {p.name} {isMe && '(YOU)'}
                      </span>
                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter">
                        {p.isBot ? 'CPU AI UNIT' : 'PLAYER UNIT'}
                      </span>
                    </div>
                  </div>

                  <div className={`text-right ${rank === 1 ? 'animate-pulse' : ''}`}>
                    <div className={`text-xs font-black uppercase tracking-widest bg-clip-text text-transparent bg-gradient-to-r ${rankColor}`}>
                       {rank === 1 ? 'WINNER' : `${rank}${rank === 2 ? 'nd' : rank === 3 ? 'rd' : 'th'} PLACE`}
                    </div>
                  </div>
                </div>
                
                {/* Shine effect for winner */}
                {rank === 1 && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
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
            <span className="relative z-10 text-white font-black uppercase tracking-widest flex items-center justify-center gap-2">
              Play Again <span className="text-xl">⚔️</span>
            </span>
          </button>
          
          <button 
            onClick={onGoHome}
            className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white font-black text-[10px] uppercase tracking-[0.3em] rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Return to Menu
          </button>
        </div>
      </div>
    </div>
  );
};
