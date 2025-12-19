import React, { useState } from 'react';
import { Card, CardCoverStyle } from './Card';
import { BrandLogo } from './BrandLogo';
import { AiDifficulty } from '../types';

interface WelcomeScreenProps {
  onStart: (name: string, mode: 'SINGLE_PLAYER' | 'MULTI_PLAYER', coverStyle: CardCoverStyle, avatar: string, quickFinish?: boolean, difficulty?: AiDifficulty) => void;
}

const AVATARS = [
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', 
  '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦄',
];

const GlassPanel: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`relative bg-black/40 backdrop-blur-2xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-[2.5rem] overflow-hidden ${className}`}>
      <div className="absolute inset-0 rounded-[2.5rem] ring-1 ring-inset ring-white/5 pointer-events-none"></div>
      {children}
  </div>
);

const SectionHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-[10px] font-black uppercase tracking-[0.5em] text-yellow-500/80 flex items-center justify-center gap-4 mb-4">
    <span className="w-10 h-[1px] bg-gradient-to-r from-transparent to-yellow-500/30"></span>
    {children}
    <span className="w-10 h-[1px] bg-gradient-to-l from-transparent to-yellow-500/30"></span>
  </p>
);

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart }) => {
  const [name, setName] = useState('');
  const [coverStyle, setCoverStyle] = useState<CardCoverStyle>('BLUE');
  const [selectedAvatar, setSelectedAvatar] = useState<string>(AVATARS[0]);
  const [quickFinish, setQuickFinish] = useState(false);
  const [difficulty, setDifficulty] = useState<AiDifficulty>('MEDIUM');

  const getDifficultyStyles = (d: AiDifficulty, active: boolean) => {
    if (!active) return "text-gray-600 hover:text-gray-400 bg-white/[0.02] border-white/5";
    
    switch (d) {
      case 'EASY':
        return "bg-green-600/90 text-white shadow-[0_0_15px_rgba(22,163,74,0.4)] border-green-400/30";
      case 'MEDIUM':
        return "bg-gradient-to-b from-yellow-400 via-yellow-500 to-yellow-600 text-black shadow-[0_0_15px_rgba(234,179,8,0.4)] border-yellow-300/30";
      case 'HARD':
        return "bg-red-600/90 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)] border-red-400/30";
      default:
        return "bg-green-600 text-white";
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#113a1e] relative overflow-hidden flex flex-col items-center justify-center p-4 transition-colors duration-1000">
      {/* Brighter Premium Green Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] aspect-square bg-green-400/10 blur-[130px] rounded-full animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] aspect-square bg-emerald-300/10 blur-[130px] rounded-full animate-pulse [animation-delay:2s]"></div>
      
      {/* Technical Grid Overlay */}
      <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }}></div>
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

      <div className="max-w-lg w-full z-10 space-y-4 py-2 md:py-4">
        {/* Hero Section */}
        <div className="flex flex-col items-center mb-0 transform hover:scale-[1.02] transition-transform duration-700">
            <BrandLogo size="xl" />
        </div>

        <GlassPanel className="p-6 pt-2 md:p-10 md:pt-4 space-y-8">
          
          {/* Player Icon Section (Avatar) */}
          <div className="space-y-4">
            <SectionHeader>Player Icon</SectionHeader>
            <div className="relative group flex flex-col items-center">
                <div className="relative mb-4">
                    <div className="absolute inset-[-15px] bg-yellow-500/10 blur-3xl rounded-full animate-pulse"></div>
                    <div className="w-20 h-20 md:w-28 md:h-28 bg-gradient-to-br from-white/[0.05] to-white/[0.01] rounded-full flex items-center justify-center text-4xl md:text-6xl border border-white/10 shadow-2xl group-hover:scale-105 transition-transform duration-500">
                        {selectedAvatar}
                    </div>
                </div>
                <div className="w-full grid grid-cols-10 gap-2 bg-black/40 p-3 rounded-[1.5rem] border border-white/5 max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
                    {AVATARS.map((avatar) => (
                        <button
                            key={avatar}
                            onClick={() => setSelectedAvatar(avatar)}
                            className={`
                              aspect-square flex items-center justify-center rounded-xl text-lg transition-all duration-300
                              ${selectedAvatar === avatar 
                                ? 'bg-yellow-500/20 text-white ring-1 ring-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.3)]' 
                                : 'text-white/40 hover:bg-white/5 hover:text-white'}
                            `}
                        >
                            {avatar}
                        </button>
                    ))}
                </div>
            </div>
          </div>

          {/* Player Handle Section */}
          <div className="space-y-3">
            <SectionHeader>Player Handle</SectionHeader>
            <div className="relative max-w-sm mx-auto">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={15}
                className="w-full px-6 py-4 rounded-2xl bg-black/50 border border-white/10 focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/30 focus:outline-none text-white text-lg font-black tracking-[0.2em] uppercase placeholder:text-white/10 transition-all text-center"
                placeholder="ENTER HANDLE"
              />
              <div className="absolute bottom-2 right-4 text-[8px] font-black text-white/20 tracking-widest">{name.length}/15</div>
            </div>
          </div>

          {/* Deck Variant Section */}
          <div className="space-y-4">
            <SectionHeader>Deck Variant</SectionHeader>
            <div className="flex justify-center gap-6 md:gap-8">
               {(['BLUE', 'RED', 'PATTERN'] as CardCoverStyle[]).map((style) => (
                 <div 
                    key={style}
                    onClick={() => setCoverStyle(style)}
                    className={`
                      cursor-pointer transition-all duration-300 relative
                      ${coverStyle === style ? 'scale-110 z-10' : 'opacity-30 grayscale-[0.5] hover:opacity-100 hover:grayscale-0 hover:scale-105'}
                    `}
                 >
                   {coverStyle === style && (
                      <div className="absolute inset-[-15px] bg-yellow-500/10 blur-2xl rounded-full"></div>
                   )}
                   <Card faceDown coverStyle={style} small className={`!w-14 !h-20 ${coverStyle === style ? 'ring-2 ring-yellow-500 shadow-2xl' : ''}`} />
                 </div>
               ))}
            </div>
          </div>

          {/* AI Settings Section */}
          <div className="space-y-4">
            <SectionHeader>AI Settings</SectionHeader>
            <div className="flex flex-col gap-4 max-w-md mx-auto">
                <div className="grid grid-cols-3 gap-3 bg-black/30 p-1.5 rounded-2xl border border-white/5">
                    {(['EASY', 'MEDIUM', 'HARD'] as AiDifficulty[]).map((d) => (
                        <button
                            key={d}
                            onClick={() => setDifficulty(d)}
                            className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all border active:scale-95 ${getDifficultyStyles(d, difficulty === d)}`}
                        >
                            {d}
                        </button>
                    ))}
                </div>
                
                <button 
                    onClick={() => setQuickFinish(!quickFinish)}
                    className={`
                        w-full py-4 rounded-2xl border font-black text-[10px] uppercase tracking-[0.2em] transition-all flex flex-col items-center justify-center gap-1
                        ${quickFinish 
                            ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.2)]' 
                            : 'bg-white/[0.01] border-white/5 text-gray-600 hover:text-gray-400'}
                    `}
                >
                    <div className="flex items-center gap-4">
                        <div className={`w-9 h-5 rounded-full relative transition-colors duration-300 ${quickFinish ? 'bg-yellow-500/50' : 'bg-white/10'}`}>
                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-300 ${quickFinish ? 'translate-x-4' : 'translate-x-0.5'}`}></div>
                        </div>
                        Quick Finish Mode
                    </div>
                    <span className="text-[7px] font-black opacity-60">SKIP AI SPECTATE ON WIN</span>
                </button>
            </div>
          </div>

          {/* Game Mode Selection Section */}
          <div className="space-y-4">
            <SectionHeader>Game Mode</SectionHeader>
            <div className="flex flex-col gap-4">
               <button
                onClick={() => onStart(name || 'GUEST', 'MULTI_PLAYER', coverStyle, selectedAvatar)}
                className="group w-full relative overflow-hidden py-5 rounded-[1.8rem] font-black uppercase tracking-[0.2em] transition-all shadow-[0_20px_50px_rgba(0,0,0,0.5)] active:scale-[0.98]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-700 via-green-600 to-emerald-700 group-hover:scale-110 transition-transform duration-500"></div>
                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_3s_infinite] pointer-events-none"></div>
                <span className="relative z-10 text-white flex items-center justify-center gap-3 drop-shadow-md whitespace-nowrap px-8 text-xs sm:text-sm md:text-base">
                  Play Online <span className="text-xl group-hover:translate-x-1 transition-transform">⚔️</span>
                </span>
              </button>

              <button
                  onClick={() => onStart(name || 'GUEST', 'SINGLE_PLAYER', coverStyle, selectedAvatar, quickFinish, difficulty)}
                  className="group w-full py-5 bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-gray-300 font-black text-xs uppercase tracking-[0.2em] rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                  Train Against AI 🤖
              </button>
            </div>
          </div>
        </GlassPanel>

        {/* Global Shimmer Animation */}
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
