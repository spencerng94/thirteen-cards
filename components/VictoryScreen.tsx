
import React, { useEffect, useState } from 'react';
import { Player, UserProfile } from '../types';
import { calculateLevel, getXpForLevel } from '../services/supabase';

interface VictoryScreenProps {
  players: Player[];
  myId: string;
  onPlayAgain: () => void;
  onGoHome: () => void;
  profile: UserProfile | null;
  xpGained: number;
  coinsGained: number;
  xpBonusApplied?: boolean;
}

export const VictoryScreen: React.FC<VictoryScreenProps> = ({ 
  players, 
  myId, 
  onPlayAgain, 
  onGoHome, 
  profile, 
  xpGained, 
  coinsGained,
  xpBonusApplied
}) => {
  const [animatedXp, setAnimatedXp] = useState(0);
  const [baseBarProgress, setBaseBarProgress] = useState(0);
  const [addedBarProgress, setAddedBarProgress] = useState(0);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [phase, setPhase] = useState<'intro' | 'stats' | 'ready'>('intro');
  const [displayLevel, setDisplayLevel] = useState(1);
  const [xpRemaining, setXpRemaining] = useState(0);

  const sortedPlayers = [...players].sort((a, b) => {
    const rankA = a.finishedRank || 99;
    const rankB = b.finishedRank || 99;
    return rankA - rankB;
  });

  const me = players.find(p => p.id === myId);
  const myRank = me?.finishedRank || 4;
  const isWinner = myRank === 1;
  const isRunnerUp = myRank === 2 || myRank === 3;

  useEffect(() => {
    if (!profile || xpGained <= 0) return;
    
    // 1. Calculate stats BEFORE match gains
    const totalXpAfter = profile.xp;
    const totalXpBefore = Math.max(0, totalXpAfter - xpGained);
    
    const levelBefore = calculateLevel(totalXpBefore);
    const levelAfter = calculateLevel(totalXpAfter);
    
    const xpFloorBefore = getXpForLevel(levelBefore);
    const xpCeilingBefore = getXpForLevel(levelBefore + 1);
    
    const initialPercent = Math.max(0, ((totalXpBefore - xpFloorBefore) / (xpCeilingBefore - xpFloorBefore)) * 100);
    
    // Initial display
    setBaseBarProgress(initialPercent);
    setAddedBarProgress(0);
    setDisplayLevel(levelBefore);
    setXpRemaining(xpCeilingBefore - totalXpBefore);

    // Sequence the reveal
    const introTimer = setTimeout(() => setPhase('stats'), 400);
    const readyTimer = setTimeout(() => setPhase('ready'), 2500);

    // XP Counter Animation
    const countDuration = 1500;
    const countStart = performance.now();
    const animateCount = (time: number) => {
      const elapsed = time - countStart;
      const progress = Math.min(elapsed / countDuration, 1);
      setAnimatedXp(Math.floor(progress * xpGained));
      if (progress < 1) requestAnimationFrame(animateCount);
    };
    const countTimer = setTimeout(() => requestAnimationFrame(animateCount), 800);

    // XP Bar Progression Animation
    const barAnimTimer = setTimeout(() => {
      if (levelAfter > levelBefore) {
        // Fill current bar
        setAddedBarProgress(100 - initialPercent);
        setTimeout(() => {
          setShowLevelUp(true);
          setBaseBarProgress(0);
          setAddedBarProgress(0);
          setDisplayLevel(levelAfter);
          
          const xpFloorAfter = getXpForLevel(levelAfter);
          const xpCeilingAfter = getXpForLevel(levelAfter + 1);
          const finalPercent = ((totalXpAfter - xpFloorAfter) / (xpCeilingAfter - xpFloorAfter)) * 100;
          
          setXpRemaining(xpCeilingAfter - totalXpAfter);
          setTimeout(() => {
            setAddedBarProgress(finalPercent);
          }, 100);
        }, 800);
      } else {
        const finalPercent = ((totalXpAfter - xpFloorBefore) / (xpCeilingBefore - xpFloorBefore)) * 100;
        setAddedBarProgress(Math.max(1.5, finalPercent - initialPercent));
        setXpRemaining(xpCeilingBefore - totalXpAfter);
      }
    }, 1200);

    return () => {
        clearTimeout(introTimer);
        clearTimeout(readyTimer);
        clearTimeout(countTimer);
        clearTimeout(barAnimTimer);
    };

  }, [profile?.xp, xpGained]);

  const getStatusTitle = () => {
    if (isWinner) return "Supreme Victory";
    if (myRank === 2) return "Elite Merit";
    if (myRank === 3) return "Honorable Mention";
    return "Tactical Setback";
  };

  const getMedal = (rank: number) => {
    switch(rank) {
      case 1: return '🏆';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '💩';
    }
  };

  const theme = { border: 'border-yellow-500/40', glow: 'shadow-[0_0_50px_rgba(234,179,8,0.2)]', accent: 'text-yellow-500' };

  return (
    <div className={`min-h-screen w-full relative overflow-hidden flex flex-col items-center justify-center p-4 transition-colors duration-1000 ${isWinner ? 'bg-[#030a05]' : myRank === 4 ? 'bg-[#0a0505]' : 'bg-[#05060a]'}`}>
      <div className={`absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] ${isWinner ? 'from-green-900/20 via-black to-black' : 'from-gray-900/10 via-black to-black'} pointer-events-none`}></div>
      
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {isWinner && Array.from({ length: 30 }).map((_, i) => (
              <div 
                key={i}
                className="absolute w-1.5 h-1.5 bg-yellow-400/40 rounded-full animate-[confetti_5s_linear_infinite]"
                style={{
                    left: `${Math.random() * 100}%`,
                    top: `-${Math.random() * 20}%`,
                    animationDelay: `${Math.random() * 5}s`,
                    opacity: Math.random() * 0.7,
                }}
              ></div>
          ))}
      </div>

      <div className="max-w-md w-full z-10 flex flex-col items-center gap-3">
        
        <div className="text-center space-y-1 animate-in fade-in zoom-in duration-700 slide-in-from-top-4">
          <div className="relative inline-block mb-1">
             <div className={`absolute inset-0 blur-3xl rounded-full opacity-30 ${isWinner ? 'bg-yellow-500' : 'bg-red-900'}`}></div>
             <div className={`text-6xl md:text-7xl relative z-10 drop-shadow-2xl ${isWinner ? 'animate-bounce' : 'opacity-60'}`}>
                {getMedal(myRank)}
             </div>
          </div>
          <h1 className={`text-3xl md:text-5xl font-black tracking-tighter uppercase italic leading-none transition-all duration-700 ${theme.accent}`}>
            {getStatusTitle()}
          </h1>
          <p className="text-[8px] font-black uppercase tracking-[0.6em] text-white/20">Operational Log Entry</p>
        </div>

        <div className={`w-full bg-black/60 border ${theme.border} rounded-[2rem] p-6 backdrop-blur-2xl transition-all duration-700 ${theme.glow} ${phase !== 'intro' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
           <div className="flex justify-between items-end mb-5">
              <div className="flex flex-col">
                 <span className="text-[8px] font-black text-white/40 uppercase tracking-[0.4em]">Battle Outcome</span>
                 <h2 className={`text-xl font-black uppercase tracking-tight ${theme.accent}`}>Rank #{myRank}</h2>
              </div>
              <div className="text-right">
                 {xpBonusApplied && (
                    <div className="bg-yellow-500 text-black px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-tighter animate-pulse mb-1">
                        x2 XP Bonus Active
                    </div>
                 )}
                 <p className="text-[9px] font-mono text-white/40 tracking-widest">ARENA-REWARD</p>
              </div>
           </div>

           <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/5 flex flex-col items-center group relative overflow-hidden">
                 <span className="text-xl mb-1">🎖️</span>
                 <span className="text-xl font-black text-white">+{animatedXp}</span>
                 <span className="text-[7px] font-black text-white/20 uppercase tracking-widest mt-1">XP ACQUIRED</span>
                 {xpBonusApplied && <div className="absolute top-0 right-0 w-8 h-8 bg-yellow-500/20 rounded-bl-full flex items-center justify-center text-[8px]">⭐</div>}
              </div>
              <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/5 flex flex-col items-center group relative overflow-hidden">
                 <span className="text-xl mb-1">💰</span>
                 <span className="text-xl font-black text-emerald-400">+{coinsGained}</span>
                 <span className="text-[7px] font-black text-white/20 uppercase tracking-widest mt-1">GOLD SECURED</span>
              </div>
           </div>

           <div className="space-y-2 relative">
              {showLevelUp && (
                 <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-yellow-500 text-black px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.3em] shadow-[0_0_20px_rgba(234,179,8,0.6)] animate-bounce z-20">
                    NEW LEVEL! ⚡
                 </div>
              )}
              <div className="flex justify-between items-end">
                <span className="text-[9px] font-black text-white/60 uppercase tracking-widest">Level {displayLevel}</span>
                <span className="text-[8px] font-black text-yellow-500/80 uppercase tracking-[0.15em]">{xpRemaining} XP TO NEXT RANK</span>
              </div>
              <div className="h-2.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5 shadow-inner flex">
                <div 
                    className="h-full bg-white/10 transition-all duration-[800ms] ease-out"
                    style={{ width: `${baseBarProgress}%` }}
                />
                <div 
                    className="h-full bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-300 transition-all duration-[800ms] ease-out"
                    style={{ width: `${addedBarProgress}%` }}
                >
                  <div className="w-full h-full bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.4)_50%,transparent_100%)] animate-[shimmer_2s_infinite]"></div>
                </div>
              </div>
           </div>
        </div>

        <div className={`w-full space-y-2 transition-all duration-1000 ${phase !== 'intro' ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
          {sortedPlayers.map((p, idx) => {
            const rank = idx + 1;
            const isMe = p.id === myId;
            return (
              <div 
                key={p.id}
                className={`relative p-3 flex items-center justify-between rounded-2xl border transition-all duration-500 ${isMe ? 'bg-white/[0.05] border-yellow-500/30' : 'bg-black/30 border-white/5 opacity-60'}`}
              >
                <div className="flex items-center gap-3">
                   <div className="relative">
                      <span className="text-2xl relative z-10">{p.avatar || '👤'}</span>
                      {rank === 1 && <div className="absolute -top-1.5 -right-1.5 text-[8px]">👑</div>}
                   </div>
                   <div className="flex flex-col">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${isMe ? 'text-white' : 'text-gray-400'}`}>{p.name}</span>
                      <span className="text-[6px] font-bold text-white/10 uppercase tracking-[0.3em]">{p.isBot ? 'SYSTEM AGENT' : 'COMBATANT'}</span>
                   </div>
                </div>
                <div className="flex items-center gap-3">
                   <span className="text-xl group-hover:scale-110 transition-transform">{getMedal(rank)}</span>
                   <div className="h-4 w-[1px] bg-white/5 mx-1"></div>
                   <span className={`text-[10px] font-black italic uppercase tracking-tighter ${rank === 1 ? 'text-yellow-500' : 'text-white/30'}`}>#{rank}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className={`w-full space-y-3 mt-1 transition-all duration-700 ${phase === 'ready' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <button 
            onClick={onPlayAgain}
            className="group w-full relative overflow-hidden py-4 rounded-2xl transition-all duration-300 active:scale-95 shadow-xl border border-white/10"
          >
            <div className={`absolute inset-0 bg-gradient-to-r transition-transform duration-1000 group-hover:scale-110 from-yellow-700 via-yellow-200 to-yellow-700`}></div>
            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_4s_infinite] pointer-events-none"></div>
            <span className="relative z-10 text-white font-black uppercase tracking-[0.3em] text-[10px] flex items-center justify-center gap-3">
              Deploy For Next Turn ⚔️
            </span>
          </button>
          
          <button 
            onClick={onGoHome}
            className="w-full py-3 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 text-gray-500 hover:text-white font-black text-[9px] uppercase tracking-[0.5em] rounded-2xl transition-all active:scale-95"
          >
            Withdraw to HQ
          </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes confetti { 0% { transform: translateY(0) rotate(0deg); opacity: 0.7; } 100% { transform: translateY(100vh) rotate(360deg); opacity: 0; } }
        @keyframes shimmer { 0% { background-position: -100% 0; } 100% { background-position: 100% 0; } }
      `}} />
    </div>
  );
};
