import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { audioService } from '../services/audio';

interface SaltShakeFinisherProps {
  onComplete: () => void;
  onReplay?: () => void;
  isPreview?: boolean;
  losingPlayers?: Array<{ id: string; position: 'top' | 'left' | 'right' | 'bottom' }>;
  winnerName?: string;
}

// Salt particle component
const SaltParticle: React.FC<{ 
  startX: number; 
  startY: number; 
  targetX: number; 
  targetY: number; 
  delay: number;
  duration: number;
}> = ({ startX, startY, targetX, targetY, delay, duration }) => {
  return (
    <motion.div
      className="absolute w-1 h-1 bg-white rounded-full transform-gpu"
      style={{
        left: `${startX}%`,
        top: `${startY}%`,
        boxShadow: '0 0 4px rgba(255,255,255,0.8), 0 0 8px rgba(255,255,255,0.4)',
        willChange: 'transform, opacity',
        backfaceVisibility: 'hidden'
      }}
      initial={{ 
        x: 0, 
        y: 0, 
        opacity: 1,
        scale: 1,
      }}
      animate={{ 
        x: `${targetX - startX}vw`,
        y: `${targetY - startY}vh`,
        opacity: [1, 1, 0.8, 0],
        scale: [1, 1.2, 0.8, 0],
      }}
      transition={{
        duration: duration,
        delay: delay,
        ease: 'easeIn',
      }}
    />
  );
};

// Salt mound component that grows over player avatar
const SaltMound: React.FC<{ 
  position: 'top' | 'left' | 'right' | 'bottom';
  startDelay: number;
}> = ({ position, startDelay }) => {
  const positionStyles = {
    top: { top: '15%', left: '50%', transform: 'translateX(-50%)' },
    bottom: { bottom: '15%', left: '50%', transform: 'translateX(-50%)' },
    left: { left: '8%', top: '50%', transform: 'translateY(-50%)' },
    right: { right: '8%', top: '50%', transform: 'translateY(-50%)' },
  };

  return (
    <motion.div
      className="absolute pointer-events-none z-[10000] transform-gpu"
      style={{
        ...positionStyles[position],
        willChange: 'transform, opacity',
        backfaceVisibility: 'hidden'
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ 
        scale: [0, 1.2, 1.2],
        opacity: [0, 1, 1],
      }}
      transition={{
        duration: 1.5,
        delay: startDelay,
        ease: 'easeOut',
      }}
    >
      {/* Salt mound graphic - white mound that covers avatar */}
      <div className="relative">
        <motion.div
          className="w-32 h-32 rounded-full bg-white"
          style={{
            background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,1) 0%, rgba(240,240,240,0.95) 50%, rgba(220,220,220,0.9) 100%)',
            boxShadow: '0 10px 40px rgba(255,255,255,0.6), inset 0 -10px 20px rgba(200,200,200,0.3)',
            filter: 'blur(2px)',
          }}
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.2, 1.2] }}
          transition={{
            duration: 1.5,
            delay: startDelay,
            ease: 'easeOut',
          }}
        />
        {/* Additional layers for depth */}
        <motion.div
          className="absolute inset-0 rounded-full bg-white/80"
          style={{
            filter: 'blur(4px)',
          }}
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.3, 1.3] }}
          transition={{
            duration: 1.5,
            delay: startDelay + 0.1,
            ease: 'easeOut',
          }}
        />
        <motion.div
          className="absolute inset-0 rounded-full bg-white/60"
          style={{
            filter: 'blur(8px)',
          }}
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.4, 1.4] }}
          transition={{
            duration: 1.5,
            delay: startDelay + 0.2,
            ease: 'easeOut',
          }}
        />
      </div>
    </motion.div>
  );
};

