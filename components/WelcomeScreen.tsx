
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

// --- Brand Asset: Leiwen Accent ---
const LeiwenCorner: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg viewBox="0 0 40 40" className={`w-4 h-4 ${className}`} xmlns="http://www.w3.org/2000/svg">
    <path d="M 5 5 H 35 V 35 H 10 V 10 H 30 V 30 H 15 V 15 H 25" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" />
  </svg>
);

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
    // Polished Imperial Gold
    gold: {
      bg: "from-[#3d280a] via-[#b8860b] to-[#3d280a]",
      highlight: "from-[#b8860b] via-[#fbf5b7] to-[#8b6508]",
      text: "text-black",
      border: "border-yellow-300/40",
      accent: "text-yellow-900/60",
      shadow: "shadow-yellow-900/40"
    },
    // Jade & Gold Rim
    emerald: {
      bg: "from-[#064e3b] via-[#059669] to-[#064e3b]",
      highlight: "from-[#059669] via-[#34d399] to-[#047857]",
      text: "text-white",
      border: "border-yellow-500/50",
      accent: "text-yellow-400/80",
      shadow: "shadow-emerald-950/60"
    },
    // Polished Lacquer & Gold Hairline
    ghost: {
      bg: "from-black via-zinc-900 to-black",
      highlight: "from-zinc-900 via-zinc-800 to-black",
      text: "text-yellow-500/90",
      border: "border-yellow-500/20",
      accent: "text-yellow-600/40",
      shadow: "shadow-black/60"
    }
  };

  const theme = themes[variant];

  return (
    <button
      onClick={onClick}
      className={`
        group relative w-full ${slim ? 'py-3.5 px-3' : 'py-5 px-4'} rounded-2xl border transition-all duration-500 active:scale-95 overflow-hidden
        ${theme.border} ${theme.shadow} shadow-[0_20px_40px_rgba(0,0,0,0.5)]
      `}
    >
      {/* Metallic Base Layer */}
      <div className={`absolute inset-0 bg-gradient-to-b ${theme.bg} group-hover:scale-110 transition-transform duration-1000`}></div>
      <div className={`absolute inset-0 bg-gradient-to-b ${theme.highlight} opacity-90 transition-opacity duration-500 group-hover:opacity-100`}></div>
      
      {/* 3D Bevel Effect */}
      <div className="absolute inset-0 border-t border-l border-white/30 rounded-2xl pointer-events-none"></div>
      <div className="absolute inset-0 border-b border-r border-black/40 rounded-2xl pointer-events-none"></div>

      {/* Shimmer Light Sweep */}
      <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,0.3)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_4s_infinite] pointer-events-none opacity-40"></div>
      
      {/* Corner Leiwen Accents */}
      <div className={`absolute top-0 left-0 p-1.5 ${theme.accent} transition-colors group-hover:text-white/40`}>
        <LeiwenCorner className="w-2.5 h-2.5" />
      </div>
      <div className={`absolute bottom-0 right-0 p-1.5 rotate-180 ${theme.accent} transition-colors group-hover:text-white/40`}>
        <LeiwenCorner className="w-2.5 h-2.5" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center">
        <div className="flex items-center gap-2">
            <span className={`text-[11px] md:text-[13px] font-black uppercase tracking-[0.25em] font-serif ${theme.text} drop-shadow-md whitespace-nowrap`}>
              {label}
            </span>
            <span className="text-lg md:text-xl group-hover:scale-125 group-hover:rotate-12 transition-transform duration-500 filter drop-shadow-md">
              {icon}
            </span>
        </div>
        {sublabel && (
          <span className={`text-[8px] font-black opacity-60 tracking-[0.3em] uppercase font-serif mt-1 ${theme.text} whitespace-nowrap`}>
            {sublabel}
          </span>
        )}
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

        <PremiumPanel className="w-full px-8 pt-4 pb-6 md:px-10 md:pt-6 md:pb-8 space-y-8">
          
          {/* Identity Selection */}
          <div className="space-y-4">
            <SectionLabel>Player Profile</SectionLabel>
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="relative group">
                <div className="absolute inset-[-15px] bg-yellow-500/10 blur-2xl rounded-full animate-pulse group-hover:bg-yellow-500/20 transition-colors"></div>
                <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full bg-black/40 border-2 border-yellow-500/30 flex items-center justify-center text-5xl md:text-6xl shadow-[inset_0_0_30px_rgba(251,191,36,0.1)] group-hover:scale-105 transition-transform duration-500">
                  {selectedAvatar}
                  <div className="absolute inset-0 rounded-full border border-white/5 animate-[spin_10s_linear_infinite]"></div>
                </div>
              </div>
              
              <div className="flex-1 w-full space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={15}
                    placeholder="ENTER CODENAME"
                    className="w-full px-6 py-4 bg-black/60 border border-white/10 rounded-2xl text-center text-white font-black tracking-[0.2em] uppercase focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/30 outline-none transition-all placeholder:text-white/10"
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
          <div className="space-y-4 pt-2">
            <LuxuryButton 
              onClick={() => handleStartGame('MULTI_PLAYER')}
              variant="emerald"
              label="PLAY ONLINE"
              icon="⚔️"
              sublabel="MULTIPLAYER MODE"
            />
            <div className="grid grid-cols-2 gap-4">
              <LuxuryButton 
                onClick={() => handleStartGame('SINGLE_PLAYER')}
                variant="gold"
                label="PLAY AI"
                icon="🤖"
                sublabel="BOT MODE"
                slim
              />
              <LuxuryButton 
                onClick={() => handleStartGame('TUTORIAL')}
                variant="ghost"
                label="TUTORIAL"
                icon="🎓"
                sublabel="INTRO MODE"
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
