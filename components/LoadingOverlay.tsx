import React from 'react';

interface LoadingOverlayProps {
  message?: string;
  variant?: 'fullscreen' | 'overlay';
  className?: string;
}

export function LoadingOverlay({ 
  message = 'Loading...', 
  variant = 'overlay',
  className = ''
}: LoadingOverlayProps) {
  const containerClasses = variant === 'fullscreen' 
    ? 'min-h-[100dvh] w-full bg-[#0a0a0a] relative overflow-visible flex flex-col items-center justify-center p-4'
    : 'fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-50';

  return (
    <div className={`${containerClasses} ${className}`}>
      {/* Background Depth Layers */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,_var(--tw-gradient-stops))] from-yellow-600/20 via-[#0a0a0a] to-black pointer-events-none"></div>
      
      {/* Subtle Scanning Grid lines */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      
      {/* Animated Scanning Beam */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="w-full h-[30vh] bg-gradient-to-b from-transparent via-yellow-500/10 to-transparent -translate-y-full animate-[scan_4s_ease-in-out_infinite]"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center max-w-md w-full">
        {/* Sophisticated Loader & Status Block */}
        <div className="w-full flex flex-col items-center space-y-6">
          
          {/* Orbital Loader Assembly */}
          <div className="relative w-16 h-16">
            {/* Background Rings */}
            <div className="absolute inset-0 border border-white/5 rounded-full"></div>
            <div className="absolute inset-3 border border-white/5 rounded-full opacity-50"></div>
            
            {/* Primary Spinning Orbit */}
            <div className="absolute inset-0 border-t-2 border-r-2 border-yellow-500/80 rounded-full animate-spin shadow-[0_0_15px_rgba(234,179,8,0.3)]"></div>
            
            {/* Counter-Spinning Inner Orbit */}
            <div className="absolute inset-3 border-b-2 border-l-2 border-yellow-500/60 rounded-full animate-[spin_1.5s_linear_infinite_reverse]"></div>
            
            {/* Central Power Core */}
            <div className="absolute inset-[35%] bg-yellow-400 rounded-full animate-pulse shadow-[0_0_20px_rgba(234,179,8,0.8)]"></div>
          </div>

          {/* Text and Progress Information */}
          <div className="text-center w-full max-w-[280px] space-y-4">
            <div className="h-5 flex items-center justify-center">
              <p className="text-sm font-bold uppercase tracking-wider text-yellow-400/90 animate-pulse">
                {message}
              </p>
            </div>
            
            {/* Professional Shimmer Progress Bar */}
            <div className="relative w-full h-[1px] bg-white/10 rounded-full overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-500 to-transparent w-[40%] animate-[progressSlide_2s_infinite_ease-in-out]"></div>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(300%); }
        }
        @keyframes progressSlide {
          0% { left: -40%; }
          100% { left: 100%; }
        }
      `}} />
    </div>
  );
}
