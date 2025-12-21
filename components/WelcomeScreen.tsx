
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

const PremiumPanel: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`relative bg-black/50 backdrop-blur-[40px] border border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.8)] rounded-[3rem] overflow-hidden ${className}`}>
      {/* Precision Rim Light */}
      <div className="absolute inset-0 rounded-[3rem] ring-1 ring-inset ring-white/10 pointer-events-none"></div>
      {/* Subtle Texture Overlay */}
      <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] pointer-events-none"></div>
      {children}
  </div>
);

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-center justify-center gap-4 mb-3">
    <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-yellow-500/20"></div>
    <span className="text-[10px] font-black uppercase tracking-[0.6em] text-yellow-500/70 italic drop-shadow-sm">{children}</span>
    <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-yellow-500/20"></div>
  </div>
);

const LuxuryButton: React.FC<{ 
  onClick: () => void; 
  variant: 'gold' | 'emerald' | 'ghost'; 
  label: string; 
  icon: string;
  sublabel?: string;
  slim?: boolean;
}> = ({ onClick, variant, label, icon, sublabel, slim }) => {
  const themes = {
    gold: "from-yellow-600 via-yellow-400 to-yellow-700 text-black border-yellow-300/40 shadow-yellow-900/40",
    emerald: "from-emerald-700 via-green-500 to-emerald-800 text-white border-emerald-400/40 shadow-emerald-900/40",
    ghost: "from-white/10 to-white/5 text-white/80 border-white/10 hover:border-white/30"
  };

  return (
    <button
      onClick={onClick}
      className={`
        group relative w-full ${slim ? 'py-3.5' : 'py-4'} px-8 rounded-2xl border transition-all duration-300 active:scale-95 overflow-hidden
        ${themes[variant]} shadow-[0_15px_30px_rgba(0,0,0,0.4)]
      `}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${themes[variant]} group-hover:scale-110 transition-transform duration-700 opacity-90`}></div>
      <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_4s_infinite] pointer-events-none"></div>
      
      <div className="relative z-10 flex flex-col items-center justify-center gap-0.5">
        <div className="flex items-center gap-3">
            <span className="text-sm md:text-base font-black uppercase tracking-[0.25em] drop-shadow-md">{label}</span>
            <span className="text-xl group-hover:scale-125 group-hover:rotate-12 transition-transform duration-300">{icon}</span>
        </div>
        {sublabel && <span className="text-[8px] font-black opacity-60 tracking-[0.3em] uppercase">{sublabel}</span>}
      </div>
    </button>
  );
};

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart }) => {
  const [name, setName] = useState('');
  const [coverStyle, setCoverStyle] = useState<CardCoverStyle>('RED');
  const [selectedAvatar, setSelectedAvatar] = useState<string>(() => AVATARS[Math.floor(Math.random() * AVATARS.length)]);
  const [quickFinish, setQuickFinish] = useState(true);
  const [difficulty, setDifficulty] = useState<AiDifficulty>('MEDIUM');

  const handleStartGame = (mode: 'SINGLE_PLAYER' | 'MULTI_PLAYER' | 'TUTORIAL') => {
    const finalName = name.trim() || AVATAR_NAMES[selectedAvatar] || 'GUEST';
    onStart(finalName, mode, coverStyle, selectedAvatar, quickFinish, difficulty);
  };

  return (
    <div className="min-h-screen w-full bg-[#031109] relative overflow-hidden flex flex-col items-center justify-center p-4">
      {/* Deep Animated Atmosphere */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_#092b15_0%,_#000000_100%)]"></div>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] bg-emerald-500/10 blur-[150px] animate-pulse"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[80%] h-[80%] bg-green-400/10 blur-[150px] animate-pulse [animation-delay:2.5s]"></div>
      </div>

      {/* Ambient Particle Layer */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
        {Array.from({ length: 20 }).map((_, i) => (
          <div 
            key={i} 
            className="absolute bg-white/20 rounded-full blur-[1px] animate-[float_15s_linear_infinite]"
            style={{
              width: `${Math.random() * 2 + 1}px`,
              height: `${Math.random() * 2 + 1}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 8}s`,
              animationDuration: `${Math.random() * 10 + 15}s`
            }}
          ></div>
        ))}
      </div>

      <div className="max-w-xl w-full z-10 flex flex-col items-center gap-1.5">
        <div className="animate-[logoEnter_1.5s_cubic-bezier(0.2,0,0.2,1)] drop-shadow-[0_0_50px_rgba(251,191,36,0.1)] mb-6">
          <BrandLogo size="lg" />
        </div>

        <PremiumPanel className="w-full px-8 pt-4 pb-6 md:px-10 md:pt-6 md:pb-8 space-y-6">
          
          {/* Identity Selection */}
          <div className="space-y-3">
            <SectionLabel>Player Profile</SectionLabel>
            <div className="flex flex-col md:flex-row items-center gap-5">
              <div className="relative group">
                <div className="absolute inset-[-15px] bg-yellow-500/10 blur-2xl rounded-full animate-pulse group-hover:bg-yellow-500/20 transition-colors"></div>
                <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full bg-black/40 border-2 border-yellow-500/30 flex items-center justify-center text-5xl md:text-6xl shadow-[inset_0_0_30px_rgba(251,191,36,0.1)] group-hover:scale-105 transition-transform duration-500">
                  {selectedAvatar}
                  <div className="absolute inset-0 rounded-full border border-white/5 animate-[spin_10s_linear_infinite]"></div>
                </div>
              </div>
              
              <div className="flex-1 w-full space-y-2.5">
                <div className="relative">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={15}
                    placeholder="ENTER CODENAME"
                    className="w-full px-5 py-3 bg-black/40 border border-white/10 rounded-2xl text-center text-white font-black tracking-[0.2em] uppercase focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/30 outline-none transition-all placeholder:text-white/10"
                  />
                  <div className="absolute right-4 bottom-1.5 text-[7px] font-black text-white/20 tracking-widest">{name.length}/15 CHARS</div>
                </div>
                
                <div className="grid grid-cols-10 gap-1 p-2 bg-black/40 rounded-2xl border border-white/5 max-h-24 overflow-y-auto no-scrollbar">
                  {AVATARS.map((a) => (
                    <button
                      key={a}
                      onClick={() => setSelectedAvatar(a)}
                      className={`
                        aspect-square flex items-center justify-center rounded-lg text-base transition-all duration-300
                        ${selectedAvatar === a ? 'bg-yellow-500/20 ring-1 ring-yellow-500/50 scale-110' : 'opacity-40 hover:opacity-100 hover:bg-white/5'}
                      `}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Logic & Visual Preferences */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <SectionLabel>AI Settings</SectionLabel>
              <div className="grid grid-cols-3 gap-2 p-1.5 bg-black/40 rounded-xl border border-white/5">
                {(['EASY', 'MEDIUM', 'HARD'] as AiDifficulty[]).map((d) => {
                  const activeColor = d === 'EASY' ? 'bg-green-600 text-white' : d === 'HARD' ? 'bg-red-600 text-white' : 'bg-yellow-500 text-black';
                  const shadowColor = d === 'EASY' ? 'shadow-green-900/40' : d === 'HARD' ? 'shadow-red-900/40' : 'shadow-yellow-900/40';
                  
                  return (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={`
                        py-2.5 rounded-lg text-[8px] font-black tracking-widest transition-all
                        ${difficulty === d 
                          ? `${activeColor} shadow-lg ${shadowColor}` 
                          : 'text-white/40 hover:text-white hover:bg-white/5'}
                      `}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
              <button 
                onClick={() => setQuickFinish(!quickFinish)}
                className={`
                  w-full py-3 px-4 rounded-xl border flex items-center justify-between group transition-all
                  ${quickFinish ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-black/20 border-white/5'}
                `}
              >
                <div className="flex flex-col items-start">
                    <span className={`text-[8px] font-black uppercase tracking-widest ${quickFinish ? 'text-yellow-500' : 'text-white/40'}`}>Turbo Finish</span>
                    <span className="text-[6px] font-black opacity-30 uppercase tracking-tighter">Skip Bot Spectate</span>
                </div>
                <div className={`w-8 h-4 rounded-full relative transition-all duration-300 ${quickFinish ? 'bg-yellow-500/50' : 'bg-white/10'}`}>
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-all duration-300 ${quickFinish ? 'translate-x-4' : 'translate-x-0.5'}`}></div>
                </div>
              </button>
            </div>

            <div className="space-y-4">
              <SectionLabel>Card Cover</SectionLabel>
              <div className="flex justify-center gap-6">
                {(['BLUE', 'RED', 'PATTERN'] as CardCoverStyle[]).map((style) => (
                  <button 
                    key={style}
                    onClick={() => setCoverStyle(style)}
                    className={`
                      relative transition-all duration-300 transform-gpu
                      ${coverStyle === style ? 'scale-110 z-10' : 'opacity-30 hover:opacity-100 grayscale-[0.5] hover:grayscale-0'}
                    `}
                  >
                    {coverStyle === style && <div className="absolute inset-[-10px] bg-yellow-500/20 blur-xl rounded-full animate-pulse"></div>}
                    <Card faceDown coverStyle={style} small className={`!w-12 !h-18 ${coverStyle === style ? 'ring-2 ring-yellow-500 shadow-2xl' : 'shadow-lg'}`} />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Core Actions */}
          <div className="space-y-3 pt-1">
            <LuxuryButton 
              onClick={() => handleStartGame('MULTI_PLAYER')}
              variant="emerald"
              label="Join Global Arena"
              icon="⚔️"
              sublabel="Online Multiplayer"
            />
            <div className="grid grid-cols-2 gap-3">
              <LuxuryButton 
                onClick={() => handleStartGame('SINGLE_PLAYER')}
                variant="gold"
                label="Simulate"
                icon="🤖"
                sublabel="Bot Game"
                slim
              />
              <LuxuryButton 
                onClick={() => handleStartGame('TUTORIAL')}
                variant="ghost"
                label="Training"
                icon="🎓"
                sublabel="Tutorial"
                slim
              />
            </div>
          </div>
        </PremiumPanel>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer {
          0% { background-position: -100% 0; }
          100% { background-position: 100% 0; }
        }
        @keyframes float {
          0% { transform: translate(0, 0) scale(1); opacity: 0; }
          20% { opacity: 0.3; }
          80% { opacity: 0.3; }
          100% { transform: translate(100px, -800px) scale(0.5); opacity: 0; }
        }
        @keyframes logoEnter {
          0% { opacity: 0; transform: translateY(40px) scale(0.9); filter: blur(15px); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
};
