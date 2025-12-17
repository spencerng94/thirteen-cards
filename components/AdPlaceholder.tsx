import React from 'react';

export const AdPlaceholder: React.FC = () => {
  return (
    <div className="w-full h-24 relative overflow-hidden rounded-2xl bg-black/40 border border-white/5 flex flex-col items-center justify-center group shadow-inner">
       {/* Cyberpunk Grid Background Effect */}
       <div className="absolute inset-0 opacity-10 pointer-events-none"
            style={{ 
              backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)', 
              backgroundSize: '24px 24px' 
            }}>
       </div>
       
       <div className="z-10 flex flex-col items-center relative">
         <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></span>
            <span className="text-[9px] text-cyan-500 font-bold tracking-[0.3em] uppercase drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]">
                Sponsored
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></span>
         </div>
         <span className="text-gray-500 text-xs font-mono tracking-widest group-hover:text-gray-300 transition-colors duration-300">
            ADVERTISEMENT SPACE
         </span>
       </div>
       
       {/* Shimmer Effect */}
       <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none"></div>
    </div>
  );
};