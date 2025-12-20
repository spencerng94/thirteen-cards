
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
  content: React.ReactNode;
  cards: Card[];
  targetCardIds?: string[];
  actionLabel?: string;
}

export const TutorialMode: React.FC<TutorialModeProps> = ({ onExit }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showRules, setShowRules] = useState(false);

  const steps: Step[] = useMemo(() => [
    {
      title: "Welcome to Thirteen",
      content: (
        <>
          Tiến Lên (Thirteen) is Vietnam's most popular card game. The goal is simple: <span className="text-yellow-400 font-bold">be the first to empty your hand.</span> Let's start with the basics of Card Ranks.
        </>
      ),
      cards: [
        { rank: Rank.Three, suit: Suit.Spades, id: uuidv4() },
        { rank: Rank.Ace, suit: Suit.Hearts, id: uuidv4() },
        { rank: Rank.Two, suit: Suit.Diamonds, id: uuidv4() }
      ],
      actionLabel: "Next"
    },
    {
      title: "The Hierarchy",
      content: "Unlike standard poker, 3 is the LOWEST card and 2 is the HIGHEST. Within the same rank, suits matter: Spades ♠ (Low) < Clubs ♣ < Diamonds ♦ < Hearts ♥ (High).",
      cards: [
        { rank: Rank.Three, suit: Suit.Spades, id: 'low' },
        { rank: Rank.Three, suit: Suit.Hearts, id: 'high' }
      ],
      targetCardIds: ['high'],
      actionLabel: "Pick the 3 of Hearts"
    },
    {
      title: "Starting the Game",
      content: "The player with the 3 of Spades (3♠) ALWAYS leads the first turn of the game. They must play it, either as a single card or part of a combo.",
      cards: [
        { rank: Rank.Three, suit: Suit.Spades, id: 'start' },
        { rank: Rank.King, suit: Suit.Clubs, id: 'king' }
      ],
      targetCardIds: ['start'],
      actionLabel: "Select the 3♠ to Start"
    },
    {
      title: "Combinations",
      content: "You can play Singles, Pairs, Triples, or Runs (3+ consecutive cards). To beat the previous player, you must play the same combo type with a higher value.",
      cards: [
        { rank: Rank.Five, suit: Suit.Clubs, id: 'p1' },
        { rank: Rank.Five, suit: Suit.Diamonds, id: 'p2' }
      ],
      targetCardIds: ['p1', 'p2'],
      actionLabel: "Select the Pair"
    },
    {
      title: "The Runs",
      content: "A Run is a sequence of at least 3 cards (e.g., 4-5-6). IMPORTANT: The 2 (Pig) can NEVER be part of a run. It's too powerful!",
      cards: [
        { rank: Rank.Nine, suit: Suit.Spades, id: 'r1' },
        { rank: Rank.Ten, suit: Suit.Clubs, id: 'r2' },
        { rank: Rank.Jack, suit: Suit.Hearts, id: 'r3' }
      ],
      targetCardIds: ['r1', 'r2', 'r3'],
      actionLabel: "Select the Run"
    },
    {
      title: "Chopping (Bombs)",
      content: "Special hands called 'Bombs' can beat a 2! For example, 3 consecutive pairs (like 4-4, 5-5, 6-6) can 'chop' a single 2 out of turn.",
      cards: [
        { rank: Rank.Four, suit: Suit.Spades, id: 'b1' },
        { rank: Rank.Four, suit: Suit.Hearts, id: 'b2' },
        { rank: Rank.Five, suit: Suit.Clubs, id: 'b3' },
        { rank: Rank.Five, suit: Suit.Diamonds, id: 'b4' },
        { rank: Rank.Six, suit: Suit.Spades, id: 'b5' },
        { rank: Rank.Six, suit: Suit.Hearts, id: 'b6' }
      ],
      targetCardIds: ['b1', 'b2', 'b3', 'b4', 'b5', 'b6'],
      actionLabel: "Select the Bomb (3 Pairs)"
    },
    {
      title: "Ready to Play",
      content: "You've mastered the fundamentals! Practice against AI or challenge friends online to become a true legend of Thirteen.",
      cards: [],
      actionLabel: "Finish Tutorial"
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
      if (!isCorrect) return;
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
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-6 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-black pointer-events-none"></div>
      
      {showRules && <InstructionsModal onClose={() => setShowRules(false)} />}

      <div className="max-w-2xl w-full z-10 flex flex-col gap-8 items-center">
        
        {/* Progress Dots */}
        <div className="flex gap-2 mb-4">
          {steps.map((_, i) => (
            <div 
              key={i} 
              className={`h-1.5 rounded-full transition-all duration-500 ${i === currentStep ? 'w-8 bg-blue-500' : 'w-2 bg-white/10'}`} 
            />
          ))}
        </div>

        <div className="bg-black/40 backdrop-blur-2xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl w-full text-center space-y-6">
          <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-blue-400 uppercase tracking-tighter">
            {step.title}
          </h2>
          <div className="text-gray-400 text-sm md:text-base leading-relaxed tracking-wide">
            {step.content}
          </div>

          <div className={`flex justify-center flex-wrap ${step.cards.length > 5 ? 'gap-2' : 'gap-4'} py-8 min-h-[160px]`}>
            {step.cards.map((c) => (
              <div key={c.id} className="transform transition-transform hover:scale-110">
                <CardComp 
                  card={c} 
                  selected={selectedIds.has(c.id)}
                  onClick={() => handleToggle(c.id)}
                  small={step.cards.length > 5}
                />
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-4 items-center">
            <button
              onClick={handleNext}
              disabled={!isComplete}
              className={`
                px-12 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all duration-300 shadow-xl
                ${isComplete 
                  ? 'bg-blue-600 text-white hover:bg-blue-500 hover:shadow-blue-500/20 active:scale-95' 
                  : 'bg-white/5 text-gray-600 cursor-not-allowed'}
              `}
            >
              {step.actionLabel}
            </button>
            <div className="flex gap-8 items-center mt-2">
              <button 
                onClick={() => setShowRules(true)}
                className="text-blue-400 hover:text-blue-300 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                View Full Rules
              </button>
              <button 
                onClick={onExit}
                className="text-gray-600 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors"
              >
                Skip Tutorial
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
