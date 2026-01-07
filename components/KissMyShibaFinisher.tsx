import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../services/supabase';

interface KissMyShibaFinisherProps {
  onComplete: () => void;
  onReplay?: () => void;
  isPreview?: boolean;
  winnerName?: string;
}

// Shiba Butt Emote Component - Rains from top, grows as it falls
const ShibaButtEmote: React.FC<{
  startX: number;
  delay: number;
  duration: number;
  startSize: number;
}> = ({ startX, delay, duration, startSize }) => {
  const [imageUrl, setImageUrl] = useState<string>('');
  
  useEffect(() => {
    // Get shiba butt emote URL from Supabase
    const getEmoteUrl = async () => {
      try {
        const { data } = supabase.storage.from('emotes').getPublicUrl('round_3/shiba_butt_card.png');
        if (data?.publicUrl) {
          setImageUrl(data.publicUrl);
        } else {
          // Fallback URL
          setImageUrl('https://spaxxexmyiczdrbikdjp.supabase.co/storage/v1/object/public/emotes/round_3/shiba_butt_card.png');
        }
      } catch (e) {
        console.error('Error loading shiba butt emote:', e);
        setImageUrl('https://spaxxexmyiczdrbikdjp.supabase.co/storage/v1/object/public/emotes/round_3/shiba_butt_card.png');
      }
    };
    getEmoteUrl();
  }, []);

  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        left: `${startX}%`,
        top: '-10%',
      }}
      initial={{
        y: 0,
        opacity: 0,
        scale: 0.4,
      }}
      animate={{
        y: '110vh', // Falls to bottom of screen
        opacity: [0, 1, 1, 0.7, 0],
        scale: [0.4, 0.7, 1.2, 1.8, 2.5], // Continuously grows as it falls
      }}
      transition={{
        duration: duration,
        delay: delay,
        ease: 'easeIn',
        times: [0, 0.2, 0.5, 0.75, 1],
      }}
    >
      {/* Bubble container with circular shape and bubble aesthetic */}
      <motion.div
        className="rounded-full overflow-hidden"
        style={{
          width: `${startSize}px`,
          height: `${startSize}px`,
          background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.95) 0%, rgba(255,182,193,0.8) 35%, rgba(255,192,203,0.6) 70%, rgba(221,160,221,0.4) 100%)',
          border: '4px solid rgba(255,255,255,0.7)',
          boxShadow: '0 0 40px rgba(255,182,193,0.7), inset 0 0 25px rgba(255,255,255,0.5), 0 10px 20px rgba(0,0,0,0.3)',
          filter: 'drop-shadow(0 0 25px rgba(255,182,193,0.9))',
        }}
        animate={{
          scale: [1, 1.05, 1, 1.03, 1],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Shiba Butt"
            className="w-full h-full object-cover"
            style={{
              borderRadius: '50%',
            }}
          />
        )}
      </motion.div>
    </motion.div>
  );
};

// Bubble Component
const Bubble: React.FC<{
  startX: number;
  startY: number;
  size: number;
  delay: number;
  duration: number;
}> = ({ startX, startY, size, delay, duration }) => {
  const driftX = (Math.random() - 0.5) * 20;
  const driftY = -100 - Math.random() * 50;

  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        left: `${startX}%`,
        top: `${startY}%`,
        width: `${size}px`,
        height: `${size}px`,
        background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.9) 0%, rgba(173,216,230,0.6) 50%, rgba(135,206,250,0.3) 100%)',
        border: '2px solid rgba(255,255,255,0.5)',
        boxShadow: '0 0 20px rgba(173,216,230,0.5), inset 0 0 10px rgba(255,255,255,0.3)',
      }}
      initial={{
        x: 0,
        y: 0,
        opacity: 0,
        scale: 0,
      }}
      animate={{
        x: `${driftX}vw`,
        y: `${driftY}vh`,
        opacity: [0, 0.8, 0.8, 0.6, 0],
        scale: [0, 1, 1.1, 1, 0.8],
      }}
      transition={{
        duration: duration,
        delay: delay,
        ease: 'easeOut',
        times: [0, 0.2, 0.5, 0.8, 1],
      }}
    />
  );
};

