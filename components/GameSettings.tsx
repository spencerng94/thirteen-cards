import React, { useState } from 'react';
import { Card, CardCoverStyle } from './Card';
import { BackgroundTheme, AiDifficulty } from '../types';
import { PREMIUM_BOARDS, BoardPreview } from './UserHub';
import { SUPER_PRESTIGE_SLEEVE_IDS, SOVEREIGN_IDS, SLEEVES as ALL_STORE_SLEEVES } from './Store';
import { InstructionsModal } from './InstructionsModal';

export type SocialFilter = 'UNMUTED' | 'FRIENDS_ONLY' | 'MUTED';

interface GameSettingsProps {
  onClose: () => void;
  onExitGame: () => void;
  currentCoverStyle: CardCoverStyle;
  onChangeCoverStyle: (style: CardCoverStyle) => void;
  currentTheme: BackgroundTheme;
  onChangeTheme: (theme: BackgroundTheme) => void;
  isSinglePlayer?: boolean;
  spQuickFinish?: boolean;
  setSpQuickFinish?: (val: boolean) => void;
  currentDifficulty?: AiDifficulty;
  onChangeDifficulty?: (d: AiDifficulty) => void;
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;
  sleeveEffectsEnabled: boolean;
  setSleeveEffectsEnabled: (val: boolean) => void;
  playAnimationsEnabled: boolean;
  setPlayAnimationsEnabled: (val: boolean) => void;
  autoPassEnabled?: boolean;
  setAutoPassEnabled?: (val: boolean) => void;
  unlockedSleeves?: string[];
  unlockedBoards?: string[];
  socialFilter?: SocialFilter;
  setSocialFilter?: (filter: SocialFilter) => void;
}

const PRESTIGE_SLEEVE_IDS: CardCoverStyle[] = [
  'ROYAL_JADE', 'CRYSTAL_EMERALD', 'GOLDEN_IMPERIAL', 'VOID_ONYX', 
  'DRAGON_SCALE', 'NEON_CYBER', 'PIXEL_CITY_LIGHTS', 'AMETHYST_ROYAL', 
  'CHERRY_BLOSSOM_NOIR', 'AETHER_VOID'
];

const SectionHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-center gap-3 mb-5 sm:mb-6 mt-2">
    <div className="h-[2px] w-6 sm:w-8 bg-gradient-to-r from-yellow-500/50 to-yellow-500/20"></div>
    <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-yellow-400/80 whitespace-nowrap drop-shadow-[0_0_10px_rgba(251,191,36,0.3)]">{children}</span>
    <div className="h-[2px] flex-1 bg-gradient-to-r from-yellow-500/30 via-yellow-500/10 to-transparent"></div>
  </div>
);