// 3D Salt Shaker SVG Component
const SaltShaker3D: React.FC<{ 
  tilt?: number; 
  x?: number; 
  y?: number;
  scale?: number;
  opacity?: number;
}> = ({ tilt = 0, x = 50, y = 50, scale = 1, opacity = 1 }) => {
  return (
      <motion.div
        className="absolute pointer-events-none transform-gpu"
        style={{
          left: `${x}%`,
          top: `${y}%`,
          transform: `translate3d(-50%, -50%, 0) rotate3d(0, 0, 1, ${tilt}deg) scale(${scale})`,
          opacity: opacity,
          filter: 'drop-shadow(0 10px 30px rgba(255,255,255,0.3))',
          willChange: 'transform, opacity',
          backfaceVisibility: 'hidden'
        }}
      >
      <svg
        width="120"
        height="180"
        viewBox="0 0 120 180"
        style={{
          filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.5))',
        }}
      >
        <defs>
          <linearGradient id="shakerBody" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#E8E8E8" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#D0D0D0" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#B8B8B8" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="shakerTop" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#F5F5F5" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#E0E0E0" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="shakerHoles" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#CCCCCC" stopOpacity="0.6" />
          </linearGradient>
        </defs>
        
        {/* Main shaker body */}
        <ellipse cx="60" cy="140" rx="35" ry="25" fill="url(#shakerBody)" />
        <rect x="25" y="30" width="70" height="110" rx="8" fill="url(#shakerBody)" />
        
        {/* Top section with holes */}
        <ellipse cx="60" cy="30" rx="40" ry="15" fill="url(#shakerTop)" />
        <rect x="20" y="15" width="80" height="30" rx="12" fill="url(#shakerTop)" />
        
        {/* Holes on top */}
        <circle cx="45" cy="25" r="4" fill="url(#shakerHoles)" />
        <circle cx="60" cy="22" r="4" fill="url(#shakerHoles)" />
        <circle cx="75" cy="25" r="4" fill="url(#shakerHoles)" />
        <circle cx="52" cy="30" r="3" fill="url(#shakerHoles)" />
        <circle cx="68" cy="30" r="3" fill="url(#shakerHoles)" />
        
        {/* Highlight/reflection */}
        <ellipse cx="50" cy="50" rx="15" ry="60" fill="rgba(255,255,255,0.3)" />
        
        {/* Bottom rim */}
        <ellipse cx="60" cy="140" rx="38" ry="28" fill="none" stroke="rgba(200,200,200,0.6)" strokeWidth="2" />
      </svg>
    </motion.div>
  );
};

