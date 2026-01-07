import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type ChatStyle = 'standard' | 'gold' | 'neon' | 'wiggle';

interface ChatBubbleProps {
  text: string;
  style: ChatStyle;
  position: 'bottom' | 'top' | 'left' | 'right';
  isVisible: boolean;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ text, style, position, isVisible }) => {
  const getPositionClasses = () => {
    switch (position) {
      case 'bottom':
        return 'bottom-32 left-1/2 -translate-x-1/2';
      case 'top':
        return 'top-32 left-1/2 -translate-x-1/2';
      case 'left':
        return 'left-32 top-1/2 -translate-y-1/2';
      case 'right':
        return 'right-32 top-1/2 -translate-y-1/2';
      default:
        return 'bottom-32 left-1/2 -translate-x-1/2';
    }
  };

  const getStyleClasses = () => {
    switch (style) {
      case 'gold':
        return 'bg-white/95 border-2 border-yellow-400/50 shadow-[0_0_20px_rgba(234,179,8,0.3)]';
      case 'neon':
        return 'bg-black/80 border-2 border-pink-500/50 shadow-[0_0_20px_rgba(255,0,255,0.5)]';
      case 'wiggle':
        return 'bg-white/95 border-2 border-orange-400/50 shadow-[0_0_15px_rgba(251,146,60,0.3)]';
      default:
        return 'bg-white/95 border-2 border-gray-300/50 shadow-lg';
    }
  };

  const getTextClasses = () => {
    switch (style) {
      case 'gold':
        return 'bg-gradient-to-r from-yellow-500 via-orange-500 to-yellow-600 bg-clip-text text-transparent';
      case 'neon':
        return 'text-pink-400';
      case 'wiggle':
        return 'text-orange-600';
      default:
        return 'text-black';
    }
  };

  const getAnimationName = () => {
    switch (style) {
      case 'gold':
        return 'shimmer';
      case 'neon':
        return 'heartbeat';
      case 'wiggle':
        return 'wiggle';
      default:
        return '';
    }
  };

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes heartbeat {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes wiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-3deg); }
          75% { transform: rotate(3deg); }
        }
        .chat-shimmer {
          background: linear-gradient(90deg, #eab308 0%, #f97316 50%, #eab308 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 2s linear infinite;
        }
        .chat-heartbeat {
          animation: heartbeat 1.5s ease-in-out infinite;
        }
        .chat-wiggle {
          animation: wiggle 0.1s infinite;
        }
      `}</style>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            className={`fixed z-[450] ${getPositionClasses()} pointer-events-none`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ 
              scale: 1, 
              opacity: 1,
              y: -20,
            }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ 
              duration: 0.2,
              ease: 'easeOut'
            }}
          >
            <div className={`relative px-4 py-2.5 rounded-2xl ${getStyleClasses()} min-w-[80px] max-w-[min(280px,90vw)] ${style === 'neon' ? 'chat-heartbeat' : ''}`}>
              <p 
                className={`text-sm font-bold text-center break-words ${getTextClasses()} ${style === 'gold' ? 'chat-shimmer' : ''} ${style === 'wiggle' ? 'chat-wiggle' : ''}`}
                style={{
                  fontFamily: style === 'wiggle' ? "'Comic Sans MS', 'Fredoka One', cursive" : undefined,
                  textShadow: style === 'neon' ? '0 0 8px #ff00ff, 0 0 12px #ff00ff' : undefined,
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                  hyphens: 'auto',
                }}
              >
                {text}
              </p>
              {/* Speech bubble tail */}
              <div 
                className={`absolute w-0 h-0 border-8 border-transparent ${
                  position === 'bottom' ? 'top-full left-1/2 -translate-x-1/2 border-t-white/95' :
                  position === 'top' ? 'bottom-full left-1/2 -translate-x-1/2 border-b-white/95' :
                  position === 'left' ? 'right-full top-1/2 -translate-y-1/2 border-r-white/95' :
                  'left-full top-1/2 -translate-y-1/2 border-l-white/95'
                }`}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
