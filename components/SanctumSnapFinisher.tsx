import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface SanctumSnapFinisherProps {
  onComplete: () => void;
  onReplay?: () => void;
  isPreview?: boolean;
  winnerName?: string;
  losingPlayers?: Array<{ id: string; position: 'top' | 'left' | 'right' | 'bottom' }>;
}

// Premium gold square particle component with luxurious styling
const GoldParticle: React.FC<{
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  delay: number;
  duration: number;
  size: number;
}> = ({ startX, startY, targetX, targetY, delay, duration, size }) => {
  return (
    <motion.div
      className="absolute"
      style={{
        left: `${startX}%`,
        top: `${startY}%`,
        width: `${size}px`,
        height: `${size}px`,
        background: 'linear-gradient(135deg, #F4D03F 0%, #F7DC6F 20%, #F9E79F 40%, #F7DC6F 60%, #F4D03F 80%, #D4AF37 100%)',
        boxShadow: `
          0 0 ${size * 2}px rgba(244, 208, 63, 1),
          0 0 ${size * 4}px rgba(244, 208, 63, 0.8),
          0 0 ${size * 6}px rgba(212, 175, 55, 0.6),
          inset 0 0 ${size * 0.5}px rgba(255, 255, 255, 0.5),
          inset -2px -2px 4px rgba(0, 0, 0, 0.3)
        `,
        borderRadius: '3px',
        border: '1px solid rgba(255, 255, 255, 0.3)',
      }}
      initial={{
        x: 0,
        y: 0,
        opacity: 1,
        scale: 1,
        rotate: 0,
      }}
      animate={{
        x: `${targetX - startX}vw`,
        y: `${targetY - startY}vh`,
        opacity: [1, 1, 1, 0.9, 0],
        scale: [1, 1.3, 1.1, 0.9, 0.4],
        rotate: [0, 180, 360],
      }}
      transition={{
        duration: duration,
        delay: delay,
        ease: [0.4, 0, 0.2, 1],
      }}
    />
  );
};

// Premium hand icon SVG component with luxurious gold styling
const HandIcon: React.FC<{ isSnapping?: boolean }> = ({ isSnapping = false }) => {
  return (
    <motion.svg
      width="300"
      height="300"
      viewBox="0 0 200 200"
      className="drop-shadow-[0_0_60px_rgba(244,208,63,0.9)]"
      animate={isSnapping ? {
        scale: [1, 1.4, 1.1],
        rotate: [0, 8, -8, 0],
      } : {}}
      transition={{
        duration: 0.4,
        ease: 'easeOut',
      }}
    >
      <defs>
        <linearGradient id="handGradientPremium" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#F4D03F" stopOpacity="1" />
          <stop offset="25%" stopColor="#F7DC6F" stopOpacity="1" />
          <stop offset="50%" stopColor="#F9E79F" stopOpacity="1" />
          <stop offset="75%" stopColor="#F7DC6F" stopOpacity="1" />
          <stop offset="100%" stopColor="#D4AF37" stopOpacity="1" />
        </linearGradient>
        <radialGradient id="handHighlight" cx="50%" cy="30%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.6" />
          <stop offset="100%" stopColor="transparent" stopOpacity="0" />
        </radialGradient>
        <filter id="handGlowPremium" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <filter id="handShadow">
          <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#D4AF37" floodOpacity="0.8"/>
        </filter>
      </defs>
      
      {/* Hand outline - snapping gesture with premium styling */}
      <g filter="url(#handGlowPremium)">
        {/* Outer glow ring */}
        <ellipse cx="100" cy="140" rx="50" ry="40" fill="url(#handGradientPremium)" opacity="0.3" />
        
        {/* Palm */}
        <ellipse cx="100" cy="140" rx="45" ry="35" fill="url(#handGradientPremium)" filter="url(#handShadow)" />
        <ellipse cx="100" cy="140" rx="45" ry="35" fill="url(#handHighlight)" />
        
        {/* Thumb */}
        <path
          d="M 60 120 Q 50 100 45 85 Q 40 70 45 60 Q 50 50 60 55"
          stroke="url(#handGradientPremium)"
          strokeWidth="10"
          fill="url(#handGradientPremium)"
          strokeLinecap="round"
          filter="url(#handShadow)"
        />
        
        {/* Fingers - in snapping position */}
        {/* Index finger */}
        <ellipse cx="110" cy="80" rx="14" ry="38" fill="url(#handGradientPremium)" filter="url(#handShadow)" />
        {/* Middle finger - raised for snap */}
        <ellipse cx="130" cy="75" rx="14" ry="42" fill="url(#handGradientPremium)" filter="url(#handShadow)" />
        {/* Ring finger */}
        <ellipse cx="150" cy="85" rx="14" ry="32" fill="url(#handGradientPremium)" filter="url(#handShadow)" />
        {/* Pinky */}
        <ellipse cx="165" cy="95" rx="12" ry="28" fill="url(#handGradientPremium)" filter="url(#handShadow)" />
        
        {/* Snap impact effect - enhanced */}
        {isSnapping && (
          <>
            <circle cx="130" cy="50" r="10" fill="#FFFFFF" opacity="1">
              <animate attributeName="r" values="10;35;10" dur="0.4s" repeatCount="1" />
              <animate attributeName="opacity" values="1;0;1" dur="0.4s" repeatCount="1" />
            </circle>
            <circle cx="130" cy="50" r="15" fill="#F4D03F" opacity="0.8">
              <animate attributeName="r" values="15;50;15" dur="0.4s" repeatCount="1" />
              <animate attributeName="opacity" values="0.8;0;0.8" dur="0.4s" repeatCount="1" />
            </circle>
            <circle cx="130" cy="50" r="20" fill="#D4AF37" opacity="0.5">
              <animate attributeName="r" values="20;70;20" dur="0.5s" repeatCount="1" />
              <animate attributeName="opacity" values="0.5;0;0.5" dur="0.5s" repeatCount="1" />
            </circle>
          </>
        )}
      </g>
    </motion.svg>
  );
};

