import React from 'react';
import { Card, CardCoverStyle } from './Card';
import { BackgroundTheme } from '../types';

interface SettingsModalProps {
  onClose: () => void;
  onExitGame: () => void;
  currentCoverStyle: CardCoverStyle;
  onChangeCoverStyle: (style: CardCoverStyle) => void;
  currentTheme: BackgroundTheme;
  onChangeTheme: (theme: BackgroundTheme) => void;
  isSinglePlayer?: boolean;
  spQuickFinish?: boolean;
  setSpQuickFinish?: (val: boolean) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  onClose, 
  onExitGame,
  currentCoverStyle,
  onChangeCoverStyle,
  currentTheme,
  onChangeTheme,
  isSinglePlayer,
  spQuickFinish,
  setSpQuickFinish
}) => {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div 
        className="bg-gray-900 border-2 border-white/10 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col" 
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gradient-to-r from-gray-900 to-gray-800">
          <h2 className="text-white font-bold text-xl tracking-wider uppercase">Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors text-xl font-bold px-2">✕</button>
        </div>
        
        <div className="p-6 space-y-6 bg-gray-900/95 max-h-[80vh] overflow-y-auto">
          
          {/* Theme Selector */}
          <div>
            <label className="block text-xs font-bold uppercase text-gray-400 mb-4 tracking-wide text-center">Arena Theme</label>
            <div className="grid grid-cols-3 gap-3">
               {[
                 { id: 'GREEN', name: 'Forest', color: 'bg-green-900' },
                 { id: 'CYBER_BLUE', name: 'Cyber', color: 'bg-blue-900' },
                 { id: 'CRIMSON_VOID', name: 'Crimson', color: 'bg-red-900' }
               ].map((theme) => (
                 <button 
                    key={theme.id}
                    onClick={() => onChangeTheme(theme.id as BackgroundTheme)}
                    className={`
                      relative h-16 rounded-xl border-2 transition-all overflow-hidden group
                      ${currentTheme === theme.id ? 'border-white ring-2 ring-white/20 scale-105' : 'border-white/10 opacity-60 hover:opacity-100'}
                    `}
                 >
                    <div className={`absolute inset-0 ${theme.color} opacity-80`}></div>
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-30"></div>
                    <span className="relative z-10 text-[10px] font-black uppercase tracking-widest text-white shadow-black drop-shadow-md">
                      {theme.name}
                    </span>
                 </button>
               ))}
            </div>
          </div>

          <div className="border-t border-gray-800"></div>

          {/* Card Style Selector */}
          <div>
            <label className="block text-xs font-bold uppercase text-gray-400 mb-4 tracking-wide text-center">Card Deck Style</label>
            <div className="flex justify-center gap-4">
               {(['BLUE', 'RED', 'PATTERN'] as CardCoverStyle[]).map((style) => (
                 <div 
                    key={style}
                    onClick={() => onChangeCoverStyle(style)}
                    className={`cursor-pointer transition-all duration-200 ${currentCoverStyle === style ? 'ring-4 ring-yellow-500 rounded-xl scale-110 shadow-lg shadow-yellow-500/20' : 'opacity-60 hover:opacity-100 hover:scale-105'}`}
                 >
                   <Card faceDown coverStyle={style} small className="!w-14 !h-20" />
                 </div>
               ))}
            </div>
          </div>

          {isSinglePlayer && setSpQuickFinish && (
            <>
              <div className="border-t border-gray-800"></div>
              <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Quick Finish</h3>
                    <p className="text-[10px] text-gray-500 uppercase tracking-tight">End game when you finish your hand</p>
                </div>
                <button 
                    onClick={() => setSpQuickFinish(!spQuickFinish)}
                    className={`w-12 h-6 rounded-full relative transition-colors duration-200 ${spQuickFinish ? 'bg-green-600' : 'bg-gray-800'}`}
                >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${spQuickFinish ? 'translate-x-7' : 'translate-x-1'}`}></div>
                </button>
              </div>
            </>
          )}

          <div className="border-t border-gray-800"></div>

          {/* Exit Game */}
          <div>
             <button
               onClick={onExitGame}
               className="w-full py-3 bg-red-900/50 hover:bg-red-800/80 border border-red-700/50 text-red-200 font-bold rounded-xl transition-all flex items-center justify-center gap-2"
             >
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
               </svg>
               LEAVE GAME
             </button>
             <p className="text-center text-[10px] text-gray-500 mt-2">Current progress will be lost immediately.</p>
          </div>
        </div>
      </div>
    </div>
  );
};