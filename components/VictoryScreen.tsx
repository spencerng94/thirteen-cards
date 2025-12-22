
import React, { useEffect, useState, useMemo } from 'react';
import { Player, UserProfile } from '../types';
import { calculateLevel, getXpForLevel } from '../services/supabase';
import { audioService } from '../services/audio';

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

const Particle: React.FC<{ color: string }> = ({ color }) => {
    const style = useMemo(() => ({
        '--tx': `${(Math.random() - 0.5) * 800}px`,
        '--ty': `${(Math.random() - 0.5) * 800}px`,
        '--rot': `${Math.random() * 720}deg`,
        left: '50%',
        top: '50%',
        animationDelay: `${Math.random() * 2}s`,
        backgroundColor: color,
    } as React.CSSProperties), [color]);

    return <div className="absolute w-1.5 h-1.5 rounded-full opacity-0 animate-victory-particle pointer-events-none" style={style}></div>;
};

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
  const [animatedCoins, setAnimatedCoins] = useState(0);
  const [baseBarProgress, setBaseBarProgress] = useState(0);
  const [addedBarProgress, setAddedBarProgress] = useState(0);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [phase, setPhase] = useState<'intro' | 'rewards' | 'ready'>('intro');
  const [displayLevel, setDisplayLevel] = useState(1);
  const [xpRemaining, setXpRemaining] = useState(0);

  const sortedPlayers = useMemo(() => [...players].sort((a, b) => {
    const rankA = a.finishedRank || 99;
    const rankB = b.finishedRank || 99;
    return rankA - rankB;
  }), [players]);

  const me = players.find(p => p.id === myId);
  const myRank = me?.finishedRank || 4;
  const isWinner = myRank === 1;

  useEffect(() => {
    audioService.playVictory();
    
    if (!profile) return;
    
    const totalXpAfter = profile.xp;
    const totalXpBefore = Math.max(0, totalXpAfter - xpGained);
    const levelBefore = calculateLevel(totalXpBefore);
    const levelAfter = calculateLevel(totalXpAfter);
    const xpFloorBefore = getXpForLevel(levelBefore);
    const xpCeilingBefore = getXpForLevel(levelBefore + 1);
    const initialPercent = Math.max(0, ((totalXpBefore - xpFloorBefore) / (xpCeilingBefore - xpFloorBefore)) * 100);
    
    setBaseBarProgress(initialPercent);
    setDisplayLevel(levelBefore);
    setXpRemaining(xpCeilingBefore - totalXpBefore);

    // Timeline Sequence
    const t1 = setTimeout(() => setPhase('rewards'), 800);
    const t2 = setTimeout(() => setPhase('ready'), 3500);

    // Counters
    const duration = 1200;
    const start = performance.now();
    const animate = (time: number) => {
      const elapsed = time - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setAnimatedXp(Math.floor(eased * xpGained));
      setAnimatedCoins(Math.floor(eased * coinsGained));
      if (progress < 1) requestAnimationFrame(animate);
    };
    const t3 = setTimeout(() => requestAnimationFrame(animate), 1000);

    // XP Bar
    const t4 = setTimeout(() => {
      if (levelAfter > levelBefore) {
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
          setTimeout(() => setAddedBarProgress(finalPercent), 100);
        }, 800);
      } else {
        const finalPercent = ((totalXpAfter - xpFloorBefore) / (xpCeilingBefore - xpFloorBefore)) * 100;
        setAddedBarProgress(Math.max(2, finalPercent - initialPercent));
        setXpRemaining(xpCeilingBefore - totalXpAfter);
      }
    }, 1800);

    return () => {
        [t1, t2, t3, t4].forEach(clearTimeout);
    };
  }, [profile?.xp, xpGained, coinsGained]);

  const getRankConfig = (rank: number) => {
    switch(rank) {
      case 1: return { title: "SUPREME VICTORY", medal: "🏆", color: "text-yellow-400", bg: "from-yellow-900/40" };
      case 2: return { title: "ELITE MERIT", medal: "🥈", color: "text-gray-200", bg: "from-gray-800/40" };
      case 3: return { title: "DISTINGUISHED", medal: "🥉", color: "text-orange-400", bg: "from-orange-900/40" };
      default: return { title: "TACTICAL SETBACK", medal: "⚔️", color: "text-red-500", bg: "from-red-950/40" };
    }
  };

  const config = getRankConfig(myRank);

  return (
    <div className={`fixed inset-0 z-[200] flex flex-col items-center justify-center p-6 bg-black overflow-hidden select-none`}>
      {/* Background Layers */}
      <div className={`absolute inset-0 bg-gradient-to-b ${config.bg} to-black transition-all duration-1000`}></div>
      <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle at center, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      
      {/* Dynamic Particle Burst */}
      {isWinner && Array.from({ length: 60 }).map((_, i) => (
          <Particle key={i} color={i % 2 === 0 ? '#fbbf24' : '#fff7ed'} />
      ))}

      <div className="relative z-10 w-full max-w-xl flex flex-col items-center gap-8">
        
        {/* Title Block */}
        <div className="text-center space-y-2 animate-in fade-in zoom-in duration-1000 slide-in-from-top-12">
            <div className="relative inline-block mb-6">
                <div className={`absolute inset-0 blur-[60px] rounded-full opacity-40 animate-pulse ${isWinner ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                <div className={`text-8xl md:text-9xl relative z-10 drop-shadow-[0_0_30px_rgba(251,191,36,0.4)] ${isWinner ? 'animate-victory-bounce' : 'opacity-80 scale-90'}`}>
                    {config.medal}
                </div>
            </div>
            <h1 className={`text-5xl md:text-7xl font-black italic tracking-tighter uppercase leading-none transition-all duration-700 ${config.color} drop-shadow-2xl`}>
                {config.title}
            </h1>
            <div className="h-[2px] w-32 bg-gradient-to-r from-transparent via-white/20 to-transparent mx-auto mt-4"></div>
            <p className="text-[10px] font-black uppercase tracking-[0.8em] text-white/30 mt-2">End of Match Protocol</p>
        </div>

        {/* Reward Reveal Area */}
        <div className={`w-full grid grid-cols-1 gap-6 transition-all duration-700 ${phase !== 'intro' ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`}>
            
            {/* Main Stats Card */}
            <div className="bg-black/60 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-8 shadow-[0_40px_80px_rgba(0,0,0,0.8)] relative overflow-hidden group">
                {/* Gloss effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-transparent pointer-events-none"></div>
                
                <div className="flex justify-between items-start mb-8">
                    <div className="space-y-1">
                        <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.4em]">Combatant Rank</span>
                        <h2 className={`text-3xl font-black italic ${config.color} tracking-tight`}>#{myRank} PLACE</h2>
                    </div>
                    <div className="text-right">
                        {xpBonusApplied && (
                            <div className="bg-yellow-500 text-black px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-tighter shadow-lg animate-pulse mb-1">
                                x2 XP Multiplier
                            </div>
                        )}
                        <p className="text-[10px] font-mono text-white/20">SEQ_ARENA_{Math.floor(Math.random()*9000)+1000}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-white/[0.03] p-6 rounded-[2rem] border border-white/5 flex flex-col items-center group/item hover:bg-white/[0.05] transition-all">
                        <span className="text-3xl mb-2 group-hover/item:scale-110 transition-transform">🎖️</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black text-white">{animatedXp}</span>
                            <span className="text-xs font-black text-white/20 uppercase tracking-widest">XP</span>
                        </div>
                    </div>
                    <div className="bg-white/[0.03] p-6 rounded-[2rem] border border-white/5 flex flex-col items-center group/item hover:bg-white/[0.05] transition-all">
                        <span className="text-3xl mb-2 group-hover/item:scale-110 transition-transform">💰</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black text-emerald-400">{animatedCoins}</span>
                            <span className="text-xs font-black text-emerald-900 uppercase tracking-widest">GOLD</span>
                        </div>
                    </div>
                </div>

                {/* Level Progress */}
                <div className="space-y-3 relative">
                    {showLevelUp && (
                        <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-yellow-500 text-black px-6 py-2 rounded-full text-xs font-black uppercase tracking-[0.3em] shadow-[0_0_40px_rgba(234,179,8,0.6)] animate-victory-pop z-20">
                            LEVEL UP! ⚡
                        </div>
                    )}
                    <div className="flex justify-between items-end px-1">
                        <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Mastery Level {displayLevel}</span>
                        <span className="text-[9px] font-black text-yellow-500/80 uppercase tracking-widest italic">{xpRemaining} XP TO ASCEND</span>
                    </div>
                    <div className="h-3 w-full bg-black/50 rounded-full overflow-hidden border border-white/5 shadow-inner p-[1px]">
                        <div className="w-full h-full rounded-full overflow-hidden flex">
                            <div className="h-full bg-white/5 transition-all duration-[1000ms] ease-out" style={{ width: `${baseBarProgress}%` }} />
                            <div className="h-full bg-gradient-to-r from-yellow-600 via-yellow-300 to-white transition-all duration-[1000ms] ease-out" style={{ width: `${addedBarProgress}%` }}>
                                <div className="w-full h-full bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.4)_50%,transparent_100%)] animate-[shimmer_1.5s_infinite]"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Players List */}
            <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 transition-all duration-700 ${phase === 'ready' ? 'opacity-100' : 'opacity-0'}`}>
                {sortedPlayers.map((p, idx) => {
                    const isMe = p.id === myId;
                    const rank = idx + 1;
                    return (
                        <div key={p.id} className={`p-4 rounded-3xl border flex flex-col items-center gap-2 transition-all ${isMe ? 'bg-white/[0.08] border-yellow-500/40 shadow-xl' : 'bg-black/40 border-white/5 opacity-60'}`}>
                            <div className="relative">
                                <span className="text-3xl">{p.avatar || '👤'}</span>
                                {rank === 1 && <span className="absolute -top-1 -right-1 text-xs">👑</span>}
                            </div>
                            <span className={`text-[9px] font-black uppercase tracking-widest truncate w-full text-center ${isMe ? 'text-white' : 'text-gray-500'}`}>{p.name}</span>
                            <span className={`text-[10px] font-black italic ${rank === 1 ? 'text-yellow-500' : 'text-white/20'}`}>#{rank}</span>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Action Bar */}
        <div className={`w-full space-y-4 transition-all duration-700 ${phase === 'ready' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <button 
                onClick={onPlayAgain}
                className="group w-full relative overflow-hidden py-6 rounded-[2rem] transition-all duration-300 active:scale-95 shadow-[0_20px_50px_rgba(0,0,0,0.4)] border border-white/10"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-700 via-green-500 to-emerald-700 transition-transform duration-1000 group-hover:scale-110"></div>
                <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,0.3)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_3s_infinite] pointer-events-none"></div>
                <span className="relative z-10 text-white font-black uppercase tracking-[0.5em] text-xs flex items-center justify-center gap-4 drop-shadow-lg">
                    Re-Deploy Next Arena ⚔️
                </span>
            </button>
            
            <button 
                onClick={onGoHome}
                className="w-full py-4 bg-white/[0.02] hover:bg-white/[0.08] border border-white/5 text-gray-500 hover:text-white font-black text-[10px] uppercase tracking-[0.6em] rounded-[2rem] transition-all active:scale-95"
            >
                Withdraw to HQ
            </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes victoryBounce {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-20px) scale(1.05); }
        }
        @keyframes victoryParticle {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
          20% { opacity: 1; }
          100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(1) rotate(var(--rot)); opacity: 0; }
        }
        @keyframes victoryPop {
          0% { transform: translate(-50%, 0) scale(0.5); opacity: 0; }
          60% { transform: translate(-50%, 0) scale(1.1); opacity: 1; }
          100% { transform: translate(-50%, 0) scale(1); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-victory-bounce { animation: victoryBounce 3s ease-in-out infinite; }
        .animate-victory-particle { animation: victoryParticle 4s ease-out infinite; }
        .animate-victory-pop { animation: victoryPop 0.5s cubic-bezier(0.17, 0.67, 0.83, 0.67) forwards; }
      `}} />
    </div>
  );
};
