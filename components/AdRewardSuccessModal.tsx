import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { VisualEmote } from './VisualEmote';
import { CurrencyIcon } from './CurrencyIcon';
import { Emote } from '../types';

interface AdRewardSuccessModalProps {
  gemAmount: number;
  onClose: () => void;
  remoteEmotes?: Emote[];
}

const ConfettiParticle: React.FC<{ index: number; color: string }> = ({ index, color }) => {
  const style = useMemo(() => ({
    '--tx': `${(Math.random() - 0.5) * 600}px`,
    '--ty': `${(Math.random() - 0.5) * 600}px`,
    '--rot': `${Math.random() * 720}deg`,
    left: '50%',
    top: '50%',
    backgroundColor: color,
    animationDelay: `${Math.random() * 0.5}s`,
  } as React.CSSProperties), []);

  return (
    <div 
      className="absolute w-2 h-2 rounded-full opacity-0 animate-confetti-burst pointer-events-none" 
      style={style}
    />
  );
};

export const AdRewardSuccessModal: React.FC<AdRewardSuccessModalProps> = ({
  gemAmount,
  onClose,
  remoteEmotes = []
}) => {
  const [phase, setPhase] = useState<'entrance' | 'celebration' | 'display'>('entrance');

  useEffect(() => {
    // Entrance animation
    const entranceTimer = setTimeout(() => setPhase('celebration'), 300);
    const celebrationTimer = setTimeout(() => setPhase('display'), 1200);
    
    // Auto-close after 3 seconds
    const autoCloseTimer = setTimeout(() => {
      onClose();
    }, 4000);

    return () => {
      clearTimeout(entranceTimer);
      clearTimeout(celebrationTimer);
      clearTimeout(autoCloseTimer);
    };
  }, [onClose]);

  const confettiColors = [
    '#FFD700', '#FFA500', '#FF6B6B', '#4ECDC4', '#45B7D1',
    '#FFE66D', '#FF6B9D', '#C44569', '#F8B500', '#6C5CE7'
  ];

  const content = (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-500"
        onClick={onClose}
      />

      {/* Confetti Particles */}
      {phase === 'celebration' && (
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 50 }).map((_, i) => (
            <ConfettiParticle 
              key={i} 
              index={i} 
              color={confettiColors[i % confettiColors.length]} 
            />
          ))}
        </div>
      )}

      {/* Success Modal */}
      <div 
        className={`relative z-10 bg-gradient-to-br from-[#0a0a0a] via-[#050505] to-[#000000] border-2 border-pink-500/40 rounded-3xl sm:rounded-[3rem] p-6 sm:p-8 w-full max-w-md shadow-[0_0_100px_rgba(236,72,153,0.5)] overflow-hidden ${
          phase === 'entrance' 
            ? 'scale-0 opacity-0' 
            : phase === 'celebration'
            ? 'scale-110 opacity-100 animate-pulse'
            : 'scale-100 opacity-100'
        } transition-all duration-500`}
        onClick={e => e.stopPropagation()}
      >
        {/* Background Glow Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(236,72,153,0.15)_0%,transparent_70%)]"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 via-transparent to-purple-500/10"></div>
        
        {/* Animated Border Glow */}
        <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 via-pink-400 to-pink-500 rounded-3xl sm:rounded-[3rem] opacity-50 blur-xl animate-pulse"></div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center gap-4 sm:gap-6">
          {/* Shiba Winking Icon */}
          <div className={`relative ${
            phase === 'celebration' 
              ? 'scale-150 rotate-12' 
              : 'scale-100 rotate-0'
          } transition-all duration-500`}>
            <div className="absolute inset-0 bg-pink-500/30 blur-2xl rounded-full animate-pulse"></div>
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
              <VisualEmote 
                trigger=":shiba:" 
                remoteEmotes={remoteEmotes} 
                size="lg"
                fallback="😉"
              />
            </div>
          </div>

          {/* Success Message */}
          <div className="space-y-2">
            <h2 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-pink-400 via-pink-300 to-pink-500 uppercase tracking-tight drop-shadow-[0_0_20px_rgba(236,72,153,0.6)]">
              FREE STASH SECURED!
            </h2>
            <p className="text-sm sm:text-base text-white/70 font-medium">
              You've earned {gemAmount} gems
            </p>
          </div>

          {/* Gem Display */}
          <div className="relative py-4 sm:py-6">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-transparent rounded-3xl blur-2xl"></div>
            <div className="relative flex items-center gap-3 px-6 py-4 bg-white/5 border border-white/10 rounded-xl">
              <CurrencyIcon type="GEMS" size="md" />
              <span className="text-2xl sm:text-3xl font-bold text-pink-300">
                +{gemAmount}
              </span>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="mt-2 px-6 py-2.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white font-bold uppercase tracking-wide rounded-xl shadow-[0_0_20px_rgba(236,72,153,0.4)] hover:shadow-[0_0_30px_rgba(236,72,153,0.6)] transition-all duration-300 hover:scale-105"
          >
            Awesome!
          </button>
        </div>
      </div>

      {/* CSS Animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes confettiBurst {
          0% {
            transform: translate(-50%, -50%) scale(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(1) rotate(var(--rot));
            opacity: 0;
          }
        }
        .animate-confetti-burst {
          animation: confettiBurst 1.5s ease-out forwards;
        }
      `}} />
    </div>
  );

  return typeof window !== 'undefined' 
    ? createPortal(content, document.body)
    : content;
};
