
import React, { useMemo, useEffect, useRef, useState } from 'react';
import { UserProfile } from '../types';
import { calculateLevel } from '../services/supabase';
import { Card, CardCoverStyle } from './Card';

interface LevelRewardsProps {
  onClose: () => void;
  profile: UserProfile | null;
  inline?: boolean; // If true, render inline instead of as modal
}

interface Reward {
  level: number;
  label: string;
  type: 'GOLD' | 'SLEEVE';
  value: number | CardCoverStyle;
  isMilestone?: boolean;
}

const REWARDS: Reward[] = [
  { level: 2, label: '100', type: 'GOLD', value: 100 },
  { level: 3, label: '100', type: 'GOLD', value: 100 },
  { level: 4, label: '100', type: 'GOLD', value: 100 },
  { level: 5, label: '250', type: 'GOLD', value: 250, isMilestone: true },
  { level: 6, label: '100', type: 'GOLD', value: 100 },
  { level: 7, label: '100', type: 'GOLD', value: 100 },
  { level: 8, label: '100', type: 'GOLD', value: 100 },
  { level: 9, label: '100', type: 'GOLD', value: 100 },
  { level: 10, label: 'SPADE', type: 'SLEEVE', value: 'SOVEREIGN_SPADE', isMilestone: true },
  { level: 11, label: '200', type: 'GOLD', value: 200 },
  { level: 12, label: '200', type: 'GOLD', value: 200 },
  { level: 13, label: '200', type: 'GOLD', value: 200 },
  { level: 14, label: '200', type: 'GOLD', value: 200 },
  { level: 15, label: '500', type: 'GOLD', value: 500, isMilestone: true },
  { level: 16, label: '200', type: 'GOLD', value: 200 },
  { level: 17, label: '200', type: 'GOLD', value: 200 },
  { level: 18, label: '200', type: 'GOLD', value: 200 },
  { level: 19, label: '200', type: 'GOLD', value: 200 },
  { level: 20, label: 'CLUB', type: 'SLEEVE', value: 'SOVEREIGN_CLUB', isMilestone: true },
  { level: 21, label: '300', type: 'GOLD', value: 300 },
  { level: 22, label: '300', type: 'GOLD', value: 300 },
  { level: 23, label: '300', type: 'GOLD', value: 300 },
  { level: 24, label: '300', type: 'GOLD', value: 300 },
  { level: 25, label: '1000', type: 'GOLD', value: 1000, isMilestone: true },
  { level: 26, label: '300', type: 'GOLD', value: 300 },
  { level: 27, label: '300', type: 'GOLD', value: 300 },
  { level: 28, label: '300', type: 'GOLD', value: 300 },
  { level: 29, label: '300', type: 'GOLD', value: 300 },
  { level: 30, label: 'DIAMOND', type: 'SLEEVE', value: 'SOVEREIGN_DIAMOND', isMilestone: true },
  { level: 31, label: '500', type: 'GOLD', value: 500 },
  { level: 32, label: '500', type: 'GOLD', value: 500 },
  { level: 33, label: '500', type: 'GOLD', value: 500 },
  { level: 34, label: '500', type: 'GOLD', value: 500 },
  { level: 35, label: '1500', type: 'GOLD', value: 1500, isMilestone: true },
  { level: 36, label: '500', type: 'GOLD', value: 500 },
  { level: 37, label: '500', type: 'GOLD', value: 500 },
  { level: 38, label: '500', type: 'GOLD', value: 500 },
  { level: 39, label: '500', type: 'GOLD', value: 500 },
  { level: 40, label: 'HEART', type: 'SLEEVE', value: 'SOVEREIGN_HEART', isMilestone: true },
  { level: 41, label: '500', type: 'GOLD', value: 500 },
  { level: 42, label: '500', type: 'GOLD', value: 500 },
  { level: 43, label: '500', type: 'GOLD', value: 500 },
  { level: 44, label: '500', type: 'GOLD', value: 500 },
  { level: 45, label: '500', type: 'GOLD', value: 500, isMilestone: true },
  { level: 46, label: '500', type: 'GOLD', value: 500 },
  { level: 47, label: '500', type: 'GOLD', value: 500 },
  { level: 48, label: '500', type: 'GOLD', value: 500 },
  { level: 49, label: '500', type: 'GOLD', value: 500 },
  { level: 50, label: '500', type: 'GOLD', value: 500, isMilestone: true },
];

