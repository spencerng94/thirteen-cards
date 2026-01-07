import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { CurrencyIcon } from './Store';
import { audioService } from '../services/audio';

interface AccountMigrationSuccessModalProps {
  migratedGems: number;
  bonusGems: number;
  migratedXp: number;
  migratedCoins: number;
  newGemBalance: number;
  onClose: () => void;
}

const GoldParticle: React.FC<{ index: number; color: string }> = ({ index, color }) => {
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
      className="absolute w-2 h-2 rounded-full opacity-0 animate-gold-burst pointer-events-none" 
      style={style}
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
    <span className="text-2xl sm:text-3xl font-black text-yellow-400">
      {count.toLocaleString()}
    </span>
  );
};

export const AccountMigrationSuccessModal: React.FC<AccountMigrationSuccessModalProps> = ({
  migratedGems,
  bonusGems,
  migratedXp,
  migratedCoins,
  newGemBalance,
  onClose,
}) => {
  const [phase, setPhase] = useState<'entrance' | 'celebration' | 'display'>('entrance');
  const [countingComplete, setCountingComplete] = useState(false);

  useEffect(() => {
    // Play celebration sound
    audioService.playPurchase();
    
    // Entrance animation
    const entranceTimer = setTimeout(() => setPhase('celebration'), 300);
    const celebrationTimer = setTimeout(() => setPhase('display'), 2000);
    
    // Auto-close after 6 seconds
    const autoCloseTimer = setTimeout(() => {
      onClose();
    }, 6000);

    return () => {
      clearTimeout(entranceTimer);
      clearTimeout(celebrationTimer);
      clearTimeout(autoCloseTimer);
    };
  }, [onClose]);

  const goldColors = [
    '#FFD700', '#FFA500', '#FFC107', '#FFB300', '#FF8C00',
    '#FFD54F', '#FFC400', '#FFB800', '#FFA000', '#FF8F00'
  ];

  const content = (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/90 backdrop-blur-sm transition-opacity duration-500"
        onClick={onClose}
      />

      {/* Gold Particles */}
      {phase === 'celebration' && (
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 60 }).map((_, i) => (
            <GoldParticle 
              key={i} 
              index={i} 
              color={goldColors[i % goldColors.length]} 
            />
          ))}
        </div>
      )}

      {/* Success Modal */}
      <div 
        className={`relative z-10 bg-gradient-to-br from-[#1a0a00] via-[#0f0500] to-[#000000] border-2 border-yellow-500/50 rounded-3xl sm:rounded-[3rem] p-6 sm:p-8 w-full max-w-lg shadow-[0_0_100px_rgba(251,191,36,0.6)] overflow-hidden ${
          phase === 'entrance' 
            ? 'scale-0 opacity-0' 
            : phase === 'celebration'
            ? 'scale-110 opacity-100 animate-pulse'
            : 'scale-100 opacity-100'
        } transition-all duration-500`}
        onClick={e => e.stopPropagation()}
      >
        {/* Background Glow Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(251,191,36,0.2)_0%,transparent_70%)]"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-amber-500/10 to-transparent"></div>
        
        {/* Animated Border Glow */}
        <div className="absolute -inset-1 bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500 rounded-3xl sm:rounded-[3rem] opacity-60 blur-xl animate-pulse"></div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center gap-4 sm:gap-6">
          {/* Gold Gem Icon */}
          <div className={`relative ${
            phase === 'celebration' 
              ? 'scale-150 rotate-12' 
              : 'scale-100 rotate-0'
          } transition-all duration-500`}>
            <div className="absolute inset-0 bg-yellow-500/40 blur-2xl rounded-full animate-pulse"></div>
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
              <CurrencyIcon type="GEMS" size="xl" />
            </div>
          </div>

          {/* Success Message */}
          <div className="space-y-2">
            <h2 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-400 via-yellow-300 to-amber-400 uppercase tracking-tight drop-shadow-[0_0_20px_rgba(251,191,36,0.8)]">
              Account Linked!
            </h2>
            <p className="text-sm sm:text-base text-white/70 font-medium">
              Your progress has been synced
            </p>
          </div>

          {/* Breakdown */}
          <div className="w-full space-y-3 sm:space-y-4 py-4">
            {/* Migrated from Guest */}
            {(migratedGems > 0 || migratedXp > 0 || migratedCoins > 0) && (
              <div className="flex items-center justify-between px-4 py-3 bg-white/5 border border-white/10 rounded-xl backdrop-blur-sm">
                <span className="text-sm sm:text-base text-white/80 font-medium">
                  Migrated from Guest:
                </span>
                <div className="flex items-center gap-2">
                  {migratedGems > 0 && (
                    <div className="flex items-center gap-1">
                      <CurrencyIcon type="GEMS" size="xs" />
                      <span className="text-sm font-bold text-yellow-300">{migratedGems}</span>
                    </div>
                  )}
                  {migratedXp > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-sm">⭐</span>
                      <span className="text-sm font-bold text-yellow-300">{migratedXp}</span>
                    </div>
                  )}
                  {migratedCoins > 0 && (
                    <div className="flex items-center gap-1">
                      <CurrencyIcon type="GOLD" size="xs" />
                      <span className="text-sm font-bold text-yellow-300">{migratedCoins}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Account Bonus */}
            {bonusGems > 0 && (
              <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-yellow-500/20 via-amber-500/20 to-yellow-500/20 border-2 border-yellow-400/50 rounded-xl backdrop-blur-sm shadow-[0_0_20px_rgba(251,191,36,0.3)]">
                <span className="text-sm sm:text-base text-yellow-300 font-bold">
                  Account Bonus:
                </span>
                <div className="flex items-center gap-2">
                  <CurrencyIcon type="GEMS" size="xs" />
                  <span className="text-lg font-black text-yellow-400">+{bonusGems}</span>
                </div>
              </div>
            )}

            {/* New Balance */}
            <div className="flex items-center justify-between px-4 py-4 bg-gradient-to-r from-yellow-600/30 via-amber-600/30 to-yellow-600/30 border-2 border-yellow-500/60 rounded-xl backdrop-blur-sm shadow-[0_0_30px_rgba(251,191,36,0.4)]">
              <span className="text-base sm:text-lg text-yellow-200 font-black uppercase tracking-wide">
                New Balance:
              </span>
              <div className="flex items-center gap-2">
                <CurrencyIcon type="GEMS" size="sm" />
                {countingComplete ? (
                  <span className="text-2xl sm:text-3xl font-black text-yellow-400">
                    {newGemBalance.toLocaleString()}
                  </span>
                ) : (
                  <GemCounter 
                    target={newGemBalance} 
                    duration={1500}
                    onComplete={() => setCountingComplete(true)}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="mt-2 px-8 py-3 bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-500 text-black font-black uppercase tracking-wide rounded-xl shadow-[0_0_30px_rgba(251,191,36,0.5)] hover:shadow-[0_0_40px_rgba(251,191,36,0.7)] transition-all duration-300 hover:scale-105 active:scale-95"
          >
            Awesome!
          </button>
        </div>
      </div>

      {/* CSS Animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes goldBurst {
          0% {
            transform: translate(-50%, -50%) scale(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(1) rotate(var(--rot));
            opacity: 0;
          }
        }
        .animate-gold-burst {
          animation: goldBurst 2s ease-out forwards;
        }
      `}} />
    </div>
  );

  return typeof window !== 'undefined' 
    ? createPortal(content, document.body)
    : content;
};