// Crossed swords icon component
const CrossedSwords: React.FC = () => {
  return (
    <motion.svg
      width="200"
      height="200"
      viewBox="0 0 200 200"
      className="absolute"
      style={{ top: '20%', left: '50%', transform: 'translateX(-50%)' }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.3 }}
    >
      <defs>
        <linearGradient id="swordGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C0C0C0" stopOpacity="1" />
          <stop offset="50%" stopColor="#E8E8E8" stopOpacity="1" />
          <stop offset="100%" stopColor="#A0A0A0" stopOpacity="1" />
        </linearGradient>
        <filter id="swordGlow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      {/* Left sword */}
      <g transform="rotate(-45 100 100)" filter="url(#swordGlow)">
        <rect x="95" y="30" width="10" height="120" fill="url(#swordGradient)" rx="2" />
        <polygon points="100,30 110,20 105,30 100,30" fill="url(#swordGradient)" />
        <rect x="92" y="145" width="16" height="8" fill="url(#swordGradient)" rx="2" />
      </g>
      
      {/* Right sword */}
      <g transform="rotate(45 100 100)" filter="url(#swordGlow)">
        <rect x="95" y="30" width="10" height="120" fill="url(#swordGradient)" rx="2" />
        <polygon points="100,30 90,20 95,30 100,30" fill="url(#swordGradient)" />
        <rect x="92" y="145" width="16" height="8" fill="url(#swordGradient)" rx="2" />
      </g>
    </motion.svg>
  );
};

