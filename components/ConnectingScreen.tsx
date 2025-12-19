import React, { useState, useEffect } from 'react';
import { BrandLogo } from './BrandLogo';

interface ConnectingScreenProps {
  onCancel?: () => void;
}

export const ConnectingScreen: React.FC<ConnectingScreenProps> = ({ onCancel }) => {
  const [statusIndex, setStatusIndex] = useState(0);
  const statuses = [
    "Establishing Secure Connection",
    "Initializing Game Engine",
    "Synchronizing With Arena",
    "Authenticating Player Credentials",
    "Preparing the Deck"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % statuses.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [statuses.length]);

  return (
    <div className="min-h-screen w-full bg-[#051109] relative overflow-hidden flex flex-col items-center justify-center p-4">
      {/* Background Depth Layers */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,_var(--tw-gradient-stops))] from-green-600/20 via-[#051109] to-black pointer-events-none"></div>
      
      {/* Subtle Scanning Grid lines */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      
      {/* Animated Scanning Beam */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="w-full h-[30vh] bg-gradient-to-b from-transparent via-green-500/5 to-transparent -translate-y-full animate-[scan_4s_ease-in-out_infinite]"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center max-w-md w-full">
        {/* Pulsating Logo Hero - Reduced mb-16 to mb-8 */}
        <div className="mb-8 relative group">
          <div className="absolute inset-0 bg-yellow-500/10 blur-[80px] rounded-full animate-pulse scale-110"></div>
          <div className="relative transition-transform duration-1000 group-hover:scale-105">
            <BrandLogo size="xl" className="animate-[float_6s_ease-in-out_infinite]" />
          </div>
        </div>

        {/* Sophisticated Loader & Status Block - Reduced space-y-10 to space-y-5 */}
        <div className="w-full flex flex-col items-center space-y-5">
          
          {/* Orbital Loader Assembly */}
          <div className="relative w-20 h-20">
            {/* Background Rings */}
            <div className="absolute inset-0 border border-white/5 rounded-full"></div>
            <div className="absolute inset-4 border border-white/5 rounded-full opacity-50"></div>
            
            {/* Primary Spinning Orbit */}
            <div className="absolute inset-0 border-t-2 border-r-2 border-yellow-500/80 rounded-full animate-spin shadow-[0_0_15px_rgba(234,179,8,0.3)]"></div>
            
            {/* Counter-Spinning Inner Orbit */}
            <div className="absolute inset-4 border-b-2 border-l-2 border-green-500/60 rounded-full animate-[spin_1.5s_linear_infinite_reverse]"></div>
            
            {/* Central Power Core */}
            <div className="absolute inset-[40%] bg-yellow-400 rounded-full animate-pulse shadow-[0_0_20px_rgba(234,179,8,0.8)]"></div>
          </div>

          {/* Text and Progress Information */}
          <div className="text-center w-full max-w-[280px] space-y-4">
            <div className="h-4 flex items-center justify-center">
               <p key={statusIndex} className="text-[10px] font-black uppercase tracking-[0.5em] text-yellow-500/90 animate-[statusFade_0.5s_ease-out_forwards]">
                {statuses[statusIndex]}
              </p>
            </div>
            
            {/* Professional Shimmer Progress Bar */}
            <div className="relative w-full h-[1px] bg-white/10 rounded-full overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-500 to-transparent w-[40%] animate-[progressSlide_2s_infinite_ease-in-out]"></div>
            </div>

            <div className="flex justify-between items-center px-1">
               <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Encrypting</span>
               <div className="flex gap-1">
                  <div className="w-1 h-1 rounded-full bg-green-500/40 animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1 h-1 rounded-full bg-green-500/40 animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1 h-1 rounded-full bg-green-500/40 animate-bounce"></div>
               </div>
               <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">v1.0.4</span>
            </div>

            {/* Cancel Button */}
            {onCancel && (
              <div className="pt-2">
                <button 
                  onClick={onCancel}
                  className="group flex items-center gap-2 mx-auto px-6 py-2 rounded-full border border-white/5 bg-white/[0.02] hover:bg-red-500/10 hover:border-red-500/20 transition-all duration-300 active:scale-95"
                >
                  <span className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-500 group-hover:text-red-400 transition-colors">
                    Abort Connection
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Discreet Legal/Build Footer */}
        <div className="absolute bottom-[-10vh] md:bottom-[-15vh] opacity-20 transition-opacity hover:opacity-50">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.6em]">
            Authorized Access Only
          </p>
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
        @keyframes statusFade {
          0% { opacity: 0; transform: translateY(10px); filter: blur(4px); }
          100% { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}} />
    </div>
  );
};