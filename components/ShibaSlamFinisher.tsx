import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface ShibaSlamFinisherProps {
  onComplete: () => void;
  onReplay?: () => void;
  isPreview?: boolean;
  winnerName?: string;
}

// Cute Chibi Shiba Component - Now actually used!
interface ChibiShibaProps {
  color: 'orange' | 'black' | 'tan';
  startDelay: number;
  duration: number;
  path: 'curved' | 'reverse' | 'vertical';
  style?: React.CSSProperties;
}

const ChibiShiba: React.FC<ChibiShibaProps> = ({ color, startDelay, duration, path, style }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [facing, setFacing] = useState<'left' | 'right'>('right');
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>(0);
  const lastXRef = useRef<number>(0);

  const colorStyles = {
    orange: { 
      body: '#F97316', 
      face: '#EA580C', 
      highlight: '#FB923C',
      white: '#FFFFFF',
      cream: '#FFF8DC'
    },
    black: { 
      body: '#1F2937', 
      face: '#111827', 
      highlight: '#374151',
      white: '#FFFFFF',
      cream: '#F5F5F5'
    },
    tan: { 
      body: '#D97706', 
      face: '#B45309', 
      highlight: '#F59E0B',
      white: '#FFFFFF',
      cream: '#FFF8DC'
    }
  };

  const colors = colorStyles[color];

  useEffect(() => {
    const animate = (currentTime: number) => {
      if (startTimeRef.current === 0) {
        startTimeRef.current = currentTime + startDelay;
      }

      const elapsed = (currentTime - startTimeRef.current) / 1000;
      if (elapsed < 0) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      if (elapsed > duration) {
        return; // Stop after duration
      }

      const progress = elapsed / duration;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Create varied walking paths for each shiba
      let x: number, y: number;
      
      if (path === 'curved') {
        // Curved path - top area
        const baseY = viewportHeight * 0.15;
        x = progress * viewportWidth * 1.1 - viewportWidth * 0.05;
        y = baseY + Math.sin(progress * Math.PI * 3) * 40;
      } else if (path === 'reverse') {
        // Reverse path - bottom area, going left to right
        const baseY = viewportHeight * 0.75;
        x = (1 - progress) * viewportWidth * 1.1 - viewportWidth * 0.05;
        y = baseY + Math.sin((1 - progress) * Math.PI * 3) * 30;
      } else if (path === 'vertical') {
        // Vertical path - middle area
        const baseX = viewportWidth * 0.5;
        x = baseX + Math.sin(progress * Math.PI * 2) * (viewportWidth * 0.2);
        y = progress * viewportHeight * 0.8 + viewportHeight * 0.1;
      } else {
        // Default curved path
        const baseY = viewportHeight * 0.85;
        x = progress * viewportWidth * 1.1 - viewportWidth * 0.05;
        y = baseY + Math.sin(progress * Math.PI * 2) * 25;
      }

      setPosition({ x, y });
      
      // Determine facing direction based on movement
      if (x > lastXRef.current) {
        setFacing('right');
      } else if (x < lastXRef.current) {
        setFacing('left');
      }
      lastXRef.current = x;

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [duration, startDelay, path]);

  return (
    <motion.div
      style={{
        ...style,
        transform: `translate3d(${position.x}px, ${position.y}px, 0) scaleX(${facing === 'right' ? 1 : -1})`,
        willChange: 'transform',
        backfaceVisibility: 'hidden',
        perspective: 1000
      }}
      className="pointer-events-none transform-gpu"
      animate={{
        y: [0, -3, 0, -2, 0],
      }}
      transition={{
        duration: 0.4,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      <svg
        width="60"
        height="60"
        viewBox="0 0 60 60"
        style={{
          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'
        }}
      >
        <defs>
          <linearGradient id={`shibaBody-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.highlight} />
            <stop offset="100%" stopColor={colors.body} />
          </linearGradient>
          <linearGradient id={`shibaWhite-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.white} />
            <stop offset="100%" stopColor={colors.cream} />
          </linearGradient>
        </defs>
        
        {/* Body - More Shiba-like shape */}
        <path d="M 15 38 Q 12 45 15 52 Q 20 55 25 52 Q 30 50 30 48 Q 30 50 35 52 Q 40 55 45 52 Q 48 45 45 38 Q 42 35 30 35 Q 18 35 15 38 Z" 
              fill={`url(#shibaBody-${color})`} />
        
        {/* White chest marking */}
        <path d="M 20 38 Q 25 40 30 38 Q 35 40 40 38 Q 38 42 35 45 Q 30 48 30 48 Q 30 48 25 45 Q 22 42 20 38 Z" 
              fill={`url(#shibaWhite-${color})`} opacity="0.95" />
        
        {/* Head */}
        <circle cx="30" cy="18" r="11" fill={`url(#shibaBody-${color})`} />
        
        {/* White muzzle marking */}
        <ellipse cx="30" cy="22" rx="7" ry="5" fill={`url(#shibaWhite-${color})`} opacity="0.95" />
        <ellipse cx="30" cy="20" rx="5" ry="3" fill={`url(#shibaWhite-${color})`} opacity="0.98" />
        
        {/* Pointed triangular ears */}
        <path d="M 20 12 L 18 6 L 22 10 L 20 12 Z" fill={colors.face} stroke={colors.body} strokeWidth="0.5" />
        <path d="M 40 12 L 42 6 L 38 10 L 40 12 Z" fill={colors.face} stroke={colors.body} strokeWidth="0.5" />
        
        {/* Inner ear highlights */}
        <path d="M 20 12 L 19 8 L 21 10 Z" fill={colors.highlight} opacity="0.6" />
        <path d="M 40 12 L 41 8 L 39 10 Z" fill={colors.highlight} opacity="0.6" />
        
        {/* Large expressive eyes */}
        <ellipse cx="26" cy="18" rx="3.5" ry="4" fill="#000000" />
        <ellipse cx="34" cy="18" rx="3.5" ry="4" fill="#000000" />
        {/* Eye reflections */}
        <ellipse cx="27" cy="17" rx="1.2" ry="1.5" fill="#FFFFFF" />
        <ellipse cx="35" cy="17" rx="1.2" ry="1.5" fill="#FFFFFF" />
        
        {/* Small black nose */}
        <ellipse cx="30" cy="23" rx="1.2" ry="0.8" fill="#000000" />
        
        {/* Simple curved mouth */}
        <path d="M 28 25 Q 30 26 32 25" stroke="#000000" strokeWidth="1" fill="none" strokeLinecap="round" />
        
        {/* Legs */}
        <ellipse cx="22" cy="50" rx="2.5" ry="3.5" fill={colors.face} />
        <ellipse cx="30" cy="52" rx="2.5" ry="3.5" fill={colors.face} />
        <ellipse cx="38" cy="50" rx="2.5" ry="3.5" fill={colors.face} />
        
        {/* Curled tail over back */}
        <path d="M 42 32 Q 48 28 50 22 Q 48 18 45 20 Q 46 24 44 26 Q 42 30 42 32 Z" 
              fill={`url(#shibaBody-${color})`} />
        {/* White underside of tail */}
        <path d="M 44 28 Q 46 24 45 22 Q 44 24 44 26 Z" 
              fill={`url(#shibaWhite-${color})`} opacity="0.7" />
      </svg>
    </motion.div>
  );
};

export const ShibaSlamFinisher: React.FC<ShibaSlamFinisherProps> = ({ 
  onComplete, 
  onReplay,
  isPreview = false,
  winnerName = 'GUEST'
}) => {
  const [phase, setPhase] = useState<'running' | 'shadow' | 'slam' | 'impact' | 'victory' | 'lingering'>('running');
  const [showReplay, setShowReplay] = useState(false);

  useEffect(() => {
    // Phase 1: Shibas running around (1.5s)
    const runningTimer = setTimeout(() => {
    setPhase('shadow');
    }, 1500);
    
    // Phase 2: Shadow buildup (0.8s)
    const shadowTimer = setTimeout(() => {
      setPhase('slam');
    }, 2300);

    // Phase 3: Slam down (0.4s)
    const slamTimer = setTimeout(() => {
      setPhase('impact');
    }, 2700);

    // Phase 4: Impact effects (1s)
    const impactTimer = setTimeout(() => {
      setPhase('victory');
    }, 3700);

    // Phase 5: Victory text (2s)
    const victoryTimer = setTimeout(() => {
      setPhase('lingering');
      if (isPreview) {
        setShowReplay(true);
      }
    }, 5700);

    // Complete (only if not preview)
    if (!isPreview) {
      const completeTimer = setTimeout(() => {
        onComplete();
      }, 8000);
      return () => {
        clearTimeout(runningTimer);
        clearTimeout(shadowTimer);
        clearTimeout(slamTimer);
        clearTimeout(impactTimer);
        clearTimeout(victoryTimer);
        clearTimeout(completeTimer);
      };
    }

    return () => {
      clearTimeout(runningTimer);
      clearTimeout(shadowTimer);
      clearTimeout(slamTimer);
      clearTimeout(impactTimer);
      clearTimeout(victoryTimer);
    };
  }, [onComplete, isPreview]);

  const handleReplay = () => {
    if (onReplay) {
      setPhase('running');
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
      {/* Dimmed Background */}
      <motion.div 
        className="absolute inset-0 bg-black"
        initial={{ opacity: 0 }}
        animate={{ 
          opacity: phase === 'running' 
            ? (isPreview ? 0.3 : 0.4)
            : phase === 'shadow' || phase === 'slam'
            ? (isPreview ? 0.5 : 0.6)
            : (isPreview ? 0.6 : 0.75)
        }}
        transition={{ duration: 0.3 }}
      />

      {/* Phase 1: Chibi Shibas Running Around */}
      {phase === 'running' && (
        <div className="absolute inset-0 overflow-hidden">
          <ChibiShiba color="orange" startDelay={0} duration={1.5} path="curved" />
          <ChibiShiba color="black" startDelay={0.2} duration={1.5} path="reverse" />
          <ChibiShiba color="tan" startDelay={0.4} duration={1.5} path="vertical" />
          <ChibiShiba color="orange" startDelay={0.6} duration={1.5} path="curved" />
          <ChibiShiba color="black" startDelay={0.8} duration={1.5} path="reverse" />
        </div>
      )}
      
      {/* Phase 2 & 3: Shadow Buildup */}
      {(phase === 'shadow' || phase === 'slam' || phase === 'impact' || phase === 'victory' || phase === 'lingering') && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <motion.div 
            className="w-[600px] h-[600px] rounded-full bg-gray-900 blur-[100px]"
            initial={{ scale: 0.3, opacity: 0.4 }}
            animate={{ 
              scale: phase === 'shadow' 
                ? [0.3, 1.2, 1.5]
                : phase === 'slam' || phase === 'impact'
                ? [1.5, 1.8, 1.6]
                : 1.6,
              opacity: phase === 'shadow'
                ? [0.4, 0.8, 0.9]
                : phase === 'slam' || phase === 'impact'
                ? [0.9, 1, 0.95]
                : 0.9
            }}
            transition={{ 
              duration: phase === 'shadow' ? 0.8 : 0.4,
              ease: 'easeOut'
            }}
            style={{
              boxShadow: '0 0 200px rgba(251,191,36,0.8)',
            }}
          />
        </div>
      )}

      {/* Phase 3 & 4: Dramatic Paw Slam */}
      {(phase === 'shadow' || phase === 'slam' || phase === 'impact' || phase === 'victory' || phase === 'lingering') && (
        <motion.div 
          className="absolute inset-0 flex items-center justify-center z-20"
          animate={phase === 'slam' || phase === 'impact' ? {
            x: [0, -8, 6, -5, 4, -3, 2, -1, 0],
            y: [0, -4, 3, -2, 2, -1, 1, 0, 0],
            rotate: [0, -1, 1, -0.5, 0.5, -0.3, 0.3, 0, 0],
          } : {}}
          transition={{
            duration: phase === 'slam' ? 0.4 : 1,
            ease: 'easeOut',
            times: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 1],
          }}
        >
          <motion.div 
              className="relative transform-gpu"
            initial={phase === 'shadow' ? {
              y: '-80vh',
              scale: 0.8,
              opacity: 0.6,
            } : {}}
            animate={{
              y: phase === 'shadow'
                ? '-80vh'
                : phase === 'slam'
                ? ['-80vh', '0vh', '-10px']
                  : phase === 'impact' 
                ? ['-10px', '0px', '-5px', '0px']
                : '-20px',
              scale: phase === 'shadow'
                ? 0.8
                : phase === 'slam'
                ? [0.8, 1.2, 1]
                  : phase === 'impact' 
                ? [1, 1.1, 1]
                : 0.95,
                opacity: phase === 'shadow' ? 0.6 : 1,
            }}
            transition={{
              duration: phase === 'slam' ? 0.4 : phase === 'impact' ? 1 : 0.3,
              ease: phase === 'slam' ? [0.16, 1, 0.3, 1] : 'easeOut',
              }}
            >
            {/* Premium Shiba Paw SVG */}
              <svg 
                width="500" 
                height="500" 
                viewBox="0 0 200 200" 
                style={{ 
                filter: phase === 'slam' || phase === 'impact'
                  ? 'drop-shadow(0 0 80px rgba(251,191,36,1)) drop-shadow(0 0 150px rgba(251,191,36,0.9)) drop-shadow(0 0 220px rgba(251,191,36,0.7))'
                    : 'drop-shadow(0 0 50px rgba(251,191,36,0.9)) drop-shadow(0 0 100px rgba(251,191,36,0.7))',
                transition: 'filter 0.3s ease-out'
                }}
              >
                <defs>
                  <radialGradient id="pawGradient" cx="50%" cy="50%">
                    <stop offset="0%" stopColor="#FFE4B5" stopOpacity="1" />
                    <stop offset="70%" stopColor="#DEB887" stopOpacity="1" />
                    <stop offset="100%" stopColor="#CD853F" stopOpacity="1" />
                  </radialGradient>
                  <filter id="pawGlowFilter">
                    <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                
                {/* Outer glow ring */}
                <circle cx="100" cy="100" r="95" fill="url(#pawGradient)" opacity="0.2" filter="url(#pawGlowFilter)" />
                
              {/* Main paw pad */}
                <ellipse cx="100" cy="145" rx="45" ry="35" fill="url(#pawGradient)" filter="url(#pawGlowFilter)" />
                <ellipse cx="100" cy="145" rx="40" ry="30" fill="#FFE4B5" opacity="0.6" />
                
              {/* Top toe pads */}
                <ellipse cx="75" cy="75" rx="18" ry="22" fill="url(#pawGradient)" filter="url(#pawGlowFilter)" />
                <ellipse cx="100" cy="65" rx="20" ry="25" fill="url(#pawGradient)" filter="url(#pawGlowFilter)" />
                <ellipse cx="125" cy="75" rx="18" ry="22" fill="url(#pawGradient)" filter="url(#pawGlowFilter)" />
                
              {/* Inner highlights */}
                <ellipse cx="75" cy="75" rx="12" ry="15" fill="#FFE4B5" opacity="0.7" />
                <ellipse cx="100" cy="65" rx="14" ry="18" fill="#FFE4B5" opacity="0.7" />
                <ellipse cx="125" cy="75" rx="12" ry="15" fill="#FFE4B5" opacity="0.7" />
                
              {/* Smaller toe pads */}
                <ellipse cx="88" cy="105" rx="15" ry="18" fill="url(#pawGradient)" filter="url(#pawGlowFilter)" />
                <ellipse cx="112" cy="105" rx="15" ry="18" fill="url(#pawGradient)" filter="url(#pawGlowFilter)" />
                <ellipse cx="88" cy="105" rx="10" ry="12" fill="#FFE4B5" opacity="0.7" />
                <ellipse cx="112" cy="105" rx="10" ry="12" fill="#FFE4B5" opacity="0.7" />
                
              {/* Claws */}
                <path d="M 65 70 Q 60 55 58 45" stroke="#8B4513" strokeWidth="3.5" strokeLinecap="round" fill="none" />
                <path d="M 80 60 Q 75 45 73 35" stroke="#8B4513" strokeWidth="3.5" strokeLinecap="round" fill="none" />
                <path d="M 100 55 Q 100 40 100 30" stroke="#8B4513" strokeWidth="4" strokeLinecap="round" fill="none" />
                <path d="M 120 60 Q 125 45 127 35" stroke="#8B4513" strokeWidth="3.5" strokeLinecap="round" fill="none" />
                <path d="M 135 70 Q 140 55 142 45" stroke="#8B4513" strokeWidth="3.5" strokeLinecap="round" fill="none" />
              </svg>
          </motion.div>

          {/* Impact Particle Effects */}
            {phase === 'impact' && (
              <>
              {/* Radial dust burst */}
              <div className="absolute inset-0 flex items-center justify-center">
                {Array.from({ length: 40 }).map((_, i) => {
                  const angle = (i * 360) / 40;
                  const distance = 200 + Math.random() * 150;
                  return (
                    <motion.div
                      key={`dust-${i}`}
                      className="absolute w-3 h-3 bg-amber-300 rounded-full"
                      style={{
                        left: '50%',
                        top: '50%',
                        boxShadow: '0 0 12px rgba(251,191,36,0.9), 0 0 20px rgba(251,191,36,0.6)',
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
                        scale: [1, 1.5, 0],
                        opacity: [1, 0.8, 0],
                      }}
                      transition={{
                        duration: 1,
                        delay: i * 0.02,
                        ease: 'easeOut',
                      }}
                    />
                  );
                })}
                </div>
                
              {/* Impact shockwave rings */}
                  {[0, 1, 2].map((ring) => (
                <motion.div
                      key={`ring-${ring}`}
                  className="absolute border-4 border-yellow-400 rounded-full"
                      style={{
                    left: '50%',
                    top: '50%',
                    width: 0,
                    height: 0,
                        boxShadow: '0 0 20px rgba(251,191,36,0.8)',
                  }}
                  initial={{ 
                    width: 0, 
                    height: 0, 
                    x: '-50%', 
                    y: '-50%',
                    opacity: 0.8 
                  }}
                  animate={{ 
                    width: 800,
                    height: 800,
                    opacity: 0,
                  }}
                  transition={{
                    duration: 1.5,
                    delay: ring * 0.3,
                    ease: 'easeOut',
                      }}
                    />
                  ))}
              
              {/* Golden sparkles */}
              {Array.from({ length: 30 }).map((_, i) => (
                <motion.div
                        key={`sparkle-${i}`}
                  className="absolute w-1 h-8 bg-gradient-to-b from-yellow-300 to-transparent"
                        style={{
                    left: `${50 + (Math.random() - 0.5) * 40}%`,
                    top: `${50 + (Math.random() - 0.5) * 40}%`,
                          boxShadow: '0 0 10px rgba(251,191,36,1), 0 0 15px rgba(251,191,36,0.7)',
                  }}
                  initial={{ 
                    opacity: 0, 
                    scale: 0, 
                    rotate: Math.random() * 360 
                  }}
                  animate={{ 
                    opacity: [0, 1, 0],
                    scale: [0, 1.5, 0],
                    y: -100,
                  }}
                  transition={{
                    duration: 1.5,
                    delay: Math.random() * 0.4,
                    ease: 'easeOut',
                  }}
                />
              ))}
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
