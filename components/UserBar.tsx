
import React from 'react';
import { UserProfile, Emote, HubTab } from '../types';
import { calculateLevel, getXpForLevel } from '../services/supabase';
import { VisualEmote } from './VisualEmote';

interface UserBarProps {
  profile: UserProfile | null;
  className?: string;
  isGuest?: boolean;
  onPromptAuth?: () => void;
  onClick?: (tab: HubTab) => void;
  avatar?: string;
  remoteEmotes?: Emote[];
}

export const UserBar: React.FC<UserBarProps> = ({ 
  profile, 
  className = '', 
  isGuest, 
  onPromptAuth, 
  onClick, 
  avatar,
  remoteEmotes = [] 
}) => {
  if (!profile) return null;

  const currentLevel = calculateLevel(profile.xp);
  const nextLevelXp = getXpForLevel(currentLevel + 1);
  const currentLevelXp = getXpForLevel(currentLevel);
  const range = Math.max(1, nextLevelXp - currentLevelXp);
  const progress = Math.min(100, Math.max(0, ((profile.xp - currentLevelXp) / range) * 100));
  
  // Update condition: Level 2 or 1000 Gold
  const showSecurityPrompt = isGuest && (profile.coins >= 1000 || currentLevel >= 2);

  return (
    <div 
      onClick={() => onClick?.('PROFILE')}
      className={`flex flex-col items-center py-3 px-2 bg-black/40 backdrop-blur-2xl border border-white/10 rounded-full shadow-2xl transition-all duration-500 hover:bg-black/60 group cursor-pointer w-12 ${className}`}
    >
      {/* Mini Avatar */}
      <div className="relative mb-3">
        <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-white/10 to-transparent border border-white/10 flex items-center justify-center text-lg shadow-inner group-hover:scale-110 transition-transform duration-500 overflow-hidden">
          <VisualEmote trigger={avatar || ':smile:'} remoteEmotes={remoteEmotes} size="sm" />
        </div>
        {showSecurityPrompt && (
          <div className="absolute -top-0.5 -left-0.5 w-2 h-2 bg-rose-500 rounded-full animate-ping"></div>
        )}
      </div>

      {/* Level Info */}
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

      {/* Mini Currency */}
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-xs group-hover:rotate-12 transition-transform duration-300">💰</span>
        <span className="text-[8px] font-black text-yellow-500/90 leading-none tracking-tighter">
          {profile.coins > 999 ? (profile.coins / 1000).toFixed(1) + 'k' : profile.coins}
        </span>
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
