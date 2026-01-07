import React from 'react';
import { BrandLogo } from './BrandLogo';

type LoadingScreenProps = {
  status: string;
  showGuestButton?: boolean;
  onEnterGuest: () => void;
};

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ status, showGuestButton = false, onEnterGuest }) => {
  return (
    <div
      className="min-h-screen h-screen w-full bg-neutral-950 text-white font-sans relative overflow-hidden"
      aria-busy="true"
      aria-live="polite"
    >
      {/* Background accents */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 w-[40rem] h-[40rem] rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-[40rem] h-[40rem] rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.04),transparent_60%)]" />
      </div>

      <div className="relative z-10 h-full flex flex-col items-center justify-center gap-10 px-6">
        {/* Branding */}
        <div className="flex flex-col items-center gap-6">
          <BrandLogo size="lg" className="drop-shadow-[0_0_24px_rgba(251,191,36,0.15)]" />
          <div className="h-px w-48 bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
        </div>

        {/* Spinner + Status */}
        <div className="flex flex-col items-center gap-6">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-2 border-neutral-800" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-amber-400 border-r-amber-300 animate-spin" />
            <div className="absolute inset-3 rounded-full bg-neutral-900/60 backdrop-blur-sm" />
          </div>

          <div className="text-center">
            <p className="text-amber-300/90 text-sm sm:text-base tracking-wide animate-pulse">
              {status}
            </p>
            <div className="mt-3 h-1 w-40 rounded-full overflow-hidden bg-neutral-800">
              <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 animate-[progress_1.6s_ease-in-out_infinite]" />
            </div>
          </div>
        </div>

        {/* Fail-safe CTA */}
        {showGuestButton && (
          <button
            type="button"
            onClick={onEnterGuest}
            className="mt-2 inline-flex items-center gap-2 rounded-md border border-amber-500/20 bg-neutral-900/40 px-4 py-2 text-xs sm:text-sm text-amber-200 hover:border-amber-400/40 hover:bg-neutral-900/70 hover:text-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40 transition"
            aria-label="Enter as Guest"
          >
            <span className="inline-block h-1.5 w-1.5 rounded-[2px] rotate-45 bg-amber-400/80" />
            Taking too long? Enter as Guest
          </button>
        )}
      </div>

      {/* Keyframes (scoped via inline style tag to avoid global CSS changes) */}
      <style>
        {`
          @keyframes progress {
            0% { transform: translateX(-120%); }
            50% { transform: translateX(15%); }
            100% { transform: translateX(120%); }
          }
          .animate-[progress_1.6s_ease-in-out_infinite] {
            animation: progress 1.6s ease-in-out infinite;
          }
        `}
      </style>
    </div>
  );
};

