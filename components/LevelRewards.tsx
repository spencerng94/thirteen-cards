import React, { useMemo, useEffect, useRef } from 'react';
import { UserProfile, Card as CardType } from '../types';
import { calculateLevel } from '../services/supabase';
import { Card, CardCoverStyle } from './Card';

interface LevelRewardsProps {
  onClose: () => void;
  profile: UserProfile | null;
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
];

export const LevelRewards: React.FC<LevelRewardsProps> = ({ onClose, profile }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const currentLevelRef = useRef<HTMLDivElement>(null);

  const currentLevel = useMemo(() => profile ? calculateLevel(profile.xp) : 1, [profile]);
  const maxLevelDisplay = 45;

  const progressSteps = useMemo(() => {
    return Array.from({ length: maxLevelDisplay }, (_, i) => i + 1);
  }, [maxLevelDisplay]);

  useEffect(() => {
    if (currentLevelRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const target = currentLevelRef.current;
      const scrollLeft = target.offsetLeft - container.offsetWidth / 2 + target.offsetWidth / 2;
      container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  }, [currentLevel]);

  if (!profile) return null;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/95 backdrop-blur-3xl animate-in fade-in duration-300" onClick={onClose}>
      <div className="bg-[#080808] border border-white/10 w-full max-w-4xl max-h-[75vh] rounded-[2rem] sm:rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,1)] flex flex-col mx-4" onClick={e => e.stopPropagation()}>
        
        {/* Compact Header */}
        <div className="p-4 sm:p-6 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
          <div className="flex flex-col">
            <h2 className="text-lg sm:text-xl font-black text-white uppercase italic tracking-widest font-serif leading-none">REWARDS</h2>
            <p className="text-[7px] font-black uppercase tracking-[0.4em] text-yellow-500 mt-1">Progression Path</p>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex flex-col items-end">
                <span className="text-[8px] font-black text-white/40 uppercase tracking-widest leading-none">Mastery</span>
                <span className="text-xl sm:text-2xl font-black text-white italic mt-0.5">{currentLevel}</span>
             </div>
             <button onClick={onClose} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-all active:scale-90">
               <span className="text-lg">✕</span>
             </button>
          </div>
        </div>

        {/* Improved Scrollable Track */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-x-auto p-4 py-12 sm:py-20 scrollbar-none select-none cursor-grab active:cursor-grabbing"
        >
          <div className="relative min-w-max flex items-center h-24 sm:h-32 px-24 sm:px-40">
            
            {/* The Track Line */}
            <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/5 -translate-y-1/2"></div>
            <div 
                className="absolute top-1/2 left-0 h-[1px] bg-yellow-500 -translate-y-1/2 shadow-[0_0_10px_rgba(234,179,8,0.5)] transition-all duration-1000 ease-out" 
                style={{ width: `${((Math.min(currentLevel, maxLevelDisplay) - 1) / (maxLevelDisplay - 1)) * 100}%` }}
            ></div>

            {/* Steps */}
            {progressSteps.map(lvl => {
              const reward = REWARDS.find(r => r.level === lvl);
              const isUnlocked = currentLevel >= lvl;
              const isCurrent = currentLevel === lvl;

              return (
                <div 
                  key={lvl} 
                  ref={isCurrent ? currentLevelRef : null}
                  className="relative flex flex-col items-center mx-3 sm:mx-5"
                  style={{ width: '32px' }}
                >
                  {/* Reward Node (Floating Above) */}
                  {reward && (
                    <div className={`absolute bottom-full mb-3 sm:mb-5 flex flex-col items-center animate-in slide-in-from-bottom-1 duration-500`}>
                        <div className={`
                            p-1 sm:p-1.5 rounded-lg sm:rounded-xl border transition-all duration-500 
                            ${isUnlocked ? 'border-yellow-500/40 bg-yellow-500/10' : 'border-white/5 bg-white/[0.02] opacity-30'}
                            ${reward.isMilestone ? 'scale-105' : 'scale-90'}
                        `}>
                            {reward.type === 'GOLD' ? (
                                <div className="flex flex-col items-center">
                                    <span className="text-base sm:text-xl leading-none">💰</span>
                                    {reward.isMilestone && <span className="text-[5px] font-black text-yellow-500 uppercase mt-0.5">+{reward.value}</span>}
                                </div>
                            ) : (
                                <div className="relative">
                                    <Card faceDown activeTurn={true} coverStyle={reward.value as CardCoverStyle} small className="!w-8 !h-11 sm:!w-10 sm:!h-14 shadow-2xl" disableEffects={!isUnlocked} />
                                    {isUnlocked && <div className="absolute -bottom-1 -right-1 bg-yellow-500 text-black text-[5px] font-black px-1 py-0.5 rounded-full shadow-lg">ELITE</div>}
                                </div>
                            )}
                        </div>
                    </div>
                  )}

                  {/* Level Marker Circle */}
                  <div className={`
                    w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 transition-all duration-500 z-20 flex items-center justify-center relative
                    ${isUnlocked ? 'bg-yellow-500 border-yellow-300 shadow-[0_0_10px_rgba(234,179,8,0.3)]' : 'bg-black border-white/10'}
                    ${isCurrent ? 'scale-125 ring-2 ring-yellow-500/20' : 'scale-100'}
                  `}>
                    <span className={`text-[7px] sm:text-[8px] font-black ${isUnlocked ? 'text-black' : 'text-white/20'}`}>{lvl}</span>
                  </div>

                  {/* Label (Below) */}
                  <div className="absolute top-full mt-3 sm:mt-5 text-center w-max">
                      <span className={`text-[5px] sm:text-[7px] font-black uppercase tracking-[0.15em] ${isUnlocked ? 'text-white/70' : 'text-white/10'}`}>
                          {reward ? (reward.type === 'GOLD' ? `💰 ${reward.label}` : reward.label) : ''}
                      </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Hint */}
        <div className="p-3 sm:p-4 border-t border-white/5 bg-black/40 flex justify-center items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-yellow-500 animate-pulse"></div>
            <span className="text-[6px] sm:text-[7px] font-black text-white/30 uppercase tracking-[0.3em] text-center">
              AWARDS DEPLOY AUTOMATICALLY UPON ASCENSION
            </span>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
};