export const GameSettings: React.FC<GameSettingsProps> = ({ 
  onClose, 
  onExitGame,
  currentCoverStyle,
  onChangeCoverStyle,
  currentTheme,
  onChangeTheme,
  isSinglePlayer,
  spQuickFinish,
  setSpQuickFinish,
  currentDifficulty,
  onChangeDifficulty,
  soundEnabled,
  setSoundEnabled,
  sleeveEffectsEnabled,
  setSleeveEffectsEnabled,
  playAnimationsEnabled,
  setPlayAnimationsEnabled,
  autoPassEnabled = false,
  setAutoPassEnabled,
  unlockedSleeves = [],
  unlockedBoards = [],
  socialFilter = 'UNMUTED',
  setSocialFilter
}) => {
  const [showHelp, setShowHelp] = useState(false);
  const [activeTab, setActiveTab] = useState<'GAMEPLAY' | 'APPEARANCE'>('GAMEPLAY');
  const coverStyles: CardCoverStyle[] = ['BLUE', 'RED', 'PATTERN', 'GOLDEN_IMPERIAL', 'VOID_ONYX', 'ROYAL_JADE', 'CRYSTAL_EMERALD', 'DRAGON_SCALE', 'NEON_CYBER', 'PIXEL_CITY_LIGHTS', 'AMETHYST_ROYAL', 'CHERRY_BLOSSOM_NOIR', 'AETHER_VOID', 'WITS_END', 'DIVINE_ROYAL', 'EMPERORS_HUBRIS', 'SOVEREIGN_SPADE', 'SOVEREIGN_CLUB', 'SOVEREIGN_DIAMOND', 'SOVEREIGN_HEART', 'ROYAL_CROSS'];

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 sm:p-6 animate-in fade-in duration-300" onClick={onClose} style={{ touchAction: 'none' }}>
      <div 
        className="relative bg-gradient-to-br from-[#0a0a0a] via-[#080808] to-[#000000] border-2 border-white/20 w-full max-w-4xl max-h-[95vh] rounded-3xl sm:rounded-[3rem] overflow-hidden shadow-[0_0_150px_rgba(0,0,0,1)] flex flex-col" 
        onClick={e => e.stopPropagation()}
        style={{ touchAction: 'pan-y' }}
      >
        {/* Premium Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(251,191,36,0.08)_0%,transparent_70%)]"></div>
        <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.02)_50%,transparent_100%)]"></div>
        
        {/* Premium Header */}
        <div className="relative px-6 sm:px-8 md:px-10 py-6 sm:py-8 border-b border-white/20 bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-transparent backdrop-blur-xl flex justify-between items-center">
          <div className="flex flex-col gap-2">
            <h2 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-400 via-yellow-300 to-yellow-500 uppercase italic tracking-tight font-serif leading-none drop-shadow-[0_4px_20px_rgba(251,191,36,0.3)]">
              GAME SETTINGS
            </h2>
            <button
              onClick={() => setShowHelp(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] border border-white/20 hover:border-yellow-500/40 text-white/70 hover:text-yellow-400 transition-all duration-200 active:scale-95 group w-fit"
            >
              <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse shadow-[0_0_12px_rgba(251,191,36,0.8)] flex-shrink-0"></div>
              <span className="text-xs sm:text-sm font-semibold uppercase tracking-wide group-hover:tracking-wider transition-all whitespace-nowrap">HELP</span>
              <svg className="w-3.5 h-3.5 group-hover:scale-110 transition-transform flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-white/[0.08] hover:bg-white/[0.12] border-2 border-white/20 hover:border-white/30 text-white/70 hover:text-white flex items-center justify-center transition-all active:scale-95 group backdrop-blur-sm shadow-lg"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="relative px-6 sm:px-8 md:px-10 pt-6 pb-0 border-b border-white/20">
          <div className="flex gap-2 sm:gap-3">
            <button
              onClick={() => setActiveTab('GAMEPLAY')}
              className={`relative px-6 sm:px-8 py-3 sm:py-4 rounded-t-2xl sm:rounded-t-3xl font-bold text-sm sm:text-base uppercase tracking-wide transition-all duration-300 ${
                activeTab === 'GAMEPLAY'
                  ? 'bg-gradient-to-br from-white/[0.12] via-white/[0.08] to-white/[0.12] text-yellow-400 border-2 border-b-0 border-white/30 shadow-[0_0_20px_rgba(251,191,36,0.2)]'
                  : 'bg-white/[0.03] text-white/40 hover:text-white/70 hover:bg-white/[0.06] border-2 border-b-0 border-transparent'
              }`}
            >
              <span className="relative z-10">GAMEPLAY</span>
              {activeTab === 'GAMEPLAY' && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-yellow-400/50 to-transparent"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('APPEARANCE')}
              className={`relative px-6 sm:px-8 py-3 sm:py-4 rounded-t-2xl sm:rounded-t-3xl font-bold text-sm sm:text-base uppercase tracking-wide transition-all duration-300 ${
                activeTab === 'APPEARANCE'
                  ? 'bg-gradient-to-br from-white/[0.12] via-white/[0.08] to-white/[0.12] text-yellow-400 border-2 border-b-0 border-white/30 shadow-[0_0_20px_rgba(251,191,36,0.2)]'
                  : 'bg-white/[0.03] text-white/40 hover:text-white/70 hover:bg-white/[0.06] border-2 border-b-0 border-transparent'
              }`}
            >
              <span className="relative z-10">APPEARANCE</span>
              {activeTab === 'APPEARANCE' && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-yellow-400/50 to-transparent"></div>
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div 
          className="flex-1 overflow-y-auto p-6 sm:p-8 md:p-10 space-y-8 sm:space-y-10 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
          style={{
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            touchAction: 'pan-y'
          }}
        >
          
          {/* GAMEPLAY Tab Content */}
          {activeTab === 'GAMEPLAY' && (
            <>
          {/* Premium Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <div className="relative flex items-center justify-between bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-white/[0.08] backdrop-blur-xl p-5 sm:p-6 rounded-2xl sm:rounded-3xl border-2 border-white/20 hover:border-emerald-500/40 hover:shadow-[0_0_30px_rgba(16,185,129,0.2)] transition-all duration-300 group overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10 flex flex-col gap-1.5 flex-1">
                <span className="text-sm sm:text-base font-bold text-white uppercase tracking-wide">Haptic Audio</span>
                <span className="text-xs sm:text-sm font-medium text-white/50 uppercase tracking-tight">Enable immersive arena sound effects</span>
              </div>
              <button 
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`relative z-10 w-14 h-7 sm:w-16 sm:h-8 rounded-full transition-all duration-300 touch-manipulation ${
                  soundEnabled 
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-[0_0_25px_rgba(16,185,129,0.5)]' 
                    : 'bg-white/10 hover:bg-white/15 border-2 border-white/20'
                }`}
              >
                <div className={`absolute top-0.5 sm:top-1 left-0.5 sm:left-1 w-6 h-6 sm:w-6 sm:h-6 bg-white rounded-full transition-transform duration-300 shadow-lg flex items-center justify-center ${
                  soundEnabled ? 'translate-x-7 sm:translate-x-8' : 'translate-x-0'
                }`}>
                  {soundEnabled && (
                    <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </button>
            </div>
            
            <div className="relative flex items-center justify-between bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-white/[0.08] backdrop-blur-xl p-5 sm:p-6 rounded-2xl sm:rounded-3xl border-2 border-white/20 hover:border-yellow-500/40 hover:shadow-[0_0_30px_rgba(251,191,36,0.2)] transition-all duration-300 group overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10 flex flex-col gap-1.5 flex-1">
                <span className="text-sm sm:text-base font-bold text-white uppercase tracking-wide">Sleeve Face Effects</span>
                <span className="text-xs sm:text-sm font-medium text-white/50 uppercase tracking-tight">Visual flair and glows on active card faces</span>
              </div>
              <button 
                onClick={() => setSleeveEffectsEnabled(!sleeveEffectsEnabled)}
                className={`relative z-10 w-14 h-7 sm:w-16 sm:h-8 rounded-full transition-all duration-300 touch-manipulation ${
                  sleeveEffectsEnabled 
                    ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 shadow-[0_0_25px_rgba(251,191,36,0.5)]' 
                    : 'bg-white/10 hover:bg-white/15 border-2 border-white/20'
                }`}
              >
                <div className={`absolute top-0.5 sm:top-1 left-0.5 sm:left-1 w-6 h-6 sm:w-6 sm:h-6 bg-white rounded-full transition-transform duration-300 shadow-lg flex items-center justify-center ${
                  sleeveEffectsEnabled ? 'translate-x-7 sm:translate-x-8' : 'translate-x-0'
                }`}>
                  {sleeveEffectsEnabled && (
                    <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </button>
            </div>

            <div className="relative flex items-center justify-between bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-white/[0.08] backdrop-blur-xl p-5 sm:p-6 rounded-2xl sm:rounded-3xl border-2 border-white/20 hover:border-emerald-500/40 hover:shadow-[0_0_30px_rgba(16,185,129,0.2)] transition-all duration-300 group overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10 flex flex-col gap-1.5 flex-1">
                <span className="text-sm sm:text-base font-bold text-white uppercase tracking-wide">Play Animations</span>
                <span className="text-xs sm:text-sm font-medium text-white/50 uppercase tracking-tight">Organic card motion when tossed to arena</span>
              </div>
              <button 
                onClick={() => setPlayAnimationsEnabled(!playAnimationsEnabled)}
                className={`relative z-10 w-14 h-7 sm:w-16 sm:h-8 rounded-full transition-all duration-300 touch-manipulation ${
                  playAnimationsEnabled 
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-[0_0_25px_rgba(16,185,129,0.5)]' 
                    : 'bg-white/10 hover:bg-white/15 border-2 border-white/20'
                }`}
              >
                <div className={`absolute top-0.5 sm:top-1 left-0.5 sm:left-1 w-6 h-6 sm:w-6 sm:h-6 bg-white rounded-full transition-transform duration-300 shadow-lg flex items-center justify-center ${
                  playAnimationsEnabled ? 'translate-x-7 sm:translate-x-8' : 'translate-x-0'
                }`}>
                  {playAnimationsEnabled && (
                    <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </button>
            </div>

            {setAutoPassEnabled && (
              <div className="relative flex items-center justify-between bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-white/[0.08] backdrop-blur-xl p-5 sm:p-6 rounded-2xl sm:rounded-3xl border-2 border-white/20 hover:border-rose-500/40 hover:shadow-[0_0_30px_rgba(244,63,94,0.2)] transition-all duration-300 group overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative z-10 flex flex-col gap-1.5 flex-1">
                  <span className="text-sm sm:text-base font-bold text-white uppercase tracking-wide">Auto-Pass</span>
                  <span className="text-xs sm:text-sm font-medium text-white/50 uppercase tracking-tight">Automatically pass when no moves are possible</span>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (setAutoPassEnabled) {
                      setAutoPassEnabled(!autoPassEnabled);
                    }
                  }}
                  className={`relative z-10 w-14 h-7 sm:w-16 sm:h-8 rounded-full transition-all duration-300 touch-manipulation cursor-pointer ${
                    autoPassEnabled 
                      ? 'bg-gradient-to-r from-rose-500 to-rose-600 shadow-[0_0_25px_rgba(244,63,94,0.5)]' 
                      : 'bg-white/10 hover:bg-white/15 border-2 border-white/20'
                  }`}
                >
                  <div className={`absolute top-0.5 sm:top-1 left-0.5 sm:left-1 w-6 h-6 sm:w-6 sm:h-6 bg-white rounded-full transition-transform duration-300 shadow-lg flex items-center justify-center ${
                    autoPassEnabled ? 'translate-x-7 sm:translate-x-8' : 'translate-x-0'
                  }`}>
                    {autoPassEnabled && (
                      <svg className="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>
              </div>
            )}

            {isSinglePlayer && spQuickFinish !== undefined && setSpQuickFinish && (
              <div className="relative flex items-center justify-between bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-white/[0.08] backdrop-blur-xl p-5 sm:p-6 rounded-2xl sm:rounded-3xl border-2 border-white/20 hover:border-yellow-500/40 hover:shadow-[0_0_30px_rgba(251,191,36,0.2)] transition-all duration-300 group overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative z-10 flex flex-col gap-1.5 flex-1">
                  <span className="text-sm sm:text-base font-bold text-white uppercase tracking-wide">Turbo Finish</span>
                  <span className="text-xs sm:text-sm font-medium text-white/50 uppercase tracking-tight">End AI matches instantly upon your victory</span>
                </div>
                <button 
                  onClick={() => setSpQuickFinish(!spQuickFinish)}
                  className={`relative z-10 w-14 h-7 sm:w-16 sm:h-8 rounded-full transition-all duration-300 touch-manipulation ${
                    spQuickFinish 
                      ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 shadow-[0_0_25px_rgba(251,191,36,0.5)]' 
                      : 'bg-white/10 hover:bg-white/15 border-2 border-white/20'
                  }`}
                >
                  <div className={`absolute top-0.5 sm:top-1 left-0.5 sm:left-1 w-6 h-6 sm:w-6 sm:h-6 bg-white rounded-full transition-transform duration-300 shadow-lg flex items-center justify-center ${
                    spQuickFinish ? 'translate-x-7 sm:translate-x-8' : 'translate-x-0'
                  }`}>
                    {spQuickFinish && (
                      <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Social Filter - Premium */}
          {!isSinglePlayer && setSocialFilter && (
            <div className="space-y-5">
              <SectionHeader>Social Filter</SectionHeader>
              <div className="grid grid-cols-3 gap-3 p-1.5 bg-white/5 backdrop-blur-xl rounded-2xl sm:rounded-3xl border-2 border-white/10">
                {(['UNMUTED', 'FRIENDS_ONLY', 'MUTED'] as SocialFilter[]).map(filter => {
                  const active = socialFilter === filter;
                  let activeStyle = "bg-gradient-to-br from-yellow-500 to-yellow-600 text-black shadow-[0_0_25px_rgba(251,191,36,0.4)] scale-105";
                  if (filter === 'UNMUTED') activeStyle = "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-[0_0_25px_rgba(16,185,129,0.4)] scale-105";
                  if (filter === 'MUTED') activeStyle = "bg-gradient-to-br from-red-500 to-red-600 text-white shadow-[0_0_25px_rgba(239,68,68,0.4)] scale-105";
                  
                  const labels: Record<SocialFilter, string> = {
                    'UNMUTED': 'Unmuted',
                    'FRIENDS_ONLY': 'Friends Only',
                    'MUTED': 'Muted'
                  };
                  
                  return (
                    <button 
                      key={filter} 
                      onClick={() => setSocialFilter(filter)} 
                      className={`py-3 sm:py-4 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold uppercase tracking-wide transition-all duration-300 touch-manipulation ${
                        active 
                          ? activeStyle 
                          : 'text-white/40 hover:text-white/70 hover:bg-white/5 border-2 border-transparent hover:border-white/10'
                      }`}
                    >
                      {labels[filter]}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* AI Difficulty - Premium */}
          {isSinglePlayer && currentDifficulty && onChangeDifficulty && (
            <div className="space-y-5">
              <SectionHeader>AI SETTINGS</SectionHeader>
              <div className="grid grid-cols-3 gap-3 p-1.5 bg-white/5 backdrop-blur-xl rounded-2xl sm:rounded-3xl border-2 border-white/10">
                {(['EASY', 'MEDIUM', 'HARD'] as AiDifficulty[]).map(d => {
                  const active = currentDifficulty === d;
                  let activeStyle = "bg-gradient-to-br from-yellow-500 to-yellow-600 text-black shadow-[0_0_25px_rgba(251,191,36,0.4)] scale-105";
                  if (d === 'EASY') activeStyle = "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-[0_0_25px_rgba(16,185,129,0.4)] scale-105";
                  if (d === 'HARD') activeStyle = "bg-gradient-to-br from-red-500 to-red-600 text-white shadow-[0_0_25px_rgba(239,68,68,0.4)] scale-105";
                  
                  return (
                    <button 
                      key={d} 
                      onClick={() => onChangeDifficulty(d)} 
                      className={`py-3 sm:py-4 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold uppercase tracking-wide transition-all duration-300 touch-manipulation ${
                        active 
                          ? activeStyle 
                          : 'text-white/40 hover:text-white/70 hover:bg-white/5 border-2 border-transparent hover:border-white/10'
                      }`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
            </>
          )}

          {/* APPEARANCE Tab Content */}
          {activeTab === 'APPEARANCE' && (
            <>
          {/* Board Themes - Premium */}
          <div className="space-y-5">
            <SectionHeader>Arena Terrain</SectionHeader>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
              {PREMIUM_BOARDS.map(b => {
                const active = currentTheme === b.id;
                const isUnlocked = unlockedBoards.includes(b.id) || b.price === 0;
                return (
                  <div 
                    key={b.id} 
                    onClick={() => {
                        if (isUnlocked) onChangeTheme(b.id as BackgroundTheme);
                    }}
                    className={`relative flex flex-col items-center gap-3 cursor-pointer group transition-all duration-300 touch-manipulation ${
                      isUnlocked 
                        ? 'opacity-100' 
                        : 'opacity-50 grayscale hover:opacity-80'
                    } ${active ? 'scale-105' : 'hover:scale-105'}`}
                  >
                    <div className="relative w-full">
                      <div className={`absolute -inset-1 rounded-2xl transition-all duration-300 ${
                        active 
                          ? 'bg-gradient-to-r from-yellow-500/40 via-yellow-600/30 to-yellow-500/40 blur-lg opacity-100' 
                          : 'bg-gradient-to-r from-white/10 via-transparent to-white/10 blur-md opacity-0 group-hover:opacity-100'
                      }`}></div>
                      <BoardPreview themeId={b.id} active={active} unlocked={isUnlocked} className="relative z-10" />
                    </div>
                    <p className={`text-xs sm:text-sm font-bold uppercase tracking-wide text-center transition-colors duration-300 ${
                      active 
                        ? 'text-yellow-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]' 
                        : 'text-white/50 group-hover:text-white/70'
                    }`}>{b.name}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card Covers - Premium */}
          <div className="space-y-5">
            <SectionHeader>Signature Sleeves</SectionHeader>
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 gap-3 sm:gap-4">
              {coverStyles.map(style => {
                const active = currentCoverStyle === style;
                const isPrestige = PRESTIGE_SLEEVE_IDS.includes(style);
                const isSuperPrestige = SUPER_PRESTIGE_SLEEVE_IDS.includes(style);
                const isSovereign = SOVEREIGN_IDS.includes(style);
                const isUnlocked = unlockedSleeves.includes(style) || ALL_STORE_SLEEVES.find(s => s.style === style)?.price === 0;

                return (
                  <div 
                    key={style} 
                    onClick={() => {
                        if (isUnlocked) onChangeCoverStyle(style);
                    }}
                    className={`relative flex flex-col items-center gap-2 cursor-pointer transition-all duration-300 touch-manipulation ${
                      active 
                        ? 'scale-110' 
                        : isUnlocked 
                          ? 'opacity-100 hover:scale-105' 
                          : 'opacity-40 grayscale-[0.5] hover:opacity-100 hover:grayscale-0'
                    }`}
                  >
                    <div className="relative group/card-badge">
                      <div className={`absolute -inset-1 rounded-lg transition-all duration-300 ${
                        active 
                          ? 'bg-gradient-to-r from-yellow-500/40 via-yellow-600/30 to-yellow-500/40 blur-md opacity-100' 
                          : 'bg-gradient-to-r from-white/10 via-transparent to-white/10 blur-sm opacity-0 group-hover:opacity-100'
                      }`}></div>
                      <Card 
                        faceDown 
                        activeTurn={true} 
                        coverStyle={style} 
                        small 
                        className={`!w-14 !h-20 sm:!w-16 sm:!h-24 rounded-lg sm:rounded-xl shadow-xl transition-all duration-300 relative z-10 ${
                          active 
                            ? 'ring-2 ring-yellow-500 shadow-[0_0_25px_rgba(251,191,36,0.4)]' 
                            : 'border-white/10 hover:border-white/20'
                        }`} 
                      />
                      {isPrestige && !isSuperPrestige && (
                        <div className="absolute -top-1 -left-1 bg-black/90 backdrop-blur-sm rounded-full w-5 h-5 flex items-center justify-center border-2 border-yellow-500/50 shadow-lg z-20 group-hover/card-badge:scale-110 transition-transform duration-200">
                          <span className="text-yellow-400 text-[9px] font-black">♠</span>
                        </div>
                      )}
                      {isSuperPrestige && (
                        <div className="absolute -top-1.5 -left-1.5 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full w-6 h-6 flex items-center justify-center border-2 border-white/50 shadow-lg z-20 group-hover/card-badge:scale-110 transition-transform duration-200 animate-pulse">
                          <span className="text-white text-[11px] font-black">♥</span>
                        </div>
                      )}
                    </div>
                    {active && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center text-[9px] text-black font-black border-2 border-white/50 shadow-lg z-20">
                        ✓
                      </div>
                    )}
                    {!isUnlocked && isSovereign && (
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/90 backdrop-blur-sm border-2 border-yellow-500/50 px-2 py-1 rounded-full z-30">
                        <span className="text-[7px] font-black text-yellow-400 tracking-tighter">EVENT</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
            </>
          )}
        </div>

        {/* Premium Footer Actions */}
        <div className="relative p-6 sm:p-8 border-t border-white/20 bg-gradient-to-br from-white/[0.05] via-white/[0.02] to-transparent backdrop-blur-xl flex flex-col gap-4">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.02)_50%,transparent_100%)]"></div>
          
          <button 
            onClick={onClose}
            className="relative z-10 w-full group overflow-hidden py-4 sm:py-5 rounded-2xl sm:rounded-3xl font-bold text-sm sm:text-base uppercase tracking-wide shadow-2xl active:scale-95 transition-all duration-300"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 group-hover:from-emerald-500 group-hover:via-emerald-400 group-hover:to-emerald-500 transition-all duration-500"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            <span className="relative z-10 text-white drop-shadow-lg">SAVE & RESUME ARENA</span>
          </button>
          
          <button 
            onClick={onExitGame}
            className="relative z-10 w-full py-3 sm:py-4 bg-white/[0.05] hover:bg-red-600/20 border-2 border-white/10 hover:border-red-500/40 rounded-2xl sm:rounded-3xl text-white/60 hover:text-red-300 text-xs sm:text-sm font-bold uppercase tracking-wide transition-all duration-300 active:scale-95 backdrop-blur-sm"
          >
            WITHDRAW TO HQ
          </button>
        </div>
      </div>
      
      {/* Help Modal */}
      {showHelp && <InstructionsModal onClose={() => setShowHelp(false)} />}
    </div>
  );
};
