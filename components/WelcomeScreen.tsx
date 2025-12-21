import React, { useState } from 'react';
import { Card, CardCoverStyle } from './Card';
import { BrandLogo } from './BrandLogo';
import { AiDifficulty } from '../types';

interface WelcomeScreenProps {
  onStart: (name: string, mode: 'SINGLE_PLAYER' | 'MULTI_PLAYER' | 'TUTORIAL', coverStyle: CardCoverStyle, avatar: string, quickFinish?: boolean, difficulty?: AiDifficulty) => void;
}

const AVATARS = [
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', 
  '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦄',
];

const AVATAR_NAMES: Record<string, string> = {
  '🐶': 'DOG', '🐱': 'CAT', '🐭': 'MOUSE', '🐹': 'HAMSTER', '🐰': 'RABBIT',
  '🦊': 'FOX', '🐻': 'BEAR', '🐼': 'PANDA', '🐨': 'KOALA', '🐯': 'TIGER',
  '🦁': 'LION', '🐮': 'COW', '🐷': 'PIG', '🐸': 'FROG', '🐵': 'MONKEY',
  '🐔': 'CHICKEN', '🐧': 'PENGUIN', '🐦': 'BIRD', '🐤': 'CHICK', '🦄': 'UNICORN',
};

const GlassPanel: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`relative bg-black/40 backdrop-blur-2xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-[2.5rem] overflow-hidden ${className}`}>
      <div className="absolute inset-0 rounded-[2.5rem] ring-1 ring-inset ring-white/5 pointer-events-none"></div>
      {children}
  </div>
);

const SectionHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-[10px] font-black uppercase tracking-[0.5em] text-yellow-300 flex items-center justify-center gap-4 mb-4">
    <span className="w-10 h-[1px] bg-gradient-to-r from-transparent to-yellow-300/40"></span>
    {children}
    <span className="w-10 h-[1px] bg-gradient-to-l from-transparent to-yellow-300/40"></span>
  </p>
);

interface MainActionButtonProps {
  onClick: () => void;
  variant: 'emerald' | 'gold' | 'charcoal';
  label: string;
  icon: string;
  showShimmer?: boolean;
}

