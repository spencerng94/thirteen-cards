import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { CurrencyIcon } from './CurrencyIcon';
import { audioService } from '../services/audio';

interface GemPurchaseCelebrationProps {
  gemsPurchased: number;
  totalGems: number;
  onClose: () => void;
}

const SparkleParticle: React.FC<{ index: number; delay: number }> = ({ index, delay }) => {
  const style = useMemo(() => ({
    '--tx': `${(Math.random() - 0.5) * 800}px`,
    '--ty': `${(Math.random() - 0.5) * 800}px`,
    '--rot': `${Math.random() * 1080}deg`,
    '--scale': `${0.5 + Math.random() * 1.5}`,
    left: `${50 + (Math.random() - 0.5) * 20}%`,
    top: `${50 + (Math.random() - 0.5) * 20}%`,
    animationDelay: `${delay}s`,
  } as React.CSSProperties), [delay]);

  const colors = ['#ec4899', '#f472b6', '#db2777', '#fbbf24', '#f59e0b', '#ffffff'];
  const color = colors[index % colors.length];

  return (
    <div 
      className="absolute w-3 h-3 rounded-full opacity-0 pointer-events-none animate-sparkle-burst" 
      style={{
        ...style,
        backgroundColor: color,
        boxShadow: `0 0 20px ${color}, 0 0 40px ${color}`,
      }}
    />
  );
};

const GemCounter: React.FC<{ 
  target: number; 
  duration: number;
  onComplete: () => void;
}> = ({ target, duration, onComplete }) => {
  const [count, setCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (isComplete) return;
    
    const startTime = Date.now();
    const startValue = 0;
    const endValue = target;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth deceleration
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(startValue + (endValue - startValue) * easeOutCubic);
      
      setCount(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCount(target);
        setIsComplete(true);
        onComplete();
      }
    };
    
    requestAnimationFrame(animate);
  }, [target, duration, isComplete, onComplete]);

  return (
    <div className="flex items-baseline gap-2">
      <span className="text-6xl sm:text-7xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-pink-400 via-pink-300 to-yellow-300 italic leading-none drop-shadow-[0_0_30px_rgba(236,72,153,0.8)]">
        {count.toLocaleString()}
      </span>
      <CurrencyIcon type="GEMS" size="lg" />
    </div>
  );
};

const RippleEffect: React.FC<{ delay: number }> = ({ delay }) => {
  return (
    <div 
      className="absolute inset-0 rounded-full border-2 border-pink-400/40 animate-ripple pointer-events-none"
      style={{ animationDelay: `${delay}s` }}
    />
  );
};

