import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../services/supabase';
import { getEmoteUrl } from '../services/supabase';
import { getWebpPath } from '../utils/imagePath';

interface BashfulFinishFinisherProps {
  onComplete: () => void;
  onReplay?: () => void;
  isPreview?: boolean;
  winnerName?: string;
}

// Bashful emote falling component - in circles with bubble effect
const FallingBashfulEmote: React.FC<{
  startX: number;
  startY: number;
  delay: number;
  duration: number;
  rotation: number;
  remoteEmotes?: any[];
}> = ({ startX, startY, delay, duration, rotation, remoteEmotes = [] }) => {
  const [imageUrl, setImageUrl] = useState<string>('');
  const driftX = (Math.random() - 0.5) * 30;
  const floatAmount = (Math.random() - 0.5) * 15;

  useEffect(() => {
    // Get bashful emote URL from Supabase
    const getEmote = async () => {
      try {
        // Try to get from remote emotes first
        const bashfulEmote = remoteEmotes.find(e => e.trigger_code === ':blush:');
        if (bashfulEmote?.file_path) {
          const webpPath = getWebpPath(bashfulEmote.file_path);
          const { data } = supabase.storage.from('emotes').getPublicUrl(webpPath);
          if (data?.publicUrl) {
            setImageUrl(data.publicUrl);
            return;
          }
        }
        
        // Fallback to direct path (WebP)
        const { data } = supabase.storage.from('emotes').getPublicUrl('blushing_card.webp');
        if (data?.publicUrl) {
          setImageUrl(data.publicUrl);
        } else {
          // Final fallback
          setImageUrl(getEmoteUrl(':blush:') || 'https://spaxxexmyiczdrbikdjp.supabase.co/storage/v1/object/public/emotes/blushing_card.webp');
        }
      } catch (e) {
        console.error('Error loading bashful emote:', e);
        setImageUrl(getEmoteUrl(':blush:') || 'https://spaxxexmyiczdrbikdjp.supabase.co/storage/v1/object/public/emotes/blushing_card.webp');
      }
    };
    getEmote();
  }, [remoteEmotes]);

  return (
    <motion.div
      className="absolute transform-gpu"
      style={{
        left: `${startX}%`,
        top: `${startY}%`,
        width: '120px',
        height: '120px',
        willChange: 'transform, opacity',
        backfaceVisibility: 'hidden'
      }}
      initial={{
        x: 0,
        y: 0,
        opacity: 0,
        rotate: rotation,
        scale: 0.6,
      }}
      animate={{
        x: [
          `${driftX * 0.3}vw`,
          `${driftX * 0.6}vw`,
          `${driftX}vw`,
          `${driftX * 0.7}vw`,
          `${driftX * 0.4}vw`,
        ],
        y: '120vh',
        opacity: [0, 1, 1, 1, 0.7],
        rotate: rotation + (Math.random() - 0.5) * 90,
        scale: [0.6, 1, 1.05, 1, 0.95],
      }}
      transition={{
        duration: duration,
        delay: delay,
        ease: [0.25, 0.1, 0.25, 1], // More floaty ease
        times: [0, 0.2, 0.5, 0.8, 1],
      }}
    >
      {/* Bubble effect - circular background with pink/rose glow */}
      <div className="w-full h-full flex items-center justify-center relative">
        {/* Outer glow bubble */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(255,182,193,0.4) 0%, rgba(255,192,203,0.2) 50%, transparent 100%)',
            filter: 'blur(8px)',
            boxShadow: '0 0 25px rgba(255,182,193,0.5), inset 0 0 30px rgba(255,192,203,0.3)',
          }}
          animate={{
            scale: [1, 1.1, 1, 1.05, 1],
            opacity: [0.6, 0.8, 0.7, 0.75, 0.6],
          }}
          transition={{
            duration: 2 + Math.random(),
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        
        {/* Bubble border */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            border: '3px solid rgba(255,182,193,0.5)',
            borderRadius: '50%',
            boxShadow: 'inset 0 0 20px rgba(255,192,203,0.4), 0 0 15px rgba(255,182,193,0.3)',
          }}
        />
        
        {/* Inner bubble highlight */}
        <div
          className="absolute inset-2 rounded-full"
          style={{
            background: 'radial-gradient(circle at 30% 30%, rgba(255,192,203,0.6) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />
        
        {/* Emote image - circular */}
        <div className="relative z-10 w-full h-full rounded-full overflow-hidden">
          <img 
            src={imageUrl || 'https://spaxxexmyiczdrbikdjp.supabase.co/storage/v1/object/public/emotes/blushing_card.webp'} 
            alt="Bashful emote"
            className="w-full h-full object-cover"
            style={{ 
              imageRendering: 'auto',
              borderRadius: '50%',
            }}
            onError={(e) => {
              // Fallback to getEmoteUrl if direct URL fails
              const fallbackUrl = getEmoteUrl(':blush:');
              if (fallbackUrl && e.currentTarget.src !== fallbackUrl) {
                e.currentTarget.src = fallbackUrl;
              }
            }}
          />
        </div>
      </div>
    </motion.div>
  );
};

export const BashfulFinishFinisher: React.FC<BashfulFinishFinisherProps> = ({ 
  onComplete, 
  onReplay,
  isPreview = false,
  winnerName = 'GUEST'
}) => {
  const [phase, setPhase] = useState<'emotes' | 'text' | 'complete'>('emotes');
  const [showReplay, setShowReplay] = useState(false);
  const [fallingEmotes, setFallingEmotes] = useState<Array<{
    id: string;
    startX: number;
    startY: number;
    delay: number;
    duration: number;
    rotation: number;
  }>>([]);
  const [remoteEmotes, setRemoteEmotes] = useState<any[]>([]);

  // Fetch remote emotes for VisualEmote component
  useEffect(() => {
    const fetchEmotes = async () => {
      try {
        const { fetchEmotes: fetchAllEmotes } = await import('../services/supabase');
        // Fetch all emotes to ensure we have the bashful emote
        const allEmotes = await fetchAllEmotes();
        setRemoteEmotes(allEmotes);
      } catch (e) {
        console.error('Error fetching emotes:', e);
      }
    };
    fetchEmotes();
  }, []);

  // Generate falling bashful emotes
  const generateFallingEmotes = () => {
    const newEmotes: typeof fallingEmotes = [];
    
    // Generate continuous stream of bashful emotes from top - more floaty
    for (let i = 0; i < 120; i++) {
      newEmotes.push({
        id: `emote-${i}`,
        startX: Math.random() * 100,
        startY: -10 - Math.random() * 40,
        delay: i * 0.1 + Math.random() * 0.4,
        duration: 4 + Math.random() * 3, // Slower, more floaty
        rotation: (Math.random() - 0.5) * 60,
      });
    }
    
    setFallingEmotes(newEmotes);
  };

  useEffect(() => {
    // Phase 1: Emotes start falling immediately, text appears almost immediately
    generateFallingEmotes();
    const emotesTimer = setTimeout(() => {
      setPhase('text');
    }, 200); // Text appears almost immediately (0.2s)

    // Phase 2: Complete (2s)
    const textTimer = setTimeout(() => {
      setPhase('complete');
      if (isPreview) {
        setShowReplay(true);
      }
    }, 2200);

    // Complete (only if not preview)
    if (!isPreview) {
      const completeTimer = setTimeout(() => {
        onComplete();
      }, 5000);
      return () => {
        clearTimeout(emotesTimer);
        clearTimeout(textTimer);
        clearTimeout(completeTimer);
      };
    }

    return () => {
      clearTimeout(emotesTimer);
      clearTimeout(textTimer);
    };
  }, [onComplete, isPreview]);

  const handleReplay = () => {
    if (onReplay) {
      setPhase('emotes');
      setFallingEmotes([]);
      setShowReplay(false);
      onReplay();
    }
  };

  const content = (
    <div 
      className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden transform-gpu" 
      style={{ 
        contain: 'layout style paint',
        willChange: 'contents'
      }}
    >
      {/* Dimmed Background Overlay */}
      <motion.div 
        className="absolute inset-0 bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.7 }}
        transition={{ duration: 0.3 }}
      />

      {/* Bashful Emotes Falling */}
      {(phase === 'emotes' || phase === 'text' || phase === 'complete') && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {fallingEmotes.map((emote) => (
            <FallingBashfulEmote
              key={emote.id}
              startX={emote.startX}
              startY={emote.startY}
              delay={emote.delay}
              duration={emote.duration}
              rotation={emote.rotation}
              remoteEmotes={remoteEmotes}
            />
          ))}
        </div>
      )}

      {/* Victory Text - appears almost immediately */}
      <AnimatePresence>
        {(phase === 'text' || phase === 'complete') && (
          <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div 
              className="relative z-10 flex flex-col items-center"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
            {/* Winner Name */}
              <motion.p
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-center mb-2"
                style={{
                  fontFamily: "'Impact', 'Arial Black', 'Franklin Gothic Bold', sans-serif",
                  fontWeight: 700,
                  color: '#FFFFFF',
                  textShadow: '0 0 40px rgba(255,182,193,0.8), 0 4px 8px rgba(0,0,0,0.8)',
                  letterSpacing: '0.15em',
                }}
              >
                {winnerName} WINS 🤭
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
