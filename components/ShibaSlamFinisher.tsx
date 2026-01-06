import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ShibaSlamFinisherProps {
  onComplete: () => void;
  onReplay?: () => void;
  isPreview?: boolean;
  winnerName?: string;
}

// Cute Chibi Shiba Component
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

      const progress = (elapsed % duration) / duration;
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
    <div
      style={{
        ...style,
        transform: `translate(${position.x}px, ${position.y}px) scaleX(${facing === 'right' ? 1 : -1})`,
        transition: 'transform 0.1s linear',
        willChange: 'transform'
      }}
      className="pointer-events-none"
    >
      <svg
        width="60"
        height="60"
        viewBox="0 0 60 60"
        style={{
          animation: 'shibaWalk 0.6s steps(4) infinite',
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
        
        {/* Body - More Shiba-like shape (not just ellipse) */}
        <path d="M 15 38 Q 12 45 15 52 Q 20 55 25 52 Q 30 50 30 48 Q 30 50 35 52 Q 40 55 45 52 Q 48 45 45 38 Q 42 35 30 35 Q 18 35 15 38 Z" 
              fill={`url(#shibaBody-${color})`} />
        
        {/* White chest marking - Distinctive Shiba feature */}
        <path d="M 20 38 Q 25 40 30 38 Q 35 40 40 38 Q 38 42 35 45 Q 30 48 30 48 Q 30 48 25 45 Q 22 42 20 38 Z" 
              fill={`url(#shibaWhite-${color})`} opacity="0.95" />
        
        {/* Head - More rounded, Shiba-like */}
        <circle cx="30" cy="18" r="11" fill={`url(#shibaBody-${color})`} />
        
        {/* White muzzle marking - Key Shiba feature */}
        <ellipse cx="30" cy="22" rx="7" ry="5" fill={`url(#shibaWhite-${color})`} opacity="0.95" />
        <ellipse cx="30" cy="20" rx="5" ry="3" fill={`url(#shibaWhite-${color})`} opacity="0.98" />
        
        {/* Pointed triangular ears - Proper Shiba ears */}
        <path d="M 20 12 L 18 6 L 22 10 L 20 12 Z" fill={colors.face} stroke={colors.body} strokeWidth="0.5" />
        <path d="M 40 12 L 42 6 L 38 10 L 40 12 Z" fill={colors.face} stroke={colors.body} strokeWidth="0.5" />
        
        {/* Inner ear highlights */}
        <path d="M 20 12 L 19 8 L 21 10 Z" fill={colors.highlight} opacity="0.6" />
        <path d="M 40 12 L 41 8 L 39 10 Z" fill={colors.highlight} opacity="0.6" />
        
        {/* Large expressive eyes with white reflections - Shiba characteristic */}
        <ellipse cx="26" cy="18" rx="3.5" ry="4" fill="#000000" />
        <ellipse cx="34" cy="18" rx="3.5" ry="4" fill="#000000" />
        {/* Eye reflections */}
        <ellipse cx="27" cy="17" rx="1.2" ry="1.5" fill="#FFFFFF" />
        <ellipse cx="35" cy="17" rx="1.2" ry="1.5" fill="#FFFFFF" />
        
        {/* Small black nose */}
        <ellipse cx="30" cy="23" rx="1.2" ry="0.8" fill="#000000" />
        
        {/* Simple curved mouth */}
        <path d="M 28 25 Q 30 26 32 25" stroke="#000000" strokeWidth="1" fill="none" strokeLinecap="round" />
        
        {/* Legs - More defined, Shiba-like */}
        <ellipse cx="22" cy="50" rx="2.5" ry="3.5" fill={colors.face} />
        <ellipse cx="30" cy="52" rx="2.5" ry="3.5" fill={colors.face} />
        <ellipse cx="38" cy="50" rx="2.5" ry="3.5" fill={colors.face} />
        
        {/* Curled tail over back - Signature Shiba feature */}
        <path d="M 42 32 Q 48 28 50 22 Q 48 18 45 20 Q 46 24 44 26 Q 42 30 42 32 Z" 
              fill={`url(#shibaBody-${color})`} />
        {/* White underside of tail */}
        <path d="M 44 28 Q 46 24 45 22 Q 44 24 44 26 Z" 
              fill={`url(#shibaWhite-${color})`} opacity="0.7" />
        
        {/* Fluffy white fur outline on face edges - Soft texture */}
        <path d="M 20 18 Q 18 16 19 14 Q 20 15 20 18 Z" fill={colors.white} opacity="0.4" />
        <path d="M 40 18 Q 42 16 41 14 Q 40 15 40 18 Z" fill={colors.white} opacity="0.4" />
        <path d="M 22 20 Q 20 22 18 20 Q 20 20 22 20 Z" fill={colors.white} opacity="0.3" />
        <path d="M 38 20 Q 40 22 42 20 Q 40 20 38 20 Z" fill={colors.white} opacity="0.3" />
      </svg>
    </div>
  );
};