export const GemPurchaseCelebration: React.FC<GemPurchaseCelebrationProps> = ({
  gemsPurchased,
  totalGems,
  onClose,
}) => {
  const [phase, setPhase] = useState<'entrance' | 'counting' | 'celebration' | 'display'>('entrance');
  const [showSparkles, setShowSparkles] = useState(false);
  const [showRipples, setShowRipples] = useState(false);

  useEffect(() => {
    // Play enhanced gem purchase sound
    audioService.playGemPurchase();
    
    // Entrance phase
    const entranceTimer = setTimeout(() => {
      setPhase('counting');
      setShowSparkles(true);
      setShowRipples(true);
    }, 400);

    // Counting phase (2 seconds for counting animation)
    const countingTimer = setTimeout(() => {
      setPhase('celebration');
      // Play victory sound for extra satisfaction
      audioService.playVictory();
    }, 2400);

    // Celebration phase
    const celebrationTimer = setTimeout(() => {
      setPhase('display');
    }, 3400);

    // Auto-close after 5 seconds total
    const autoCloseTimer = setTimeout(() => {
      onClose();
    }, 6000);

    return () => {
      clearTimeout(entranceTimer);
      clearTimeout(countingTimer);
      clearTimeout(celebrationTimer);
      clearTimeout(autoCloseTimer);
    };
  }, [onClose]);

  const sparkleCount = 80;
  const rippleCount = 5;

  const content = (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 pointer-events-none">
      {/* Backdrop with pulsing glow */}
      <div 
        className={`absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-1000 ${
          phase === 'entrance' ? 'opacity-0' : 'opacity-100'
        }`}
      />

      {/* Sparkle Particles */}
      {showSparkles && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: sparkleCount }).map((_, i) => (
            <SparkleParticle 
              key={i} 
              index={i} 
              delay={Math.random() * 1.5}
            />
          ))}
        </div>
      )}

      {/* Ripple Effects */}
      {showRipples && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {Array.from({ length: rippleCount }).map((_, i) => (
            <RippleEffect key={i} delay={i * 0.3} />
          ))}
        </div>
      )}

      {/* Main Celebration Modal */}
      <div 
        className={`relative z-10 bg-gradient-to-br from-[#0a0a0a] via-[#1a0010] to-[#000000] border-2 rounded-3xl sm:rounded-[3rem] p-6 sm:p-8 md:p-12 w-full max-w-lg shadow-[0_0_200px_rgba(236,72,153,0.6)] overflow-hidden pointer-events-auto transition-all duration-700 ${
          phase === 'entrance' 
            ? 'scale-0 opacity-0 rotate-12' 
            : phase === 'celebration'
            ? 'scale-110 opacity-100 rotate-0 animate-pulse'
            : 'scale-100 opacity-100 rotate-0'
        }`}
      >
        {/* Animated Border Glow */}
        <div className="absolute -inset-1 bg-gradient-to-r from-pink-500 via-pink-400 via-yellow-400 to-pink-500 rounded-3xl sm:rounded-[3rem] opacity-60 blur-xl animate-pulse"></div>
        <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-600 via-pink-500 to-pink-600 rounded-3xl sm:rounded-[3rem] opacity-40 blur-lg"></div>

        {/* Background Glow Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(236,72,153,0.3)_0%,transparent_70%)] animate-pulse"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 via-transparent to-yellow-500/10"></div>
        
        {/* Animated Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.03] mix-blend-screen" style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)
          `,
          backgroundSize: '30px 30px',
          animation: 'gridMove 20s linear infinite'
        }}></div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center gap-4 sm:gap-6">
          {/* Success Icon with Multiple Layers */}
          <div className={`relative transition-all duration-700 ${
            phase === 'celebration' 
              ? 'scale-150 rotate-12' 
              : 'scale-100 rotate-0'
          }`}>
            {/* Outer Glow Rings */}
            <div className="absolute inset-0 bg-pink-500/30 blur-3xl rounded-full animate-pulse scale-150"></div>
            <div className="absolute inset-0 bg-yellow-400/20 blur-2xl rounded-full animate-pulse scale-125" style={{ animationDelay: '0.5s' }}></div>
            
            {/* Main Icon Container */}
            <div className="relative w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 bg-gradient-to-br from-pink-500 via-pink-400 to-yellow-400 rounded-full flex items-center justify-center border-4 border-pink-300 shadow-[0_0_60px_rgba(236,72,153,0.9),inset_0_0_40px_rgba(251,191,36,0.3)]">
              {/* Inner Glow */}
              <div className="absolute inset-4 bg-gradient-to-br from-white/40 to-transparent rounded-full"></div>
              
              {/* Checkmark */}
              <svg 
                className="relative z-10 w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 text-white drop-shadow-lg" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth={4}
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  d="M5 13l4 4L19 7" 
                />
              </svg>
              
              {/* Rotating Sparkle Ring */}
              <div className="absolute inset-0 border-2 border-pink-300/50 rounded-full animate-spin" style={{ animationDuration: '3s' }}></div>
            </div>
          </div>

          {/* Achievement Text */}
          <div className="space-y-2 sm:space-y-3">
            <h2 className={`text-3xl sm:text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-pink-400 via-pink-300 to-yellow-300 uppercase tracking-tight drop-shadow-[0_0_30px_rgba(236,72,153,0.8)] transition-all duration-500 ${
              phase === 'celebration' ? 'scale-110' : 'scale-100'
            }`}>
              🎉 PURCHASE SUCCESS! 🎉
            </h2>
            <p className="text-base sm:text-lg text-white/80 font-semibold">
              You've unlocked premium power!
            </p>
          </div>

          {/* Gem Counter Display */}
          <div className="relative py-6 sm:py-8">
            {/* Background Glow for Counter */}
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 via-pink-600/20 to-yellow-500/20 rounded-3xl blur-3xl scale-150"></div>
            
            {/* Counter Container */}
            <div className="relative bg-gradient-to-br from-pink-500/10 via-pink-600/10 to-yellow-500/10 border-2 border-pink-400/30 rounded-2xl sm:rounded-3xl p-6 sm:p-8 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm sm:text-base text-white/60 uppercase tracking-wider font-semibold">
                  Gems Added
                </p>
                {phase === 'counting' || phase === 'celebration' || phase === 'display' ? (
                  <GemCounter 
                    target={gemsPurchased} 
                    duration={2000}
                    onComplete={() => {}}
                  />
                ) : (
                  <div className="flex items-baseline gap-2">
                    <span className="text-6xl sm:text-7xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-pink-400 via-pink-300 to-yellow-300 italic leading-none">
                      0
                    </span>
                    <CurrencyIcon type="GEMS" size="lg" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Total Gems Display */}
          <div className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm">
            <span className="text-xs sm:text-sm text-white/50 uppercase tracking-wide font-semibold">New Total:</span>
            <div className="flex items-center gap-1.5">
              <CurrencyIcon type="GEMS" size="sm" />
              <span className="text-lg sm:text-xl font-bold text-pink-300">
                {totalGems.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Achievement Badge */}
          <div className={`px-4 py-2 bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border border-yellow-400/40 rounded-xl transition-all duration-500 ${
            phase === 'celebration' ? 'scale-110 opacity-100' : 'scale-100 opacity-80'
          }`}>
            <p className="text-xs sm:text-sm font-black text-yellow-300 uppercase tracking-wider">
              ⭐ Premium Member ⭐
            </p>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="mt-2 px-8 py-3 sm:py-4 bg-gradient-to-r from-pink-500 via-pink-600 to-pink-500 text-white font-black uppercase tracking-wide rounded-xl shadow-[0_0_30px_rgba(236,72,153,0.5)] hover:shadow-[0_0_50px_rgba(236,72,153,0.8)] transition-all duration-300 hover:scale-105 active:scale-95 text-sm sm:text-base"
          >
            Amazing! 🚀
          </button>
        </div>
      </div>

      {/* CSS Animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes sparkleBurst {
          0% {
            transform: translate(-50%, -50%) scale(0) rotate(0deg);
            opacity: 1;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(var(--scale)) rotate(var(--rot));
            opacity: 0;
          }
        }
        .animate-sparkle-burst {
          animation: sparkleBurst 2.5s ease-out forwards;
        }
        
        @keyframes ripple {
          0% {
            transform: scale(0.8);
            opacity: 0.8;
          }
          100% {
            transform: scale(4);
            opacity: 0;
          }
        }
        .animate-ripple {
          animation: ripple 2s ease-out infinite;
        }
        
        @keyframes gridMove {
          0% {
            transform: translate(0, 0);
          }
          100% {
            transform: translate(30px, 30px);
          }
        }
      `}} />
    </div>
  );

  return typeof window !== 'undefined' 
    ? createPortal(content, document.body)
    : content;
};
