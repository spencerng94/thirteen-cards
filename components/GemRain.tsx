import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface GemRainProps {
  onComplete: () => void;
  gemCount?: number;
}

export const GemRain: React.FC<GemRainProps> = ({ onComplete, gemCount = 20 }) => {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; delay: number }>>([]);

  useEffect(() => {
    // Generate particles
    const newParticles = Array.from({ length: Math.min(gemCount, 30) }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.5,
    }));
    setParticles(newParticles);

    // Complete after animation
    const timer = setTimeout(() => {
      onComplete();
    }, 2000);

    return () => clearTimeout(timer);
  }, [gemCount, onComplete]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[10000] overflow-hidden">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute top-0"
          style={{
            left: `${particle.x}%`,
          }}
          initial={{ y: -50, opacity: 0, scale: 0 }}
          animate={{
            y: window.innerHeight + 100,
            opacity: [0, 1, 1, 0],
            scale: [0, 1.2, 1, 0.8],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 1.5,
            delay: particle.delay,
            ease: 'easeIn',
          }}
        >
          {/* Gem Icon SVG */}
          <svg
            width="32"
            height="32"
            viewBox="0 0 100 100"
            className="drop-shadow-lg"
          >
            <defs>
              <linearGradient id={`gemGrad${particle.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ec4899" stopOpacity="1" />
                <stop offset="50%" stopColor="#f472b6" stopOpacity="1" />
                <stop offset="100%" stopColor="#db2777" stopOpacity="1" />
              </linearGradient>
              <filter id={`gemGlow${particle.id}`}>
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            {/* Faceted gem shape */}
            <path
              d="M50 20 L70 35 L70 65 L50 80 L30 65 L30 35 Z"
              fill={`url(#gemGrad${particle.id})`}
              filter={`url(#gemGlow${particle.id})`}
              stroke="#ec4899"
              strokeWidth="2"
            />
            {/* Highlight */}
            <path
              d="M50 25 L60 35 L50 45 L40 35 Z"
              fill="rgba(255,255,255,0.4)"
            />
          </svg>
        </motion.div>
      ))}
    </div>
  );
};
