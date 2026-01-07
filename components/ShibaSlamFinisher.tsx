import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface ShibaSlamFinisherProps {
  onComplete: () => void;
  onReplay?: () => void;
  isPreview?: boolean;
  winnerName?: string;
}

export const ShibaSlamFinisher: React.FC<ShibaSlamFinisherProps> = ({ 
  onComplete, 
  onReplay,
  isPreview = false,
  winnerName = 'GUEST'
}) => {
  const [phase, setPhase] = useState<'charge' | 'shadow' | 'slam' | 'impact' | 'victory' | 'lingering'>('charge');
  const [showReplay, setShowReplay] = useState(false);

  useEffect(() => {
    // Phase 1: Power charge/build-up (1s) - dramatic energy gathering
    const chargeTimer = setTimeout(() => {
      setPhase('shadow');
    }, 1000);
    
    // Phase 2: Shadow buildup - massive paw shadow forming (1s)
    const shadowTimer = setTimeout(() => {
      setPhase('slam');
    }, 2000);

    // Phase 3: Slam down (0.3s) - fast and impactful
    const slamTimer = setTimeout(() => {
      setPhase('impact');
    }, 2300);

    // Phase 4: Impact effects (1.2s)
    const impactTimer = setTimeout(() => {
      setPhase('victory');
    }, 3500);

    // Phase 5: Victory text (2.5s)
    const victoryTimer = setTimeout(() => {
      setPhase('lingering');
      if (isPreview) {
        setShowReplay(true);
      }
    }, 6000);

    // Complete (only if not preview)
    if (!isPreview) {
      const completeTimer = setTimeout(() => {
        onComplete();
      }, 7500);
      return () => {
        clearTimeout(chargeTimer);
        clearTimeout(shadowTimer);
        clearTimeout(slamTimer);
        clearTimeout(impactTimer);
        clearTimeout(victoryTimer);
        clearTimeout(completeTimer);
      };
    }

    return () => {
      clearTimeout(chargeTimer);
      clearTimeout(shadowTimer);
      clearTimeout(slamTimer);
      clearTimeout(impactTimer);
      clearTimeout(victoryTimer);
    };
  }, [onComplete, isPreview]);

  const handleReplay = () => {
    if (onReplay) {
      setPhase('charge');
      setShowReplay(false);
      onReplay();
    }
  };

  const content = (
    <div 
      className="fixed inset-0 z-[300] pointer-events-none transform-gpu" 
      style={{ 
        backgroundColor: 'transparent',
        contain: 'layout style paint',
        willChange: 'contents'
      }}
    >
      {/* Dimmed Background with Dynamic Lighting */}
      <motion.div 
        className="absolute inset-0 bg-black"
        initial={{ opacity: 0 }}
        animate={{ 
          opacity: phase === 'charge'
            ? (isPreview ? 0.4 : 0.5)
            : phase === 'shadow' || phase === 'slam'
            ? (isPreview ? 0.6 : 0.7)
            : (isPreview ? 0.7 : 0.8)
        }}
        transition={{ duration: 0.3 }}
      />

      {/* Phase 1: Energy Charge Build-up - Dramatic Power Gathering */}
      {phase === 'charge' && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          {/* Pulsing energy orbs */}
          {[0, 1, 2].map((i) => (
            <motion.div
              key={`energy-${i}`}
              className="absolute w-32 h-32 rounded-full"
              style={{
                background: `radial-gradient(circle, rgba(251,191,36,${0.8 - i * 0.2}) 0%, transparent 70%)`,
                filter: 'blur(20px)',
              }}
              animate={{
                scale: [1, 1.5 + i * 0.3, 1],
                opacity: [0.3, 0.7, 0.3],
                x: Math.cos(i * 2 * Math.PI / 3) * 150,
                y: Math.sin(i * 2 * Math.PI / 3) * 150,
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.2,
              }}
            />
          ))}
          
          {/* Central pulsing glow */}
          <motion.div
            className="absolute w-96 h-96 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(251,191,36,0.6) 0%, rgba(251,191,36,0.2) 50%, transparent 100%)',
              filter: 'blur(60px)',
            }}
            animate={{
              scale: [0.8, 1.2, 0.8],
              opacity: [0.4, 0.8, 0.4],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </div>
      )}
      
      {/* Phase 2 & 3: Massive Shadow Buildup - Premium Shadow Effect */}
      {(phase === 'shadow' || phase === 'slam' || phase === 'impact' || phase === 'victory' || phase === 'lingering') && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          {/* Multiple shadow layers for depth */}
          <motion.div 
            className="absolute w-[800px] h-[800px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.7) 40%, transparent 100%)',
              filter: 'blur(120px)',
            }}
            initial={{ scale: 0.2, opacity: 0 }}
            animate={{ 
              scale: phase === 'shadow' 
                ? [0.2, 1.3, 1.6]
                : phase === 'slam' || phase === 'impact'
                ? [1.6, 2, 1.8]
                : 1.8,
              opacity: phase === 'shadow'
                ? [0, 0.9, 1]
                : phase === 'slam' || phase === 'impact'
                ? [1, 1, 0.95]
                : 0.9
            }}
            transition={{ 
              duration: phase === 'shadow' ? 1 : 0.3,
              ease: 'easeOut'
            }}
          />
          
          {/* Golden energy aura around shadow */}
          <motion.div 
            className="absolute w-[700px] h-[700px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(251,191,36,0.5) 0%, rgba(251,191,36,0.2) 30%, transparent 70%)',
              filter: 'blur(80px)',
            }}
            animate={{ 
              scale: phase === 'shadow' 
                ? [0.3, 1.1, 1.4]
                : phase === 'slam' || phase === 'impact'
                ? [1.4, 1.7, 1.5]
                : 1.5,
              opacity: phase === 'shadow'
                ? [0.2, 0.8, 0.9]
                : [0.9, 1, 0.8]
            }}
            transition={{ 
              duration: phase === 'shadow' ? 1 : 0.3,
              ease: 'easeOut'
            }}
          />
        </div>
      )}

      {/* Phase 3 & 4: Premium Dramatic Paw Slam */}
      {(phase === 'shadow' || phase === 'slam' || phase === 'impact' || phase === 'victory' || phase === 'lingering') && (
        <motion.div 
          className="absolute inset-0 flex items-center justify-center z-20"
          animate={phase === 'slam' || phase === 'impact' ? {
            x: [0, -10, 8, -6, 4, -3, 2, -1, 0],
            y: [0, -5, 4, -3, 2, -1, 1, 0, 0],
            rotate: [0, -1.5, 1.5, -0.8, 0.8, -0.4, 0.4, 0, 0],
          } : {}}
          transition={{
            duration: phase === 'slam' ? 0.3 : 1.2,
            ease: 'easeOut',
            times: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 1],
          }}
        >
          <motion.div 
            className="relative transform-gpu"
            initial={phase === 'shadow' ? {
              y: '-90vh',
              scale: 0.6,
              opacity: 0.4,
            } : {}}
            animate={{
              y: phase === 'shadow'
                ? '-90vh'
                : phase === 'slam'
                ? ['-90vh', '0vh', '-15px']
                : phase === 'impact' 
                ? ['-15px', '0px', '-8px', '0px']
                : '-25px',
              scale: phase === 'shadow'
                ? [0.6, 0.7, 0.8]
                : phase === 'slam'
                ? [0.8, 1.3, 1]
                : phase === 'impact' 
                ? [1, 1.15, 1.05, 1]
                : 0.98,
              opacity: phase === 'shadow' 
                ? [0.4, 0.7, 0.8]
                : 1,
              rotate: phase === 'impact' ? [0, -2, 1, -1, 0] : 0,
            }}
            transition={{
              duration: phase === 'shadow' ? 1 : phase === 'slam' ? 0.3 : phase === 'impact' ? 1.2 : 0.3,
              ease: phase === 'slam' ? [0.16, 1, 0.3, 1] : 'easeOut',
            }}
          >
            {/* Premium Enhanced Shiba Paw SVG with Multiple Glow Layers */}
            <svg 
              width="600" 
              height="600" 
              viewBox="0 0 200 200" 
              style={{ 
                filter: phase === 'slam' || phase === 'impact'
                  ? 'drop-shadow(0 0 100px rgba(251,191,36,1)) drop-shadow(0 0 180px rgba(251,191,36,0.95)) drop-shadow(0 0 260px rgba(251,191,36,0.8)) drop-shadow(0 0 340px rgba(251,191,36,0.6))'
                  : 'drop-shadow(0 0 60px rgba(251,191,36,0.95)) drop-shadow(0 0 120px rgba(251,191,36,0.8)) drop-shadow(0 0 180px rgba(251,191,36,0.6))',
                transition: 'filter 0.4s ease-out'
              }}
            >
              <defs>
                {/* Enhanced Premium Gradients */}
                <radialGradient id="pawGradientPremium" cx="50%" cy="50%">
                  <stop offset="0%" stopColor="#FFF8DC" stopOpacity="1" />
                  <stop offset="30%" stopColor="#FFE4B5" stopOpacity="1" />
                  <stop offset="60%" stopColor="#DEB887" stopOpacity="1" />
                  <stop offset="85%" stopColor="#CD853F" stopOpacity="1" />
                  <stop offset="100%" stopColor="#A0522D" stopOpacity="1" />
                </radialGradient>
                
                <radialGradient id="pawHighlight" cx="50%" cy="40%">
                  <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#FFF8DC" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                </radialGradient>
                
                <radialGradient id="pawShadow" cx="50%" cy="60%">
                  <stop offset="0%" stopColor="transparent" stopOpacity="0" />
                  <stop offset="100%" stopColor="#654321" stopOpacity="0.4" />
                </radialGradient>
                
                {/* Premium Glow Filters */}
                <filter id="pawGlowFilterPremium" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                
                <filter id="pawInnerGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="innerBlur"/>
                  <feMerge>
                    <feMergeNode in="innerBlur"/>
                  </feMerge>
                </filter>
                
                {/* Golden energy aura */}
                <radialGradient id="goldenAura" cx="50%" cy="50%">
                  <stop offset="0%" stopColor="#FEF3C7" stopOpacity="0.8" />
                  <stop offset="40%" stopColor="#FDE68A" stopOpacity="0.5" />
                  <stop offset="80%" stopColor="#FCD34D" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                </radialGradient>
              </defs>
              
              {/* Outer golden energy aura */}
              <circle 
                cx="100" 
                cy="100" 
                r="98" 
                fill="url(#goldenAura)" 
                opacity={phase === 'slam' || phase === 'impact' ? 0.9 : 0.6}
              />
              
              {/* Outer glow ring - multiple layers for depth */}
              <circle cx="100" cy="100" r="96" fill="url(#pawGradientPremium)" opacity="0.25" filter="url(#pawGlowFilterPremium)" />
              <circle cx="100" cy="100" r="94" fill="url(#pawGradientPremium)" opacity="0.15" filter="url(#pawGlowFilterPremium)" />
              
              {/* Main paw pad - with enhanced depth */}
              <ellipse cx="100" cy="145" rx="48" ry="38" fill="url(#pawShadow)" opacity="0.3" />
              <ellipse cx="100" cy="145" rx="46" ry="36" fill="url(#pawGradientPremium)" filter="url(#pawGlowFilterPremium)" />
              <ellipse cx="100" cy="142" rx="42" ry="32" fill="url(#pawGradientPremium)" />
              <ellipse cx="100" cy="140" rx="38" ry="28" fill="url(#pawHighlight)" opacity="0.4" />
              
              {/* Top toe pads - enhanced with better gradients */}
              <ellipse cx="75" cy="75" rx="20" ry="24" fill="url(#pawShadow)" opacity="0.25" />
              <ellipse cx="100" cy="65" rx="22" ry="27" fill="url(#pawShadow)" opacity="0.25" />
              <ellipse cx="125" cy="75" rx="20" ry="24" fill="url(#pawShadow)" opacity="0.25" />
              
              <ellipse cx="75" cy="75" rx="19" ry="23" fill="url(#pawGradientPremium)" filter="url(#pawGlowFilterPremium)" />
              <ellipse cx="100" cy="65" rx="21" ry="26" fill="url(#pawGradientPremium)" filter="url(#pawGlowFilterPremium)" />
              <ellipse cx="125" cy="75" rx="19" ry="23" fill="url(#pawGradientPremium)" filter="url(#pawGlowFilterPremium)" />
              
              {/* Inner highlights - premium shine effect */}
              <ellipse cx="75" cy="73" rx="13" ry="16" fill="url(#pawHighlight)" opacity="0.8" />
              <ellipse cx="100" cy="63" rx="15" ry="19" fill="url(#pawHighlight)" opacity="0.8" />
              <ellipse cx="125" cy="73" rx="13" ry="16" fill="url(#pawHighlight)" opacity="0.8" />
              
              {/* Smaller toe pads */}
              <ellipse cx="88" cy="105" rx="16" ry="19" fill="url(#pawShadow)" opacity="0.2" />
              <ellipse cx="112" cy="105" rx="16" ry="19" fill="url(#pawShadow)" opacity="0.2" />
              
              <ellipse cx="88" cy="105" rx="16" ry="19" fill="url(#pawGradientPremium)" filter="url(#pawGlowFilterPremium)" />
              <ellipse cx="112" cy="105" rx="16" ry="19" fill="url(#pawGradientPremium)" filter="url(#pawGlowFilterPremium)" />
              
              <ellipse cx="88" cy="103" rx="11" ry="13" fill="url(#pawHighlight)" opacity="0.75" />
              <ellipse cx="112" cy="103" rx="11" ry="13" fill="url(#pawHighlight)" opacity="0.75" />
              
              {/* Premium Claws - sharper and more defined */}
              <path d="M 65 70 Q 60 55 58 45" stroke="#654321" strokeWidth="4" strokeLinecap="round" fill="none" filter="url(#pawGlowFilterPremium)" />
              <path d="M 80 60 Q 75 45 73 35" stroke="#654321" strokeWidth="4" strokeLinecap="round" fill="none" filter="url(#pawGlowFilterPremium)" />
              <path d="M 100 55 Q 100 40 100 30" stroke="#654321" strokeWidth="4.5" strokeLinecap="round" fill="none" filter="url(#pawGlowFilterPremium)" />
              <path d="M 120 60 Q 125 45 127 35" stroke="#654321" strokeWidth="4" strokeLinecap="round" fill="none" filter="url(#pawGlowFilterPremium)" />
              <path d="M 135 70 Q 140 55 142 45" stroke="#654321" strokeWidth="4" strokeLinecap="round" fill="none" filter="url(#pawGlowFilterPremium)" />
              
              {/* Claw highlights */}
              <path d="M 66 70 Q 61 56 59 46" stroke="#D4AF37" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.6" />
              <path d="M 81 60 Q 76 46 74 36" stroke="#D4AF37" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.6" />
              <path d="M 100 56 Q 100 41 100 31" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.6" />
              <path d="M 119 60 Q 124 46 126 36" stroke="#D4AF37" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.6" />
              <path d="M 134 70 Q 139 56 141 46" stroke="#D4AF37" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.6" />
            </svg>
          </motion.div>

          {/* Premium Impact Particle Effects */}
          {phase === 'impact' && (
            <>
              {/* Enhanced Radial Energy Burst */}
              <div className="absolute inset-0 flex items-center justify-center">
                {Array.from({ length: 60 }).map((_, i) => {
                  const angle = (i * 360) / 60;
                  const distance = 250 + Math.random() * 200;
                  const size = 4 + Math.random() * 4;
                  return (
                    <motion.div
                      key={`energy-${i}`}
                      className="absolute rounded-full"
                      style={{
                        width: `${size}px`,
                        height: `${size}px`,
                        left: '50%',
                        top: '50%',
                        background: `radial-gradient(circle, rgba(251,191,36,1) 0%, rgba(251,191,36,0.7) 50%, transparent 100%)`,
                        boxShadow: '0 0 15px rgba(251,191,36,1), 0 0 25px rgba(251,191,36,0.8), 0 0 35px rgba(251,191,36,0.6)',
                      }}
                      initial={{ 
                        x: 0, 
                        y: 0, 
                        scale: 1, 
                        opacity: 1 
                      }}
                      animate={{ 
                        x: Math.cos((angle * Math.PI) / 180) * distance,
                        y: Math.sin((angle * Math.PI) / 180) * distance,
                        scale: [1, 2, 0],
                        opacity: [1, 1, 0],
                      }}
                      transition={{
                        duration: 1.2,
                        delay: i * 0.015,
                        ease: 'easeOut',
                      }}
                    />
                  );
                })}
              </div>
              
              {/* Premium Multi-Layer Shockwave Rings */}
              {[0, 1, 2, 3].map((ring) => (
                <>
                  <motion.div
                    key={`ring-outer-${ring}`}
                    className="absolute border-4 border-yellow-400 rounded-full"
                    style={{
                      left: '50%',
                      top: '50%',
                      width: 0,
                      height: 0,
                      borderColor: 'rgba(251,191,36,0.9)',
                      boxShadow: '0 0 30px rgba(251,191,36,1), 0 0 50px rgba(251,191,36,0.8), 0 0 70px rgba(251,191,36,0.6)',
                    }}
                    initial={{ 
                      width: 0, 
                      height: 0, 
                      x: '-50%', 
                      y: '-50%',
                      opacity: 1,
                      borderWidth: '6px',
                    }}
                    animate={{ 
                      width: 900 + ring * 100,
                      height: 900 + ring * 100,
                      opacity: 0,
                      borderWidth: '2px',
                    }}
                    transition={{
                      duration: 1.8,
                      delay: ring * 0.25,
                      ease: 'easeOut',
                    }}
                  />
                  <motion.div
                    key={`ring-inner-${ring}`}
                    className="absolute border-2 border-yellow-300 rounded-full"
                    style={{
                      left: '50%',
                      top: '50%',
                      width: 0,
                      height: 0,
                      borderColor: 'rgba(254,243,199,0.8)',
                      boxShadow: '0 0 20px rgba(254,243,199,0.9)',
                    }}
                    initial={{ 
                      width: 0, 
                      height: 0, 
                      x: '-50%', 
                      y: '-50%',
                      opacity: 0.9,
                      borderWidth: '4px',
                    }}
                    animate={{ 
                      width: 700 + ring * 80,
                      height: 700 + ring * 80,
                      opacity: 0,
                      borderWidth: '1px',
                    }}
                    transition={{
                      duration: 1.6,
                      delay: ring * 0.25 + 0.1,
                      ease: 'easeOut',
                    }}
                  />
                </>
              ))}
              
              {/* Premium Golden Sparkles with Varied Sizes */}
              {Array.from({ length: 50 }).map((_, i) => {
                const sparkleSize = 2 + Math.random() * 6;
                const sparkleType = Math.floor(Math.random() * 3);
                return (
                  <motion.div
                    key={`sparkle-${i}`}
                    className="absolute"
                    style={{
                      width: `${sparkleSize}px`,
                      height: sparkleType === 0 ? `${sparkleSize * 4}px` : `${sparkleSize}px`,
                      left: `${50 + (Math.random() - 0.5) * 50}%`,
                      top: `${50 + (Math.random() - 0.5) * 50}%`,
                      background: sparkleType === 0 
                        ? 'linear-gradient(to bottom, rgba(254,243,199,1) 0%, rgba(251,191,36,0.8) 50%, transparent 100%)'
                        : 'radial-gradient(circle, rgba(254,243,199,1) 0%, rgba(251,191,36,0.8) 50%, transparent 100%)',
                      borderRadius: sparkleType === 0 ? '50%' : '50%',
                      boxShadow: '0 0 12px rgba(251,191,36,1), 0 0 20px rgba(251,191,36,0.8), 0 0 30px rgba(251,191,36,0.6)',
                    }}
                    initial={{ 
                      opacity: 0, 
                      scale: 0, 
                      rotate: Math.random() * 360 
                    }}
                    animate={{ 
                      opacity: [0, 1, 1, 0],
                      scale: [0, 1.8, 1.5, 0],
                      y: -150 - Math.random() * 50,
                      x: (Math.random() - 0.5) * 100,
                      rotate: (Math.random() - 0.5) * 720,
                    }}
                    transition={{
                      duration: 1.8,
                      delay: Math.random() * 0.5,
                      ease: 'easeOut',
                    }}
                  />
                );
              })}
              
              {/* Ground Cracks Effect */}
              <div className="absolute bottom-0 left-0 right-0 h-[40%] overflow-hidden">
                {Array.from({ length: 12 }).map((_, i) => {
                  const startX = 50 + (Math.random() - 0.5) * 30;
                  const angle = (Math.random() - 0.5) * 60;
                  const length = 100 + Math.random() * 150;
                  return (
                    <motion.div
                      key={`crack-${i}`}
                      className="absolute"
                      style={{
                        left: `${startX}%`,
                        bottom: '0%',
                        width: '3px',
                        height: `${length}px`,
                        background: 'linear-gradient(to top, rgba(251,191,36,0.8) 0%, rgba(251,191,36,0.5) 50%, transparent 100%)',
                        transformOrigin: 'bottom center',
                        boxShadow: '0 0 8px rgba(251,191,36,0.9)',
                      }}
                      initial={{ 
                        height: 0,
                        opacity: 0,
                        rotate: angle,
                      }}
                      animate={{ 
                        height: length,
                        opacity: [0, 1, 0.8, 0],
                      }}
                      transition={{
                        duration: 0.8,
                        delay: 0.2 + i * 0.05,
                        ease: 'easeOut',
                      }}
                    />
                  );
                })}
              </div>
            </>
          )}
        </motion.div>
      )}

      {/* Phase 5 & 6: Victory Text */}
      <AnimatePresence>
      {(phase === 'victory' || phase === 'lingering') && (
          <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center z-30 px-4"
            initial={{ opacity: 0, scale: 0.8, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            {/* Multiple glow layers */}
            <motion.div 
              className="absolute inset-0 blur-[60px] bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 opacity-90"
              style={{ transform: 'scale(1.5)' }}
              animate={{ 
                opacity: [0.7, 0.9, 0.7],
                scale: [1.5, 1.6, 1.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
            <motion.div 
              className="absolute inset-0 blur-[40px] bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-400 opacity-80"
              style={{ transform: 'scale(1.3)' }}
              animate={{ 
                opacity: [0.6, 0.8, 0.6],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: 0.2,
              }}
            />
            
            {/* Winner Name */}
            <motion.div 
              className="relative italic uppercase tracking-tighter text-center mb-4"
              style={{
                fontFamily: "'Playfair Display', 'Cinzel', serif",
                fontWeight: 900,
                fontSize: 'clamp(2rem, 8vw, 6rem)',
                lineHeight: '1',
                textShadow: '0 0 60px rgba(251,191,36,0.9), 0 0 100px rgba(251,191,36,0.7), 0 0 140px rgba(251,191,36,0.5)',
                WebkitTextStroke: '2px rgba(251,191,36,0.4)',
                WebkitTextFillColor: 'transparent',
                background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 25%, #FCD34D 50%, #FBBF24 75%, #F59E0B 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                letterSpacing: '-0.03em',
              }}
              animate={{ 
                scale: [1, 1.03, 1],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              {winnerName}
            </motion.div>
            
            {/* Main Victory Text */}
            <motion.div 
              className="relative italic uppercase tracking-tighter text-center"
              style={{
                fontFamily: "'Playfair Display', 'Cinzel', serif",
                fontWeight: 900,
                fontSize: 'clamp(4rem, 15vw, 12rem)',
                lineHeight: '1',
                textShadow: '0 0 80px rgba(251,191,36,1), 0 0 120px rgba(251,191,36,0.8), 0 0 160px rgba(251,191,36,0.6), 0 0 200px rgba(251,191,36,0.4)',
                WebkitTextStroke: '3px rgba(251,191,36,0.4)',
                WebkitTextFillColor: 'transparent',
                background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 25%, #FCD34D 50%, #FBBF24 75%, #F59E0B 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                letterSpacing: '-0.05em',
              }}
              animate={{ 
                scale: [1, 1.05, 1],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              VICTORY
            </motion.div>
            
            {/* Floating particles around text */}
            {Array.from({ length: 20 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                style={{
                  left: `${50 + Math.cos(i * 0.314) * 30}%`,
                  top: `${50 + Math.sin(i * 0.314) * 30}%`,
                  boxShadow: '0 0 10px rgba(251,191,36,0.8)',
                }}
                animate={{
                  x: [0, Math.cos(i * 0.314) * 20, 0],
                  y: [0, Math.sin(i * 0.314) * 20, 0],
                  scale: [1, 1.2, 1],
                  opacity: [0.6, 1, 0.6],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: i * 0.15,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </motion.div>
      )}
      </AnimatePresence>

      {/* Replay Button (Preview Mode Only) */}
      {isPreview && showReplay && (
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-auto z-[301]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <button
            onClick={handleReplay}
            className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-bold rounded-xl shadow-lg hover:scale-105 transition-transform duration-200"
          >
            Replay
          </button>
        </motion.div>
      )}
    </div>
  );

  // Use portal for high z-index
  return typeof window !== 'undefined' 
    ? createPortal(content, document.body)
    : content;
};