export const SaltShakeFinisher: React.FC<SaltShakeFinisherProps> = ({ 
  onComplete, 
  onReplay,
  isPreview = false,
  losingPlayers = [],
  winnerName = 'GUEST'
}) => {
  const [phase, setPhase] = useState<'shaker' | 'pour' | 'particles' | 'mound' | 'toxic' | 'complete'>('shaker');
  const [showReplay, setShowReplay] = useState(false);
  const [currentTarget, setCurrentTarget] = useState(0);
  const pourAudioRef = useRef<AudioBufferSourceNode | null>(null);
  const squeakAudioRef = useRef<AudioBufferSourceNode | null>(null);

  // Default losing player positions if not provided (for preview)
  const defaultLosingPlayers: Array<{ id: string; position: 'top' | 'left' | 'right' | 'bottom' }> = [
    { id: 'loser1', position: 'top' },
    { id: 'loser2', position: 'left' },
    { id: 'loser3', position: 'right' },
  ];
  const targets = losingPlayers.length >= 3 ? losingPlayers : defaultLosingPlayers;

  // Get target position coordinates
  const getTargetPosition = (position: 'top' | 'left' | 'right' | 'bottom') => {
    switch (position) {
      case 'top': return { x: 50, y: 15 };
      case 'bottom': return { x: 50, y: 85 };
      case 'left': return { x: 8, y: 50 };
      case 'right': return { x: 92, y: 50 };
      default: return { x: 50, y: 50 };
    }
  };

  useEffect(() => {
    // Phase 1: Shaker appears (0.8s)
    const shakerTimer = setTimeout(() => {
      setPhase('pour');
      setCurrentTarget(0);
    }, 800);

    // Phase 2: Pour sequence - tilt toward each loser (0.4s each)
    const pour1Timer = setTimeout(() => {
      setCurrentTarget(1);
    }, 1200);
    const pour2Timer = setTimeout(() => {
      setCurrentTarget(2);
    }, 1600);
    const pour3Timer = setTimeout(() => {
      setPhase('particles');
    }, 2000);

    // Phase 3: Heavy particle stream (1.5s)
    const particlesTimer = setTimeout(() => {
      setPhase('mound');
    }, 3500);

    // Phase 4: Mound growth completes (1.5s)
    const moundTimer = setTimeout(() => {
      setPhase('toxic');
      // Play squeak sound when toxic text appears
      playSqueakSound();
    }, 5000);

    // Phase 5: Toxic text display (2s)
    const toxicTimer = setTimeout(() => {
      setPhase('complete');
      if (isPreview) {
        setShowReplay(true);
      }
    }, 7000);

    // Complete (only if not preview)
    if (!isPreview) {
      const completeTimer = setTimeout(() => {
        onComplete();
      }, 9000);
      return () => {
        clearTimeout(shakerTimer);
        clearTimeout(pour1Timer);
        clearTimeout(pour2Timer);
        clearTimeout(pour3Timer);
        clearTimeout(particlesTimer);
        clearTimeout(moundTimer);
        clearTimeout(toxicTimer);
        clearTimeout(completeTimer);
        stopPourSound();
      };
    }

    // Start playing pour sound when pour phase begins
    const startPourTimer = setTimeout(() => {
      playPourSound();
    }, 1200);

    return () => {
      clearTimeout(shakerTimer);
      clearTimeout(pour1Timer);
      clearTimeout(pour2Timer);
      clearTimeout(pour3Timer);
      clearTimeout(particlesTimer);
      clearTimeout(moundTimer);
      clearTimeout(toxicTimer);
      clearTimeout(startPourTimer);
      stopPourSound();
    };
  }, [onComplete, isPreview]);

  const playPourSound = () => {
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      if (context.state === 'suspended') {
        context.resume();
      }

      // Create gritty pour sound using noise
      const bufferSize = context.sampleRate * 3; // 3 seconds
      const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
      const data = buffer.getChannelData(0);
      
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.3;
      }

      const source = context.createBufferSource();
      const gain = context.createGain();
      const filter = context.createBiquadFilter();
      
      filter.type = 'lowpass';
      filter.frequency.value = 2000;
      filter.Q.value = 1;
      
      gain.gain.setValueAtTime(0.15, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 3);
      
      source.buffer = buffer;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(context.destination);
      
      source.loop = true;
      source.start();
      pourAudioRef.current = source;
      
      // Stop after 2.5 seconds
      setTimeout(() => {
        if (source) {
          source.stop();
          pourAudioRef.current = null;
        }
      }, 2500);
    } catch (e) {
      console.error('Error playing pour sound:', e);
    }
  };

  const stopPourSound = () => {
    if (pourAudioRef.current) {
      try {
        pourAudioRef.current.stop();
      } catch (e) {}
      pourAudioRef.current = null;
    }
  };

  const playSqueakSound = () => {
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      if (context.state === 'suspended') {
        context.resume();
      }

      const now = context.currentTime;
      const osc = context.createOscillator();
      const gain = context.createGain();
      
      // Squeak toy sound - high frequency that drops
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.3);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      
      osc.connect(gain);
      gain.connect(context.destination);
      osc.start(now);
      osc.stop(now + 0.3);
      
      squeakAudioRef.current = osc as any;
    } catch (e) {
      console.error('Error playing squeak sound:', e);
    }
  };

  const handleReplay = () => {
    if (onReplay) {
      setPhase('shaker');
      setCurrentTarget(0);
      setShowReplay(false);
      stopPourSound();
      onReplay();
    }
  };

  // Calculate tilt angle toward target
  const getTiltAngle = (targetIndex: number) => {
    if (targetIndex === 0) {
      const target = getTargetPosition(targets[0].position);
      return Math.atan2(target.y - 50, target.x - 50) * (180 / Math.PI) - 90;
    } else if (targetIndex === 1) {
      const target = getTargetPosition(targets[1].position);
      return Math.atan2(target.y - 50, target.x - 50) * (180 / Math.PI) - 90;
    } else if (targetIndex === 2) {
      const target = getTargetPosition(targets[2].position);
      return Math.atan2(target.y - 50, target.x - 50) * (180 / Math.PI) - 90;
    }
    return 0;
  };

  const content = (
    <div 
      className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden transform-gpu" 
      style={{
        contain: 'layout style paint',
        willChange: 'contents'
      }}
    >
      {/* Dimmed Background */}
      <motion.div
        className="absolute inset-0 bg-black"
        initial={{ opacity: 0 }}
        animate={{ 
          opacity: isPreview ? 0.5 : 0.7 
        }}
        transition={{ duration: 0.5 }}
      />

      {/* Phase 1: Salt Shaker Appears */}
      {(phase === 'shaker' || phase === 'pour' || phase === 'particles' || phase === 'mound' || phase === 'toxic') && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center transform-gpu"
          style={{
            willChange: 'transform, opacity',
            backfaceVisibility: 'hidden'
          }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ 
            opacity: phase === 'shaker' ? [0, 1] : 1,
            scale: phase === 'shaker' ? [0.5, 1] : 1,
          }}
          transition={{ 
            duration: 0.8,
            ease: 'easeOut'
          }}
        >
          <SaltShaker3D
            tilt={phase === 'pour' ? getTiltAngle(currentTarget) : 0}
            x={50}
            y={50}
            scale={1.2}
            opacity={0.85}
          />
        </motion.div>
      )}

      {/* Phase 2 & 3: Pour Animation - Multiple shakers tilting toward each target */}
      {(phase === 'pour' || phase === 'particles') && (
        <>
          {targets.map((target, index) => {
            const targetPos = getTargetPosition(target.position);
            const tilt = Math.atan2(targetPos.y - 50, targetPos.x - 50) * (180 / Math.PI) - 90;
            const shouldTilt = phase === 'pour' && (currentTarget === index || currentTarget > index);
            
              return (
              <motion.div
                key={target.id}
                className="absolute inset-0 flex items-center justify-center transform-gpu"
                style={{
                  willChange: 'transform, opacity',
                  backfaceVisibility: 'hidden'
                }}
                initial={{ opacity: 0 }}
                animate={{ 
                  opacity: shouldTilt ? 0.6 : 0,
                  scale: shouldTilt ? 1 : 0.8,
                }}
                transition={{ duration: 0.3 }}
              >
                <SaltShaker3D
                  tilt={shouldTilt ? tilt : 0}
                  x={50}
                  y={50}
                  scale={0.8}
                  opacity={0.6}
                />
              </motion.div>
            );
          })}
        </>
      )}

      {/* Phase 3: Heavy Salt Particle Stream - optimized particle count */}
      {phase === 'particles' && (
        <div className="absolute inset-0 transform-gpu" style={{ contain: 'layout style paint' }}>
          {targets.map((target, targetIndex) => {
            const targetPos = getTargetPosition(target.position);
            const particles = Array.from({ length: 80 }, (_, i) => {
              const angle = (Math.PI / 6) * (Math.random() - 0.5); // Spread angle
              const offsetX = Math.cos(angle) * (Math.random() - 0.5) * 10;
              const offsetY = Math.sin(angle) * (Math.random() - 0.5) * 10;
              
              return (
                <SaltParticle
                  key={`${target.id}-${i}`}
                  startX={50 + offsetX}
                  startY={50 + offsetY}
                  targetX={targetPos.x + (Math.random() - 0.5) * 8}
                  targetY={targetPos.y + (Math.random() - 0.5) * 8}
                  delay={targetIndex * 0.2 + i * 0.01}
                  duration={0.8 + Math.random() * 0.4}
                />
              );
            });
            return particles;
          })}
        </div>
      )}

      {/* Phase 4: Salt Mounds Growing Over Losers */}
      {(phase === 'mound' || phase === 'toxic' || phase === 'complete') && (
        <>
          {targets.map((target, index) => (
            <SaltMound
              key={target.id}
              position={target.position}
              startDelay={2.0 + index * 0.3}
            />
          ))}
        </>
      )}

      {/* Phase 5: Toxic UI Text Banner */}
      <AnimatePresence>
        {(phase === 'toxic' || phase === 'complete') && (
          <motion.div
            className="absolute bottom-20 left-1/2 -translate-x-1/2 z-[10001] transform-gpu"
            style={{
              willChange: 'transform, opacity',
              backfaceVisibility: 'hidden'
            }}
            initial={{ opacity: 0, y: 50, scale: 0.8 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
            }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 0.6,
              ease: 'easeOut',
              type: 'spring',
              stiffness: 200,
              damping: 15,
            }}
          >
            <motion.div
              className="relative px-8 py-4 bg-black/80 backdrop-blur-xl border-2 border-white/30 rounded-2xl shadow-[0_0_40px_rgba(255,255,255,0.3)]"
              animate={{
                rotate: [0, -1, 1, -0.5, 0.5, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <motion.p
                className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-wider text-white text-center"
                style={{
                  fontFamily: "'Bangers', 'Luckiest Guy', 'Impact', sans-serif",
                  textShadow: '0 0 20px rgba(255,255,255,0.8), 0 4px 8px rgba(0,0,0,0.5)',
                  letterSpacing: '0.1em',
                }}
              >
                Don't be salty, it's just a game.
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