export const LevelRewards: React.FC<LevelRewardsProps> = ({ onClose, profile, inline = false }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const currentLevelRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const currentLevel = useMemo(() => profile ? calculateLevel(profile.xp) : 1, [profile]);
  const maxLevelDisplay = 60;

  const progressSteps = useMemo(() => {
    return Array.from({ length: maxLevelDisplay }, (_, i) => i + 1);
  }, [maxLevelDisplay]);

  // Get next milestone
  const nextMilestone = useMemo(() => {
    return REWARDS.find(r => r.level > currentLevel && r.isMilestone) || null;
  }, [currentLevel]);

  // Get unlocked milestones count
  const unlockedMilestones = useMemo(() => {
    return REWARDS.filter(r => r.isMilestone && currentLevel >= r.level).length;
  }, [currentLevel]);

  // Handle loading state - ensure smooth transition
  useEffect(() => {
    if (profile) {
      // Small delay to ensure all calculations are complete
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 150);
      return () => clearTimeout(timer);
    } else {
      setIsLoading(true);
    }
  }, [profile, currentLevel]);

  // Scroll to current level on mount (after loading)
  useEffect(() => {
    if (!isLoading && currentLevelRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const target = currentLevelRef.current;
      const scrollLeft = target.offsetLeft - container.offsetWidth / 2 + target.offsetWidth / 2;
      container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  }, [currentLevel, isLoading]);

  // Track scroll progress
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const updateScrollProgress = () => {
      const scrollWidth = container.scrollWidth - container.clientWidth;
      const scrollLeft = container.scrollLeft;
      const progress = scrollWidth > 0 ? (scrollLeft / scrollWidth) * 100 : 0;
      setScrollProgress(progress);
    };

    container.addEventListener('scroll', updateScrollProgress);
    updateScrollProgress(); // Initial update

    return () => container.removeEventListener('scroll', updateScrollProgress);
  }, []);

  if (!profile) return null;

  const content = (
    <div 
      className={`${inline ? 'w-full' : 'bg-gradient-to-br from-[#0a0a0a] via-[#080808] to-[#000000] border border-white/20 w-full max-w-7xl max-h-[95vh] rounded-3xl overflow-hidden shadow-[0_0_150px_rgba(0,0,0,1)]'} flex flex-col ${inline ? '' : 'mx-4'} relative transition-opacity duration-500 ease-out`}
      style={{ opacity: isLoading ? 0 : 1 }}
      onClick={e => inline ? null : e.stopPropagation()}
    >
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-50 bg-gradient-to-br from-[#0a0a0a] via-[#080808] to-[#000000] flex items-center justify-center transition-opacity duration-300">
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-4 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 border-4 border-transparent border-t-yellow-400/60 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}></div>
            </div>
            <div className="text-white/60 text-sm font-medium">Loading rewards...</div>
          </div>
        </div>
      )}
        
        {/* Premium Header - Mobile Optimized */}
        <div className="relative p-4 sm:p-6 md:p-8 lg:p-10 border-b border-white/20 bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-transparent overflow-hidden">
          {/* Dramatic background effects */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(251,191,36,0.2)_0%,transparent_70%)]"></div>
          <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.05)_50%,transparent_100%)]"></div>
          
          <div className="relative flex flex-col sm:flex-row justify-between items-start gap-4 sm:gap-6">
            <div className="flex flex-col min-w-0 flex-1">
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-none mb-2 sm:mb-3 drop-shadow-[0_4px_30px_rgba(251,191,36,0.4)]">
                Level Rewards
              </h2>
              <p className="text-xs sm:text-sm md:text-base font-medium text-white/70">
                {unlockedMilestones} milestones unlocked
              </p>
          </div>
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4 shrink-0 w-full sm:w-auto">
              {/* Current Level Display - Mobile Optimized */}
              <div className="relative flex flex-col items-end bg-white/[0.12] backdrop-blur-2xl border-2 border-white/30 rounded-xl sm:rounded-2xl md:rounded-3xl px-4 sm:px-5 md:px-6 py-3 sm:py-3.5 md:py-4 shadow-[0_12px_40px_rgba(0,0,0,0.6)] flex-1 sm:flex-none">
                <div className="absolute inset-0 bg-gradient-to-br from-white/15 to-transparent rounded-xl sm:rounded-2xl md:rounded-3xl"></div>
                <span className="text-[10px] sm:text-xs font-semibold text-white/70 mb-0.5 sm:mb-1 relative z-10 uppercase tracking-wider">Level</span>
                <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-white leading-none relative z-10 drop-shadow-lg">{currentLevel}</span>
             </div>
              {!inline && (
                <button 
                  onClick={onClose} 
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-white/10 border-2 border-white/20 flex items-center justify-center text-white/70 hover:bg-white/20 hover:text-white hover:border-white/30 transition-all active:scale-90 group shrink-0 backdrop-blur-sm touch-manipulation"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
             </button>
              )}
            </div>
          </div>
        </div>

        {/* Next Milestone Preview - Mobile Optimized */}
        {nextMilestone && (
          <div className="relative px-4 sm:px-6 md:px-8 lg:px-10 py-4 sm:py-5 md:py-6 bg-gradient-to-r from-yellow-500/15 via-yellow-500/8 to-transparent border-b border-yellow-500/30 overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(251,191,36,0.15)_50%,transparent_100%)]"></div>
            <div className="relative flex items-center gap-2 sm:gap-3 md:gap-4 flex-wrap">
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-400 animate-pulse shadow-[0_0_12px_rgba(251,191,36,1)]"></div>
                <span className="text-xs sm:text-sm md:text-base font-semibold text-white/80 whitespace-nowrap">Next Milestone:</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                {nextMilestone.type === 'GOLD' ? (
                  <span className="text-base sm:text-lg md:text-xl font-bold text-yellow-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.6)] whitespace-nowrap">{nextMilestone.value} Gold</span>
                ) : (
                  <span className="text-base sm:text-lg md:text-xl font-bold text-yellow-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.6)] whitespace-nowrap">{nextMilestone.label} Sleeve</span>
                )}
                <span className="text-xs sm:text-sm font-medium text-white/60 whitespace-nowrap">Level {nextMilestone.level}</span>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Scrollable Track - Final Boss Premium */}
        <div className="relative flex-1 flex flex-col">
          {/* Scroll Navigation Hints - Mobile Optimized */}
          <div className="px-4 sm:px-6 md:px-8 lg:px-10 pt-4 sm:pt-6 pb-3 sm:pb-4 flex items-center justify-between border-b border-white/10 gap-2">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-white/5 border border-white/10 shrink-0">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                </svg>
                <span className="text-[10px] sm:text-xs font-medium text-white/60 whitespace-nowrap">Swipe</span>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-white/5 border border-white/10 shrink-0">
              <span className="text-[10px] sm:text-xs font-semibold text-white/70 whitespace-nowrap">Level <span className="text-yellow-400">{currentLevel}</span> / {maxLevelDisplay}</span>
            </div>
          </div>

        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-x-auto overflow-y-hidden py-8 sm:py-10 md:py-12 scrollbar-thin scrollbar-thumb-yellow-500/50 scrollbar-track-white/5 select-none"
          style={{ 
            scrollbarWidth: 'thin', 
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
            scrollBehavior: 'smooth',
            overscrollBehaviorX: 'contain',
            touchAction: 'pan-x'
          } as React.CSSProperties}
        >
          <div className="relative flex items-center justify-start min-h-[240px] sm:min-h-[280px] px-4 sm:px-6" style={{ width: 'max-content', minWidth: '100%' }}>
            {/* Track Line */}
            <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-y-1/2"></div>
            <div 
              className="absolute top-1/2 left-0 h-[3px] bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-500 -translate-y-1/2 shadow-[0_0_20px_rgba(251,191,36,0.8)] transition-all duration-1000 ease-out" 
                style={{ width: `${((Math.min(currentLevel, maxLevelDisplay) - 1) / (maxLevelDisplay - 1)) * 100}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-yellow-400 shadow-[0_0_20px_rgba(251,191,36,0.9)] animate-pulse"></div>
            </div>

            {/* Enhanced Steps */}
            {progressSteps.map(lvl => {
              const reward = REWARDS.find(r => r.level === lvl);
              const isUnlocked = currentLevel >= lvl;
              const isCurrent = currentLevel === lvl;
              const isNext = currentLevel + 1 === lvl;

              return (
                <div 
                  key={lvl} 
                  ref={isCurrent ? currentLevelRef : null}
                  className="relative flex flex-col items-center mx-3 sm:mx-4 group cursor-pointer"
                  style={{ minWidth: '70px', width: '70px', flexShrink: 0 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (scrollContainerRef.current) {
                      const container = scrollContainerRef.current;
                      const target = e.currentTarget;
                      const scrollLeft = target.offsetLeft - container.offsetWidth / 2 + target.offsetWidth / 2;
                      container.scrollTo({ left: Math.max(0, scrollLeft), behavior: 'smooth' });
                    }
                  }}
                >
                  {/* Premium Reward Node */}
                  {reward && (
                    <div className={`absolute bottom-full mb-8 sm:mb-10 flex flex-col items-center transition-all duration-300 ${isUnlocked ? 'opacity-100' : 'opacity-50'}`}>
                        <div className={`
                            relative p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 transition-all duration-300 backdrop-blur-xl
                            ${isUnlocked 
                              ? reward.isMilestone 
                                ? 'border-yellow-500/80 bg-gradient-to-br from-yellow-500/30 via-yellow-600/25 to-yellow-500/30 shadow-[0_0_40px_rgba(251,191,36,0.6)] scale-105' 
                                : 'border-yellow-500/40 bg-white/[0.12] shadow-[0_0_20px_rgba(251,191,36,0.4)] scale-100'
                              : 'border-white/20 bg-white/[0.08] scale-95'
                            }
                            ${isCurrent ? 'ring-3 ring-yellow-500/60 shadow-[0_0_50px_rgba(251,191,36,0.8)]' : ''}
                        `}>
                            {/* Glow effect for milestones */}
                            {reward.isMilestone && isUnlocked && (
                              <div className="absolute -inset-1 bg-yellow-500/30 blur-xl rounded-xl opacity-50 animate-pulse"></div>
                            )}
                            
                            {reward.type === 'GOLD' ? (
                                <div className="flex flex-col items-center gap-1 relative z-10">
                                    <div className="text-2xl sm:text-3xl leading-none filter drop-shadow-[0_0_15px_rgba(251,191,36,0.6)]">💰</div>
                                    <div className={`
                                      text-[10px] sm:text-xs font-semibold
                                      ${isUnlocked ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]' : 'text-white/30'}
                                    `}>
                                      {reward.value}
                                    </div>
                                    {reward.isMilestone && (
                                      <div className="absolute -top-1 -right-1 bg-gradient-to-br from-yellow-400 to-yellow-600 text-black text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-lg border border-yellow-300">
                                        ⭐
                                      </div>
                                    )}
                                </div>
                            ) : (
                                <div className="relative z-10">
                                    <Card 
                                      faceDown 
                                      activeTurn={true} 
                                      coverStyle={reward.value as CardCoverStyle} 
                                      small 
                                      className={`!w-10 !h-14 sm:!w-12 sm:!h-16 shadow-2xl transition-all ${!isUnlocked ? 'grayscale opacity-50' : ''}`} 
                                      disableEffects={!isUnlocked} 
                                    />
                                    {isUnlocked && (
                                      <div className="absolute -bottom-1 -right-1 bg-gradient-to-br from-yellow-400 to-yellow-600 text-black text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-lg border border-yellow-300">
                                        ⭐
                                      </div>
                                    )}
                                    {reward.isMilestone && (
                                      <div className="absolute -top-1 -left-1 bg-gradient-to-br from-yellow-400 to-yellow-600 text-black text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-lg">
                                        ⭐
                                      </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                  )}

                  {/* Premium Level Marker */}
                  <div className={`
                    relative w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 transition-all duration-300 z-20 flex items-center justify-center
                    ${isUnlocked 
                      ? 'bg-gradient-to-br from-yellow-500/50 to-yellow-600/40 border-yellow-500/70 shadow-[0_0_25px_rgba(251,191,36,0.6)]' 
                      : 'bg-white/[0.10] border-white/30'
                    }
                    ${isCurrent ? 'scale-110 ring-3 ring-yellow-500/60 shadow-[0_0_40px_rgba(251,191,36,0.9)]' : 'scale-100'}
                    ${isNext ? 'ring-2 ring-yellow-500/40' : ''}
                  `}>
                    {/* Inner glow */}
                    {isUnlocked && (
                      <div className="absolute inset-0 bg-gradient-to-br from-white/25 to-transparent rounded-full"></div>
                    )}
                    <span className={`text-xs sm:text-sm font-bold relative z-10 ${isUnlocked ? 'text-white drop-shadow-md' : 'text-white/50'}`}>
                      {lvl}
                    </span>
                    {isCurrent && (
                      <>
                        <div className="absolute inset-0 rounded-full bg-yellow-500/30 animate-ping"></div>
                        <div className="absolute -inset-2 rounded-full bg-yellow-500/20 blur-md animate-pulse"></div>
                      </>
                    )}
                  </div>

                  {/* Premium Label */}
                  <div className="absolute top-full mt-3 sm:mt-4 text-center w-full">
                      {reward && (
                        <div className="flex flex-col items-center gap-1">
                          <span className={`
                            text-[10px] sm:text-xs font-semibold
                            ${isUnlocked ? 'text-white/90' : 'text-white/40'}
                          `}>
                            {reward.type === 'GOLD' ? `${reward.value}` : reward.label}
                          </span>
                          {reward.isMilestone && (
                            <span className="text-[8px] font-bold text-yellow-400">
                              ⭐
                      </span>
                          )}
                        </div>
                      )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

          {/* Scroll Progress Indicator - Mobile Optimized */}
          <div className="px-4 sm:px-6 md:px-8 lg:px-10 pb-4 sm:pb-6">
            <div className="relative h-1 sm:h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-500 transition-all duration-300 shadow-[0_0_10px_rgba(251,191,36,0.5)]"
                style={{ width: `${scrollProgress}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Premium Footer */}
        <div className="relative p-6 sm:p-8 border-t border-white/20 bg-gradient-to-br from-white/[0.05] to-transparent flex flex-col sm:flex-row justify-center items-center gap-3 overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.03)_50%,transparent_100%)]"></div>
            <div className="relative flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-pulse shadow-[0_0_12px_rgba(251,191,36,1)]"></div>
              <span className="text-sm font-semibold text-white/70 text-center">
                Rewards auto-claim on level up
            </span>
            </div>
        </div>
      </div>
    );

  if (inline) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/95 backdrop-blur-3xl animate-in fade-in duration-300" onClick={onClose}>
      {content}
      <style dangerouslySetInnerHTML={{ __html: `
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
};
