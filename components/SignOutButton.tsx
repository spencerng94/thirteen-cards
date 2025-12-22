
import React from 'react';

interface SignOutButtonProps {
  onSignOut: () => void;
  className?: string;
}

export const SignOutButton: React.FC<SignOutButtonProps> = ({ onSignOut, className = '' }) => {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onSignOut();
      }}
      className={`group flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/30 transition-all duration-300 active:scale-95 ${className}`}
      title="Sign Out"
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="16" 
        height="16" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2.5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className="text-gray-500 group-hover:text-red-400 transition-colors"
      >
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 group-hover:text-red-400 transition-colors">
        Sign Out
      </span>
    </button>
  );
};
