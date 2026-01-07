import React, { useEffect, useState } from 'react';

interface QuickMoveRewardProps {
  gold: number;
  xp: number;
  isStreak: boolean;
  position: 'bottom' | 'top' | 'left' | 'right';
  onComplete: () => void;
}

export const QuickMoveReward: React.FC<QuickMoveRewardProps> = ({ gold, xp, isStreak, position, onComplete }) => {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      setTimeout(onComplete, 500);
    }, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!show) return null;

  // Position calculations based on player position
  const positionStyles: Record<string, React.CSSProperties> = {
    bottom: { bottom: '32vh', left: '50%', transform: 'translateX(-50%)' },
    top: { top: '32vh', left: '50%', transform: 'translateX(-50%)' },
    left: { left: '32vw', top: '50%', transform: 'translateY(-50%)' },
    right: { right: '32vw', top: '50%', transform: 'translateY(-50%)' }
  };

  return (
    <div 
      className="fixed z-[450] pointer-events-none flex flex-col items-center gap-2"
      style={positionStyles[position]}
    >
      {/* STREAK Badge */}
      {isStreak && (
        <div className="absolute -top-12 animate-streak-pop">
          <div className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-black px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-[0_0_20px_rgba(234,179,8,0.8)] border-2 border-yellow-300">
            STREAK!
          </div>
        </div>
      )}
      
      {/* Gold Reward */}
      <div className="animate-float-reward-gold flex items-center gap-1.5 bg-black/70 backdrop-blur-md border border-yellow-500/50 px-3 py-1.5 rounded-full shadow-[0_0_15px_rgba(234,179,8,0.6)]">
        <span className="text-yellow-400 text-lg">💰</span>
        <span className="text-yellow-400 font-black text-sm">+{gold}</span>
      </div>
      
      {/* XP Reward */}
      <div className="animate-float-reward-xp flex items-center gap-1.5 bg-black/70 backdrop-blur-md border border-blue-500/50 px-3 py-1.5 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.6)]">
        <span className="text-blue-400 text-lg">⭐</span>
        <span className="text-blue-400 font-black text-sm">+{xp}</span>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes floatRewardGold {
          0% { transform: translateY(0) scale(0.8); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translateY(-80px) scale(1.1); opacity: 0; }
        }
        @keyframes floatRewardXp {
          0% { transform: translateY(0) scale(0.8); opacity: 0; }
          15% { opacity: 1; }
          100% { transform: translateY(-100px) scale(1.1); opacity: 0; }
        }
        @keyframes streakPop {
          0% { transform: scale(0) rotate(-10deg); opacity: 0; }
          50% { transform: scale(1.2) rotate(5deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        .animate-float-reward-gold { animation: floatRewardGold 2.5s cubic-bezier(0.19, 1, 0.22, 1) forwards; }
        .animate-float-reward-xp { animation: floatRewardXp 2.5s cubic-bezier(0.19, 1, 0.22, 1) forwards; animation-delay: 0.1s; }
        .animate-streak-pop { animation: streakPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
      `}} />
    </div>
  );
};
