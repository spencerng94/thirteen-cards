import React from 'react';
import { Card, CardCoverStyle } from './Card';

interface SettingsModalProps {
  onClose: () => void;
  onExitGame: () => void;
  currentCoverStyle: CardCoverStyle;
  onChangeCoverStyle: (style: CardCoverStyle) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  onClose, 
  onExitGame,
  currentCoverStyle,
  onChangeCoverStyle 
}) => {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div 
        className="bg-gray-900 border-2 border-yellow-600/50 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col" 
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gradient-to-r from-gray-900 to-gray-800">
          <h2 className="text-yellow-400 font-bold text-xl tracking-wider uppercase">Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors text-xl font-bold px-2">✕</button>
        </div>
        
        <div className="p-6 space-y-8 bg-gray-900/95">
          
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

          <div className="border-t border-gray-800 my-4"></div>

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