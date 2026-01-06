import React from 'react';
import { UserProfile, Emote, HubTab } from '../types';
import { calculateLevel, getXpForLevel } from '../services/supabase';
import { VisualEmote } from './VisualEmote';
import { CurrencyIcon } from './Store';

/* FIXED: Added onOpenGemPacks to UserBarProps interface */
interface UserBarProps {
  profile: UserProfile | null;
  className?: string;
  isGuest?: boolean;
  onPromptAuth?: () => void;
  onClick?: (tab: HubTab) => void;
  onOpenStore?: (tab: 'SLEEVES' | 'AVATARS' | 'BOARDS' | 'GEMS') => void;
  onOpenGemPacks?: () => void;
  avatar?: string;
  remoteEmotes?: Emote[];
}

/* FIXED: Destructured onOpenGemPacks from props */
export const UserBar: React.FC<UserBarProps> = ({ 
  profile, 
  className = '', 
  isGuest, 
  onPromptAuth, 
  onClick, 
  onOpenStore,
  onOpenGemPacks,
  avatar,
  remoteEmotes = [] 
}) => {
  if (!profile) return null;

  const currentLevel = calculateLevel(profile.xp);
  const nextLevelXp = getXpForLevel(currentLevel + 1);
  const currentLevelXp = getXpForLevel(currentLevel);
  const range = Math.max(1, nextLevelXp - currentLevelXp);
  const progress = Math.min(100, Math.max(0, ((profile.xp - currentLevelXp) / range) * 100));
  
  const showSecurityPrompt = isGuest && (profile.coins >= 1000 || currentLevel >= 2);

  return (
    <div 
      className={`flex flex-col items-center py-4 sm:py-5 px-3 sm:px-4 bg-gradient-to-b from-black/60 via-black/50 to-black/60 backdrop-blur-2xl border-2 border-white/10 rounded-2xl sm:rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.6)] transition-all duration-500 hover:bg-gradient-to-b hover:from-black/70 hover:via-black/60 hover:to-black/70 hover:border-white/20 hover:shadow-[0_12px_50px_rgba(0,0,0,0.8)] group w-16 sm:w-20 ${className}`}
    >
      {/* Avatar */}
      <div className="relative mb-4 sm:mb-5 cursor-pointer" onClick={() => onClick?.('PROFILE')}>
        <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-yellow-500/20 via-yellow-600/10 to-yellow-500/20 border-2 border-yellow-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(234,179,8,0.3)] group-hover:scale-110 group-hover:border-yellow-500/50 group-hover:shadow-[0_0_30px_rgba(234,179,8,0.5)] transition-all duration-300 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(234,179,8,0.2)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <VisualEmote trigger={avatar || ':smile:'} remoteEmotes={remoteEmotes} size="sm" />
        </div>
        {showSecurityPrompt && (
          <div className="absolute -top-1 -right-1 flex items-center justify-center z-10">
            <span className="absolute w-4 h-4 bg-rose-600 rounded-full animate-ping opacity-75"></span>
            <span className="relative w-3 h-3 bg-gradient-to-br from-rose-500 to-rose-600 rounded-full border-2 border-white/30 shadow-[0_0_10px_rgba(244,63,94,0.8)]"></span>
          </div>
        )}
      </div>

      {/* Level Display */}
      <div 
        onClick={(e) => { e.stopPropagation(); onClick?.('LEVEL_REWARDS'); }}
        className="flex flex-col items-center mb-5 sm:mb-6 cursor-pointer hover:scale-110 transition-transform duration-300 group/level"
      >
        <span className="text-[7px] sm:text-[8px] font-black text-white/50 uppercase tracking-wider leading-none mb-1.5">Level</span>
        <div className="relative">
          <span className="text-base sm:text-lg font-black text-yellow-400 leading-none tracking-tighter drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]">
            {currentLevel}
          </span>
          <div className="absolute -inset-1 bg-yellow-500/20 blur-md opacity-0 group-hover/level:opacity-100 transition-opacity duration-300 rounded-lg"></div>
        </div>
        <div className="w-8 sm:w-10 h-1.5 sm:h-2 bg-white/10 rounded-full mt-2.5 sm:mt-3 overflow-hidden border border-white/5">
          <div 
            className="h-full bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.6)] transition-all duration-1000 relative overflow-hidden"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_25%,rgba(255,255,255,0.3)_50%,transparent_75%)] bg-[length:200%_100%] animate-[shimmer_2s_infinite]"></div>
          </div>
        </div>
      </div>

      {/* Currency Display */}
      <div className="flex flex-col items-center gap-4 sm:gap-5">
        {/* Gold Coins */}
        <button 
          onClick={(e) => { e.stopPropagation(); onOpenStore?.('SLEEVES'); }}
          className="flex flex-col items-center gap-1 hover:scale-110 transition-transform duration-300 group/coin"
        >
          <div className="relative">
            <div className="absolute -inset-2 bg-yellow-500/20 blur-lg opacity-0 group-hover/coin:opacity-100 transition-opacity duration-300 rounded-full"></div>
            <CurrencyIcon type="GOLD" size="sm" />
          </div>
          <span className="text-[9px] sm:text-[10px] font-black text-yellow-400 leading-none tracking-tight text-center drop-shadow-[0_0_8px_rgba(234,179,8,0.4)]">
            {profile.coins > 999 ? (profile.coins / 1000).toFixed(1) + 'k' : profile.coins}
          </span>
        </button>

        {/* Gems */}
        <button 
          onClick={(e) => { e.stopPropagation(); onOpenGemPacks ? onOpenGemPacks() : onOpenStore?.('GEMS'); }}
          className="flex flex-col items-center gap-1 hover:scale-110 transition-transform duration-300 group/gem"
        >
          <div className="relative">
            <div className="absolute -inset-2 bg-pink-500/20 blur-lg opacity-0 group-hover/gem:opacity-100 transition-opacity duration-300 rounded-full"></div>
            <CurrencyIcon type="GEMS" size="sm" />
          </div>
          <span className="text-[9px] sm:text-[10px] font-black text-pink-400 leading-none tracking-tight text-center drop-shadow-[0_0_8px_rgba(236,72,153,0.4)]">
            {(profile.gems || 0) > 999 ? ((profile.gems || 0) / 1000).toFixed(1) + 'k' : (profile.gems || 0)}
          </span>
        </button>
      </div>

      {/* Security Prompt */}
      {showSecurityPrompt && onPromptAuth && (
        <button 
          onClick={(e) => { e.stopPropagation(); onPromptAuth(); }}
          className="absolute -left-14 sm:-left-16 top-4 opacity-0 group-hover:opacity-100 bg-gradient-to-br from-rose-600 to-rose-700 text-white text-[8px] font-black p-2 rounded-xl border-2 border-rose-400/50 shadow-[0_0_20px_rgba(244,63,94,0.5)] transition-all duration-300 pointer-events-auto hover:scale-110 hover:shadow-[0_0_30px_rgba(244,63,94,0.7)]"
          title="Secure Account"
        >
          🛡️
        </button>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}} />
    </div>
  );
};