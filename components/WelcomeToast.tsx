import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { parseUsername } from '../utils/username';

interface WelcomeToastProps {
  username: string;
  onClose: () => void;
}

export const WelcomeToast: React.FC<WelcomeToastProps> = ({ username, onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    setVisible(true);
    // Auto-close after 4 seconds
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300); // Wait for fade-out animation
    }, 4000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const parsed = parseUsername(username);

  const content = (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[500] pointer-events-none">
      <div 
        className={`bg-gradient-to-br from-emerald-500/95 via-emerald-600/95 to-emerald-700/95 backdrop-blur-xl border-2 border-emerald-400/50 rounded-2xl px-6 py-4 shadow-[0_20px_60px_rgba(16,185,129,0.4)] transition-all duration-500 ${
          visible 
            ? 'opacity-100 translate-y-0 scale-100' 
            : 'opacity-0 -translate-y-4 scale-95'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <svg 
              className="w-6 h-6 text-white" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2.5} 
                d="M5 13l4 4L19 7" 
              />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white uppercase tracking-wide">
              Welcome, {parsed.displayName}
              <span className="opacity-60">#{parsed.discriminator}</span>
            </span>
            <span className="text-xs text-white/80 font-medium">
              Your unique ID has been generated
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof window !== 'undefined' 
    ? createPortal(content, document.body)
    : content;
};
