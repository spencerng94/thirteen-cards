import React, { useState } from 'react';
import { Card, CardCoverStyle } from './Card';

interface WelcomeScreenProps {
  onStart: (name: string, mode: 'SINGLE_PLAYER' | 'MULTI_PLAYER', coverStyle: CardCoverStyle, avatar: string, quickFinish?: boolean) => void;
}

const AVATARS = [
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', 
  '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦄',
];

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart }) => {
  const [name, setName] = useState('');
  const [coverStyle, setCoverStyle] = useState<CardCoverStyle>('BLUE');
  const [selectedAvatar, setSelectedAvatar] = useState<string>(AVATARS[0]);
  const [quickFinish, setQuickFinish] = useState(false);

  // Helper to get button theme classes based on card aesthetic
  const getButtonTheme = (style: CardCoverStyle) => {
    switch (style) {
      case 'RED':
        return 'from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 shadow-red-900/20';
      case 'PATTERN':
        return 'from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 shadow-yellow-900/20';
      case 'BLUE':
      default:
        return 'from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-900/20';
    }
  };

  return (
    <div className="min-h-screen w-full bg-green-900 relative overflow-hidden flex flex-col items-center justify-center p-4 transition-colors duration-1000">
      {/* Background Gradients - Matching Game Board Green */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-600/40 via-green-900 to-green-950 pointer-events-none"></div>
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

      <div className="max-w-md w-full bg-black/40 backdrop-blur-xl p-6 md:p-8 rounded-3xl shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 relative z-10">
        
        <div className="text-center mb-8">
            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500 drop-shadow-lg tracking-tighter">Tiến Lên</h1>
            <p className="text-center text-green-500/80 font-bold uppercase text-[10px] tracking-[0.3em]">Thirteen Card Arena</p>
        </div>

        <div className="space-y-6">
          {/* Avatar Selection */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-500 mb-2 tracking-widest text-center">Identity</label>
            <div className="bg-black/30 p-4 rounded-2xl border border-white/5">
                <div className="flex justify-center mb-4">
                    <div className="w-20 h-20 bg-gradient-to-br from-white/10 to-transparent rounded-full flex items-center justify-center text-4xl shadow-inner border border-white/10 animate-bounce">
                        {selectedAvatar}
                    </div>
                </div>
                <div className="grid grid-cols-5 gap-2">
                    {AVATARS.map((avatar) => (
                        <button
                            key={avatar}
                            onClick={() => setSelectedAvatar(avatar)}
                            className={`aspect-square flex items-center justify-center rounded-xl text-xl hover:bg-white/10 transition-colors ${selectedAvatar === avatar ? 'bg-white/10 ring-1 ring-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]' : ''}`}
                        >
                            {avatar}
                        </button>
                    ))}
                </div>
            </div>
          </div>

          {/* Name Input */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-500 mb-2 tracking-widest">Player Handle</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 focus:outline-none text-white placeholder-gray-700 transition-all font-bold tracking-wide"
              placeholder="ENTER NAME"
            />
          </div>

          {/* Card Style Selector */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-500 mb-3 tracking-widest text-center">Deck Aesthetic</label>
            <div className="flex justify-center gap-4">
               {(['BLUE', 'RED', 'PATTERN'] as CardCoverStyle[]).map((style) => (
                 <div 
                    key={style}
                    onClick={() => setCoverStyle(style)}
                    className={`cursor-pointer transition-transform hover:scale-105 ${coverStyle === style ? 'ring-2 ring-green-500 rounded-xl scale-105 shadow-lg shadow-green-900/50' : 'opacity-50 hover:opacity-100'}`}
                 >
                   <Card faceDown coverStyle={style} small className="!w-12 !h-16" />
                 </div>
               ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 mt-8">
             <button
              onClick={() => onStart(name || 'Guest', 'MULTI_PLAYER', coverStyle, selectedAvatar)}
              className={`group w-full py-4 bg-gradient-to-r ${getButtonTheme(coverStyle)} text-white font-black text-sm uppercase tracking-widest rounded-xl shadow-lg active:scale-95 transition-all duration-300`}
            >
              Enter Multiplayer
            </button>
            <div className="space-y-2">
                <button
                onClick={() => onStart(name || 'Guest', 'SINGLE_PLAYER', coverStyle, selectedAvatar, quickFinish)}
                className="group w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 font-bold text-xs uppercase tracking-widest rounded-xl active:scale-95 transition-all"
                >
                Practice vs Bots
                </button>
                <div className="flex items-center justify-center gap-2 px-2">
                    <button 
                        onClick={() => setQuickFinish(!quickFinish)}
                        className="flex items-center gap-2 text-[10px] font-bold text-gray-500 hover:text-gray-400 transition-colors uppercase tracking-widest group"
                    >
                        <div className={`w-8 h-4 rounded-full relative transition-colors duration-200 ${quickFinish ? 'bg-green-600' : 'bg-gray-800'}`}>
                            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform duration-200 ${quickFinish ? 'translate-x-4' : 'translate-x-0.5'}`}></div>
                        </div>
                        Quick Finish Mode
                    </button>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};