export const ShibaSlamFinisher: React.FC<ShibaSlamFinisherProps> = ({ 
  onComplete, 
  onReplay,
  isPreview = false,
  winnerName = 'GUEST'
}) => {
  const [phase, setPhase] = useState<'shadow' | 'impact' | 'victory' | 'lingering'>('shadow');
  const [showReplay, setShowReplay] = useState(false);

  useEffect(() => {
    // Reset to shadow phase when component mounts
    setPhase('shadow');
    console.log('🎬 ShibaSlamFinisher: Starting animation, phase:', 'shadow');
    
    // Phase 1: Shadow (0.5s)
    const shadowTimer = setTimeout(() => {
      console.log('🎬 ShibaSlamFinisher: Phase -> impact');
      setPhase('impact');
    }, 500);

    // Phase 2: Impact (0.6s)
    const impactTimer = setTimeout(() => {
      console.log('🎬 ShibaSlamFinisher: Phase -> victory');
      setPhase('victory');
    }, 1100);

    // Phase 3: Victory text (0.8s)
    const victoryTimer = setTimeout(() => {
      console.log('🎬 ShibaSlamFinisher: Phase -> lingering');
      setPhase('lingering');
      if (isPreview) {
        setShowReplay(true);
      }
    }, 1900);

    // Phase 4: Lingering (3s) - only if not preview
    if (!isPreview) {
      const lingeringTimer = setTimeout(() => {
        onComplete();
      }, 4900);
      return () => {
        clearTimeout(shadowTimer);
        clearTimeout(impactTimer);
        clearTimeout(victoryTimer);
        clearTimeout(lingeringTimer);
      };
    }

    return () => {
      clearTimeout(shadowTimer);
      clearTimeout(impactTimer);
      clearTimeout(victoryTimer);
    };
  }, [onComplete, isPreview]);

  const handleReplay = () => {
    if (onReplay) {
      setPhase('shadow');
      setShowReplay(false);
      onReplay();
    }
  };

  const content = (
    <div className="fixed inset-0 z-[300] pointer-events-none" style={{ backgroundColor: 'transparent' }}>
      {/* Dimmed Background - Semi-transparent overlay that doesn't block the animation */}
      <div 
        className={`absolute inset-0 bg-black transition-opacity duration-500 ${
          phase === 'shadow' 
            ? 'opacity-0' 
            : isPreview 
            ? 'opacity-50'  // Lighter so animation is clearly visible
            : 'opacity-80'  // Normal for actual game
        }`}
      />

      {/* Phase 1: Shadow - Show during shadow phase and grow - Make it visible with darker color */}
      {phase === 'shadow' && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div 
            className="w-[600px] h-[600px] rounded-full bg-gray-800 blur-[80px]"
            style={{
              animation: 'shadowGrow 0.5s ease-out forwards',
              transform: 'scale(0)',
              opacity: 0
            }}
          />
        </div>
      )}
      
      {/* Keep shadow visible during impact phase too */}
      {phase === 'impact' && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div 
            className="w-[600px] h-[600px] rounded-full bg-gray-800 blur-[80px] opacity-60"
          />
        </div>
      )}

      {/* Phase 2: Paw Impact - Show paw starting from shadow phase so it can animate down */}
      {(phase === 'shadow' || phase === 'impact' || phase === 'victory' || phase === 'lingering') && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          {/* Screen Shake Container */}
          <div 
            className={`transition-transform duration-200 ${
              phase === 'impact' ? 'animate-screen-shake' : ''
            }`}
          >
            {/* Shiba Paw */}
            <div 
              className="relative"
              style={{
                transform: phase === 'shadow'
                  ? 'translateY(-100%)'
                  : phase === 'impact' 
                  ? 'translateY(0)' 
                  : phase === 'victory' || phase === 'lingering'
                  ? 'translateY(-20px)'
                  : 'translateY(-100%)',
                transition: phase === 'shadow'
                  ? 'none'
                  : phase === 'impact' 
                  ? 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' 
                  : phase === 'victory' || phase === 'lingering'
                  ? 'transform 0.4s ease-out'
                  : 'none',
                filter: phase === 'impact' ? 'blur(2px)' : 'blur(0px)',
              }}
            >
              {/* Premium Cute Shiba Paw SVG - Detailed and adorable */}
              <svg 
                width="500" 
                height="500" 
                viewBox="0 0 200 200" 
                className="drop-shadow-[0_30px_80px_rgba(251,191,36,0.8)]"
                style={{ 
                  filter: 'drop-shadow(0 0 40px rgba(251,191,36,0.8)) drop-shadow(0 0 80px rgba(251,191,36,0.4))',
                  animation: phase === 'impact' ? 'pawGlow 0.6s ease-out' : undefined
                }}
              >
                <defs>
                  {/* Gradient for paw pads */}
                  <radialGradient id="pawGradient" cx="50%" cy="50%">
                    <stop offset="0%" stopColor="#FFE4B5" stopOpacity="1" />
                    <stop offset="70%" stopColor="#DEB887" stopOpacity="1" />
                    <stop offset="100%" stopColor="#CD853F" stopOpacity="1" />
                  </radialGradient>
                  {/* Glow filter */}
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
                
                {/* Main paw pad (bottom, largest) */}
                <ellipse cx="100" cy="145" rx="45" ry="35" fill="url(#pawGradient)" filter="url(#pawGlowFilter)" />
                <ellipse cx="100" cy="145" rx="40" ry="30" fill="#FFE4B5" opacity="0.6" />
                
                {/* Top toe pads (3 main ones) */}
                <ellipse cx="75" cy="75" rx="18" ry="22" fill="url(#pawGradient)" filter="url(#pawGlowFilter)" />
                <ellipse cx="100" cy="65" rx="20" ry="25" fill="url(#pawGradient)" filter="url(#pawGlowFilter)" />
                <ellipse cx="125" cy="75" rx="18" ry="22" fill="url(#pawGradient)" filter="url(#pawGlowFilter)" />
                
                {/* Inner highlights on toe pads */}
                <ellipse cx="75" cy="75" rx="12" ry="15" fill="#FFE4B5" opacity="0.7" />
                <ellipse cx="100" cy="65" rx="14" ry="18" fill="#FFE4B5" opacity="0.7" />
                <ellipse cx="125" cy="75" rx="12" ry="15" fill="#FFE4B5" opacity="0.7" />
                
                {/* Smaller toe pads (2 on sides) */}
                <ellipse cx="88" cy="105" rx="15" ry="18" fill="url(#pawGradient)" filter="url(#pawGlowFilter)" />
                <ellipse cx="112" cy="105" rx="15" ry="18" fill="url(#pawGradient)" filter="url(#pawGlowFilter)" />
                <ellipse cx="88" cy="105" rx="10" ry="12" fill="#FFE4B5" opacity="0.7" />
                <ellipse cx="112" cy="105" rx="10" ry="12" fill="#FFE4B5" opacity="0.7" />
                
                {/* Cute little claws - curved and adorable */}
                <path d="M 65 70 Q 60 55 58 45" stroke="#8B4513" strokeWidth="3.5" strokeLinecap="round" fill="none" />
                <path d="M 80 60 Q 75 45 73 35" stroke="#8B4513" strokeWidth="3.5" strokeLinecap="round" fill="none" />
                <path d="M 100 55 Q 100 40 100 30" stroke="#8B4513" strokeWidth="4" strokeLinecap="round" fill="none" />
                <path d="M 120 60 Q 125 45 127 35" stroke="#8B4513" strokeWidth="3.5" strokeLinecap="round" fill="none" />
                <path d="M 135 70 Q 140 55 142 45" stroke="#8B4513" strokeWidth="3.5" strokeLinecap="round" fill="none" />
                
                {/* Sparkle effects on impact */}
                {phase === 'impact' && (
                  <>
                    <circle cx="75" cy="75" r="3" fill="#FFD700" opacity="0.9">
                      <animate attributeName="opacity" values="0.9;0;0.9" dur="0.3s" repeatCount="indefinite" />
                    </circle>
                    <circle cx="100" cy="65" r="3" fill="#FFD700" opacity="0.9">
                      <animate attributeName="opacity" values="0;0.9;0" dur="0.3s" begin="0.1s" repeatCount="indefinite" />
                    </circle>
                    <circle cx="125" cy="75" r="3" fill="#FFD700" opacity="0.9">
                      <animate attributeName="opacity" values="0.9;0;0.9" dur="0.3s" begin="0.2s" repeatCount="indefinite" />
                    </circle>
                  </>
                )}
              </svg>
            </div>

            {/* Enhanced Particle Effects on Impact */}
            {phase === 'impact' && (
              <>
                {/* Radial dust burst */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {Array.from({ length: 50 }).map((_, i) => (
                    <div
                      key={`dust-${i}`}
                      className="absolute w-3 h-3 bg-amber-300/80 rounded-full"
                      style={{
                        left: '50%',
                        top: '50%',
                        transform: `translate(-50%, -50%) rotate(${i * 7.2}deg) translateY(-200px)`,
                        animation: `dustBurst 1s ease-out forwards`,
                        animationDelay: `${i * 0.015}s`,
                        boxShadow: '0 0 8px rgba(251,191,36,0.6)'
                      }}
                    />
                  ))}
                </div>
                
                {/* Impact shockwave rings */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {[0, 1, 2].map((ring) => (
                    <div
                      key={`ring-${ring}`}
                      className="absolute w-0 h-0 border-4 border-yellow-400 rounded-full opacity-60"
                      style={{
                        animation: `shockwave 1s ease-out forwards`,
                        animationDelay: `${ring * 0.2}s`,
                      }}
                    />
                  ))}
                </div>
                
                {/* Golden sparkles */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {Array.from({ length: 30 }).map((_, i) => (
                    <div
                      key={`sparkle-${i}`}
                      className="absolute w-1 h-8 bg-gradient-to-b from-yellow-300 to-transparent"
                      style={{
                        left: `${50 + (Math.random() - 0.5) * 40}%`,
                        top: `${50 + (Math.random() - 0.5) * 40}%`,
                        transform: `rotate(${Math.random() * 360}deg)`,
                        animation: `sparkleFade 0.8s ease-out forwards`,
                        animationDelay: `${Math.random() * 0.3}s`,
                        boxShadow: '0 0 6px rgba(251,191,36,0.8)'
                      }}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Phase 3 & 4: Victory Text - Premium obnoxious style - Responsive */}
      {(phase === 'victory' || phase === 'lingering') && (
        <div className="absolute inset-0 flex items-center justify-center z-30 px-4">
          <div 
            className="relative w-full max-w-[95vw]"
            style={{
              animation: phase === 'victory' 
                ? 'victoryExplode 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards' 
                : undefined,
              transform: phase === 'lingering' ? 'scale(1)' : undefined,
            }}
          >
            {/* Multiple glow layers for obnoxious effect */}
            <div className="absolute inset-0 blur-[60px] bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 opacity-90 animate-pulse" style={{ transform: 'scale(1.5)' }} />
            <div className="absolute inset-0 blur-[40px] bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-400 opacity-80 animate-pulse" style={{ transform: 'scale(1.3)', animationDelay: '0.2s' }} />
            <div className="absolute inset-0 blur-[20px] bg-gradient-to-br from-yellow-200 via-yellow-300 to-amber-300 opacity-70" />
            
            {/* Winner Name */}
            <div 
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
                animation: phase === 'lingering' ? 'victoryPulse 1.5s ease-in-out infinite' : undefined,
                letterSpacing: '-0.03em',
                wordBreak: 'keep-all',
                overflow: 'hidden',
                whiteSpace: 'nowrap'
              }}
            >
              {winnerName}
            </div>
            
            {/* Main text with premium serif font - Responsive and always visible */}
            <div 
              className="relative italic uppercase tracking-tighter text-center"
              style={{
                fontFamily: "'Playfair Display', 'Cinzel', serif",
                fontWeight: 900,
                fontSize: 'clamp(4rem, 15vw, 12rem)',
                lineHeight: '1',
                textShadow: '0 0 80px rgba(251,191,36,1), 0 0 120px rgba(251,191,36,0.8), 0 0 160px rgba(251,191,36,0.6), 0 0 200px rgba(251,191,36,0.4), 0 0 240px rgba(251,191,36,0.3)',
                WebkitTextStroke: '3px rgba(251,191,36,0.4)',
                WebkitTextFillColor: 'transparent',
                background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 25%, #FCD34D 50%, #FBBF24 75%, #F59E0B 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                animation: phase === 'lingering' ? 'victoryPulse 1.5s ease-in-out infinite' : undefined,
                letterSpacing: '-0.05em',
                wordBreak: 'keep-all',
                overflow: 'hidden',
                whiteSpace: 'nowrap'
              }}
            >
              VICTORY
            </div>
            
            {/* Floating particles around text */}
            {phase === 'lingering' && Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                style={{
                  left: `${50 + Math.cos(i * 0.314) * 30}%`,
                  top: `${50 + Math.sin(i * 0.314) * 30}%`,
                  animation: `floatParticle 3s ease-in-out infinite`,
                  animationDelay: `${i * 0.15}s`,
                  boxShadow: '0 0 10px rgba(251,191,36,0.8)'
                }}
              />
            ))}
          </div>
        </div>
      )}


      {/* Replay Button (Preview Mode Only) */}
      {isPreview && showReplay && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-auto">
          <button
            onClick={handleReplay}
            className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-bold rounded-xl shadow-lg hover:scale-105 transition-transform duration-200"
          >
            Replay
          </button>
        </div>
      )}
    </div>
  );

  // Use portal for high z-index
  return typeof window !== 'undefined' 
    ? createPortal(content, document.body)
    : content;
};

// Inject CSS styles on component mount
if (typeof document !== 'undefined') {
  const styleId = 'shiba-slam-styles';
  if (!document.getElementById(styleId)) {
    const styleSheet = document.createElement('style');
    styleSheet.id = styleId;
    styleSheet.textContent = `
      @keyframes shadowGrow {
        0% {
          transform: scale(0);
          opacity: 0;
        }
        100% {
          transform: scale(1.5);
          opacity: 0.8;
        }
      }

      @keyframes screen-shake {
        0%, 100% { transform: translate(0, 0); }
        10% { transform: translate(-10px, -5px) rotate(-1deg); }
        20% { transform: translate(10px, 5px) rotate(1deg); }
        30% { transform: translate(-8px, -3px) rotate(-0.5deg); }
        40% { transform: translate(8px, 3px) rotate(0.5deg); }
        50% { transform: translate(-5px, -2px) rotate(-0.3deg); }
        60% { transform: translate(5px, 2px) rotate(0.3deg); }
        70% { transform: translate(-3px, -1px); }
        80% { transform: translate(3px, 1px); }
        90% { transform: translate(-1px, 0); }
      }

      @keyframes dustBurst {
        0% {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
        }
        100% {
          opacity: 0;
          transform: translate(-50%, -50%) scale(0) translateY(-200px);
        }
      }

      @keyframes victoryExplode {
        0% {
          transform: scale(0) rotate(-10deg);
          opacity: 0;
        }
        40% {
          transform: scale(1.3) rotate(5deg);
          opacity: 1;
        }
        60% {
          transform: scale(0.95) rotate(-2deg);
          opacity: 1;
        }
        80% {
          transform: scale(1.05) rotate(1deg);
          opacity: 1;
        }
        100% {
          transform: scale(1) rotate(0deg);
          opacity: 1;
        }
      }

      @keyframes victoryPulse {
        0%, 100% {
          transform: scale(1);
          filter: brightness(1);
        }
        50% {
          transform: scale(1.05);
          filter: brightness(1.2);
        }
      }

      @keyframes pawGlow {
        0% {
          filter: drop-shadow(0 0 20px rgba(251,191,36,0.5));
        }
        50% {
          filter: drop-shadow(0 0 60px rgba(251,191,36,1)) drop-shadow(0 0 100px rgba(251,191,36,0.6));
        }
        100% {
          filter: drop-shadow(0 0 40px rgba(251,191,36,0.8)) drop-shadow(0 0 80px rgba(251,191,36,0.4));
        }
      }

      @keyframes shockwave {
        0% {
          width: 0;
          height: 0;
          opacity: 0.8;
        }
        100% {
          width: 600px;
          height: 600px;
          opacity: 0;
        }
      }

      @keyframes sparkleFade {
        0% {
          opacity: 1;
          transform: scale(1);
        }
        100% {
          opacity: 0;
          transform: scale(0) translateY(-100px);
        }
      }

      @keyframes floatParticle {
        0%, 100% {
          transform: translate(0, 0) scale(1);
          opacity: 0.6;
        }
        50% {
          transform: translate(10px, -20px) scale(1.2);
          opacity: 1;
        }
      }

      @keyframes shibaWalk {
        0% { transform: translateY(0px); }
        25% { transform: translateY(-2px); }
        50% { transform: translateY(0px); }
        75% { transform: translateY(2px); }
        100% { transform: translateY(0px); }
      }

      .animate-shadow-grow {
        animation: shadowGrow 0.5s ease-out forwards;
      }

      .animate-screen-shake {
        animation: screen-shake 0.6s ease-out;
      }
    `;
    document.head.appendChild(styleSheet);
  }
}