export const KissMyShibaFinisher: React.FC<KissMyShibaFinisherProps> = ({
  onComplete,
  onReplay,
  isPreview = false,
  winnerName = 'GUEST'
}) => {
  const [phase, setPhase] = useState<'rain' | 'bubbles' | 'victory' | 'complete'>('rain');
  const [showReplay, setShowReplay] = useState(false);

  // Generate rain from top of screen
  const generateRain = () => {
    const emotes = [];
    const numEmotes = 50; // More emotes for continuous rain
    
    for (let i = 0; i < numEmotes; i++) {
      emotes.push({
        id: `emote-${i}`,
        startX: Math.random() * 100, // Random X position across screen
        delay: Math.random() * 2, // Stagger start times
        duration: 2 + Math.random() * 2, // 2-4 seconds to fall
        startSize: 60 + Math.random() * 40, // Start size: 60-100px
      });
    }
    return emotes;
  };

  // Generate bubbles
  const generateBubbles = () => {
    const bubbles = [];
    const numBubbles = 40;
    
    for (let i = 0; i < numBubbles; i++) {
      bubbles.push({
        id: `bubble-${i}`,
        startX: Math.random() * 100,
        startY: 100 + Math.random() * 20, // Start from bottom
        size: 20 + Math.random() * 40,
        delay: Math.random() * 2,
        duration: 4 + Math.random() * 3,
      });
    }
    return bubbles;
  };

  const [rainPattern] = useState(() => generateRain());
  const [bubbles] = useState(() => generateBubbles());

  useEffect(() => {
    // Phase 1: Victory text appears at 0.75s
    const victoryTimer = setTimeout(() => {
      setPhase('victory');
    }, 750);

    // Phase 2: Bubbles appear (1s after rain starts)
    const bubblesTimer = setTimeout(() => {
      setPhase('bubbles');
    }, 1000);

    // Phase 3: Complete (5s total)
    const completeTimer = setTimeout(() => {
      setPhase('complete');
      if (isPreview) {
        setShowReplay(true);
      }
    }, 5000);

    if (!isPreview) {
      const finalTimer = setTimeout(() => {
        onComplete();
      }, 7000);
      return () => {
        clearTimeout(bubblesTimer);
        clearTimeout(victoryTimer);
        clearTimeout(completeTimer);
        clearTimeout(finalTimer);
      };
    }

    return () => {
      clearTimeout(bubblesTimer);
      clearTimeout(victoryTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete, isPreview]);

  const handleReplay = () => {
    if (onReplay) {
      setPhase('rain');
      setShowReplay(false);
      onReplay();
    }
  };

  const content = (
    <div className="fixed inset-0 z-[300] pointer-events-none overflow-hidden">
      {/* Soft pastel background */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        style={{
          background: 'radial-gradient(circle at center, rgba(255,182,193,0.3) 0%, rgba(255,192,203,0.2) 50%, rgba(221,160,221,0.1) 100%)',
        }}
      />

      {/* Dimmed overlay */}
      <motion.div
        className="absolute inset-0 bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: isPreview ? 0.4 : 0.6 }}
        transition={{ duration: 0.5 }}
      />

      {/* Continuous Rain from Top */}
      <div className="absolute inset-0">
        {rainPattern.map((emote) => (
          <ShibaButtEmote
            key={emote.id}
            startX={emote.startX}
            delay={emote.delay}
            duration={emote.duration}
            startSize={emote.startSize}
          />
        ))}
      </div>

      {/* Phase 2 & 3: Bubbles */}
      {(phase === 'bubbles' || phase === 'victory' || phase === 'complete') && (
        <div className="absolute inset-0">
          {bubbles.map((bubble) => (
            <Bubble
              key={bubble.id}
              startX={bubble.startX}
              startY={bubble.startY}
              size={bubble.size}
              delay={bubble.delay}
              duration={bubble.duration}
            />
          ))}
        </div>
      )}

      {/* Phase 3 & 4: Victory Text */}
      <AnimatePresence>
        {(phase === 'victory' || phase === 'complete') && (
          <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center z-50 px-4"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            {/* Winner Name */}
            <motion.div
              className="text-center mb-6"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <div
                className="text-3xl sm:text-4xl md:text-5xl font-bold uppercase tracking-wider"
                style={{
                  fontFamily: "'Comic Sans MS', 'Comic Sans', cursive",
                  color: '#FFB6C1',
                  textShadow: '0 0 20px rgba(255,182,193,0.8), 0 0 40px rgba(255,192,203,0.6), 0 4px 8px rgba(0,0,0,0.3)',
                }}
              >
                {winnerName}
              </div>
            </motion.div>

            {/* Main Victory Phrase - Meme Font */}
            <motion.div
              className="text-center"
              initial={{ y: 30, opacity: 0, scale: 0.8 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ delay: 0, duration: 0.5, ease: 'easeOut' }}
            >
              <motion.div
                className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black uppercase tracking-tighter leading-tight"
                style={{
                  fontFamily: "'Impact', 'Arial Black', 'Franklin Gothic Bold', sans-serif",
                  color: '#FFFFFF',
                  textShadow: '4px 4px 0px #000000, -2px -2px 0px #000000, 2px -2px 0px #000000, -2px 2px 0px #000000, 0 0 20px rgba(255,182,193,0.8), 0 0 40px rgba(255,192,203,0.6)',
                  WebkitTextStroke: '3px #000000',
                  letterSpacing: '0.05em',
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
                KISS MY SHIBA!
              </motion.div>
            </motion.div>

            {/* Sparkle effects around text */}
            {Array.from({ length: 15 }).map((_, i) => (
              <motion.div
                key={`sparkle-${i}`}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  left: `${50 + Math.cos(i * 0.4) * 30}%`,
                  top: `${50 + Math.sin(i * 0.4) * 30}%`,
                  background: 'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,182,193,0.8) 50%, transparent 100%)',
                  boxShadow: '0 0 10px rgba(255,182,193,0.8)',
                }}
                animate={{
                  scale: [0, 1, 0],
                  opacity: [0, 1, 0],
                  rotate: 360,
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.1,
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
            className="px-6 py-3 bg-gradient-to-r from-pink-400 to-pink-600 text-white font-bold rounded-xl shadow-lg hover:scale-105 transition-transform duration-200"
            style={{
              fontFamily: "'Comic Sans MS', 'Comic Sans', cursive",
            }}
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

// Inject CSS styles
if (typeof document !== 'undefined') {
  const styleId = 'kiss-my-shiba-styles';
  if (!document.getElementById(styleId)) {
    const styleSheet = document.createElement('style');
    styleSheet.id = styleId;
    styleSheet.textContent = `
      @keyframes floatRotate {
        0%, 100% {
          transform: rotate(0deg) translateY(0px);
        }
        25% {
          transform: rotate(3deg) translateY(-8px);
        }
        50% {
          transform: rotate(0deg) translateY(-12px);
        }
        75% {
          transform: rotate(-3deg) translateY(-8px);
        }
      }
    `;
    document.head.appendChild(styleSheet);
  }
}
