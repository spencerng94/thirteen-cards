import React, { useState } from 'react';
import { Card, CardCoverStyle } from './Card';

interface WelcomeScreenProps {
  onStart: (name: string, mode: 'SINGLE_PLAYER' | 'MULTI_PLAYER', coverStyle: CardCoverStyle, avatar: string) => void;
}

// Reduced list to prevent excessive scrolling
const AVATARS = [
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', 
  '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦄',
];

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart }) => {
  const [name, setName] = useState('');
  const [coverStyle, setCoverStyle] = useState<CardCoverStyle>('BLUE');
  const [selectedAvatar, setSelectedAvatar] = useState<string>(AVATARS[0]);

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-900 via-black to-black text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/5 backdrop-blur-xl p-6 md:p-8 rounded-3xl shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-yellow-600">
        <h1 className="text-4xl md:text-5xl font-extrabold text-center mb-1 text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-md">Tiến Lên</h1>
        <p className="text-center text-gray-400 mb-6 tracking-widest uppercase text-xs">The Ultimate Card Game</p>

        <div className="space-y-6">
          {/* Avatar Selection */}
          <div>
            <label className="block text-xs font-bold uppercase text-gray-400 mb-2 tracking-wide text-center">Choose Avatar</label>
            <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                <div className="flex justify-center mb-3">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-4xl shadow-lg border-2 border-white/20 animate-bounce">
                        {selectedAvatar}
                    </div>
                </div>
                <div className="grid grid-cols-5 gap-2 pr-1">
                    {AVATARS.map((avatar) => (
                        <button
                            key={avatar}
                            onClick={() => setSelectedAvatar(avatar)}
                            className={`aspect-square flex items-center justify-center rounded-lg text-xl hover:bg-white/10 transition-colors ${selectedAvatar === avatar ? 'bg-white/20 ring-1 ring-yellow-400' : ''}`}
                        >
                            {avatar}
                        </button>
                    ))}
                </div>
            </div>
          </div>

          {/* Name Input */}
          <div>
            <label className="block text-xs font-bold uppercase text-gray-400 mb-2 tracking-wide">Player Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-black/40 border border-gray-700 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 focus:outline-none text-white placeholder-gray-600 transition-all font-bold"
              placeholder="Enter your name"
            />
          </div>

          {/* Card Style Selector */}
          <div>
            <label className="block text-xs font-bold uppercase text-gray-400 mb-3 tracking-wide text-center">Choose Card Style</label>
            <div className="flex justify-center gap-4">
               {(['BLUE', 'RED', 'PATTERN'] as CardCoverStyle[]).map((style) => (
                 <div 
                    key={style}
                    onClick={() => setCoverStyle(style)}
                    className={`cursor-pointer transition-transform hover:scale-105 ${coverStyle === style ? 'ring-4 ring-yellow-500 rounded-xl scale-105' : 'opacity-70 hover:opacity-100'}`}
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
              className="group w-full py-3 md:py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black font-extrabold text-lg rounded-xl shadow-[0_4px_0_rgb(161,98,7)] active:shadow-none active:translate-y-1 transition-all"
            >
              MULTIPLAYER
              <span className="block text-[10px] font-normal opacity-70 group-hover:opacity-100">Join friends online</span>
            </button>
            <button
              onClick={() => onStart(name || 'Guest', 'SINGLE_PLAYER', coverStyle, selectedAvatar)}
              className="group w-full py-3 md:py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white font-extrabold text-lg rounded-xl shadow-[0_4px_0_rgb(21,128,61)] active:shadow-none active:translate-y-1 transition-all"
            >
              SINGLE PLAYER
              <span className="block text-[10px] font-normal opacity-70 group-hover:opacity-100">Practice vs AI</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};