const MainActionButton: React.FC<MainActionButtonProps> = ({ onClick, variant, label, icon, showShimmer = true }) => {
  const variantStyles = {
    emerald: {
      bg: 'from-emerald-700 via-green-500 to-emerald-700',
      border: 'border-emerald-400/30',
      shadow: 'shadow-emerald-900/40',
      text: 'text-white'
    },
    gold: {
      bg: 'from-yellow-600 via-yellow-400 to-yellow-600',
      border: 'border-yellow-300/40',
      shadow: 'shadow-yellow-900/40',
      text: 'text-black'
    },
    charcoal: {
      bg: 'from-slate-800 via-slate-700 to-slate-900',
      border: 'border-slate-500/30',
      shadow: 'shadow-black/60',
      text: 'text-white'
    }
  };

  const style = variantStyles[variant];

  return (
    <button
      onClick={onClick}
      className={`
        group w-full relative overflow-hidden py-5 rounded-[1.8rem] font-black uppercase tracking-[0.2em] 
        transition-all duration-300 active:scale-[0.98] border ${style.border} shadow-[0_15px_45px_rgba(0,0,0,0.6)] ${style.shadow}
      `}
    >
      {/* Dynamic Gradient Layer */}
      <div className={`absolute inset-0 bg-gradient-to-r ${style.bg} group-hover:scale-110 transition-transform duration-700`}></div>
      
      {/* Shimmer Effect (Optional) */}
      {showShimmer && (
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.25)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_3.5s_infinite] pointer-events-none"></div>
      )}

      {/* Glossy Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>
      
      {/* Content */}
      <span className={`relative z-10 flex items-center justify-center gap-3 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] whitespace-nowrap px-8 text-xs sm:text-sm md:text-base ${style.text}`}>
        {label} 
        <span className="text-xl group-hover:translate-x-1 group-hover:rotate-12 transition-transform duration-300">
          {icon}
        </span>
      </span>
    </button>
  );
};

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart }) => {
  const [name, setName] = useState('');
  const [coverStyle, setCoverStyle] = useState<CardCoverStyle>('RED');
  const [selectedAvatar, setSelectedAvatar] = useState<string>(() => AVATARS[Math.floor(Math.random() * AVATARS.length)]);
  const [quickFinish, setQuickFinish] = useState(true);
  const [difficulty, setDifficulty] = useState<AiDifficulty>('MEDIUM');

  const getDifficultyStyles = (d: AiDifficulty, active: boolean) => {
    if (!active) return "text-gray-600 hover:text-gray-400 bg-white/[0.02] border-white/5";
    
    switch (d) {
      case 'EASY':
        return "bg-green-600/90 text-white shadow-[0_0_15px_rgba(22,163,74,0.4)] border-green-400/30";
      case 'MEDIUM':
        return "bg-gradient-to-b from-yellow-300 via-yellow-500 to-yellow-600 text-black shadow-[0_0_15px_rgba(234,179,8,0.4)] border-yellow-300/30";
      case 'HARD':
        return "bg-red-600/90 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)] border-red-400/30";
      default:
        return "bg-green-600 text-white";
    }
  };

  const handleStartGame = (mode: 'SINGLE_PLAYER' | 'MULTI_PLAYER' | 'TUTORIAL') => {
    const finalName = name.trim() || AVATAR_NAMES[selectedAvatar] || 'GUEST';
    onStart(finalName, mode, coverStyle, selectedAvatar, quickFinish, difficulty);
  };

  return (
    <div className="min-h-screen w-full bg-[#113a1e] relative overflow-hidden flex flex-col items-center justify-center p-4 transition-colors duration-1000">
      <div className="absolute top-[-10%] left-[-10%] w-[60%] aspect-square bg-green-400/10 blur-[130px] rounded-full animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] aspect-square bg-emerald-300/10 blur-[130px] rounded-full animate-pulse [animation-delay:2s]"></div>
      
      <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }}></div>
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

      <div className="max-w-lg w-full z-10 space-y-4 py-2 md:py-4">
        <div className="flex flex-col items-center mb-0 transform hover:scale-[1.02] transition-transform duration-700">
            <BrandLogo size="xl" />
        </div>

        <GlassPanel className="p-6 pt-2 md:p-10 md:pt-4 space-y-8">
          
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

          <div className="space-y-3">
            <SectionHeader>Player Nickname</SectionHeader>
            <div className="relative max-w-sm mx-auto">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={15}
                className="w-full px-6 py-4 rounded-2xl bg-black/50 border border-white/10 focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/30 focus:outline-none text-white text-lg font-black tracking-[0.2em] uppercase placeholder:text-white/10 transition-all text-center"
                placeholder="ENTER NICKNAME"
              />
              <div className="absolute bottom-2 right-4 text-[8px] font-black text-white/20 tracking-widest">{name.length}/15</div>
            </div>
          </div>

          <div className="space-y-4">
            <SectionHeader>Card Cover</SectionHeader>
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
                      <div className="absolute inset-[-15px] bg-yellow-500/10 blur-2xl rounded-full animate-pulse"></div>
                   )}
                   <Card faceDown coverStyle={style} small className={`!w-14 !h-20 ${coverStyle === style ? 'ring-2 ring-yellow-500 shadow-2xl' : ''}`} />
                 </div>
               ))}
            </div>
          </div>

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

          <div className="space-y-4">
            <SectionHeader>Game Mode</SectionHeader>
            <div className="flex flex-col gap-4">
              <MainActionButton 
                onClick={() => handleStartGame('MULTI_PLAYER')}
                variant="emerald"
                label="Play Online"
                icon="⚔️"
              />
              <MainActionButton 
                onClick={() => handleStartGame('SINGLE_PLAYER')}
                variant="gold"
                label="Train Against AI"
                icon="🤖"
              />
              <MainActionButton 
                onClick={() => handleStartGame('TUTORIAL')}
                variant="charcoal"
                label="Tutorial"
                icon="🎓"
                showShimmer={false}
              />
            </div>
          </div>
        </GlassPanel>

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
