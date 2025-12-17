import React from 'react';
import { Player } from '../types';
import { AdBanner } from './AdBanner';

interface VictoryScreenProps {
  players: Player[]; // Full list of players to show leaderboard
  myId: string;
  onPlayAgain: () => void;
  onGoHome: () => void;
}

export const VictoryScreen: React.FC<VictoryScreenProps> = ({ players, myId, onPlayAgain, onGoHome }) => {
  // Sort players by finishedRank. 
  // Note: finishedRank might be null for the loser if server logic didn't set it explicitly before finish,
  // but logic should handle it. If null, treat as last.
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-32 h-32 bg-yellow-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-700"></div>
      </div>

      <div className="relative z-10 max-w-lg w-full bg-white/10 backdrop-blur-lg border border-white/20 p-8 rounded-3xl shadow-2xl text-center flex flex-col gap-6 transform transition-all duration-500">
        
        <div>
            {isWinner ? (
                <div className="text-7xl mb-2 animate-bounce">👑</div>
            ) : (
                <div className="text-7xl mb-2 grayscale opacity-80">🏁</div>
            )}
        </div>

        <div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-200 mb-2 filter drop-shadow-lg">
                MATCH COMPLETE
            </h1>
            <p className="text-gray-300 font-light uppercase tracking-widest text-sm">
                Final Standings
            </p>
        </div>

        {/* Leaderboard */}
        <div className="bg-black/30 rounded-xl border border-white/5 overflow-hidden">
            {sortedPlayers.map((p, idx) => (
                <div 
                    key={p.id} 
                    className={`flex items-center justify-between p-4 border-b border-white/5 last:border-0 ${p.id === myId ? 'bg-white/10' : ''}`}
                >
                    <div className="flex items-center gap-4">
                        <span className="text-2xl">{getMedal(idx + 1)}</span>
                        <div className="flex flex-col items-start">
                            <span className={`font-bold ${p.id === myId ? 'text-green-400' : 'text-white'}`}>
                                {p.name} {p.id === myId && '(You)'}
                            </span>
                        </div>
                    </div>
                    <div className="text-xs font-mono text-gray-400 uppercase tracking-widest">
                        {idx === 0 ? 'Winner' : `${idx + 1} Place`}
                    </div>
                </div>
            ))}
        </div>

        <AdBanner />

        <div className="flex flex-col gap-3">
          <button 
            onClick={onPlayAgain}
            className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-green-500/50 transition-all active:scale-95"
          >
            Play Again
          </button>
          
          <button 
            onClick={onGoHome}
            className="w-full py-4 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white font-semibold rounded-xl border border-white/10 transition-all active:scale-95"
          >
            Return to Menu
          </button>
        </div>
      </div>
    </div>
  );
};