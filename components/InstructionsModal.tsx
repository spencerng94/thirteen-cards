
import React from 'react';
import { Card } from './Card';
import { Rank, Suit } from '../types';

interface InstructionsModalProps {
  onClose: () => void;
}

// Added onClick to GlassPanel props to fix the type error  on line 35
const GlassPanel: React.FC<{ children: React.ReactNode; className?: string; onClick?: (e: React.MouseEvent) => void }> = ({ children, className = '', onClick }) => (
  <div 
    onClick={onClick}
    className={`relative bg-black/60 backdrop-blur-3xl border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.8)] rounded-[2.5rem] overflow-hidden ${className}`}
  >
      <div className="absolute inset-0 rounded-[2.5rem] ring-1 ring-inset ring-white/10 pointer-events-none"></div>
      {children}
  </div>
);

const SectionHeader: React.FC<{ children: React.ReactNode; icon?: string }> = ({ children, icon }) => (
  <div className="flex flex-col items-center gap-2 mb-6">
    <div className="flex items-center gap-4 w-full">
      <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-yellow-500/30 to-yellow-500/50"></div>
      <div className="flex items-center gap-2">
        {icon && <span className="text-xl filter drop-shadow-[0_0_8px_rgba(234,179,8,0.4)]">{icon}</span>}
        <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-yellow-500 drop-shadow-sm">
          {children}
        </h3>
      </div>
      <div className="flex-1 h-[1px] bg-gradient-to-l from-transparent via-yellow-500/30 to-yellow-500/50"></div>
    </div>
  </div>
);

