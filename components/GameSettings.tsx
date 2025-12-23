
import React, { useState } from 'react';
import { Card, CardCoverStyle } from './Card';
import { BackgroundTheme, AiDifficulty } from '../types';
import { PREMIUM_BOARDS, BoardPreview } from './UserHub';

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
}

const SectionHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-center gap-3 mb-4 mt-2">
    <div className="h-[1px] w-4 bg-yellow-500/30"></div>
    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-yellow-500/70 italic whitespace-nowrap">{children}</span>
    <div className="h-[1px] flex-1 bg-gradient-to-r from-yellow-500/30 to-transparent"></div>
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
  setSoundEnabled
}) => {
  const coverStyles: CardCoverStyle[] = ['BLUE', 'RED', 'PATTERN', 'GOLDEN_IMPERIAL', 'VOID_ONYX', 'ROYAL_JADE', 'CRYSTAL_EMERALD', 'DRAGON_SCALE', 'NEON_CYBER', 'PIXEL_CITY_LIGHTS'];

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300" onClick={onClose}>
      <div 
        className="relative bg-[#050505] border border-white/10 w-full max-w-lg max-h-[90vh] rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,1)] flex flex-col" 
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent flex justify-between items-center relative">
          <div className="flex flex-col">
            <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-white/80 to-white/30 uppercase italic tracking-widest font-serif leading-none">GAME SETTINGS</h2>
            <div className="flex items-center gap-2 mt-1.5">
               <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></span>
               <p className="text-[7px] font-black uppercase tracking-[0.4em] text-gray-500">Battlefield Configuration</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 bg-white/[0.03] hover:bg-red-600 text-white rounded-xl flex items-center justify-center transition-all active:scale-90 group border border-white/5">
            <span className="text-lg font-black group-hover:rotate-90 transition-transform">✕</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-10 scrollbar-thin scrollbar-thumb-white/10">
          
          {/* Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center justify-between bg-white/[0.02] p-4 rounded-2xl border border-white/5 group hover:border-white/10 transition-colors">
              <span className="text-[10px] font-black text-white/80 uppercase tracking-widest">Haptic Audio</span>
              <button 
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`w-12 h-6 rounded-full relative transition-all duration-500 ${soundEnabled ? 'bg-emerald-600 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-white/10'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-500 ${soundEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
            </div>
            {isSinglePlayer && setSpQuickFinish && (
              <div className="flex items-center justify-between bg-white/[0.02] p-4 rounded-2xl border border-white/5 group hover:border-white/10 transition-colors">
                <span className="text-[10px] font-black text-white/80 uppercase tracking-widest">Turbo Finish</span>
                <button 
                  onClick={() => setSpQuickFinish(!spQuickFinish)}
                  className={`w-12 h-6 rounded-full relative transition-all duration-500 ${spQuickFinish ? 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.3)]' : 'bg-white/10'}`}
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
                return (
                  <div 
                    key={style} 
                    onClick={() => onChangeCoverStyle(style)}
                    className={`relative flex flex-col items-center gap-1 cursor-pointer transition-all ${active ? 'scale-110' : 'opacity-40 grayscale-[0.5] hover:opacity-100 hover:grayscale-0'}`}
                  >
                    <Card faceDown coverStyle={style} small className={`!w-12 !h-18 rounded-lg shadow-xl ${active ? 'ring-2 ring-yellow-500' : 'border-white/5'}`} />
                    {active && <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center text-[8px] text-black font-black border border-black shadow-lg">✓</div>}
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
            className="w-full py-3 bg-white/[0.02] hover:bg-red-600/10 border border-white/5 hover:border-red-500/20 rounded-2xl text-gray-500 hover:text-red-400 text-[9px] font-black uppercase tracking-[0.4em] transition-all"
          >
            WITHDRAW TO HQ
          </button>
        </div>
      </div>
    </div>
  );
};
