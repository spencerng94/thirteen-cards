import React from 'react';
import { BrandLogo } from './BrandLogo';

export const GameEndTransition: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center overflow-hidden pointer-events-none">
      {/* Heavy Backdrop Blur and Gradient Veil */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-3xl animate-[veilIn_0.8s_ease-out_forwards]"></div>
      
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl aspect-square bg-yellow-500/5 blur-[150px] animate-pulse"></div>

      {/* Main Content Assembly */}
      <div className="relative z-10 flex flex-col items-center gap-8 text-center">
        {/* Logo Reveal */}
        <div className="animate-[logoEntrance_2.5s_cubic-bezier(0.2,0,0.2,1)_forwards]">
          <BrandLogo size="xl" />
        </div>

        {/* Cinematic Text Overlay */}
        <div className="relative mt-4 px-12 py-4">
            {/* Horizontal Light Ray Sweep */}
            <div className="absolute top-1/2 left-1/2 -translate-y-1/2 w-[200%] h-[1px] bg-gradient-to-r from-transparent via-yellow-400 to-transparent -translate-x-full animate-[raySweep_2s_ease-in-out_forwards]"></div>
            
            <h2 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-white/80 to-white/40 uppercase italic tracking-[0.4em] animate-[textExpand_2.5s_cubic-bezier(0.2,0,0.2,1)_forwards] drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                Match Concluded
            </h2>
            
            <div className="flex items-center justify-center gap-4 mt-6 opacity-0 animate-[fadeIn_0.5s_ease-out_1.2s_forwards]">
                <div className="w-12 h-[1px] bg-gradient-to-r from-transparent to-yellow-500/50"></div>
                <span className="text-[10px] font-black uppercase tracking-[0.8em] text-yellow-500/80">Compiling Results</span>
                <div className="w-12 h-[1px] bg-gradient-to-l from-transparent to-yellow-500/50"></div>
            </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes veilIn {
          0% { opacity: 0; backdrop-filter: blur(0px); }
          100% { opacity: 1; backdrop-filter: blur(24px); }
        }
        @keyframes logoEntrance {
          0% { opacity: 0; transform: scale(0.8) translateY(20px); filter: blur(10px); }
          20% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0px); }
          100% { transform: scale(1.1); }
        }
        @keyframes textExpand {
          0% { opacity: 0; letter-spacing: -0.2em; filter: blur(10px); }
          30% { opacity: 1; filter: blur(0px); }
          100% { letter-spacing: 0.4em; }
        }
        @keyframes raySweep {
          0% { transform: translate(-150%, -50%); opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translate(50%, -50%); opacity: 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </div>
  );
};
