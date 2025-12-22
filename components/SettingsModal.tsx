
import React, { useState } from 'react';
import { Card, CardCoverStyle } from './Card';
import { BackgroundTheme, AiDifficulty } from '../types';
import { SignOutButton } from './SignOutButton';

interface SettingsModalProps {
  onClose: () => void;
  onExitGame: () => void;
  onSignOut: () => void;
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
  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-yellow-500/80 flex items-center justify-center gap-3 mb-5">
    <span className="w-8 h-[1px] bg-yellow-500/20"></span>
    {children}
    <span className="w-8 h-[1px] bg-yellow-500/20"></span>
  </p>
);

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  onClose, 
  onExitGame,
  onSignOut,
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
  const [hasChanged, setHasChanged] = useState(false);

  const getDifficultyStyles = (d: AiDifficulty, active: boolean) => {
    if (!active) return "text-gray-500 hover:text-gray-300 bg-white/[0.02] border-white/5";
    
    switch (d) {
      case 'EASY':
        return "bg-green-600/90 text-white shadow-[0_0_15px_rgba(22,163,74,0.4)] border-green-400/30";
      case 'MEDIUM':
        return "bg-gradient-to-b from-yellow-400 via-yellow-500 to-yellow-600 text-black shadow-[0_0_15px_rgba(234,179,8,0.4)] border-yellow-300/30";
      case 'HARD':
        return "bg-red-600/90 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)] border-red-400/30";
      default:
        return "bg-green-600 text-white shadow-lg";
    }
  };

  const getThemeStyles = (themeId: BackgroundTheme, active: boolean) => {
    if (!active) return "text-gray-500 hover:text-gray-300 bg-white/[0.02] border-white/5";
    
    switch (themeId) {
      case 'GREEN':
        return "bg-emerald-600/90 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] border-emerald-400/30";
      case 'CYBER_BLUE':
        return "bg-blue-600/90 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] border-blue-400/30";
      case 'CRIMSON_VOID':
        return "bg-rose-600/90 text-white shadow-[0_0_15px_rgba(225,29,72,0.4)] border-rose-400/30";
      default:
        return "bg-white/10 text-white";
    }
  };

  const handleChange = (fn: () => void) => {
    fn();
    setHasChanged(true);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={onClose}>
      <div 
        className="relative bg-black/60 backdrop-blur-2xl border border-white/10 w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.8)] flex flex-col transition-all duration-500 scale-100" 
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute inset-0 rounded-[2.5rem] ring-1 ring-inset ring-white/5 pointer-events-none"></div>

        <div className="p-6 md:p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <div className="flex flex-col">
            <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-white/90 to-white/40 uppercase tracking-tighter">USER SETTINGS</h2>
            <div className="flex items-center gap-2 mt-1">
                <span className="w-2 h-2 rounded-full bg-yellow-500/80 animate-pulse"></span>
                <span className="text-[8px] font-black uppercase tracking-[0.4em] text-gray-500">CUSTOMIZE GAME EXPERIENCE</span>
            </div>
          </div>
          
          <button 
            onClick={onClose} 
            className="w-10 h-10 rounded-full flex items-center justify-center bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-gray-400 hover:text-white transition-all group active:scale-90"
          >
            <span className="text-xl group-hover:rotate-90 transition-transform">✕</span>
          </button>
        </div>
        
        <div className="p-6 md:p-10 space-y-10 bg-transparent max-h-[75vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          <div className="grid grid-cols-1 gap-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white/[0.02] p-5 rounded-2xl border border-white/5 group hover:border-white/10 transition-colors">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/[0.03] rounded-xl border border-white/5 text-yellow-500/80 group-hover:text-yellow-400 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M11 5L6 9H2v6h4l5 4V5z" />
                            {soundEnabled ? (
                                <path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" />
                            ) : (
                                <path d="M23 9l-6 6M17 9l6 6" />
                            )}
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-xs font-black text-white/90 uppercase tracking-widest">Haptic Audio</h3>
                        <p className="text-[8px] text-gray-500 uppercase tracking-widest font-bold mt-0.5">Tactile Game Feedback</p>
                    </div>
                </div>
                <button 
                    onClick={() => handleChange(() => setSoundEnabled(!soundEnabled))}
                    className={`w-14 h-7 rounded-full relative transition-all duration-500 ${soundEnabled ? 'bg-green-600/80 shadow-[0_0_15px_rgba(22,163,74,0.3)]' : 'bg-white/5'}`}
                >
                    <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-500 ${soundEnabled ? 'translate-x-8' : 'translate-x-1'}`}></div>
                </button>
              </div>

              {isSinglePlayer && setSpQuickFinish && (
                <div className="flex items-center justify-between bg-white/[0.02] p-5 rounded-2xl border border-white/5 group hover:border-white/10 transition-colors">
                  <div className="flex items-center gap-4">
                      <div className="p-3 bg-white/[0.03] rounded-xl border border-white/5 text-yellow-500/80">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div>
                          <h3 className="text-xs font-black text-white/90 uppercase tracking-widest">Quick Finish</h3>
                          <p className="text-[8px] text-gray-500 uppercase tracking-widest font-bold mt-0.5">SKIP AI SPECTATE ON WIN</p>
                      </div>
                  </div>
                  <button 
                      onClick={() => handleChange(() => setSpQuickFinish(!spQuickFinish))}
                      className={`w-14 h-7 rounded-full relative transition-all duration-500 ${spQuickFinish ? 'bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.4)]' : 'bg-white/5'}`}
                  >
                      <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-lg transition-transform duration-500 ${spQuickFinish ? 'translate-x-8' : 'translate-x-1'}`}></div>
                  </button>
                </div>
              )}
            </div>

            {isSinglePlayer && currentDifficulty && onChangeDifficulty && (
               <div className="space-y-4">
                  <SectionHeader>AI DIFFICULTY</SectionHeader>
                  <div className="grid grid-cols-3 gap-3 bg-white/[0.03] p-1.5 rounded-2xl border border-white/5">
                      {(['EASY', 'MEDIUM', 'HARD'] as AiDifficulty[]).map((d) => (
                          <button
                              key={d}
                              onClick={() => handleChange(() => onChangeDifficulty(d))}
                              className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${getDifficultyStyles(d, currentDifficulty === d)} active:scale-95`}
                          >
                              {d}
                          </button>
                      ))}
                  </div>
               </div>
            )}

            <div className="space-y-4">
              <SectionHeader>BOARD THEME</SectionHeader>
              <div className="grid grid-cols-3 gap-3 bg-white/[0.03] p-1.5 rounded-2xl border border-white/5">
                 {[
                   { id: 'GREEN', name: 'Emerald' },
                   { id: 'CYBER_BLUE', name: 'Cobalt' },
                   { id: 'CRIMSON_VOID', name: 'Crimson' }
                 ].map((theme) => (
                   <button 
                      key={theme.id}
                      onClick={() => handleChange(() => onChangeTheme(theme.id as BackgroundTheme))}
                      className={`
                        py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border active:scale-95
                        ${getThemeStyles(theme.id as BackgroundTheme, currentTheme === theme.id)}
                      `}
                   >
                      {theme.name}
                   </button>
                 ))}
              </div>
            </div>

            <div className="space-y-4">
              <SectionHeader>Card Cover</SectionHeader>
              <div className="flex justify-center gap-6">
                 {(['BLUE', 'RED', 'PATTERN'] as CardCoverStyle[]).map((style) => (
                   <div 
                      key={style}
                      onClick={() => handleChange(() => onChangeCoverStyle(style))}
                      className={`
                        cursor-pointer transition-all duration-300 relative group
                        ${currentCoverStyle === style ? 'scale-110 z-10' : 'opacity-40 grayscale-[0.5] hover:opacity-100 hover:grayscale-0 hover:scale-105'}
                      `}
                   >
                     {currentCoverStyle === style && (
                        <div className="absolute inset-[-15px] bg-yellow-500/10 blur-2xl rounded-full animate-pulse"></div>
                     )}
                     <Card 
                        faceDown 
                        coverStyle={style} 
                        small 
                        className={`!w-16 !h-24 transition-all ${currentCoverStyle === style ? 'ring-2 ring-yellow-500 shadow-[0_15px_30px_rgba(0,0,0,0.6)]' : 'shadow-lg border-white/5'}`} 
                     />
                   </div>
                 ))}
              </div>
            </div>
          </div>

          <div className="pt-4 flex flex-col gap-4">
             {hasChanged && (
                <button
                  onClick={onClose}
                  className="group w-full relative overflow-hidden py-5 rounded-3xl font-black uppercase tracking-[0.2em] text-[10px] transition-all duration-300 active:scale-95 border border-emerald-400/30 shadow-[0_15px_40px_rgba(16,185,129,0.3)]"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-green-500 to-emerald-600 group-hover:scale-110 transition-transform duration-700"></div>
                  <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_3.5s_infinite] pointer-events-none"></div>
                  <span className="relative z-10 text-white flex items-center justify-center gap-3 drop-shadow-md">
                    Apply & Save Changes <span className="text-xl">✅</span>
                  </span>
                </button>
             )}

             <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={onExitGame}
                  className="group relative overflow-hidden py-5 bg-white/[0.02] hover:bg-white/[0.08] border border-white/10 rounded-3xl transition-all duration-300 active:scale-95"
                >
                  <span className="relative z-10 flex items-center justify-center gap-3 text-gray-500 group-hover:text-white font-black text-[11px] uppercase tracking-[0.4em] transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                    </svg>
                    Home
                  </span>
                </button>
                <SignOutButton onSignOut={onSignOut} className="py-5" />
             </div>
          </div>
        </div>
        
        <style dangerouslySetInnerHTML={{ __html: `
            @keyframes shimmer {
                0% { background-position: -100% 0; }
                100% { background-position: 100% 0; }
            }
        `}} />
      </div>
    </div>
  );
};
