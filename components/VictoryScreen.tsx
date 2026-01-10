import React, { useEffect, useState, useMemo } from 'react';
import { Player, UserProfile, Emote } from '../types';
import { calculateLevel, getXpForLevel, fetchEmotes, processAdReward, updateProfileSettings, submitVibeCheck } from '../services/supabase';
import { audioService } from '../services/audio';
import { VisualEmote } from './VisualEmote';
import { useFinisher } from '../hooks/useFinisher';
import { ShibaSlamFinisher } from './ShibaSlamFinisher';
import { EtherealBladeFinisher } from './EtherealBladeFinisher';
import { SaltShakeFinisher } from './SaltShakeFinisher';
import { SanctumSnapFinisher } from './SanctumSnapFinisher';
import { SeductiveFinishFinisher } from './SeductiveFinishFinisher';
import { KissMyShibaFinisher } from './KissMyShibaFinisher';
import { TooFunnyFinisher } from './TooFunnyFinisher';
import { adService, AdPlacement } from '../services/adService';
import { GemRain } from './GemRain';
import { CurrencyIcon } from './Store';
import { Toast } from './Toast';

interface VictoryScreenProps {
  players: Player[];
  myId: string;
  onPlayAgain: () => void;
  onGoHome: () => void;
  profile: UserProfile | null;
  xpGained: number;
  coinsGained: number;
  xpBonusApplied?: boolean;
  totalXpAfter?: number;
  speedBonus?: { gold: number; xp: number };
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
  xpBonusApplied,
  totalXpAfter: explicitTotalXpAfter,
  speedBonus
}) => {
  const [animatedXp, setAnimatedXp] = useState(0);
  const [animatedCoins, setAnimatedCoins] = useState(0);
  const [baseBarProgress, setBaseBarProgress] = useState(0);
  const [addedBarProgress, setAddedBarProgress] = useState(0);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [phase, setPhase] = useState<'intro' | 'rewards' | 'ready'>('intro');
  const [displayLevel, setDisplayLevel] = useState(1);
  const [xpRemaining, setXpRemaining] = useState(0);
  const [remoteEmotes, setRemoteEmotes] = useState<Emote[]>([]);
  const [finisherComplete, setFinisherComplete] = useState(false);
  const [adState, setAdState] = useState<'idle' | 'loading' | 'showing' | 'rewarded' | 'error'>('idle');
  const [adRewardChoice, setAdRewardChoice] = useState<'gems' | 'gold' | null>(null);
  const [showGemRain, setShowGemRain] = useState(false);
  const [showFinisherQuestion, setShowFinisherQuestion] = useState(false);
  const [vibeSubmitted, setVibeSubmitted] = useState(false);
  const [showWarningToast, setShowWarningToast] = useState(false);

  const sortedPlayers = useMemo(() => [...players].sort((a, b) => {
    const rankA = a.finishedRank || 99;
    const rankB = b.finishedRank || 99;
    return rankA - rankB;
  }), [players]);

  const me = players.find(p => p.id === myId);
  const myRank = me?.finishedRank || 4;
  const isWinner = myRank === 1;

  // Finisher system
  const { shouldShowFinisher, finisherData, loadEquippedFinisher } = useFinisher(myId, profile);
  
  useEffect(() => {
    if (isWinner && profile) {
      loadEquippedFinisher();
    }
  }, [isWinner, profile, loadEquippedFinisher]);

  useEffect(() => {
    fetchEmotes().then(setRemoteEmotes);
  }, []);

  useEffect(() => {
    const unsubscribe = adService.onStateChange('victory', setAdState);
    return unsubscribe;
  }, []);

  const handleAdReward = async (choice: 'gems' | 'gold') => {
    if (!profile || adState !== 'idle') return;
    
    setAdRewardChoice(choice);
    const placement: AdPlacement = 'victory';
    
    try {
      await adService.showRewardedAd(
        placement,
        async (amount) => {
          // SECURITY: Only called when onUserEarnedReward fires
          if (choice === 'gems') {
            const result = await processAdReward(profile.id, amount);
            if (result.success) {
              audioService.playPurchase();
              setShowGemRain(true);
            }
          } else {
            // Double gold
            const updates: Partial<UserProfile> = {
              coins: (profile.coins || 0) + coinsGained
            };
            await updateProfileSettings(profile.id, updates);
            audioService.playPurchase();
          }
        },
        () => {
          // Early close callback - show warning toast
          setShowWarningToast(true);
        }
      );
    } catch (error: any) {
      console.error('Ad error:', error);
      // Check if ad was closed early
      if (adService.wasAdClosedEarly()) {
        setShowWarningToast(true);
      }
    }
  };

  const isAdAvailable = adService.isAdAvailable('victory');
  const isAdLoaded = adService.isLoaded();

  useEffect(() => {
    audioService.playVictory();
    
    // Determine the XP values for animation
    const finalXp = explicitTotalXpAfter !== undefined ? explicitTotalXpAfter : (profile?.xp || 0);
    const startXp = Math.max(0, finalXp - xpGained);
    
    const levelBefore = calculateLevel(startXp);
    const levelAfter = calculateLevel(finalXp);
    
    const xpFloorBefore = getXpForLevel(levelBefore);
    const xpCeilingBefore = getXpForLevel(levelBefore + 1);
    
    // Defensive check: ensure startXp is at least the floor of current level (fixes legacy user issues)
    const safeStartXp = Math.max(xpFloorBefore, startXp);
    const rangeBefore = Math.max(1, xpCeilingBefore - xpFloorBefore);
    
    // Initial progress % within the "level before" range
    const initialPercent = Math.min(100, Math.max(0, ((safeStartXp - xpFloorBefore) / rangeBefore) * 100));
    
    setBaseBarProgress(initialPercent);
    setDisplayLevel(levelBefore);
    setXpRemaining(xpCeilingBefore - startXp);

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

    // XP Bar Progression Animation
    const t4 = setTimeout(() => {
      if (levelAfter > levelBefore) {
        // Handle Level Up Animation
        setAddedBarProgress(100 - initialPercent);
        setTimeout(() => {
          setShowLevelUp(true);
          setBaseBarProgress(0);
          setAddedBarProgress(0);
          setDisplayLevel(levelAfter);
          const xpFloorAfter = getXpForLevel(levelAfter);
          const xpCeilingAfter = getXpForLevel(levelAfter + 1);
          // Defensive check: ensure finalXp is at least the floor of current level
          const safeFinalXp = Math.max(xpFloorAfter, finalXp);
          const rangeAfter = Math.max(1, xpCeilingAfter - xpFloorAfter);
          const finalPercent = Math.min(100, Math.max(0, ((safeFinalXp - xpFloorAfter) / rangeAfter) * 100));
          setXpRemaining(Math.max(0, xpCeilingAfter - safeFinalXp));
          setTimeout(() => setAddedBarProgress(finalPercent), 100);
        }, 800);
      } else {
        // Standard progression within level
        // Defensive check: ensure finalXp is at least the floor of current level
        const safeFinalXp = Math.max(xpFloorBefore, finalXp);
        const range = Math.max(1, xpCeilingBefore - xpFloorBefore);
        const finalPercent = Math.min(100, Math.max(0, ((safeFinalXp - xpFloorBefore) / range) * 100));
        setAddedBarProgress(Math.max(2, finalPercent - initialPercent));
        setXpRemaining(Math.max(0, xpCeilingBefore - safeFinalXp));
      }
    }, 1800);

    return () => {
        [t1, t2, t3, t4].forEach(clearTimeout);
    };
  }, [profile?.xp, xpGained, coinsGained, explicitTotalXpAfter]);

  const getRankConfig = (rank: number) => {
    switch(rank) {
      case 1: return { title: "SUPREME VICTORY", medal: "🥇", color: "text-yellow-400", bg: "from-yellow-900/40" };
      case 2: return { title: "ELITE MERIT", medal: "🥈", color: "text-gray-200", bg: "from-gray-800/40" };
      case 3: return { title: "DISTINGUISHED", medal: "🥉", color: "text-orange-400", bg: "from-orange-900/40" };
      default: return { title: "TACTICAL SETBACK", medal: "💩", color: "text-red-500", bg: "from-red-950/40" };
    }
  };

  const config = getRankConfig(myRank);

  return (
    <>
      {/* Finisher Animation - Show before main screen if winner has equipped finisher */}
      {isWinner && shouldShowFinisher && finisherData && !finisherComplete && (
        <>
          {finisherData.animation_key === 'shiba_slam' && (
            <ShibaSlamFinisher 
              onComplete={() => setFinisherComplete(true)}
              winnerName={me?.name || 'GUEST'}
            />
          )}
          {finisherData.animation_key === 'ethereal_blade' && (
            <EtherealBladeFinisher 
              onComplete={() => setFinisherComplete(true)}
              winnerName={me?.name || 'GUEST'}
            />
          )}
          {finisherData.animation_key === 'salt_shaker' && (
            <SaltShakeFinisher 
              onComplete={() => setFinisherComplete(true)}
              losingPlayers={sortedPlayers
                .filter(p => p.finishedRank && p.finishedRank > 1)
                .slice(0, 3)
                .map((p, idx) => ({
                  id: p.id,
                  position: (['top', 'left', 'right'] as const)[idx] || 'top'
                }))}
              winnerName={me?.name || 'GUEST'}
            />
          )}
          {finisherData.animation_key === 'sanctum_snap' && (
            <SanctumSnapFinisher 
              onComplete={() => setFinisherComplete(true)}
              losingPlayers={sortedPlayers
                .filter(p => p.finishedRank && p.finishedRank > 1)
                .slice(0, 3)
                .map((p, idx) => ({
                  id: p.id,
                  position: (['top', 'left', 'right'] as const)[idx] || 'top'
                }))}
              winnerName={me?.name || 'GUEST'}
            />
          )}
          {finisherData.animation_key === 'seductive_finish' && (
            <SeductiveFinishFinisher 
              onComplete={() => setFinisherComplete(true)}
              losingPlayers={sortedPlayers
                .filter(p => p.finishedRank && p.finishedRank > 1)
                .slice(0, 3)
                .map((p, idx) => ({
                  id: p.id,
                  position: (['top', 'left', 'right'] as const)[idx] || 'top'
                }))}
              winnerName={me?.name || 'GUEST'}
            />
          )}
          {finisherData.animation_key === 'kiss_my_shiba' && (
            <KissMyShibaFinisher 
              onComplete={() => setFinisherComplete(true)}
              winnerName={me?.name || 'GUEST'}
            />
          )}
          {finisherData.animation_key === 'too_funny' && (
            <TooFunnyFinisher 
              onComplete={() => setFinisherComplete(true)}
              winnerName={me?.name || 'GUEST'}
            />
          )}
        </>
      )}
      
      <div className={`fixed inset-0 z-[200] flex flex-col items-center p-6 bg-black overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent select-none ${!finisherComplete && isWinner && shouldShowFinisher ? 'opacity-0 pointer-events-none' : ''}`}>
      {/* Background Layers */}
      <div className={`fixed inset-0 bg-gradient-to-b ${config.bg} to-black transition-all duration-1000`}></div>
      <div className="fixed inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle at center, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      
      {/* Dynamic Particle Burst */}
      {isWinner && Array.from({ length: 60 }).map((_, i) => (
          <Particle key={i} color={i % 2 === 0 ? '#fbbf24' : '#fff7ed'} />
      ))}

      <div className="relative z-10 w-full max-w-xl flex flex-col items-center gap-8 py-12 md:py-24">
        
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
        <div className={`w-full flex flex-col gap-6 transition-all duration-700 ${phase !== 'intro' ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`}>
            
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
                        <span className="text-3xl mb-2 group/item:scale-110 transition-transform">🎖️</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black text-white">{animatedXp}</span>
                            <span className="text-xs font-black text-white/20 uppercase tracking-widest">XP</span>
                        </div>
                    </div>
                    <div className="bg-white/[0.03] p-6 rounded-[2rem] border border-white/5 flex flex-col items-center group/item hover:bg-white/[0.05] transition-all">
                        <span className="text-3xl mb-2 group/item:scale-110 transition-transform">💰</span>
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
                                <div className="w-full h-full bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.2)_50%,transparent_100%)] animate-[shimmer_1.5s_infinite]"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Speed Bonuses Breakdown */}
            {speedBonus && (speedBonus.gold > 0 || speedBonus.xp > 0) && (
                <div className={`bg-gradient-to-br from-yellow-900/20 via-orange-900/15 to-yellow-900/20 backdrop-blur-xl border-2 border-yellow-500/30 rounded-[2rem] p-6 shadow-[0_0_40px_rgba(234,179,8,0.3)] transition-all duration-700 ${phase === 'ready' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                    <div className="flex items-center gap-3 mb-4">
                        <span className="text-2xl">⚡</span>
                        <h3 className="text-lg font-black text-yellow-400 uppercase tracking-wider">Speed Bonuses</h3>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between bg-black/40 px-4 py-3 rounded-xl border border-yellow-500/20">
                            <div className="flex items-center gap-2">
                                <span className="text-xl">💰</span>
                                <span className="text-sm font-bold text-white/80">Speed Gold</span>
                            </div>
                            <span className="text-lg font-black text-yellow-400">+{speedBonus.gold}</span>
                        </div>
                        <div className="flex items-center justify-between bg-black/40 px-4 py-3 rounded-xl border border-blue-500/20">
                            <div className="flex items-center gap-2">
                                <span className="text-xl">⭐</span>
                                <span className="text-sm font-bold text-white/80">Speed XP</span>
                            </div>
                            <span className="text-lg font-black text-blue-400">+{speedBonus.xp}</span>
                        </div>
                    </div>
                    <p className="text-[10px] text-white/50 text-center mt-4 italic">Rewards for quick moves during the match</p>
                </div>
            )}

            {/* Players List */}
            <div className={`flex flex-col gap-3 w-full transition-all duration-700 ${phase === 'ready' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                {sortedPlayers.map((p, idx) => {
                    const isMe = p.id === myId;
                    const rank = p.finishedRank || idx + 1;
                    const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '💩';
                    const rankColor = rank === 1 ? 'text-yellow-400' : rank === 2 ? 'text-gray-300' : rank === 3 ? 'text-orange-400' : 'text-gray-500';
                    const isVictor = rank === 1;
                    
                    return (
                        <div key={p.id} className={`group relative flex items-center gap-5 p-4 rounded-[2rem] border transition-all duration-500 overflow-hidden ${isVictor ? 'bg-yellow-500/10 border-yellow-500/40 shadow-[0_0_50px_rgba(234,179,8,0.4)] ring-2 ring-yellow-400/20' : isMe ? 'bg-white/[0.08] border-white/20 shadow-lg' : 'bg-black/40 border-white/5 opacity-70'}`}>
                            {isVictor && (
                                <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/0 via-yellow-500/10 to-yellow-500/0 animate-[winnerGlow_4s_infinite_linear]"></div>
                            )}

                            <div className={`w-12 h-12 rounded-2xl bg-black/40 flex items-center justify-center text-2xl filter drop-shadow-sm ${rankColor} font-black italic`}>
                                {rankEmoji}
                            </div>

                            <div className="relative">
                                {isVictor && (
                                    <div className="absolute inset-0 bg-yellow-500/30 blur-2xl rounded-full scale-150 animate-pulse"></div>
                                )}
                                <div className="absolute inset-0 bg-white/10 blur-xl rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="w-14 h-14 md:w-20 md:h-20 relative z-10 flex items-center justify-center overflow-hidden rounded-full border border-white/10 bg-black/40">
                                  <VisualEmote trigger={p.avatar || ':smile:'} remoteEmotes={remoteEmotes} size="lg" />
                                </div>
                                {isVictor && <span className="absolute -top-2 -right-2 text-sm animate-bounce z-20">👑</span>}
                            </div>

                            <div className="flex-1 min-w-0 flex flex-col">
                                <span className={`font-black uppercase tracking-[0.15em] truncate text-base md:text-lg ${isVictor ? 'text-yellow-400' : isMe ? 'text-white' : 'text-gray-400'}`}>
                                    {p.name} {isMe && <span className="text-[10px] text-yellow-500/60 ml-2 font-black tracking-widest">(YOU)</span>}
                                </span>
                                <span className="text-[8px] font-bold text-white/20 uppercase tracking-[0.4em] mt-0.5">
                                    {isVictor ? "Supreme Combatant" : p.cardCount === 0 ? "Strategic Withdrawal" : "Defeated in Arena"}
                                </span>
                            </div>

                            {isVictor && (
                                <div className="hidden sm:flex items-center gap-2 px-5 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                                     <span className="text-[9px] font-black text-yellow-500 uppercase tracking-[0.4em]">Elite Victor</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Ad Reward Button - Double Gold or Get Gems */}
        {phase === 'ready' && isAdAvailable && (
          <div className={`w-full mb-4 transition-all duration-700 ${phase === 'ready' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="bg-gradient-to-br from-purple-500/20 via-pink-500/15 to-purple-600/20 backdrop-blur-xl border-2 border-purple-500/30 rounded-2xl p-4 sm:p-5 shadow-[0_0_40px_rgba(168,85,247,0.3)]">
              <p className="text-xs sm:text-sm text-white/70 text-center mb-3 font-medium">Double your rewards!</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleAdReward('gold')}
                  disabled={adState !== 'idle' || !isAdLoaded}
                  className={`group relative overflow-hidden py-3 sm:py-4 px-4 rounded-xl transition-all duration-300 min-h-[56px] touch-manipulation ${
                    adState !== 'idle' || !isAdLoaded
                      ? 'bg-white/10 border border-white/20 text-white/50 cursor-not-allowed'
                      : 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold shadow-lg hover:scale-105'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    {!isAdLoaded ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span className="text-xs font-bold">Loading...</span>
                      </>
                    ) : (
                      <>
                        <CurrencyIcon type="GOLD" size="sm" />
                        <span className="text-xs font-bold">Double Gold</span>
                        <span className="text-[10px] opacity-80">+{coinsGained}</span>
                      </>
                    )}
                  </div>
                </button>
                <button
                  onClick={() => handleAdReward('gems')}
                  disabled={adState !== 'idle' || !isAdLoaded}
                  className={`group relative overflow-hidden py-3 sm:py-4 px-4 rounded-xl transition-all duration-300 min-h-[56px] touch-manipulation ${
                    adState !== 'idle' || !isAdLoaded
                      ? 'bg-white/10 border border-white/20 text-white/50 cursor-not-allowed'
                      : 'bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold shadow-lg hover:scale-105'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    {!isAdLoaded ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span className="text-xs font-bold">Loading...</span>
                      </>
                    ) : (
                      <>
                        <CurrencyIcon type="GEMS" size="sm" />
                        <span className="text-xs font-bold">Get 5 Gems</span>
                        <span className="text-[10px] opacity-80">+5</span>
                      </>
                    )}
                  </div>
                </button>
              </div>
              <p className="text-[10px] text-white/50 text-center mt-3">Watch a video to claim</p>
            </div>
          </div>
        )}

        {/* Vibe Check - Happy/Salty Faces */}
        {phase === 'ready' && !vibeSubmitted && (
          <div className={`w-full flex items-center justify-center gap-6 transition-all duration-700 ${phase === 'ready' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <button
              onClick={async () => {
                setVibeSubmitted(true);
                if (profile) {
                  await submitVibeCheck(profile.id, true, undefined, '1.0.0');
                }
              }}
              className="group relative flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.08] border border-white/10 transition-all active:scale-95"
            >
              <div className="text-4xl group-hover:scale-110 transition-transform">😊</div>
              <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Happy</span>
            </button>
            <button
              onClick={() => {
                setShowFinisherQuestion(true);
              }}
              className="group relative flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.08] border border-white/10 transition-all active:scale-95"
            >
              <div className="text-4xl group-hover:scale-110 transition-transform">😤</div>
              <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Salty</span>
            </button>
          </div>
        )}

        {/* Action Bar */}
        <div className={`w-full space-y-4 transition-all duration-700 ${phase === 'ready' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <button 
                onClick={onPlayAgain}
                className="group w-full relative overflow-hidden py-6 rounded-[2rem] transition-all duration-300 active:scale-95 shadow-[0_20px_50px_rgba(0,0,0,0.4)] border border-white/10 min-h-[56px] touch-manipulation"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-700 via-green-500 to-emerald-700 transition-transform duration-1000 group-hover:scale-110"></div>
                <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,0.3)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_3s_infinite] pointer-events-none"></div>
                <span className="relative z-10 text-white font-black uppercase tracking-[0.5em] text-xs flex items-center justify-center gap-4 drop-shadow-lg">
                    Re-Deploy Next Arena ⚔️
                </span>
            </button>
            
            <button 
                onClick={onGoHome}
                className="w-full py-4 bg-white/[0.02] hover:bg-white/[0.08] border border-white/5 text-gray-500 hover:text-white font-black text-[10px] uppercase tracking-[0.6em] rounded-[2rem] transition-all active:scale-95 min-h-[48px] touch-manipulation"
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
        @keyframes winnerGlow {
          0% { transform: translateX(-150%) skewX(-45deg); }
          50% { transform: translateX(150%) skewX(-45deg); }
          100% { transform: translateX(150%) skewX(-45deg); }
        }
        .animate-victory-bounce { animation: victoryBounce 3s ease-in-out infinite; }
        .animate-victory-particle { animation: victoryParticle 4s ease-out infinite; }
        .animate-victory-pop { animation: victoryPop 0.5s cubic-bezier(0.17, 0.67, 0.83, 0.67) forwards; }
      `}} />

      {/* Gem Rain Effect */}
      {showGemRain && (
        <GemRain 
          gemCount={5} 
          onComplete={() => setShowGemRain(false)} 
        />
      )}

      {/* Warning Toast for Early Ad Closure */}
      {showWarningToast && (
        <Toast
          message="Watch the full video to claim your gems!"
          type="error"
          onClose={() => setShowWarningToast(false)}
        />
      )}

      {/* Finisher Question Modal */}
      {showFinisherQuestion && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/90 backdrop-blur-md p-4" onClick={() => setShowFinisherQuestion(false)}>
          <div 
            className="relative bg-black/80 backdrop-blur-2xl border border-white/10 w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.8)] p-6 md:p-8"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center space-y-6">
              <div className="text-5xl">😤</div>
              <h3 className="text-xl font-black text-white uppercase tracking-wider">
                Was it the finisher?
              </h3>
              <div className="flex gap-4">
                <button
                  onClick={async () => {
                    setShowFinisherQuestion(false);
                    setVibeSubmitted(true);
                    if (profile) {
                      await submitVibeCheck(profile.id, false, true, '1.0.0');
                    }
                  }}
                  className="flex-1 py-3 bg-emerald-600/80 hover:bg-emerald-600 text-white font-black uppercase tracking-widest rounded-2xl transition-all active:scale-95"
                >
                  Yes
                </button>
                <button
                  onClick={async () => {
                    setShowFinisherQuestion(false);
                    setVibeSubmitted(true);
                    if (profile) {
                      await submitVibeCheck(profile.id, false, false, '1.0.0');
                    }
                  }}
                  className="flex-1 py-3 bg-white/[0.05] hover:bg-white/[0.10] text-white font-black uppercase tracking-widest rounded-2xl transition-all active:scale-95 border border-white/10"
                >
                  No
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};