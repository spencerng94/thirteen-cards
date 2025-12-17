import React from 'react';

export const AdPlaceholder: React.FC = () => {
  return (
    <div className="w-full h-24 bg-gray-800/40 border-2 border-dashed border-gray-700/50 rounded-xl flex flex-col items-center justify-center overflow-hidden relative group">
       <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite]"></div>
       <span className="text-gray-600 font-bold uppercase tracking-[0.2em] text-[10px] mb-1">Advertisement</span>
       <span className="text-gray-700 text-xs">Ad Space Available</span>
    </div>
  );
};