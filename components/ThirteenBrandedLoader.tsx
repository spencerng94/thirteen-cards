import React from 'react';
import { BrandLogo } from './BrandLogo';

interface ThirteenBrandedLoaderProps {
  message?: string;
  variant?: 'centered' | 'overlay';
  className?: string;
}

export const ThirteenBrandedLoader: React.FC<ThirteenBrandedLoaderProps> = ({
  message = 'Shuffling the deck...',
  variant = 'centered',
  className = ''
}) => {
  const containerClasses = variant === 'centered'
    ? 'min-h-screen w-full relative overflow-hidden flex flex-col items-center justify-center p-4'
    : 'fixed inset-0 bg-black/60 backdrop-blur-sm relative overflow-hidden flex flex-col items-center justify-center p-4 z-50';

  // Messages with Imperial Noir theme
  const messages = [
    'Shuffling the deck...',
    'Polishing the Emerald Felt...',
    'Dealing the cards...',
    'Setting the table...',
    'Preparing for battle...',
  ];

  const displayMessage = message || messages[0];

  return (
    <div className={`${containerClasses} ${className}`}>
      {/* Emerald Felt Background - Static during loading */}
      <div 
        className="absolute inset-0 bg-[#0a3d23]"
        style={{
          transform: 'translateZ(0)',
          willChange: 'auto',
        }}
      >
        {/* Subtle felt texture */}
        <div 
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{ 
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            transform: 'translateZ(0)',
          }}
        />
      </div>

      {/* Content Container */}
      <div 
        className="relative z-10 flex flex-col items-center max-w-md w-full"
        style={{
          transform: 'translateZ(0)',
          willChange: 'opacity',
        }}
      >
        {/* Logo with Shimmer Effect */}
        <div className="relative mb-8 group">
          {/* Pulsating glow backdrop */}
          <div 
            className="absolute inset-0 bg-amber-500/10 blur-[80px] rounded-full animate-pulse scale-110"
            style={{
              transform: 'translateZ(0)',
              willChange: 'opacity, transform',
            }}
          />
          
          {/* Logo Container with Shimmer */}
          <div 
            className="relative transition-transform duration-1000 group-hover:scale-105"
            style={{
              transform: 'translateZ(0)',
              willChange: 'transform',
            }}
          >
            {/* Shimmer overlay - sweeps across the logo */}
            <div 
              className="absolute inset-0 overflow-hidden rounded-full"
              style={{
                transform: 'translateZ(0)',
                willChange: 'transform',
                maskImage: 'radial-gradient(circle, black 40%, transparent 70%)',
                WebkitMaskImage: 'radial-gradient(circle, black 40%, transparent 70%)',
              }}
            >
              <div 
                className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/40 to-transparent -translate-x-full animate-[goldShimmer_3s_ease-in-out_infinite]"
                style={{
                  transform: 'translateZ(0)',
                  width: '200%',
                  height: '100%',
                }}
              />
            </div>

            {/* Brand Logo */}
            <div 
              style={{
                transform: 'translateZ(0)',
                willChange: 'auto',
              }}
            >
              <BrandLogo size="xl" className="animate-[float_6s_ease-in-out_infinite]" />
            </div>
          </div>
        </div>

        {/* Message Text */}
        <div 
          className="text-center w-full max-w-[280px] space-y-4"
          style={{
            transform: 'translateZ(0)',
            willChange: 'opacity',
          }}
        >
          <div className="h-5 flex items-center justify-center">
            <p 
              className="text-sm font-bold uppercase tracking-wider text-amber-400/90 animate-pulse"
              style={{
                textShadow: '0 0 10px rgba(251, 191, 36, 0.5)',
                transform: 'translateZ(0)',
                willChange: 'opacity',
              }}
            >
              {displayMessage}
            </p>
          </div>

          {/* Refined Progress Bar */}
          <div 
            className="relative w-full h-[1px] bg-white/10 rounded-full overflow-hidden"
            style={{
              transform: 'translateZ(0)',
              willChange: 'auto',
            }}
          >
            <div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500 to-transparent w-[40%] animate-[progressSlide_2s_infinite_ease-in-out]"
              style={{
                transform: 'translateZ(0)',
                willChange: 'transform',
              }}
            />
          </div>
        </div>
      </div>

      {/* GPU-accelerated animations */}
      <style>{`
        @keyframes goldShimmer {
          0% {
            transform: translateX(-100%) translateZ(0);
          }
          50% {
            transform: translateX(0%) translateZ(0);
          }
          100% {
            transform: translateX(100%) translateZ(0);
          }
        }

        @keyframes progressSlide {
          0% {
            left: -40%;
            transform: translateZ(0);
          }
          100% {
            left: 100%;
            transform: translateZ(0);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px) translateZ(0);
          }
          50% {
            transform: translateY(-10px) translateZ(0);
          }
        }

        /* Ensure GPU acceleration */
        * {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
      `}</style>
    </div>
  );
};
