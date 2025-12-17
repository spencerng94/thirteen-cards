import React, { useState } from 'react';
import { Card, CardCoverStyle } from './Card';

interface WelcomeScreenProps {
  onStart: (name: string, mode: 'SINGLE_PLAYER' | 'MULTI_PLAYER', coverStyle: CardCoverStyle, avatar: string) => void;
}

const AVATARS = [
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', 
  '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦄',
];

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart }) => {
  const [name, setName] = useState('');
  const [coverStyle, setCoverStyle] = useState<CardCoverStyle>('BLUE');
  const [selectedAvatar, setSelectedAvatar] = useState<string>(AVATARS[0]);

  return (
    <div className="min-h-screen w-full bg-[#050505] relative overflow-hidden flex flex-col items-center justify-center p-4">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-96 bg-green-900/20 blur-[100px] rounded-full pointer-events-none"></div>
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

      <div className="max-w-md w-full bg-black/40 backdrop-blur-xl p-6 md:p-8 rounded-3xl shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 relative z-10">
        
        <div className="text-center mb-8">
            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500 drop-shadow-lg tracking-tighter">Tiến Lên</h1>
            <p className="text-center text-green-500/80 font-bold uppercase text-[10px] tracking-[0.3em]">Ultimate Card Arena</p>
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
              className="group w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm uppercase tracking-widest rounded-xl shadow-lg shadow-blue-900/20 active:scale-95 transition-all"
            >
              Enter Multiplayer
            </button>
            <button
              onClick={() => onStart(name || 'Guest', 'SINGLE_PLAYER', coverStyle, selectedAvatar)}
              className="group w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 font-bold text-xs uppercase tracking-widest rounded-xl active:scale-95 transition-all"
            >
              Practice vs Bots
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};