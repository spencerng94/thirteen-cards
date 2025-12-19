// Import useState from react
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

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart }) => {
  const [name, setName] = useState('');
  const [coverStyle, setCoverStyle] = useState<CardCoverStyle>('BLUE');
  const [selectedAvatar, setSelectedAvatar] = useState<string>(AVATARS[0]);
  const [quickFinish, setQuickFinish] = useState(false);
  const [difficulty, setDifficulty] = useState<AiDifficulty>('MEDIUM');

  const SectionHeader = ({ children }: { children: React.ReactNode }) => (
    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-yellow-400 flex items-center justify-center gap-3 mb-4">
      <span className="w-12 h-[1px] bg-yellow-400/30"></span>
      {children}
      <span className="w-12 h-[1px] bg-yellow-400/30"></span>
    </p>
  );

  const getDifficultyStyles = (d: AiDifficulty, active: boolean) => {
    if (!active) return "text-gray-500 hover:text-gray-300";
    
    switch (d) {
      case 'EASY':
        return "bg-green-600 text-white shadow-[0_0_15px_rgba(22,163,74,0.4)]";
      case 'MEDIUM':
        return "bg-gradient-to-b from-yellow-400 via-yellow-500 to-yellow-600 text-black shadow-[0_0_15px_rgba(234,179,8,0.4)]";
      case 'HARD':
        return "bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]";
      default:
        return "bg-green-600 text-white shadow-lg";
    }
  };

  return (
    <div className="min-h-screen w-full bg-green-900 relative overflow-hidden flex flex-col items-center justify-center p-4 transition-colors duration-1000">
      {/* Background Gradients - Matching Game Board Green */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-600/40 via-green-900 to-green-950 pointer-events-none"></div>
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

      <div className="max-w-md w-full bg-black/40 backdrop-blur-xl p-6 md:p-8 rounded-3xl shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 relative z-10">
        
        <div className="flex flex-col items-center mb-10">
            <BrandLogo size="xl" />
        </div>

        <div className="space-y-6">
          {/* Avatar Selection */}
          <div className="mt-0">
            <SectionHeader>Player Icon</SectionHeader>
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
            <SectionHeader>Player Handle</SectionHeader>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 focus:outline-none text-white placeholder-gray-700 transition-all font-bold tracking-wide"
              placeholder="ENTER NAME"
            />
          </div>

          {/* Difficulty Selection */}
          <div>
            <SectionHeader>AI Difficulty</SectionHeader>
            <div className="grid grid-cols-3 gap-2 bg-black/30 p-1.5 rounded-xl border border-white/5">
                {(['EASY', 'MEDIUM', 'HARD'] as AiDifficulty[]).map((d) => (
                    <button
                        key={d}
                        onClick={() => setDifficulty(d)}
                        className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${getDifficultyStyles(d, difficulty === d)}`}
                    >
                        {d}
                    </button>
                ))}
            </div>
          </div>

          {/* Card Style Selector */}
          <div>
            <SectionHeader>Deck Aesthetic</SectionHeader>
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
              className="group w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-black text-sm uppercase tracking-widest rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.2)] active:scale-95 transition-all duration-300 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <span className="relative z-10 flex items-center justify-center gap-2">
                Enter Multiplayer
                <span className="text-lg">⚔️</span>
              </span>
            </button>
            <div className="space-y-2">
                <button
                onClick={() => onStart(name || 'Guest', 'SINGLE_PLAYER', coverStyle, selectedAvatar, quickFinish, difficulty)}
                className="group w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 font-bold text-xs uppercase tracking-widest rounded-xl active:scale-95 transition-all"
                >
                Practice vs Bots 🤖
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