export const SanctumSnapFinisher: React.FC<SanctumSnapFinisherProps> = ({
  onComplete,
  onReplay,
  isPreview = false,
  winnerName = 'GUEST',
  losingPlayers = []
}) => {
  const [phase, setPhase] = useState<'hand' | 'snap' | 'disintegrate' | 'text' | 'complete'>('hand');
  const [showReplay, setShowReplay] = useState(false);
  const [particles, setParticles] = useState<Array<{
    id: string;
    startX: number;
    startY: number;
    targetX: number;
    targetY: number;
    delay: number;
    duration: number;
    size: number;
  }>>([]);
  const snapAudioRef = useRef<AudioBufferSourceNode | null>(null);
  const shimmerAudioRef = useRef<AudioBufferSourceNode | null>(null);

  // Default losing player positions if not provided
  const defaultLosingPlayers: Array<{ id: string; position: 'top' | 'left' | 'right' | 'bottom' }> = [
    { id: 'loser1', position: 'top' },
    { id: 'loser2', position: 'left' },
    { id: 'loser3', position: 'right' },
  ];
  const targets = losingPlayers.length >= 3 ? losingPlayers : defaultLosingPlayers;

  // Get position coordinates
  const getPositionCoords = (position: 'top' | 'left' | 'right' | 'bottom') => {
    switch (position) {
      case 'top': return { x: 50, y: 15 };
      case 'bottom': return { x: 50, y: 85 };
      case 'left': return { x: 8, y: 50 };
      case 'right': return { x: 92, y: 50 };
      default: return { x: 50, y: 50 };
    }
  };

  // Winner is at bottom center
  const winnerCoords = { x: 50, y: 85 };

  // Generate particles for disintegration
  const generateParticles = () => {
    const newParticles: typeof particles = [];
    
    targets.forEach((target, targetIndex) => {
      const targetCoords = getPositionCoords(target.position);
      
      // Generate 80+ particles per avatar for more dramatic effect
      for (let i = 0; i < 85; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 5;
        const offsetX = Math.cos(angle) * radius;
        const offsetY = Math.sin(angle) * radius;
        
        newParticles.push({
          id: `${target.id}-${i}`,
          startX: targetCoords.x + offsetX,
          startY: targetCoords.y + offsetY,
          targetX: winnerCoords.x + (Math.random() - 0.5) * 10,
          targetY: winnerCoords.y + (Math.random() - 0.5) * 10,
          delay: targetIndex * 0.2 + i * 0.01,
          duration: 1.2 + Math.random() * 0.6,
          size: 4 + Math.random() * 6,
        });
      }
    });
    
    setParticles(newParticles);
  };

  useEffect(() => {
    // Phase 1: Hand appears (0.5s)
    const handTimer = setTimeout(() => {
      setPhase('snap');
      playSnapSound();
    }, 500);

    // Phase 2: Snap animation (0.3s)
    const snapTimer = setTimeout(() => {
      setPhase('disintegrate');
      generateParticles();
      playShimmerSound();
    }, 800);

    // Phase 3: Disintegration (1.5s)
    const disintegrateTimer = setTimeout(() => {
      setPhase('text');
    }, 2300);

    // Phase 4: Text appears (2s)
    const textTimer = setTimeout(() => {
      setPhase('complete');
      if (isPreview) {
        setShowReplay(true);
      }
    }, 4300);

    // Complete (only if not preview)
    if (!isPreview) {
      const completeTimer = setTimeout(() => {
        onComplete();
      }, 6300);
      return () => {
        clearTimeout(handTimer);
        clearTimeout(snapTimer);
        clearTimeout(disintegrateTimer);
        clearTimeout(textTimer);
        clearTimeout(completeTimer);
        stopAllAudio();
      };
    }

    return () => {
      clearTimeout(handTimer);
      clearTimeout(snapTimer);
      clearTimeout(disintegrateTimer);
      clearTimeout(textTimer);
      stopAllAudio();
    };
  }, [onComplete, isPreview]);

  const playSnapSound = () => {
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      if (context.state === 'suspended') {
        context.resume();
      }

      const now = context.currentTime;
      
      // Snap sound with reverb - sharp impact
      const osc1 = context.createOscillator();
      const gain1 = context.createGain();
      const filter1 = context.createBiquadFilter();
      
      osc1.type = 'square';
      osc1.frequency.setValueAtTime(200, now);
      osc1.frequency.exponentialRampToValueAtTime(50, now + 0.1);
      
      filter1.type = 'lowpass';
      filter1.frequency.value = 800;
      filter1.Q.value = 5;
      
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.3, now + 0.01);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      
      osc1.connect(filter1);
      filter1.connect(gain1);
      gain1.connect(context.destination);
      
      osc1.start(now);
      osc1.stop(now + 0.3);
      
      // Reverb tail
      const osc2 = context.createOscillator();
      const gain2 = context.createGain();
      const delay = context.createDelay();
      const delayGain = context.createGain();
      
      delay.delayTime.value = 0.1;
      delayGain.gain.value = 0.3;
      
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(100, now);
      osc2.frequency.exponentialRampToValueAtTime(30, now + 0.5);
      
      gain2.gain.setValueAtTime(0, now);
      gain2.gain.linearRampToValueAtTime(0.15, now + 0.05);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      
      osc2.connect(gain2);
      gain2.connect(delay);
      delay.connect(delayGain);
      delayGain.connect(context.destination);
      
      osc2.start(now);
      osc2.stop(now + 0.5);
      
      snapAudioRef.current = osc1 as any;
    } catch (e) {
      console.error('Error playing snap sound:', e);
    }
  };

  const playShimmerSound = () => {
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      if (context.state === 'suspended') {
        context.resume();
      }

      const now = context.currentTime;
      
      // Shimmer wind sound - ethereal particles
      const bufferSize = context.sampleRate * 2; // 2 seconds
      const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
      const data = buffer.getChannelData(0);
      
      for (let i = 0; i < bufferSize; i++) {
        // Wind-like noise with shimmer
        data[i] = (Math.random() * 2 - 1) * 0.2 * Math.sin(i * 0.01);
      }

      const source = context.createBufferSource();
      const gain = context.createGain();
      const filter = context.createBiquadFilter();
      const filter2 = context.createBiquadFilter();
      
      filter.type = 'highpass';
      filter.frequency.value = 500;
      filter.Q.value = 1;
      
      filter2.type = 'lowpass';
      filter2.frequency.value = 3000;
      filter2.Q.value = 1;
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 2);
      
      source.buffer = buffer;
      source.connect(filter);
      filter.connect(filter2);
      filter2.connect(gain);
      gain.connect(context.destination);
      
      source.loop = true;
      source.start(now);
      shimmerAudioRef.current = source;
      
      // Stop after 1.8 seconds
      setTimeout(() => {
        if (source) {
          source.stop();
          shimmerAudioRef.current = null;
        }
      }, 1800);
    } catch (e) {
      console.error('Error playing shimmer sound:', e);
    }
  };

  const stopAllAudio = () => {
    if (snapAudioRef.current) {
      try {
        snapAudioRef.current.stop();
      } catch (e) {}
      snapAudioRef.current = null;
    }
    if (shimmerAudioRef.current) {
      try {
        shimmerAudioRef.current.stop();
      } catch (e) {}
      shimmerAudioRef.current = null;
    }
  };

  const handleReplay = () => {
    if (onReplay) {
      setPhase('hand');
      setParticles([]);
      setShowReplay(false);
      stopAllAudio();
      onReplay();
    }
  };

  const content = (
    <div className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden">
      {/* Dimmed Background Overlay */}
      <motion.div
        className="absolute inset-0 bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.7 }}
        transition={{ duration: 0.3 }}
      />

      {/* Crossed Swords Above */}
      {(phase === 'text' || phase === 'complete') && <CrossedSwords />}

      {/* Phase 1 & 2: Hand Animation */}
      {(phase === 'hand' || phase === 'snap' || phase === 'disintegrate' || phase === 'text' || phase === 'complete') && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <HandIcon isSnapping={phase === 'snap'} />
        </motion.div>
      )}

      {/* Additional glow effects during snap */}
      {phase === 'snap' && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 2, opacity: [0, 0.6, 0] }}
          transition={{ duration: 0.5 }}
        >
          <div 
            className="w-64 h-64 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(244,208,63,0.8) 0%, rgba(212,175,55,0.6) 50%, transparent 100%)',
              filter: 'blur(40px)',
            }}
          />
        </motion.div>
      )}

      {/* Phase 3: Disintegration Particles */}
      {phase === 'disintegrate' && (
        <>
          <div className="absolute inset-0">
            {particles.map((particle) => (
              <GoldParticle
                key={particle.id}
                startX={particle.startX}
                startY={particle.startY}
                targetX={particle.targetX}
                targetY={particle.targetY}
                delay={particle.delay}
                duration={particle.duration}
                size={particle.size}
              />
            ))}
          </div>
          
          {/* Additional sparkle particles for extra flash */}
          <div className="absolute inset-0">
            {targets.flatMap((target, targetIndex) => {
              const targetCoords = getPositionCoords(target.position);
              return Array.from({ length: 17 }).map((_, i) => {
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * 15;
                
                return (
                  <motion.div
                    key={`sparkle-${target.id}-${i}`}
                    className="absolute w-2 h-2 rounded-full"
                    style={{
                      left: `${targetCoords.x}%`,
                      top: `${targetCoords.y}%`,
                      background: 'radial-gradient(circle, #FFFFFF 0%, #F4D03F 50%, transparent 100%)',
                      boxShadow: '0 0 12px rgba(244,208,63,1), 0 0 24px rgba(244,208,63,0.8)',
                    }}
                    initial={{
                      x: 0,
                      y: 0,
                      opacity: 1,
                      scale: 0,
                    }}
                    animate={{
                      x: `${Math.cos(angle) * distance}vw`,
                      y: `${Math.sin(angle) * distance}vh`,
                      opacity: [1, 1, 0],
                      scale: [0, 1.5, 0],
                    }}
                    transition={{
                      duration: 1 + Math.random() * 0.5,
                      delay: targetIndex * 0.2 + i * 0.02,
                      ease: 'easeOut',
                    }}
                  />
                );
              });
            })}
          </div>
        </>
      )}

      {/* Phase 4: Winner Name + RAINED ON YOU Text */}
      <AnimatePresence>
        {(phase === 'text' || phase === 'complete') && (
          <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Multiple glow layers behind text */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1.5, opacity: 0.4 }}
              transition={{ duration: 1.5 }}
            >
              <div 
                className="w-full h-full max-w-4xl"
                style={{
                  background: 'radial-gradient(circle, rgba(244,208,63,0.6) 0%, rgba(212,175,55,0.4) 50%, transparent 100%)',
                  filter: 'blur(60px)',
                }}
              />
            </motion.div>
            
            <motion.div
              className="relative z-10"
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ duration: 1.2, ease: [0.34, 1.56, 0.64, 1] }}
            >
              {/* Winner Name */}
              <motion.p
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif italic text-center mb-2"
                style={{
                  fontFamily: "'Playfair Display', 'Cinzel', 'Times New Roman', serif",
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #F4D03F 0%, #F7DC6F 30%, #F9E79F 50%, #F7DC6F 70%, #D4AF37 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  textShadow: '0 0 60px rgba(244,208,63,1), 0 0 100px rgba(244,208,63,0.8), 0 0 140px rgba(212,175,55,0.6)',
                  letterSpacing: '0.15em',
                  filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.8))',
                }}
                initial={{ letterSpacing: '0.05em' }}
                animate={{ letterSpacing: '0.25em' }}
                transition={{
                  duration: 2,
                  ease: 'easeOut',
                }}
              >
                {winnerName}
              </motion.p>
              
              {/* RAINED ON YOU */}
              <motion.p
                className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-serif italic text-center"
                style={{
                  fontFamily: "'Playfair Display', 'Cinzel', 'Times New Roman', serif",
                  fontWeight: 400,
                  background: 'linear-gradient(135deg, #F4D03F 0%, #F7DC6F 30%, #F9E79F 50%, #F7DC6F 70%, #D4AF37 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  textShadow: '0 0 80px rgba(244,208,63,1), 0 0 120px rgba(244,208,63,0.9), 0 0 160px rgba(212,175,55,0.7)',
                  letterSpacing: '0.1em',
                  filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.8))',
                }}
                initial={{ letterSpacing: '0.05em' }}
                animate={{ 
                  letterSpacing: '0.3em',
                  filter: [
                    'drop-shadow(0 4px 12px rgba(0,0,0,0.8)) drop-shadow(0 0 80px rgba(244,208,63,1))',
                    'drop-shadow(0 4px 12px rgba(0,0,0,0.8)) drop-shadow(0 0 100px rgba(244,208,63,1)) drop-shadow(0 0 140px rgba(212,175,55,0.9))',
                    'drop-shadow(0 4px 12px rgba(0,0,0,0.8)) drop-shadow(0 0 80px rgba(244,208,63,1))',
                  ],
                }}
                transition={{
                  letterSpacing: { duration: 2, ease: 'easeOut' },
                  filter: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
                }}
              >
                RAINED ON YOU
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Replay Button (Preview Mode Only) */}
      {isPreview && showReplay && (
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-auto z-[10002]"
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
