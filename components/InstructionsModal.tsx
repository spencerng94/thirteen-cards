import React from 'react';
import { Card } from './Card';
import { Rank, Suit } from '../types';

interface InstructionsModalProps {
  onClose: () => void;
}

export const InstructionsModal: React.FC<InstructionsModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div 
        className="bg-gray-900 border-2 border-yellow-600/50 w-full max-w-2xl max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl flex flex-col relative" 
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gradient-to-r from-gray-900 to-gray-800">
          <h2 className="text-yellow-400 font-bold text-2xl tracking-wider">GAME RULES</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors text-xl font-bold px-2">✕</button>
        </div>
        
        <div className="overflow-y-auto p-6 space-y-8 text-gray-200 bg-gray-900/95 scrollbar-thin scrollbar-thumb-yellow-600 scrollbar-track-gray-800">
          
          {/* How to Win */}
          <section className="bg-yellow-900/20 border border-yellow-600/30 p-4 rounded-lg">
            <h3 className="text-lg font-bold text-yellow-400 mb-2 flex items-center gap-2">
                🏆 How to Win
            </h3>
            <p className="text-sm text-gray-200">
                The objective is to be the <strong className="text-white">first player to discard all your cards</strong>. 
                The game ends immediately when a player empties their hand.
            </p>
          </section>

          {/* Start Rule */}
          <section className="bg-white/5 p-4 rounded-lg border border-white/10">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-yellow-500">🏁</span> Starting the Game
            </h3>
            <p className="text-sm">
              The player holding the <span className="text-white font-bold">3 of Spades (3♠)</span> goes first. 
              The first play of the game <strong className="text-yellow-400">must</strong> include this card.
            </p>
          </section>

          {/* Ranks & Suits */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <section>
              <h3 className="text-lg font-bold text-white mb-2">📈 Rank Order</h3>
              <p className="text-sm mb-2 text-gray-400">Low to High:</p>
              <div className="flex flex-wrap gap-1 text-sm font-mono">
                <span className="bg-gray-800 px-2 py-1 rounded">3</span>
                <span>→</span>
                <span className="bg-gray-800 px-2 py-1 rounded">4</span>
                <span>...</span>
                <span className="bg-gray-800 px-2 py-1 rounded">K</span>
                <span>→</span>
                <span className="bg-gray-800 px-2 py-1 rounded">A</span>
                <span>→</span>
                <span className="bg-yellow-900/50 text-yellow-400 border border-yellow-600 px-2 py-1 rounded font-bold">2 (Pig)</span>
              </div>
            </section>
            
            <section>
              <h3 className="text-lg font-bold text-white mb-2">🎨 Suit Order</h3>
              <p className="text-sm mb-2 text-gray-400">Low to High:</p>
              <div className="flex gap-2 text-xl bg-gray-200 p-2 rounded w-fit shadow-lg border border-white/10">
                <span className="text-black font-medium">♠</span>
                <span className="text-gray-400 font-bold text-base mt-1">&lt;</span>
                <span className="text-black font-medium">♣</span>
                <span className="text-gray-400 font-bold text-base mt-1">&lt;</span>
                <span className="text-red-600 font-medium">♦</span>
                <span className="text-gray-400 font-bold text-base mt-1">&lt;</span>
                <span className="text-red-600 font-bold">♥</span>
              </div>
            </section>
          </div>

          {/* Combinations */}
          <section>
            <h3 className="text-lg font-bold text-white mb-3">🃏 Valid Combinations</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex gap-2"><span className="text-yellow-500 font-bold w-16">Single:</span> Any one card.</li>
              <li className="flex gap-2"><span className="text-yellow-500 font-bold w-16">Pair:</span> Two cards of the same rank (e.g., 5♠ 5♥).</li>
              <li className="flex gap-2"><span className="text-yellow-500 font-bold w-16">Triple:</span> Three cards of the same rank.</li>
              <li className="flex gap-2"><span className="text-yellow-500 font-bold w-16">Quad:</span> Four cards of the same rank.</li>
              <li className="flex gap-2"><span className="text-yellow-500 font-bold w-16">Run:</span> 3+ consecutive ranks (e.g., 4, 5, 6). <strong className="text-red-400">No 2s allowed in runs.</strong></li>
            </ul>
          </section>

          {/* Bombs */}
          <section className="bg-red-900/20 border border-red-500/30 p-4 rounded-lg">
            <h3 className="text-lg font-bold text-red-400 mb-2 flex items-center gap-2">
              💣 Chopping (Bombs)
            </h3>
            <p className="text-sm mb-3">
              The <span className="font-bold text-white">2 (Pig)</span> is the highest card but can be "chopped" (beaten) by special combinations:
            </p>
            <ul className="space-y-2 text-sm list-disc pl-4">
              <li><strong className="text-white">3 Consecutive Pairs</strong> beats a Single 2.</li>
              <li><strong className="text-white">Four of a Kind (Quad)</strong> beats a Single 2 OR a Pair of 2s.</li>
              <li><strong className="text-white">4 Consecutive Pairs</strong> beats a Pair of 2s OR a Quad.</li>
            </ul>
          </section>

        </div>
        <div className="p-4 bg-gray-800 border-t border-gray-700 text-center">
            <button onClick={onClose} className="bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-2 px-8 rounded-full shadow-lg transition-transform active:scale-95">
                Got it!
            </button>
        </div>
      </div>
    </div>
  );
};