import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ToastProps {
  message: string;
  onClose: () => void;
  type?: 'error' | 'success' | 'info';
}

export const Toast: React.FC<ToastProps> = ({ message, onClose, type = 'error' }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    setVisible(true);
    // Auto-close after 3 seconds
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300); // Wait for fade-out animation
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'error' 
    ? 'from-red-500/95 via-red-600/95 to-red-700/95 border-red-400/50'
    : type === 'success'
    ? 'from-emerald-500/95 via-emerald-600/95 to-emerald-700/95 border-emerald-400/50'
    : 'from-blue-500/95 via-blue-600/95 to-blue-700/95 border-blue-400/50';

  const shadowColor = type === 'error'
    ? 'rgba(239, 68, 68, 0.4)'
    : type === 'success'
    ? 'rgba(16, 185, 129, 0.4)'
    : 'rgba(59, 130, 246, 0.4)';

  const content = (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[500] pointer-events-none">
      <div 
        className={`bg-gradient-to-br ${bgColor} backdrop-blur-xl border-2 rounded-2xl px-6 py-4 shadow-[0_20px_60px_${shadowColor}] transition-all duration-500 ${
          visible 
            ? 'opacity-100 translate-y-0 scale-100' 
            : 'opacity-0 -translate-y-4 scale-95'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            {type === 'error' ? (
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
                  d="M6 18L18 6M6 6l12 12" 
                />
              </svg>
            ) : type === 'success' ? (
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
            ) : (
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
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
            )}
          </div>
          <span className="text-sm font-bold text-white">{message}</span>
        </div>
      </div>
    </div>
  );

  return typeof window !== 'undefined' 
    ? createPortal(content, document.body)
    : content;
};
