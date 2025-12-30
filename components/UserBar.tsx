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
      className={`flex flex-col items-center py-4 px-2 bg-black/40 backdrop-blur-2xl border border-white/10 rounded-full shadow-2xl transition-all duration-500 hover:bg-black/60 group w-14 ${className}`}
    >
      <div className="relative mb-3 cursor-pointer" onClick={() => onClick?.('PROFILE')}>
        <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-white/10 to-transparent border border-white/10 flex items-center justify-center text-lg shadow-inner group-hover:scale-110 transition-transform duration-500 overflow-hidden">
          <VisualEmote trigger={avatar || ':smile:'} remoteEmotes={remoteEmotes} size="sm" />
        </div>
        {showSecurityPrompt && (
          <div className="absolute -top-0.5 -left-0.5 w-2 h-2 bg-rose-500 rounded-full animate-ping"></div>
        )}
      </div>

      <div 
        onClick={(e) => { e.stopPropagation(); onClick?.('LEVEL_REWARDS'); }}
        className="flex flex-col items-center mb-4 cursor-pointer hover:scale-110 transition-transform"
      >
        <span className="text-[6px] font-black text-white/40 uppercase tracking-widest leading-none">Level</span>
        <span className="text-xs font-black text-white leading-none mt-0.5 tracking-tighter">
          {currentLevel}
        </span>
        <div className="w-5 h-[2px] bg-white/5 rounded-full mt-1.5 overflow-hidden">
          <div 
            className="h-full bg-yellow-500 shadow-[0_0_5px_rgba(234,179,8,0.5)] transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col items-center gap-5">
        <button 
          onClick={(e) => { e.stopPropagation(); onOpenStore?.('SLEEVES'); }}
          className="flex flex-col items-center gap-0.5 hover:scale-110 transition-transform"
        >
          <CurrencyIcon type="GOLD" size="sm" />
          <span className="text-[8px] font-black text-yellow-500/90 leading-none tracking-tighter text-center">
            {profile.coins > 999 ? (profile.coins / 1000).toFixed(1) + 'k' : profile.coins}
          </span>
        </button>

        <button 
          /* FIXED: Used onOpenGemPacks if available, otherwise fall back to onOpenStore('GEMS') */
          onClick={(e) => { e.stopPropagation(); onOpenGemPacks ? onOpenGemPacks() : onOpenStore?.('GEMS'); }}
          className="flex flex-col items-center gap-0.5 hover:scale-110 transition-transform"
        >
          <CurrencyIcon type="GEMS" size="sm" />
          <span className="text-[8px] font-black text-white/90 leading-none tracking-tighter text-center">
            {(profile.gems || 0) > 999 ? ((profile.gems || 0) / 1000).toFixed(1) + 'k' : (profile.gems || 0)}
          </span>
        </button>
      </div>

      {showSecurityPrompt && onPromptAuth && (
        <button 
          onClick={(e) => { e.stopPropagation(); onPromptAuth(); }}
          className="absolute -left-12 top-4 opacity-0 group-hover:opacity-100 bg-rose-600 text-white text-[6px] font-black p-1 rounded-full transition-all duration-300 pointer-events-auto"
          title="Secure Account"
        >
          🛡️
        </button>
      )}
    </div>
  );
};