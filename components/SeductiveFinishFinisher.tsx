import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getEmoteUrl } from '../services/supabase';

interface SeductiveFinishFinisherProps {
  onComplete: () => void;
  onReplay?: () => void;
  isPreview?: boolean;
  losingPlayers?: Array<{ id: string; position: 'top' | 'left' | 'right' | 'bottom' }>;
  winnerName?: string;
}

// Seductive emote particle component - starts from winner, targets losing players
const SeductiveEmoteParticle: React.FC<{ 
  id: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  delay: number;
  duration: number;
}> = ({ id, startX, startY, targetX, targetY, delay, duration }) => {
  const emoteUrl = getEmoteUrl(':heart_eyes:');
  
  // Calculate the difference in viewport units
  const deltaX = targetX - startX;
  const deltaY = targetY - startY;
  
  return (
    <motion.div
      className="absolute pointer-events-none transform-gpu"
      style={{
        left: `${startX}%`,
        top: `${startY}%`,
        transform: 'translate3d(-50%, -50%, 0)',
        willChange: 'transform, opacity',
        zIndex: 25,
        backfaceVisibility: 'hidden'
      }}
      initial={{ 
        opacity: 0,
        scale: 0.4,
        rotate: 0,
        x: 0,
        y: 0,
      }}
      animate={{ 
        opacity: [0, 1, 1, 1, 0.8, 0],
        scale: [0.4, 0.6, 0.8, 1, 1, 0.9],
        rotate: [0, 180, 360, 540, 720, 900],
        x: `${deltaX}vw`,
        y: `${deltaY}vh`,
      }}
      transition={{
        duration: duration,
        delay: delay,
        ease: [0.25, 0.1, 0.25, 1],
        times: [0, 0.1, 0.3, 0.7, 0.95, 1],
      }}
    >
      {/* Bubble container with circular shape - larger size with dynamic glow */}
      <motion.div
        className="relative rounded-full"
        style={{
          width: '120px', // Larger size
          height: '120px',
        }}
        animate={{
          boxShadow: [
            '0 0 20px rgba(255, 105, 180, 0.5), 0 0 30px rgba(255, 20, 147, 0.3), 0 0 40px rgba(255, 105, 180, 0.2), inset 0 0 20px rgba(255, 255, 255, 0.2), inset 0 -10px 30px rgba(255, 105, 180, 0.3)',
            '0 0 40px rgba(255, 105, 180, 0.8), 0 0 60px rgba(255, 20, 147, 0.6), 0 0 80px rgba(255, 105, 180, 0.4), inset 0 0 20px rgba(255, 255, 255, 0.2), inset 0 -10px 30px rgba(255, 105, 180, 0.5)',
            '0 0 60px rgba(255, 105, 180, 1), 0 0 90px rgba(255, 20, 147, 0.8), 0 0 120px rgba(255, 105, 180, 0.6), inset 0 0 20px rgba(255, 255, 255, 0.2), inset 0 -10px 30px rgba(255, 105, 180, 0.7)',
          ],
        }}
        transition={{
          duration: duration,
          delay: delay,
          ease: 'easeIn',
          times: [0, 0.5, 1],
        }}
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.4) 0%, rgba(255, 105, 180, 0.2) 50%, rgba(255, 20, 147, 0.3) 100%)',
            backdropFilter: 'blur(10px)',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            padding: '10px',
          }}
        >
          {/* Intensifying glow ring that gets stronger near target */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'radial-gradient(circle at 50% 50%, transparent 40%, rgba(255, 105, 180, 0.2) 100%)',
            }}
            animate={{
              opacity: [0.2, 0.5, 0.7],
              scale: [1, 1.1, 1.2],
            }}
            transition={{
              duration: duration,
              delay: delay,
              ease: 'easeIn',
              times: [0, 0.5, 1],
            }}
          />
        
          {/* Emote image - circular clipped */}
          <div
            className="relative w-full h-full rounded-full overflow-hidden"
            style={{
              clipPath: 'circle(50% at 50% 50%)',
            }}
          >
            <motion.img
              src={emoteUrl}
              alt="seductive emote"
              className="w-full h-full object-cover"
              animate={{
                filter: [
                  'drop-shadow(0 0 8px rgba(255, 105, 180, 0.8))',
                  'drop-shadow(0 0 15px rgba(255, 105, 180, 1))',
                  'drop-shadow(0 0 20px rgba(255, 105, 180, 1))',
                ],
              }}
              transition={{
                duration: duration,
                delay: delay,
                ease: 'easeIn',
                times: [0, 0.5, 1],
              }}
            />
          </div>
          
          {/* Bubble highlight */}
          <div
            className="absolute top-2 left-2 w-8 h-8 rounded-full"
            style={{
              background: 'radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.7) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
};

export const SeductiveFinishFinisher: React.FC<SeductiveFinishFinisherProps> = ({ 
  onComplete, 
  onReplay,
  isPreview = false,
  losingPlayers = [],
  winnerName = 'GUEST'
}) => {
  const [phase, setPhase] = useState<'gasp' | 'rain' | 'text' | 'lingering'>('gasp');
  const [showReplay, setShowReplay] = useState(false);
  const [particles, setParticles] = useState<Array<{ 
    id: number; 
    targetIndex: number;
    startX: number;
    startY: number;
    targetX: number;
    targetY: number;
    delay: number;
    duration: number;
  }>>([]);
  const gaspAudioRef = useRef<AudioBufferSourceNode | null>(null);
  const basslineAudioRef = useRef<AudioBufferSourceNode | null>(null);

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

  // Winner position (bottom center)
  const winnerPosition = { x: 50, y: 85 };

  // Play anime victory gasp/pop sound
  const playGaspSound = () => {
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      if (context.state === 'suspended') {
        context.resume();
      }

      const now = context.currentTime;
      
      // High-pitched anime gasp - quick upward sweep
      const gasp = context.createOscillator();
      const gaspGain = context.createGain();
      
      gasp.type = 'sine';
      gasp.frequency.setValueAtTime(400, now);
      gasp.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
      
      gaspGain.gain.setValueAtTime(0, now);
      gaspGain.gain.linearRampToValueAtTime(0.25, now + 0.02);
      gaspGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      
      gasp.connect(gaspGain);
      gaspGain.connect(context.destination);
      gasp.start(now);
      gasp.stop(now + 0.15);
      
      // Pop sound - quick click
      const pop = context.createOscillator();
      const popGain = context.createGain();
      
      pop.type = 'square';
      pop.frequency.setValueAtTime(800, now + 0.1);
      pop.frequency.exponentialRampToValueAtTime(200, now + 0.15);
      
      popGain.gain.setValueAtTime(0, now + 0.1);
      popGain.gain.linearRampToValueAtTime(0.15, now + 0.105);
      popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      
      pop.connect(popGain);
      popGain.connect(context.destination);
      pop.start(now + 0.1);
      pop.stop(now + 0.15);
      
      gaspAudioRef.current = gasp as any;
    } catch (e) {
      console.error('Error playing gasp sound:', e);
    }
  };

  // Play sultry jazzy bassline
  const playBassline = () => {
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      if (context.state === 'suspended') {
        context.resume();
      }

      const now = context.currentTime;
      
      // Jazzy bassline - smooth, sultry low frequencies
      const bassNotes = [82.41, 98.00, 110.00, 123.47]; // E2, G2, A2, B2
      const noteDuration = 0.4;
      
      bassNotes.forEach((freq, i) => {
        const osc = context.createOscillator();
        const gain = context.createGain();
        const filter = context.createBiquadFilter();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * noteDuration);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, now + i * noteDuration);
        filter.Q.value = 1;
        
        gain.gain.setValueAtTime(0, now + i * noteDuration);
        gain.gain.linearRampToValueAtTime(0.15, now + i * noteDuration + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * noteDuration + noteDuration);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(context.destination);
        osc.start(now + i * noteDuration);
        osc.stop(now + i * noteDuration + noteDuration);
      });
      
      // Continue with a smooth loop
      bassNotes.forEach((freq, i) => {
        const osc = context.createOscillator();
        const gain = context.createGain();
        const filter = context.createBiquadFilter();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + (bassNotes.length + i) * noteDuration);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, now + (bassNotes.length + i) * noteDuration);
        filter.Q.value = 1;
        
        gain.gain.setValueAtTime(0, now + (bassNotes.length + i) * noteDuration);
        gain.gain.linearRampToValueAtTime(0.15, now + (bassNotes.length + i) * noteDuration + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (bassNotes.length + i) * noteDuration + noteDuration);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(context.destination);
        osc.start(now + (bassNotes.length + i) * noteDuration);
        osc.stop(now + (bassNotes.length + i) * noteDuration + noteDuration);
      });
      
      basslineAudioRef.current = bassNotes[0] as any;
    } catch (e) {
      console.error('Error playing bassline:', e);
    }
  };

  useEffect(() => {
    // Reset phase
    setPhase('gasp');
    
    // Phase 1: Gasp sound (0.2s)
    playGaspSound();
    const gaspTimer = setTimeout(() => {
      setPhase('rain');
      playBassline();
    }, 200);

    // Generate particles - hose effect from winner to each losing player
    const newParticles: Array<{ 
      id: number; 
      targetIndex: number;
      startX: number;
      startY: number;
      targetX: number;
      targetY: number;
      delay: number;
      duration: number;
    }> = [];
    
    targets.forEach((target, targetIndex) => {
      const targetPos = getTargetPosition(target.position);
      // Create 20-25 particles per target for hose effect
      const particlesPerTarget = 22;
      
      for (let i = 0; i < particlesPerTarget; i++) {
        const particleId = targetIndex * 100 + i;
        // Add slight spread from winner position for hose effect
        const spreadAngle = (Math.random() - 0.5) * 0.3; // Small angle spread
        const spreadDistance = Math.random() * 15; // Small distance spread
        
        newParticles.push({
          id: particleId,
          targetIndex,
          startX: winnerPosition.x + Math.cos(spreadAngle) * spreadDistance,
          startY: winnerPosition.y + Math.sin(spreadAngle) * spreadDistance,
          targetX: targetPos.x + (Math.random() - 0.5) * 10, // Small spread at target
          targetY: targetPos.y + (Math.random() - 0.5) * 10,
          delay: targetIndex * 0.3 + i * 0.08, // Staggered by target, then by particle
          duration: 1.5 + Math.random() * 0.8, // Fast travel time
        });
      }
    });
    
    setParticles(newParticles);

    // Phase 2: Rain/hose effect (2.5s)
    const rainTimer = setTimeout(() => {
      setPhase('text');
    }, 2500);

    // Phase 3: Text display (2s)
    const textTimer = setTimeout(() => {
      setPhase('lingering');
      if (isPreview) {
        setShowReplay(true);
      }
    }, 4500);

    // Phase 4: Lingering (2s) - only if not preview
    if (!isPreview) {
      const lingeringTimer = setTimeout(() => {
        onComplete();
      }, 6500);
      return () => {
        clearTimeout(gaspTimer);
        clearTimeout(rainTimer);
        clearTimeout(textTimer);
        clearTimeout(lingeringTimer);
      };
    }

    return () => {
      clearTimeout(gaspTimer);
      clearTimeout(rainTimer);
      clearTimeout(textTimer);
    };
  }, [onComplete, isPreview, losingPlayers]);

  const handleReplay = () => {
    if (onReplay) {
      setPhase('gasp');
      setShowReplay(false);
      onReplay();
    }
  };

  const content = (
    <div 
      className="fixed inset-0 z-[300] pointer-events-none overflow-hidden transform-gpu" 
      style={{
        contain: 'layout style paint',
        willChange: 'contents'
      }}
    >
      {/* Pink/Flirty Background Gradient */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        style={{
          background: 'linear-gradient(135deg, #ff69b4 0%, #ff1493 25%, #ff69b4 50%, #ffb6c1 75%, #ff69b4 100%)',
          backgroundSize: '400% 400%',
          animation: 'gradientShift 8s ease infinite',
        }}
      />

      {/* Hose Effect - Emotes from Winner to Losing Players */}
      {(phase === 'rain' || phase === 'text' || phase === 'lingering') && particles.length > 0 && (
        <div 
          className="absolute inset-0 overflow-hidden transform-gpu" 
          style={{ 
            zIndex: 20,
            contain: 'layout style paint'
          }}
        >
          {particles.map((particle) => (
            <SeductiveEmoteParticle
              key={particle.id}
              id={particle.id}
              startX={particle.startX}
              startY={particle.startY}
              targetX={particle.targetX}
              targetY={particle.targetY}
              delay={particle.delay}
              duration={particle.duration}
            />
          ))}
        </div>
      )}

      {/* Center Text */}
      {(phase === 'text' || phase === 'lingering') && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center z-[100] px-4 transform-gpu"
          style={{
            willChange: 'transform, opacity',
            backfaceVisibility: 'hidden'
          }}
          initial={{ opacity: 0, scale: 0.5, y: 50 }}
          animate={{ 
            opacity: 1, 
            scale: 1, 
            y: 0,
          }}
          transition={{ 
            duration: 0.8,
            ease: 'easeOut',
            type: 'spring',
            stiffness: 200,
            damping: 15,
          }}
        >
            <div className="relative w-full max-w-[95vw] text-center">
              {/* Multiple glow layers for flirty effect */}
              <div 
                className="absolute inset-0 blur-[60px] bg-gradient-to-br from-pink-400 via-rose-500 to-fuchsia-500 opacity-90 animate-pulse" 
                style={{ transform: 'scale(1.5)' }} 
              />
              <div 
                className="absolute inset-0 blur-[40px] bg-gradient-to-br from-pink-300 via-pink-400 to-rose-400 opacity-80 animate-pulse" 
                style={{ transform: 'scale(1.3)', animationDelay: '0.2s' }} 
              />
              <div 
                className="absolute inset-0 blur-[20px] bg-gradient-to-br from-pink-200 via-pink-300 to-rose-300 opacity-70" 
              />
              
              {/* Main text - Updated to "WINS!" */}
              <div 
                className="relative italic uppercase tracking-tighter"
                style={{
                  fontFamily: "'Playfair Display', 'Cinzel', serif",
                  fontWeight: 900,
                  fontSize: 'clamp(2rem, 10vw, 8rem)',
                  lineHeight: '1.2',
                  color: '#FF69B4', // Fallback color
                  textShadow: '0 0 80px rgba(255,105,180,1), 0 0 120px rgba(255,20,147,0.8), 0 0 160px rgba(255,105,180,0.6), 0 0 200px rgba(255,20,147,0.4), 0 4px 8px rgba(0,0,0,0.5)',
                  WebkitTextStroke: '3px rgba(255,105,180,0.4)',
                  background: 'linear-gradient(135deg, #FFB6C1 0%, #FF69B4 25%, #FF1493 50%, #FF69B4 75%, #FFB6C1 100%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  animation: phase === 'lingering' ? 'textPulse 1.5s ease-in-out infinite' : undefined,
                  letterSpacing: '-0.05em',
                  wordBreak: 'break-word',
                  padding: '0 1rem',
                  position: 'relative',
                  zIndex: 1,
                  display: 'block',
                }}
              >
                {winnerName} WINS!
              </div>
              
              {/* Floating heart particles around text */}
              {phase === 'lingering' && Array.from({ length: 15 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-3 h-3 text-pink-400"
                  style={{
                    left: `${50 + Math.cos(i * 0.418) * 30}%`,
                    top: `${50 + Math.sin(i * 0.418) * 30}%`,
                  }}
                  animate={{
                    y: [0, -20, 0],
                    opacity: [0.6, 1, 0.6],
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.1,
                    ease: 'easeInOut',
                  }}
                >
                  <span className="text-2xl">💖</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

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
            className="px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold rounded-xl shadow-lg hover:scale-105 transition-transform duration-200"
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

// Inject CSS styles on component mount
if (typeof document !== 'undefined') {
  const styleId = 'seductive-finish-styles';
  if (!document.getElementById(styleId)) {
    const styleSheet = document.createElement('style');
    styleSheet.id = styleId;
    styleSheet.textContent = `
      @keyframes gradientShift {
        0% {
          background-position: 0% 50%;
        }
        50% {
          background-position: 100% 50%;
        }
        100% {
          background-position: 0% 50%;
        }
      }

      @keyframes textPulse {
        0%, 100% {
          transform: scale(1);
          filter: brightness(1);
        }
        50% {
          transform: scale(1.05);
          filter: brightness(1.2);
        }
      }

      @keyframes bubblePulse {
        0%, 100% {
          opacity: 0.3;
          transform: scale(1);
        }
        50% {
          opacity: 0.6;
          transform: scale(1.1);
        }
      }
    `;
    document.head.appendChild(styleSheet);
  }
}
