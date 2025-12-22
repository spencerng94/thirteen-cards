
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
      className={`group relative overflow-hidden rounded-2xl border transition-all duration-500 active:scale-95 shadow-[0_15px_30px_rgba(0,0,0,0.5)] border-red-500/30 shadow-red-950/40 ${className}`}
      title="Terminate Session"
    >
      {/* Multi-stop High-Luster Metallic Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#2d0a0a] via-[#4a0404] to-[#2d0a0a] group-hover:scale-110 transition-transform duration-1000"></div>
      
      {/* Luxury Highlight Layer */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#4a0404] via-[#7f1d1d] to-[#450a0a] opacity-90 transition-opacity duration-500 group-hover:opacity-100"></div>
      
      {/* Animated Shimmer Effect */}
      <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:250%_250%] animate-[signOutShimmer_4s_infinite] pointer-events-none opacity-30"></div>
      
      {/* Glossy Bevel Top Light */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>

      <div className="relative z-10 flex flex-col items-center justify-center px-6 py-2">
        <div className="flex items-center gap-3">
          {/* Exit Icon with animation */}
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="14" 
            height="14" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="3" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="text-red-400 group-hover:scale-110 group-hover:-translate-x-1 transition-all duration-500 drop-shadow-[0_0_8px_rgba(248,113,113,0.4)]"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          
          <div className="flex flex-col items-start leading-none">
            <span className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em] font-serif text-white drop-shadow-md">
              Sign Out
            </span>
            <span className="text-[6px] font-black opacity-40 tracking-[0.2em] uppercase font-serif mt-0.5 text-white">
              End Session
            </span>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes signOutShimmer {
          0% { background-position: -100% 0; }
          100% { background-position: 100% 0; }
        }
      `}} />
    </button>
  );
};
