
import React from 'react';
import { Card, CardCoverStyle } from './Card';
import { BackgroundTheme, AiDifficulty } from '../types';
import { PREMIUM_BOARDS, BoardPreview } from './UserHub';
import { SUPER_PRESTIGE_SLEEVE_IDS } from './Store';

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
}

const PRESTIGE_SLEEVE_IDS: CardCoverStyle[] = [
  'ROYAL_JADE', 'CRYSTAL_EMERALD', 'GOLDEN_IMPERIAL', 'VOID_ONYX', 
  'DRAGON_SCALE', 'NEON_CYBER', 'PIXEL_CITY_LIGHTS', 'AMETHYST_ROYAL', 
  'CHERRY_BLOSSOM_NOIR', 'AETHER_VOID'
];

const SectionHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-center gap-3 mb-4 mt-2">
    <div className="h-[1px] w-4 bg-yellow-500/30"></div>
    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-yellow-500/70 italic whitespace-nowrap">{children}</span>
    <div className="h-[1px] flex-1 bg-gradient-to-r from-yellow-500/30 to-transparent"></div>
  </div>
);

const getThemeStyles = (themeId: BackgroundTheme, active: boolean) => {
    if (!active) return "text-gray-500 hover:text-gray-300 bg-white/[0.02] border-white/5";
    
    switch (themeId) {
      case 'CLASSIC_GREEN':
        return "bg-[#064e3b] text-emerald-300 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]";
      case 'EMERALD':
        return "bg-emerald-600/90 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] border-emerald-400/30";
      case 'CYBER_BLUE':
        return "bg-blue-600/90 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] border-blue-400/30";
      case 'CRIMSON_VOID':
        return "bg-rose-900/90 text-white shadow-[0_0_15px_rgba(225,29,72,0.4)] border-rose-400/30";
      case 'CYBERPUNK_NEON':
        return "bg-slate-700/90 text-white shadow-[0_0_15px_rgba(51,65,85,0.4)] border-white/30";
      case 'OBSIDIAN_MADNESS':
        return "bg-black text-red-600 border-red-950 shadow-[0_0_20px_rgba(153,27,27,0.6)] font-black italic";
      case 'SHIBA':
        return "bg-orange-100 text-orange-600 border-orange-300 shadow-[0_0_20px_rgba(251,191,36,0.4)] font-black italic";
      case 'JUST_A_GIRL':
        return "bg-pink-100 text-pink-600 border-pink-300 shadow-[0_0_20px_rgba(244,114,182,0.4)] font-black italic";
      case 'LAS_VEGAS':
        return "bg-black text-yellow-500 border-yellow-500 shadow-[0_0_25px_rgba(251,191,36,0.6)] font-black italic uppercase tracking-widest";
      case 'LOTUS_FOREST':
        return "bg-pink-600/90 text-white shadow-[0_0_15px_rgba(219,39,119,0.4)] border-pink-400/30";
      case 'CHRISTMAS_YULETIDE':
        return "bg-blue-800/90 text-white shadow-[0_0_15px_rgba(30,58,138,0.4)] border-blue-400/30";
      case 'GOLDEN_EMPEROR':
        return "bg-gradient-to-r from-yellow-500 via-yellow-200 to-yellow-500 text-black border-yellow-300 shadow-[0_0_20px_rgba(234,179,8,0.5)]";
      case 'ZEN_POND':
        return "bg-[#082f49] text-cyan-400 border-cyan-500 shadow-[0_0_20px_rgba(34,211,238,0.4)] font-black italic";
      case 'HIGH_ROLLER':
        return "bg-black text-yellow-500 border-yellow-600 shadow-[0_0_25px_rgba(251,191,36,0.6)] font-black italic";
      case 'GOLD_FLUX':
        return "bg-[#fffbeb] text-yellow-600 border-yellow-400 shadow-[0_0_25px_rgba(251,191,36,0.4)] font-black italic";
      default:
        return "bg-white/10 text-white shadow-lg";
    }
};

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
  setPlayAnimationsEnabled
}) => {
  const coverStyles: CardCoverStyle[] = ['BLUE', 'RED', 'PATTERN', 'GOLDEN_IMPERIAL', 'VOID_ONYX', 'ROYAL_JADE', 'CRYSTAL_EMERALD', 'DRAGON_SCALE', 'NEON_CYBER', 'PIXEL_CITY_LIGHTS', 'AMETHYST_ROYAL', 'CHERRY_BLOSSOM_NOIR', 'AETHER_VOID', 'WITS_END', 'DIVINE_ROYAL', 'EMPERORS_HUBRIS'];

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300" onClick={onClose}>
      
      <div 
        className="relative bg-[#050505] border border-white/10 w-full max-lg max-h-[90vh] rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,1)] flex flex-col" 
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent flex justify-between items-center relative">
          <div className="flex flex-col">
            <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-white/90 to-white/40 uppercase italic tracking-widest font-serif leading-none">GAME SETTINGS</h2>
            <div className="flex items-center gap-2 mt-1.5">
               <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></span>
               <p className="text-[7px] font-black uppercase tracking-[0.4em] text-gray-500">Battlefield Configuration</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 bg-white/[0.03] hover:bg-red-600 text-white rounded-xl flex items-center justify-center transition-all active:scale-90 group border border-white/5"><span className="text-lg font-black group-hover:rotate-90 transition-transform">✕</span></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-10 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          
          {/* Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center justify-between bg-white/[0.02] p-4 rounded-2xl border border-white/5 group hover:border-white/10 transition-colors">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-black text-white/80 uppercase tracking-widest">Haptic Audio</span>
                <span className="text-[7px] font-bold text-white/30 uppercase tracking-tight">Enable immersive arena sound effects</span>
              </div>
              <button 
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`w-12 h-6 rounded-full relative transition-all duration-500 ${soundEnabled ? 'bg-emerald-600 shadow-[0_0_100px_rgba(16,185,129,0.3)]' : 'bg-white/10'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-500 ${soundEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
            </div>
            
            <div className="flex items-center justify-between bg-white/[0.02] p-4 rounded-2xl border border-white/5 group hover:border-white/10 transition-colors">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-black text-white/80 uppercase tracking-widest">Sleeve Face Effects</span>
                <span className="text-[7px] font-bold text-white/30 uppercase tracking-tight">Visual flair and glows on active card faces</span>
              </div>
              <button 
                onClick={() => setSleeveEffectsEnabled(!sleeveEffectsEnabled)}
                className={`w-12 h-6 rounded-full relative transition-all duration-500 ${sleeveEffectsEnabled ? 'bg-yellow-500 shadow-[0_0_100px_rgba(234,179,8,0.3)]' : 'bg-white/10'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-500 ${sleeveEffectsEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between bg-white/[0.02] p-4 rounded-2xl border border-white/5 group hover:border-white/10 transition-colors">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-black text-white/80 uppercase tracking-widest">Play Animations</span>
                <span className="text-[7px] font-bold text-white/30 uppercase tracking-tight">Organic card motion when tossed to arena</span>
              </div>
              <button 
                onClick={() => setPlayAnimationsEnabled(!playAnimationsEnabled)}
                className={`w-12 h-6 rounded-full relative transition-all duration-500 ${playAnimationsEnabled ? 'bg-emerald-600 shadow-[0_0_100px_rgba(16,185,129,0.3)]' : 'bg-white/10'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-500 ${playAnimationsEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
            </div>

            {isSinglePlayer && spQuickFinish !== undefined && setSpQuickFinish && (
              <div className="flex items-center justify-between bg-white/[0.02] p-4 rounded-2xl border border-white/5 group hover:border-white/10 transition-colors">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-black text-white/80 uppercase tracking-widest">Turbo Finish</span>
                  <span className="text-[7px] font-bold text-white/30 uppercase tracking-tight">End AI matches instantly upon your victory</span>
                </div>
                <button 
                  onClick={() => setSpQuickFinish(!spQuickFinish)}
                  className={`w-12 h-6 rounded-full relative transition-all duration-500 ${spQuickFinish ? 'bg-yellow-500 shadow-[0_0_100px_rgba(234,179,8,0.3)]' : 'bg-white/10'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-500 ${spQuickFinish ? 'translate-x-7' : 'translate-x-1'}`} />
                </button>
              </div>
            )}
          </div>

          {/* AI Difficulty */}
          {isSinglePlayer && currentDifficulty && onChangeDifficulty && (
            <div className="space-y-4">
              <SectionHeader>AI SETTINGS</SectionHeader>
              <div className="grid grid-cols-3 gap-2 p-1 bg-black/40 rounded-2xl border border-white/5">
                {(['EASY', 'MEDIUM', 'HARD'] as AiDifficulty[]).map(d => {
                  const active = currentDifficulty === d;
                  let activeStyle = "bg-yellow-500 text-black shadow-lg";
                  if (d === 'EASY') activeStyle = "bg-emerald-600 text-white shadow-lg";
                  if (d === 'HARD') activeStyle = "bg-red-600 text-white shadow-lg";
                  
                  return (
                    <button 
                      key={d} 
                      onClick={() => onChangeDifficulty(d)} 
                      className={`py-3 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${active ? activeStyle : 'text-white/30 hover:text-white/60 hover:bg-white/5'}`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Board Themes */}
          <div className="space-y-4">
            <SectionHeader>Arena Terrain</SectionHeader>
            <div className="grid grid-cols-2 gap-3 px-1">
              {PREMIUM_BOARDS.map(b => {
                const active = currentTheme === b.id;
                return (
                  <div 
                    key={b.id} 
                    onClick={() => onChangeTheme(b.id as BackgroundTheme)}
                    className="flex flex-col items-center gap-2 cursor-pointer group"
                  >
                    <BoardPreview themeId={b.id} active={active} />
                    <p className={`text-[8px] font-black uppercase tracking-widest text-center mt-1 ${active ? 'text-yellow-500' : 'text-white/40'}`}>{b.name}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card Covers */}
          <div className="space-y-4">
            <SectionHeader>Signature Sleeves</SectionHeader>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-4">
              {coverStyles.map(style => {
                const active = currentCoverStyle === style;
                const isLegendary = style === 'AETHER_VOID';
                const isPrestige = PRESTIGE_SLEEVE_IDS.includes(style);
                const isSuperPrestige = SUPER_PRESTIGE_SLEEVE_IDS.includes(style);

                return (
                  <div 
                    key={style} 
                    onClick={() => onChangeCoverStyle(style)}
                    className={`relative flex flex-col items-center gap-1 cursor-pointer transition-all ${active ? 'scale-110' : 'opacity-40 grayscale-[0.5] hover:opacity-100 hover:grayscale-0'}`}
                  >
                    <div className="relative group/card-badge">
                      <Card faceDown activeTurn={true} coverStyle={style} small className={`!w-12 !h-18 rounded-lg shadow-xl ${active ? 'ring-2 ring-yellow-500' : 'border-white/5'}`} disableEffects={!sleeveEffectsEnabled} />
                      {isPrestige && !isSuperPrestige && (
                        <div className="absolute -top-1 -left-1 bg-black/80 rounded-full w-4 h-4 flex items-center justify-center border border-yellow-500/30 shadow-lg z-20 group-hover/card-badge:scale-110 transition-transform">
                          <span className="text-yellow-500 text-[8px] font-black">♠</span>
                        </div>
                      )}
                      {isSuperPrestige && (
                        <div className="absolute -top-1.5 -left-1.5 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full w-5 h-5 flex items-center justify-center border border-white shadow-lg z-20 group-hover/card-badge:scale-110 transition-transform animate-pulse">
                          <span className="text-white text-[10px] font-black">♥</span>
                        </div>
                      )}
                    </div>
                    {active && <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center text-[8px] text-black font-black border border-black shadow-lg">✓</div>}
                    {isLegendary && <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-white rounded-full flex items-center justify-center text-[6px] shadow-lg animate-pulse">✨</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-8 bg-black/40 border-t border-white/5 flex flex-col gap-4">
          <button 
            onClick={onClose}
            className="w-full group relative overflow-hidden py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] shadow-2xl"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-green-500 to-emerald-600 group-hover:scale-110 transition-transform duration-500"></div>
            <span className="relative z-10 text-white">SAVE & RESUME ARENA</span>
          </button>
          
          <button 
            onClick={onExitGame}
            className="w-full py-3 bg-white/[0.02] hover:bg-red-600/10 border border-white/5 border-red-500/20 rounded-2xl text-gray-500 hover:text-red-400 text-[9px] font-black uppercase tracking-[0.4em] transition-all"
          >
            WITHDRAW TO HQ
          </button>
        </div>
      </div>
    </div>
  );
};
