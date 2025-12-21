
import React, { useState, useMemo } from 'react';
import { Card as CardComp } from './Card';
import { Rank, Suit, Card } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { InstructionsModal } from './InstructionsModal';

interface TutorialModeProps {
  onExit: () => void;
}

interface Step {
  title: string;
  subtitle: string;
  content: string;
  cards: Card[];
  targetCardIds?: string[];
  actionLabel?: string;
}

// --- Brand Asset: Leiwen Accent ---
const LeiwenCorner: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg viewBox="0 0 40 40" className={`w-4 h-4 ${className}`} xmlns="http://www.w3.org/2000/svg">
    <path d="M 5 5 H 35 V 35 H 10 V 10 H 30 V 30 H 15 V 15 H 25" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" />
  </svg>
);

/**
 * Renders text with  highlights. 
 * Patterns wrapped in **double asterisks** will be colored yellow.
 */
const HighlightedText: React.FC<{ text: string }> = ({ text }) => {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <span key={i} className="text-yellow-400 font-bold drop-shadow-[0_0_8px_rgba(250,204,21,0.4)]">
              {part.slice(2, -2)}
            </span>
          );
        }
        return part;
      })}
    </>
  );
};

export const TutorialMode: React.FC<TutorialModeProps> = ({ onExit }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showRules, setShowRules] = useState(false);
  const [isWrong, setIsWrong] = useState(false);

  const steps: Step[] = useMemo(() => [
    {
      title: "GAME OVERVIEW",
      subtitle: "Objective",
      content: "Welcome to Thirteen. Your mission is simple: **Empty your hand before all others.** The first player to play all 13 of their cards is the victor.",
      cards: [
        { rank: Rank.Three, suit: Suit.Spades, id: uuidv4() },
        { rank: Rank.Ace, suit: Suit.Hearts, id: uuidv4() },
        { rank: Rank.Two, suit: Suit.Diamonds, id: uuidv4() }
      ],
      actionLabel: "I Understand"
    },
    {
      title: "CARD RANKINGS",
      subtitle: "The Hierarchy",
      content: "Forget traditional ranks. In this arena, **3 is the lowest card, and the 2 is the highest.** Suits follow this order: Spades ♠ (Low) < Clubs ♣ < Diamonds ♦ < Hearts ♥ (High).",
      cards: [
        { rank: Rank.Three, suit: Suit.Spades, id: 'low' },
        { rank: Rank.Three, suit: Suit.Hearts, id: 'high' }
      ],
      targetCardIds: ['high'],
      actionLabel: "Select the Higher Card"
    },
    {
      title: "STARTING THE MATCH",
      subtitle: "The Opening Move",
      content: "In the very first round, the player holding the **3 of Spades (3♠) must lead first.** This card must be part of your first play.",
      cards: [
        { rank: Rank.Three, suit: Suit.Spades, id: 'start' },
        { rank: Rank.King, suit: Suit.Clubs, id: 'king' }
      ],
      targetCardIds: ['start'],
      actionLabel: "Play the 3 of Spades"
    },
    {
      title: "PLAYING COMBOS",
      subtitle: "Pairs & Triples",
      content: "Cards can be played in groups. To beat a previous player, you must play the **same combo type but with higher value cards.**",
      cards: [
        { rank: Rank.Seven, suit: Suit.Clubs, id: 'p1' },
        { rank: Rank.Seven, suit: Suit.Diamonds, id: 'p2' }
      ],
      targetCardIds: ['p1', 'p2'],
      actionLabel: "Select the Pair"
    },
    {
      title: "RUNS & SEQUENCES",
      subtitle: "Strategic Runs",
      content: "A Run is a sequence of 3 or more consecutive cards. Be careful: **The 2 is unique and cannot be part of a Run.**",
      cards: [
        { rank: Rank.Nine, suit: Suit.Spades, id: 'r1' },
        { rank: Rank.Ten, suit: Suit.Clubs, id: 'r2' },
        { rank: Rank.Jack, suit: Suit.Hearts, id: 'r3' }
      ],
      targetCardIds: ['r1', 'r2', 'r3'],
      actionLabel: "Confirm the Run"
    },
    {
      title: "BOMBS & CHOPPING",
      subtitle: "Countering the 2",
      content: "Special 'Bombs'—like 3 consecutive pairs—are the only way to **strike a 2 out of turn.** This tactical move is known as a 'Chop'.",
      cards: [
        { rank: Rank.Four, suit: Suit.Spades, id: 'b1' },
        { rank: Rank.Four, suit: Suit.Hearts, id: 'b2' },
        { rank: Rank.Five, suit: Suit.Clubs, id: 'b3' },
        { rank: Rank.Five, suit: Suit.Diamonds, id: 'b4' },
        { rank: Rank.Six, suit: Suit.Spades, id: 'b5' },
        { rank: Rank.Six, suit: Suit.Hearts, id: 'b6' }
      ],
      targetCardIds: ['b1', 'b2', 'b3', 'b4', 'b5', 'b6'],
      actionLabel: "Perform the Chop"
    },
    {
      title: "READY TO PLAY",
      subtitle: "Final Preparation",
      content: "You have completed your briefing. **Practice is the key to mastery.** Step into the Arena and outsmart your opponents.",
      cards: [],
      actionLabel: "Enter the Arena"
    }
  ], []);

  const step = steps[currentStep];

  const handleToggle = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleNext = () => {
    if (step.targetCardIds) {
      const isCorrect = step.targetCardIds.every(id => selectedIds.has(id)) && selectedIds.size === step.targetCardIds.length;
      if (!isCorrect) {
        setIsWrong(true);
        setTimeout(() => setIsWrong(false), 500);
        return;
      }
    }
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      setSelectedIds(new Set());
    } else {
      onExit();
    }
  };

  const isComplete = !step.targetCardIds || (step.targetCardIds.every(id => selectedIds.has(id)) && selectedIds.size === step.targetCardIds.length);

  return (
    <div className="fixed inset-0 z-[100] bg-[#031109] flex flex-col items-center justify-center p-6 overflow-hidden">
      {/* Immersive Atmospheric Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#092b15_0%,_#000000_100%)]"></div>
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }}></div>
      
      {showRules && <InstructionsModal onClose={() => setShowRules(false)} />}

      <div className={`max-w-3xl w-full z-10 flex flex-col gap-10 items-center transition-all duration-500 ${isWrong ? 'translate-x-2' : ''}`}>
        
        {/* Progress Timeline */}
        <div className="w-full flex items-center justify-between px-12 relative mb-2">
            <div className="absolute top-1/2 left-12 right-12 h-[1px] bg-white/10 -translate-y-1/2"></div>
            {steps.map((_, i) => (
                <div 
                    key={i} 
                    className={`
                        relative z-10 w-3 h-3 rounded-full border-2 transition-all duration-700
                        ${i < currentStep ? 'bg-yellow-500 border-yellow-300 scale-75' : i === currentStep ? 'bg-white border-yellow-400 scale-125 shadow-[0_0_15px_rgba(251,191,36,0.6)]' : 'bg-black border-white/20 scale-100'}
                    `}
                />
            ))}
        </div>

        {/* Briefing Panel */}
        <div className="relative w-full bg-black/40 backdrop-blur-3xl border border-white/10 p-8 md:p-12 rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,0.8)] text-center space-y-8 overflow-hidden">
          
          {/* Decorative Framing */}
          <div className="absolute top-4 left-4 text-yellow-500/30"><LeiwenCorner /></div>
          <div className="absolute top-4 right-4 text-yellow-500/30 rotate-90"><LeiwenCorner /></div>
          <div className="absolute bottom-4 left-4 text-yellow-500/30 -rotate-90"><LeiwenCorner /></div>
          <div className="absolute bottom-4 right-4 text-yellow-500/30 rotate-180"><LeiwenCorner /></div>

          <div className="space-y-2">
            <h2 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-white/80 to-yellow-500/50 uppercase tracking-tighter italic font-serif">
                {step.title}
            </h2>
            <p className="text-[10px] font-black uppercase tracking-[0.6em] text-yellow-500/60 drop-shadow-sm">
                {step.subtitle}
            </p>
          </div>

          <div className="relative group px-4">
              <div className="absolute inset-0 bg-yellow-500/5 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <p className="relative text-gray-300 text-sm md:text-lg leading-relaxed font-medium max-w-xl mx-auto drop-shadow-sm animate-[fadeInText_0.8s_ease-out]">
                <HighlightedText text={step.content} />
              </p>
          </div>

          {/* Interactive Arena */}
          <div className="relative py-6 min-h-[200px] flex items-center justify-center">
            <div className={`flex justify-center flex-wrap ${step.cards.length > 5 ? 'gap-2' : 'gap-6'} perspective-1000`}>
                {step.cards.map((c) => {
                    const isTarget = step.targetCardIds?.includes(c.id);
                    const isSelected = selectedIds.has(c.id);
                    return (
                        <div key={c.id} className="relative group">
                            {/* Visual Guide Ring */}
                            {isTarget && !isSelected && (
                                <div className="absolute inset-[-15px] rounded-full border-2 border-yellow-500/20 animate-[ping_2s_infinite] pointer-events-none"></div>
                            )}
                            <div className={`transform transition-all duration-300 ${isSelected ? '-translate-y-4 scale-110' : 'hover:scale-105'} cursor-pointer`}>
                                <CardComp 
                                    card={c} 
                                    selected={isSelected}
                                    onClick={() => handleToggle(c.id)}
                                    small={step.cards.length > 5}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
          </div>

          {/* Action Interface */}
          <div className="flex flex-col gap-6 items-center">
            <button
              onClick={handleNext}
              className={`
                relative group overflow-hidden px-16 py-5 rounded-[1.5rem] font-black uppercase tracking-[0.3em] text-[10px] transition-all duration-500 active:scale-95 shadow-2xl
                ${isComplete 
                  ? 'text-black bg-gradient-to-r from-yellow-500 via-yellow-200 to-yellow-600 shadow-yellow-900/40 ring-1 ring-yellow-300/50' 
                  : 'text-white/20 bg-white/5 grayscale pointer-events-none border border-white/5'}
              `}
            >
              {isComplete && (
                  <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,0.4)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_4s_infinite] pointer-events-none"></div>
              )}
              <span className="relative z-10">{step.actionLabel}</span>
            </button>

            <div className="flex gap-10 items-center mt-2">
              <button 
                onClick={() => setShowRules(true)}
                className="text-yellow-500/60 hover:text-yellow-400 text-[10px] font-black uppercase tracking-[0.4em] transition-all flex items-center gap-3 group"
              >
                <span className="w-5 h-5 rounded-full border border-yellow-500/40 flex items-center justify-center text-[8px] group-hover:bg-yellow-500 group-hover:text-black transition-all">?</span>
                Full Codex
              </button>
              <button 
                onClick={onExit}
                className="text-white/20 hover:text-red-500/80 text-[10px] font-black uppercase tracking-[0.4em] transition-all border-b border-transparent hover:border-red-500/20"
              >
                End Briefing
              </button>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeInText {
          from { opacity: 0; transform: translateY(10px); filter: blur(4px); }
          to { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        @keyframes shimmer {
          0% { background-position: -100% 0; }
          100% { background-position: 100% 0; }
        }
        .perspective-1000 { perspective: 1000px; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
};
