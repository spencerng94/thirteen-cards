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
    <div className="min-h-screen w-full bg-[#0a0f0d] relative overflow-hidden flex flex-col items-center justify-center p-4">
      {/* Dynamic Background Gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-green-900/10 via-slate-950 to-black pointer-events-none"></div>
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

      {/* Victory Confetti Effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 30 }).map((_, i) => (
              <div 
                key={i}
                className="absolute w-2 h-2 bg-yellow-400/60 rounded-sm animate-[confetti_4s_linear_infinite]"
                style={{
                    left: `${Math.random() * 100}%`,
                    top: `-${Math.random() * 20}%`,
                    animationDelay: `${Math.random() * 4}s`,
                    opacity: Math.random(),
                    transform: `rotate(${Math.random() * 360}deg)`
                }}
              ></div>
          ))}
      </div>

      {/* extreme Winner Spotlight Glow */}
      {isWinner && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-5xl aspect-square bg-yellow-500/5 blur-[180px] animate-pulse pointer-events-none"></div>
      )}

      <div className="max-w-md w-full z-10 flex flex-col items-center gap-8">
        
        {/* Header Section */}
        <div className="text-center space-y-2 animate-[slideDown_0.8s_ease-out_forwards]">
          <div className="relative inline-block mb-4">
            <div className={`text-8xl md:text-9xl drop-shadow-[0_0_45px_rgba(234,179,8,0.5)] ${isWinner ? 'animate-bounce' : ''}`}>
              👑
            </div>
            {isWinner && (
              <div className="absolute -top-4 -right-4 w-12 h-12 bg-white/20 blur-3xl rounded-full animate-ping"></div>
            )}
          </div>
          
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter uppercase italic leading-none">
            <span className="block text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-yellow-500 to-yellow-700 drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]">
              {isWinner ? 'Victory' : 'Match'}
            </span>
            <span className="block text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] -mt-2">
              Report
            </span>
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-yellow-500/50 flex items-center justify-center gap-3">
            <span className="w-6 h-[1px] bg-yellow-500/20"></span>
            Final Standings
            <span className="w-6 h-[1px] bg-yellow-500/20"></span>
          </p>
        </div>

        {/* Leaderboard Section with Staggered Entries */}
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
                  relative group overflow-hidden opacity-0 animate-[cardReveal_0.6s_ease-out_forwards] rounded-[1.5rem] border
                  ${isMe ? 'scale-105 z-20 shadow-[0_20px_50px_rgba(0,0,0,0.6)]' : 'scale-100 opacity-90'}
                  ${isFirst ? 'border-yellow-500/40 shadow-[0_0_40px_rgba(234,179,8,0.3)]' : 'border-white/5 shadow-xl'}
                `}
                style={{ animationDelay: `${idx * 150}ms` }}
              >
                {/* Background Aesthetics */}
                <div className={`absolute inset-0 bg-black/70 backdrop-blur-3xl`}></div>
                {isFirst && <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-transparent to-transparent"></div>}
                
                {/* Vertical Accent */}
                {rank <= 3 && (
                   <div className={`absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b ${rankColor}`}></div>
                )}

                <div className="relative p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative flex items-center justify-center">
                      <div className="text-4xl md:text-5xl filter drop-shadow-md group-hover:scale-110 transition-transform duration-500">{p.avatar || '😊'}</div>
                      <div className="absolute -top-3 -left-3 text-2xl filter drop-shadow-[0_5px_10px_rgba(0,0,0,0.5)] animate-pulse">{getMedal(rank)}</div>
                    </div>
                    
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                          <span className={`font-black text-sm md:text-base uppercase tracking-widest ${isMe ? 'text-green-400' : 'text-gray-100'}`}>
                            {p.name}
                          </span>
                          {isMe && <span className="bg-green-500/20 text-green-400 text-[7px] px-1.5 py-0.5 rounded font-black border border-green-500/20">YOU</span>}
                      </div>
                      <span className="text-[8px] font-bold text-white/20 uppercase tracking-[0.3em]">Player Identity</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end justify-center relative">
                    {/* Pulsating Text Glow for Champion */}
                    <div className={`
                      text-[10px] font-black uppercase tracking-widest bg-clip-text text-transparent bg-gradient-to-r ${rankColor}
                      ${isFirst ? 'animate-[textGlow_2s_ease-in-out_infinite]' : ''}
                    `}>
                       {isFirst ? 'Winner' : `${rank}${rank === 2 ? 'nd' : rank === 3 ? 'rd' : 'th'} Place`}
                    </div>
                    
                    {/* Radiant Background Aura for Champion Rank */}
                    {isFirst && (
                        <div className="absolute inset-0 -z-10 bg-yellow-500/20 blur-xl scale-150 animate-pulse rounded-full pointer-events-none"></div>
                    )}
                  </div>
                </div>
                
                {/* Sweep Shine Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none"></div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="w-full space-y-3 mt-4 opacity-0 animate-[fadeIn_0.5s_ease-out_1s_forwards]">
          <button 
            onClick={onPlayAgain}
            className="group w-full relative overflow-hidden py-5 rounded-2xl transition-all duration-300 active:scale-95 shadow-[0_20px_40px_rgba(0,0,0,0.5)] border border-green-400/20"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-green-700 via-green-500 to-green-700 group-hover:scale-110 transition-transform duration-700"></div>
            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_3s_infinite] pointer-events-none"></div>
            
            <span className="relative z-10 text-white font-black uppercase tracking-[0.3em] text-xs md:text-sm flex items-center justify-center gap-4">
              Queue Up <span className="text-2xl group-hover:rotate-12 group-hover:scale-125 transition-transform duration-300">⚔️</span>
            </span>
          </button>
          
          <button 
            onClick={onGoHome}
            className="w-full py-4 bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-gray-500 hover:text-white font-black text-[10px] uppercase tracking-[0.4em] rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-3 backdrop-blur-xl"
          >
            Return to HQ
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes confetti {
            0% { transform: translateY(0) rotate(0deg); }
            100% { transform: translateY(120vh) rotate(720deg); }
        }
        @keyframes cardReveal {
            from { opacity: 0; transform: translateY(30px) scale(0.9); filter: blur(10px); }
            to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes slideDown {
            from { opacity: 0; transform: translateY(-50px); filter: blur(15px); }
            to { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
            0% { background-position: -100% 0; }
            100% { background-position: 100% 0; }
        }
        @keyframes textGlow {
            0%, 100% { filter: drop-shadow(0 0 2px rgba(251, 191, 36, 0.4)); transform: scale(1); }
            50% { filter: drop-shadow(0 0 10px rgba(251, 191, 36, 0.8)); transform: scale(1.05); }
        }
      `}} />
    </div>
  );
};