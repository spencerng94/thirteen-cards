import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface EtherealBladeFinisherProps {
  onComplete: () => void;
  onReplay?: () => void;
  isPreview?: boolean;
  winnerName?: string;
}

// Generate random triangle clip-path
const generateTriangle = () => {
  const variations = [
    'polygon(50% 0%, 100% 100%, 0% 100%)', // Standard triangle
    'polygon(0% 0%, 100% 0%, 50% 100%)', // Inverted
    'polygon(0% 50%, 100% 0%, 100% 100%)', // Right triangle
    'polygon(0% 0%, 100% 50%, 0% 100%)', // Left triangle
  ];
  return variations[Math.floor(Math.random() * variations.length)];
};

// Generate random direction for shard explosion
const generateShardDirection = () => {
  const angle = Math.random() * 360;
  const distance = 200 + Math.random() * 400;
  const x = Math.cos((angle * Math.PI) / 180) * distance;
  const y = Math.sin((angle * Math.PI) / 180) * distance;
  return { x, y, rotate: angle + Math.random() * 360 };
};

export const EtherealBladeFinisher: React.FC<EtherealBladeFinisherProps> = ({ 
  onComplete, 
  onReplay,
  isPreview = false,
  winnerName = 'GUEST'
}) => {
  const [phase, setPhase] = useState<'charge' | 'slashes' | 'shatter' | 'glow' | 'fanfare' | 'complete'>('charge');
  const [showReplay, setShowReplay] = useState(false);
  const [showLetterbox, setShowLetterbox] = useState(false);
  const [shardDirections] = useState(() => 
    Array.from({ length: 20 }, () => generateShardDirection())
  );

  useEffect(() => {
    // Show letterbox immediately
    setShowLetterbox(true);

    // Phase 0: Charge/Energy Build-up (0.8s) - Final Fantasy style
    const chargeTimer = setTimeout(() => {
      setPhase('slashes');
    }, 800);

    // Phase 1: Slashes (5 slashes, 0.05s apart, 0.2s duration each)
    const slashDuration = 200; // 0.2s
    const slashDelay = 50; // 0.05s between slashes
    const numSlashes = 5;
    const totalSlashTime = 800 + (numSlashes - 1) * slashDelay + slashDuration;

    // Phase 2: Shatter (starts right after last slash)
    const shatterTimer = setTimeout(() => {
      setPhase('shatter');
    }, totalSlashTime);

    // Phase 3: Glow (0.4s after shatter starts)
    const glowTimer = setTimeout(() => {
      setPhase('glow');
    }, totalSlashTime + 400);

    // Phase 4: Fanfare (0.6s after glow)
    const fanfareTimer = setTimeout(() => {
      setPhase('fanfare');
      if (isPreview) {
        setShowReplay(true);
        // Auto-close after 5 seconds in preview mode
        setTimeout(() => {
          onComplete();
        }, 5000);
      }
    }, totalSlashTime + 1000);

    // Phase 5: Complete (only if not preview)
    if (!isPreview) {
      const completeTimer = setTimeout(() => {
        setShowLetterbox(false);
        setPhase('complete');
        onComplete();
      }, totalSlashTime + 5500);
      return () => {
        clearTimeout(chargeTimer);
        clearTimeout(shatterTimer);
        clearTimeout(glowTimer);
        clearTimeout(fanfareTimer);
        clearTimeout(completeTimer);
      };
    }

    return () => {
      clearTimeout(chargeTimer);
      clearTimeout(shatterTimer);
      clearTimeout(glowTimer);
      clearTimeout(fanfareTimer);
    };
  }, [onComplete, isPreview]);

  const handleReplay = () => {
    if (onReplay) {
      setPhase('charge');
      setShowReplay(false);
      setShowLetterbox(true);
      onReplay();
    }
  };

  const content = (
    <div className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden">
      {/* Cinematic Letterbox Bars */}
      <AnimatePresence>
        {showLetterbox && (
          <>
            <motion.div
              className="absolute top-0 left-0 right-0 bg-black"
              initial={{ height: 0 }}
              animate={{ height: 96 }}
              exit={{ height: 0 }}
              transition={{ duration: 0.5 }}
            />
            <motion.div
              className="absolute bottom-0 left-0 right-0 bg-black"
              initial={{ height: 0 }}
              animate={{ height: 96 }}
              exit={{ height: 0 }}
              transition={{ duration: 0.5 }}
            />
          </>
        )}
      </AnimatePresence>

      {/* Dimmed Background with Ethereal Glow */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{
          opacity: phase === 'charge'
            ? (isPreview ? 0.3 : 0.5)
            : phase === 'slashes'
            ? (isPreview ? 0.4 : 0.6)
            : (isPreview ? 0.6 : 0.85)
        }}
        transition={{ duration: 0.3 }}
        style={{ 
          paddingTop: showLetterbox ? '96px' : '0', 
          paddingBottom: showLetterbox ? '96px' : '0',
          background: phase === 'charge' || phase === 'slashes'
            ? 'radial-gradient(circle at center, rgba(100,50,200,0.3) 0%, rgba(0,0,0,0.9) 70%)'
            : 'radial-gradient(circle at center, rgba(255,215,0,0.2) 0%, rgba(0,0,0,0.95) 70%)'
        }}
      />

      {/* Phase 0: Energy Charge/Charge-up - Final Fantasy Style */}
      {phase === 'charge' && (
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Concentric Energy Rings */}
          {Array.from({ length: 5 }).map((_, i) => (
            <motion.div
              key={`ring-${i}`}
              className="absolute border-2 border-cyan-400 rounded-full"
              style={{
                width: `${200 + i * 100}px`,
                height: `${200 + i * 100}px`,
                borderColor: `rgba(${100 + i * 30}, ${200 + i * 20}, 255, ${0.8 - i * 0.15})`,
                boxShadow: `0 0 ${20 + i * 10}px rgba(100, 200, 255, 0.6)`,
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: [0, 1.2, 1],
                opacity: [0, 0.8, 0],
              }}
              transition={{
                duration: 0.8,
                delay: i * 0.1,
                ease: 'easeOut',
              }}
            />
          ))}

          {/* Energy Orbs Spinning */}
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i * 360) / 8;
            const radius = 150;
            return (
              <motion.div
                key={`orb-${i}`}
                className="absolute w-4 h-4 rounded-full"
                style={{
                  background: 'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(100,200,255,0.8) 50%, transparent 100%)',
                  boxShadow: '0 0 20px rgba(100,200,255,1), 0 0 40px rgba(100,200,255,0.6)',
                }}
                initial={{ 
                  x: 0, 
                  y: 0,
                  scale: 0,
                  opacity: 0,
                }}
                animate={{ 
                  x: Math.cos((angle * Math.PI) / 180) * radius,
                  y: Math.sin((angle * Math.PI) / 180) * radius,
                  scale: [0, 1.5, 1],
                  opacity: [0, 1, 0.8],
                  rotate: 360,
                }}
                transition={{
                  duration: 0.8,
                  delay: i * 0.05,
                  ease: 'easeOut',
                }}
              />
            );
          })}

          {/* Central Energy Core */}
          <motion.div
            className="absolute w-32 h-32 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(100,200,255,0.8) 30%, rgba(150,100,255,0.6) 60%, transparent 100%)',
              boxShadow: '0 0 60px rgba(100,200,255,1), 0 0 120px rgba(150,100,255,0.8), inset 0 0 40px rgba(255,255,255,0.5)',
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ 
              scale: [0, 1.5, 1.2, 1],
              opacity: [0, 1, 0.9, 0.8],
              rotate: 360,
            }}
            transition={{
              duration: 0.8,
              ease: 'easeOut',
            }}
          />
        </div>
      )}

      {/* Phase 1: Enhanced Slash Layers - Energy Blades */}
      {phase === 'slashes' && (
        <div className="absolute inset-0 flex items-center justify-center">
          {Array.from({ length: 5 }).map((_, i) => {
            const angle = -45 + (Math.random() * 20 - 10); // -55 to -35 degrees
            const x = 50 + (Math.random() * 20 - 10); // Center with variation
            const y = 50 + (Math.random() * 20 - 10);
            
            return (
              <motion.div
                key={i}
                className="absolute"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  transformOrigin: 'center',
                  transform: `rotate(${angle}deg)`,
                }}
                initial={{ width: 0, opacity: 1 }}
                animate={{ 
                  width: '200%', 
                  opacity: [1, 1, 0.8, 0],
                }}
                transition={{
                  duration: 0.2,
                  delay: i * 0.05,
                  ease: 'easeOut',
                }}
              >
                {/* Main Blade */}
                <div
                  className="h-2 bg-gradient-to-r from-transparent via-white to-transparent"
                  style={{
                    boxShadow: '0 0 30px rgba(255,255,255,1), 0 0 60px rgba(100,200,255,0.9), 0 0 100px rgba(150,100,255,0.7), 0 0 140px rgba(200,150,255,0.5)',
                    filter: 'blur(1px)',
                  }}
                />
                {/* Energy Trail */}
                <motion.div
                  className="absolute h-1 bg-gradient-to-r from-cyan-400 via-blue-300 to-purple-400"
                  style={{
                    top: '-2px',
                    width: '100%',
                    boxShadow: '0 0 20px rgba(100,200,255,0.8), 0 0 40px rgba(150,100,255,0.6)',
                    filter: 'blur(2px)',
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 0.8, 0] }}
                  transition={{
                    duration: 0.2,
                    delay: i * 0.05 + 0.05,
                  }}
                />
                {/* Sparkle Particles */}
                {Array.from({ length: 8 }).map((_, j) => (
                  <motion.div
                    key={j}
                    className="absolute w-1 h-1 bg-white rounded-full"
                    style={{
                      left: `${20 + j * 10}%`,
                      top: '-4px',
                      boxShadow: '0 0 8px rgba(255,255,255,1), 0 0 16px rgba(100,200,255,0.8)',
                    }}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ 
                      opacity: [0, 1, 0],
                      scale: [0, 1.5, 0],
                      y: [-10, -30],
                    }}
                    transition={{
                      duration: 0.3,
                      delay: i * 0.05 + j * 0.02,
                    }}
                  />
                ))}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Phase 2: Enhanced Screen Shatter - Crystal Shards */}
      <AnimatePresence>
        {phase === 'shatter' && (
          <div 
            className="absolute inset-0 flex items-center justify-center"
            style={{
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
            }}
          >
            {shardDirections.map((dir, i) => {
              const size = 50 + Math.random() * 60; // 50-110px
              const hue = 180 + Math.random() * 60; // Cyan to purple range
              return (
                <motion.div
                  key={i}
                  className="absolute"
                  style={{
                    left: '50%',
                    top: '50%',
                    width: `${size}px`,
                    height: `${size}px`,
                    clipPath: generateTriangle(),
                    background: `linear-gradient(135deg, 
                      hsla(${hue}, 100%, 90%, 0.95) 0%, 
                      hsla(${hue}, 100%, 70%, 0.85) 50%, 
                      hsla(${hue + 30}, 100%, 60%, 0.75) 100%)`,
                    filter: `blur(0.5px) drop-shadow(0 0 12px hsla(${hue}, 100%, 80%, 0.9)) drop-shadow(0 0 24px hsla(${hue}, 100%, 70%, 0.6))`,
                    border: `1px solid hsla(${hue}, 100%, 85%, 0.6)`,
                  }}
                  initial={{ 
                    x: 0, 
                    y: 0, 
                    rotate: 0, 
                    opacity: 1,
                    scale: 1,
                  }}
                  animate={{ 
                    x: dir.x, 
                    y: dir.y, 
                    rotate: dir.rotate, 
                    opacity: [1, 0.9, 0],
                    scale: [1, 1.1, 0.3],
                  }}
                  transition={{
                    duration: 0.8,
                    delay: Math.random() * 0.3,
                    ease: [0.4, 0, 0.2, 1],
                  }}
                />
              );
            })}
            
            {/* Additional Energy Burst */}
            {Array.from({ length: 12 }).map((_, i) => {
              const angle = (i * 360) / 12;
              const distance = 300 + Math.random() * 200;
              return (
                <motion.div
                  key={`burst-${i}`}
                  className="absolute w-3 h-3 rounded-full"
                  style={{
                    left: '50%',
                    top: '50%',
                    background: 'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(100,200,255,0.8) 50%, transparent 100%)',
                    boxShadow: '0 0 20px rgba(255,255,255,1), 0 0 40px rgba(100,200,255,0.8)',
                  }}
                  initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                  animate={{ 
                    x: Math.cos((angle * Math.PI) / 180) * distance,
                    y: Math.sin((angle * Math.PI) / 180) * distance,
                    scale: [0, 2, 0],
                    opacity: [1, 1, 0],
                  }}
                  transition={{
                    duration: 0.8,
                    delay: 0.1 + i * 0.05,
                    ease: 'easeOut',
                  }}
                />
              );
            })}
          </div>
        )}
      </AnimatePresence>

      {/* Phase 3: Enhanced Glow - Ethereal Energy Burst */}
      <AnimatePresence>
        {(phase === 'glow' || phase === 'fanfare') && (
          <>
            {/* Multiple Glow Layers */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              style={{
                background: 'radial-gradient(circle at center, rgba(255,255,255,0.95) 0%, rgba(200,150,255,0.8) 20%, rgba(100,200,255,0.6) 40%, rgba(255,215,0,0.4) 60%, transparent 80%)',
                filter: 'blur(40px)',
              }}
            />
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              style={{
                background: 'radial-gradient(circle at center, rgba(255,215,0,0.9) 0%, rgba(255,165,0,0.7) 30%, rgba(200,100,255,0.5) 50%, transparent 70%)',
                filter: 'blur(60px)',
              }}
            />
            
            {/* Rotating Energy Rings */}
            {Array.from({ length: 3 }).map((_, i) => (
              <motion.div
                key={`energy-ring-${i}`}
                className="absolute border-2 rounded-full"
                style={{
                  width: `${300 + i * 200}px`,
                  height: `${300 + i * 200}px`,
                  borderColor: `rgba(${255 - i * 50}, ${215 - i * 30}, ${i * 50}, ${0.6 - i * 0.15})`,
                  borderImage: 'linear-gradient(45deg, rgba(255,215,0,0.8), rgba(200,150,255,0.8), rgba(100,200,255,0.8)) 1',
                  boxShadow: `0 0 ${40 + i * 20}px rgba(255,215,0,${0.8 - i * 0.2})`,
                }}
                initial={{ rotate: 0, scale: 0, opacity: 0 }}
                animate={{ 
                  rotate: 360,
                  scale: [0, 1.2, 1],
                  opacity: [0, 0.8, 0.6],
                }}
                transition={{
                  duration: 2,
                  delay: i * 0.3,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              />
            ))}
          </>
        )}
      </AnimatePresence>

      {/* Phase 4: Victory Text */}
      <AnimatePresence>
        {(phase === 'fanfare' || phase === 'complete') && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1, ease: 'easeOut' }}
          >
            {/* Enhanced Floating Particles - Ethereal Energy */}
            {Array.from({ length: 50 }).map((_, i) => {
              const angle = (i * 360) / 50;
              const distance = 150 + Math.random() * 100;
              const hue = 180 + Math.random() * 60; // Cyan to purple
              return (
                <motion.div
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    left: '50%',
                    top: '50%',
                    width: `${3 + Math.random() * 4}px`,
                    height: `${3 + Math.random() * 4}px`,
                    background: `radial-gradient(circle, rgba(255,255,255,1) 0%, hsla(${hue}, 100%, 80%, 0.9) 50%, hsla(${hue + 30}, 100%, 70%, 0.7) 100%)`,
                    boxShadow: `0 0 ${8 + Math.random() * 8}px hsla(${hue}, 100%, 85%, 1), 0 0 ${16 + Math.random() * 12}px hsla(${hue}, 100%, 75%, 0.8)`,
                    filter: 'blur(0.5px)',
                  }}
                  initial={{ 
                    x: 0, 
                    y: 0, 
                    opacity: 1,
                    scale: 1,
                  }}
                  animate={{ 
                    x: Math.cos((angle * Math.PI) / 180) * distance,
                    y: Math.sin((angle * Math.PI) / 180) * distance - 50,
                    opacity: [1, 0.9, 0],
                    scale: [1, 1.5, 0.3],
                    rotate: 360,
                  }}
                  transition={{
                    duration: 3 + Math.random() * 2,
                    delay: i * 0.05,
                    ease: 'easeOut',
                  }}
                />
              );
            })}
            
            {/* Magical Runes/Symbols Floating */}
            {Array.from({ length: 8 }).map((_, i) => {
              const angle = (i * 360) / 8;
              const radius = 200;
              return (
                <motion.div
                  key={`rune-${i}`}
                  className="absolute text-4xl"
                  style={{
                    left: '50%',
                    top: '50%',
                    color: `hsla(${200 + i * 20}, 100%, 80%, 0.8)`,
                    textShadow: `0 0 20px hsla(${200 + i * 20}, 100%, 80%, 1), 0 0 40px hsla(${200 + i * 20}, 100%, 70%, 0.8)`,
                    fontFamily: 'serif',
                  }}
                  initial={{ 
                    x: 0, 
                    y: 0, 
                    opacity: 0,
                    scale: 0,
                    rotate: 0,
                  }}
                  animate={{ 
                    x: Math.cos((angle * Math.PI) / 180) * radius,
                    y: Math.sin((angle * Math.PI) / 180) * radius,
                    opacity: [0, 0.8, 0.6, 0],
                    scale: [0, 1.2, 1, 0.5],
                    rotate: 360,
                  }}
                  transition={{
                    duration: 4,
                    delay: 0.5 + i * 0.2,
                    ease: 'easeOut',
                  }}
                >
                  ✦
                </motion.div>
              );
            })}

            {/* Victory Text - Premium Final Fantasy Style */}
            <motion.div
              className="relative"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1.2, ease: [0.34, 1.56, 0.64, 1] }}
            >
              {/* Multiple Glow Layers Behind Text */}
              <motion.div
                className="absolute inset-0 blur-[80px]"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,215,0,1) 0%, rgba(200,150,255,0.9) 50%, rgba(100,200,255,0.8) 100%)',
                  transform: 'scale(1.5)',
                }}
                animate={{ 
                  opacity: [0.6, 0.9, 0.6],
                  scale: [1.5, 1.6, 1.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
              <motion.div
                className="absolute inset-0 blur-[40px]"
                style={{
                  background: 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,215,0,0.7) 100%)',
                  transform: 'scale(1.2)',
                }}
                animate={{ 
                  opacity: [0.7, 1, 0.7],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
              
              {/* Winner Name */}
              <motion.div
                className="text-4xl sm:text-5xl md:text-[6rem] lg:text-[7rem] italic font-black uppercase tracking-tighter relative z-10 mb-4"
                style={{
                  fontFamily: "'Cinzel', 'Playfair Display', serif",
                  background: 'linear-gradient(135deg, #FFFFFF 0%, #FFD700 20%, #FFA500 40%, #FFD700 60%, #FFF8DC 80%, #FFD700 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  filter: 'drop-shadow(0 0 20px rgba(255,215,0,0.9)) drop-shadow(0 0 40px rgba(255,215,0,0.7)) drop-shadow(0 0 60px rgba(200,150,255,0.6))',
                  textShadow: '0 0 60px rgba(255,215,0,0.8), 0 0 100px rgba(255,215,0,0.6)',
                  letterSpacing: '-0.01em',
                  lineHeight: '0.9',
                }}
                animate={{ 
                  scale: [1, 1.03, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                {winnerName}
              </motion.div>
              
              {/* Main Text with Multiple Effects */}
              <motion.div
                className="text-7xl sm:text-8xl md:text-[12rem] lg:text-[14rem] italic font-black uppercase tracking-tighter relative z-10"
                style={{
                  fontFamily: "'Cinzel', 'Playfair Display', serif",
                  background: 'linear-gradient(135deg, #FFFFFF 0%, #FFD700 20%, #FFA500 40%, #FFD700 60%, #FFF8DC 80%, #FFD700 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  filter: 'drop-shadow(0 0 30px rgba(255,215,0,1)) drop-shadow(0 0 60px rgba(255,215,0,0.9)) drop-shadow(0 0 100px rgba(200,150,255,0.8)) drop-shadow(0 0 140px rgba(100,200,255,0.6))',
                  textShadow: '0 0 80px rgba(255,215,0,0.9), 0 0 120px rgba(255,215,0,0.7), 0 0 160px rgba(200,150,255,0.5)',
                  letterSpacing: '-0.02em',
                  lineHeight: '0.9',
                }}
                animate={{ 
                  scale: [1, 1.05, 1],
                  filter: [
                    'drop-shadow(0 0 30px rgba(255,215,0,1)) drop-shadow(0 0 60px rgba(255,215,0,0.9))',
                    'drop-shadow(0 0 40px rgba(255,215,0,1)) drop-shadow(0 0 80px rgba(255,215,0,1)) drop-shadow(0 0 120px rgba(200,150,255,0.9))',
                    'drop-shadow(0 0 30px rgba(255,215,0,1)) drop-shadow(0 0 60px rgba(255,215,0,0.9))',
                  ],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                VICTORY
              </motion.div>
              
              {/* Ethereal Border Glow */}
              <motion.div
                className="absolute -inset-4 rounded-lg"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,215,0,0.3) 0%, rgba(200,150,255,0.3) 50%, rgba(100,200,255,0.3) 100%)',
                  filter: 'blur(20px)',
                  opacity: 0.6,
                }}
                animate={{ 
                  opacity: [0.4, 0.7, 0.4],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Replay Button (Preview Mode Only) */}
      {isPreview && showReplay && (
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-auto"
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

      {/* Close Button (Preview Mode) */}
      {isPreview && (
        <div className="absolute top-4 right-4 pointer-events-auto z-[10000]">
          <button
            onClick={onComplete}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white font-medium transition-all duration-200 backdrop-blur-sm"
          >
            Close
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
