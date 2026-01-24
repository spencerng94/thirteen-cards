import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LoadingOverlayProps {
  isVisible: boolean;
  status?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isVisible, status = 'Initializing...' }) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ pointerEvents: isVisible ? 'auto' : 'none' }}
        >
          {/* Background with gradient and blur */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a2a1a] via-[#064e3b] to-[#051a10] backdrop-blur-md" />
          
          {/* Subtle grid pattern overlay */}
          <div 
            className="absolute inset-0 opacity-[0.03] pointer-events-none" 
            style={{ 
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', 
              backgroundSize: '40px 40px' 
            }} 
          />
          
          {/* Radial gradient overlay for depth */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)] pointer-events-none" />
          
          {/* Content */}
          <div className="relative z-10 flex flex-col items-center justify-center gap-6 px-6">
            {/* Spinner */}
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-2 border-emerald-900/30" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-emerald-400 border-r-emerald-300 animate-spin" style={{ animationDuration: '1s' }} />
              <div className="absolute inset-3 rounded-full bg-emerald-950/40 backdrop-blur-sm" />
              {/* Inner glow */}
              <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-pulse" />
            </div>
            
            {/* Text with loading dots animation */}
            <div className="text-center">
              <motion.p
                key={status}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-white font-serif text-sm sm:text-base tracking-wide"
                style={{ fontFamily: "'Cinzel', serif" }}
              >
                {status}
                <span className="inline-block ml-1">
                  <motion.span
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
                    className="inline-block"
                  >
                    .
                  </motion.span>
                  <motion.span
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                    className="inline-block"
                  >
                    .
                  </motion.span>
                  <motion.span
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                    className="inline-block"
                  >
                    .
                  </motion.span>
                </span>
              </motion.p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