export const InstructionsModal: React.FC<InstructionsModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300" onClick={onClose}>
      <GlassPanel className="w-full max-w-2xl max-h-[85vh] flex flex-col transform transition-all duration-500 scale-100 shadow-[0_0_100px_rgba(0,0,0,1)] border-white/20" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="relative p-6 md:p-8 border-b border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent flex justify-between items-center">
            <div className="flex flex-col">
              <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-white/90 to-white/40 uppercase tracking-tighter italic">GAME RULES</h2>
              <div className="flex items-center gap-2 mt-1">
                  <span className="w-2 h-2 rounded-full bg-yellow-500/80 animate-pulse"></span>
                  <span className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-500">Tiến Lên (Thirteen) v1.0</span>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="w-12 h-12 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-gray-400 hover:text-white transition-all group flex items-center justify-center shadow-xl active:scale-90"
            >
              <span className="text-2xl group-hover:rotate-90 transition-transform">✕</span>
            </button>
        </div>

        {/* Content Scroll Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-12 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          
          {/* Mission Objective */}
          <div className="space-y-4">
            <div className="relative p-6 rounded-3xl bg-gradient-to-br from-yellow-500/10 to-transparent border border-yellow-500/20 shadow-inner group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <span className="text-6xl">🏆</span>
              </div>
              <h4 className="text-xs font-black text-yellow-500 uppercase tracking-widest mb-2">Primary Objective</h4>
              <p className="text-sm text-gray-300 leading-relaxed font-medium">
                Discard every card in your hand to secure victory. The game concludes immediately when a player reaches <span className="text-white font-bold">ZERO</span>.
              </p>
            </div>

            <div className="relative p-5 rounded-3xl bg-white/[0.03] border border-white/5 shadow-inner group">
              <h4 className="text-[9px] font-black text-green-400 uppercase tracking-widest mb-2">Round Protocol</h4>
              <div className="space-y-3">
                <p className="text-xs text-gray-400 leading-relaxed">
                  Players must play a stronger combo of the same type (e.g., Pair beats Pair) or <span className="text-white">Pass</span>. When everyone passes, the last player starts a fresh round.
                </p>
                <div className="p-3 bg-yellow-500/5 border-l-2 border-yellow-500/50 rounded-r-lg space-y-1">
                  <p className="text-[10px] text-yellow-500 font-black uppercase tracking-wider">
                    ⚡ The player with the <span className="text-white">3♠</span> goes first.
                  </p>
                  <p className="text-[9px] text-gray-500 font-bold italic tracking-wide">
                    Note: The <span className="text-rose-500">2♥</span> is the highest card.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Card Hierarchy Visual */}
          <div className="space-y-6">
            <SectionHeader icon="📊">Card Order</SectionHeader>
            <div className="flex flex-nowrap justify-center items-center gap-2 md:gap-4 bg-black/40 p-6 rounded-[2rem] border border-white/5 relative group overflow-hidden overflow-x-auto no-scrollbar">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1500 pointer-events-none"></div>
                
                {[Rank.Three, Rank.Four, Rank.Ace, Rank.Two].map((r, i) => (
                  <React.Fragment key={r}>
                    <div className={`
                      flex flex-col items-center justify-center w-12 h-16 md:w-14 md:h-20 rounded-xl border transition-all duration-300 shrink-0
                      ${r === Rank.Two ? 'bg-yellow-500 text-black border-yellow-300 scale-110 shadow-lg' : 'bg-white/5 text-white/60 border-white/10'}
                    `}>
                      <span className="text-xs md:text-sm font-black">
                        {r === 11 ? 'J' : r === 14 ? 'A' : r === 15 ? '2' : r}
                      </span>
                    </div>
                    {i < 3 && <span className="text-white/20 font-black shrink-0">→</span>}
                  </React.Fragment>
                ))}
                
                <div className="absolute bottom-2 left-0 w-full text-center">
                   <p className="text-[7px] font-black uppercase tracking-[0.3em] text-gray-600">3 LOWEST • 2 HIGHEST</p>
                </div>
            </div>
          </div>

          {/* Suit Hierarchy */}
          <div className="space-y-6">
            <SectionHeader icon="💠">Suit Order</SectionHeader>
            <div className="flex justify-center items-center gap-4 bg-black/30 p-6 pb-10 rounded-[2rem] border border-white/5 relative">
               {[
                 { s: '♠', c: 'text-slate-400', n: 'SPADES' },
                 { s: '♣', c: 'text-slate-300', n: 'CLUBS' },
                 { s: '♦', c: 'text-rose-500', n: 'DIAMONDS' },
                 { s: '♥', c: 'text-rose-600', n: 'HEARTS' }
               ].map((suit, i) => (
                 <div key={suit.n} className="flex items-center gap-3">
                    <div className="flex flex-col items-center">
                      <span className={`text-2xl ${suit.c} filter drop-shadow-md`}>{suit.s}</span>
                      <span className="text-[7px] font-black text-white/20 mt-1 tracking-widest">{suit.n}</span>
                    </div>
                    {i < 3 && <span className="text-white/10 font-black text-xs">«</span>}
                 </div>
               ))}
               
               <div className="absolute bottom-2 left-0 w-full text-center">
                  <p className="text-[7px] font-black uppercase tracking-[0.3em] text-gray-600">♠ LOWEST • ♥ HIGHEST</p>
               </div>
            </div>
          </div>

          {/* Valid Combos */}
          <div className="space-y-6">
            <SectionHeader icon="⚔️">Valid Combos</SectionHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { name: 'Singles', desc: 'Any individual unit card.' },
                { name: 'Pairs', desc: 'Two cards of identical rank (e.g., 5♠ 5♥).' },
                { name: 'Triples', desc: 'Three cards of identical rank (e.g., 8♠ 8♦ 8♥).' },
                { name: 'Runs (Straights)', desc: '3+ consecutive ranks. Note: 2 is excluded.' },
                { name: 'Bombs', desc: 'Sequences of pairs or quads to "Chop" Pigs.' }
              ].map(combo => (
                <div key={combo.name} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors">
                  <h5 className="text-[10px] font-black uppercase tracking-widest text-yellow-500 mb-1">{combo.name}</h5>
                  <p className="text-[11px] text-gray-400 font-medium leading-relaxed">{combo.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* The Chop Protocol */}
          <div className="space-y-6">
             <SectionHeader icon="💣">Counter 2 (Chopping)</SectionHeader>
             <div className="p-6 rounded-3xl bg-gradient-to-br from-red-600/10 to-transparent border border-red-500/20 space-y-4">
                <p className="text-xs text-red-400 font-black uppercase tracking-widest text-center">Counter-Pig Special Moves</p>
                <div className="space-y-3">
                   <div className="flex items-center gap-4 text-xs">
                      <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center shrink-0">1</div>
                      <p className="text-gray-300 font-medium"><span className="text-white font-black">3 PAIRS:</span> Beat a single 2 out of turn.</p>
                   </div>
                   <div className="flex items-center gap-4 text-xs">
                      <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center shrink-0">2</div>
                      <p className="text-gray-300 font-medium"><span className="text-white font-black">QUADS:</span> Beat a single 2 or a Pair of 2s.</p>
                   </div>
                   <div className="flex items-center gap-4 text-xs">
                      <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center shrink-0">3</div>
                      <p className="text-gray-300 font-medium"><span className="text-white font-black">4 PAIRS:</span> Absolute power. Beats any 2s or Quads.</p>
                   </div>
                </div>
             </div>
          </div>

        </div>

        {/* Footer CTA */}
        <div className="p-8 bg-white/[0.02] border-t border-white/10">
            <button 
              onClick={onClose} 
              className="w-full relative group overflow-hidden py-4 rounded-2xl font-black uppercase tracking-[0.3em] text-xs transition-all active:scale-95 shadow-[0_15px_30px_rgba(0,0,0,0.4)]"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-green-500 to-emerald-600 group-hover:scale-110 transition-transform duration-500"></div>
                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_3s_infinite] pointer-events-none"></div>
                <span className="relative z-10 text-white drop-shadow-md">Return to Game</span>
            </button>
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
            @keyframes shimmer {
                0% { background-position: -100% 0; }
                100% { background-position: 100% 0; }
            }
            .no-scrollbar::-webkit-scrollbar { display: none; }
            .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}} />
      </GlassPanel>
    </div>
  );
};
