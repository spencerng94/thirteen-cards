import React, { useState } from 'react';
import { parseUsername } from '../utils/username';

interface CopyUsernameProps {
  username: string;
  className?: string;
  showCopyButton?: boolean;
}

export const CopyUsername: React.FC<CopyUsernameProps> = ({ 
  username, 
  className = '',
  showCopyButton = true 
}) => {
  const [copied, setCopied] = useState(false);
  const parsed = parseUsername(username);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(parsed.full);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy username:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = parsed.full;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (fallbackErr) {
        console.error('Fallback copy failed:', fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-white">
        <span className="font-semibold">{parsed.displayName}</span>
        <span className="opacity-60">#{parsed.discriminator}</span>
      </span>
      {showCopyButton && (
        <button
          onClick={handleCopy}
          className="relative w-6 h-6 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 transition-all duration-200 group"
          title={copied ? 'Copied!' : 'Copy username'}
        >
          {copied ? (
            <svg 
              className="w-4 h-4 text-green-400" 
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
              className="w-4 h-4 text-white/70 group-hover:text-white transition-colors" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" 
              />
            </svg>
          )}
          {copied && (
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-green-500 text-white text-xs font-semibold rounded whitespace-nowrap pointer-events-none animate-in fade-in slide-in-from-bottom-2">
              Copied!
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-green-500 rotate-45 -mb-1"></div>
            </div>
          )}
        </button>
      )}
    </div>
  );
};
