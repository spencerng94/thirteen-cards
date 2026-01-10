import React from 'react';
import { UserProfile } from '../types';
import { CurrencyIcon } from './Store';

interface GuestBannerProps {
  profile: UserProfile | null;
  onLinkAccount: () => void;
}

export const GuestBanner: React.FC<GuestBannerProps> = ({ profile, onLinkAccount }) => {
  if (!profile) return null;

  const gemCount = profile.gems || 0;
  const xp = profile.xp || 0;
  const coins = profile.coins || 0;

  return (
    <div className="relative w-full mb-4 sm:mb-6">
      {/* Amber warning banner with dark/gold theme */}
      <div className="relative bg-gradient-to-br from-amber-900/40 via-amber-800/30 to-amber-900/40 backdrop-blur-xl border-2 border-amber-500/40 rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(217,119,6,0.3)]">
        {/* Animated background glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/10 to-amber-500/0 animate-[shimmer_3s_infinite_linear]"></div>
        
        {/* Inner glow effect */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(217,119,6,0.15)_0%,transparent_70%)]"></div>
        
        <div className="relative z-10 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Left side - Guest Mode label and stats */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                <h3 className="text-sm sm:text-base font-black text-amber-300 uppercase tracking-wider">
                  Guest Mode
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-amber-200/80 mb-3 sm:mb-0">
                Your progress is saved locally. Link your account to sync across devices.
              </p>
              
              {/* Stats row */}
              <div className="flex items-center gap-4 sm:gap-6 mt-3 sm:mt-2">
                {gemCount > 0 && (
                  <div className="flex items-center gap-1.5">
                    <CurrencyIcon type="GEMS" size="xs" />
                    <span className="text-xs sm:text-sm font-bold text-amber-200">{gemCount}</span>
                  </div>
                )}
                {xp > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs sm:text-sm">⭐</span>
                    <span className="text-xs sm:text-sm font-bold text-amber-200">{xp} XP</span>
                  </div>
                )}
                {coins > 0 && (
                  <div className="flex items-center gap-1.5">
                    <CurrencyIcon type="GOLD" size="xs" />
                    <span className="text-xs sm:text-sm font-bold text-amber-200">{coins}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right side - Link Account button with bonus badge */}
            <div className="flex flex-col items-end gap-2">
              {/* Bonus Badge */}
              <div className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-yellow-500/20 via-yellow-400/30 to-yellow-500/20 border border-yellow-400/50 rounded-full backdrop-blur-sm">
                <CurrencyIcon type="GEMS" size="xs" />
                <span className="text-xs font-black text-yellow-300 uppercase tracking-wide">
                  +50 Gem Bonus
                </span>
              </div>
              
              {/* Link Account button with pulsing gold glow */}
              <button
                onClick={onLinkAccount}
                className="group relative px-5 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-br from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:via-amber-400 hover:to-amber-500 border-2 border-amber-400/50 rounded-xl sm:rounded-2xl text-black font-black text-xs sm:text-sm uppercase tracking-wider transition-all duration-300 hover:scale-105 hover:border-amber-300/70 active:scale-95 shadow-[0_8px_30px_rgba(217,119,6,0.4)] hover:shadow-[0_12px_40px_rgba(217,119,6,0.6)] animate-pulse-gold"
              >
                {/* Pulsing gold glow effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-400 rounded-xl sm:rounded-2xl opacity-75 blur-sm animate-pulse-glow"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                <span className="relative z-10 flex items-center gap-2">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Link Account
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes pulse-gold {
          0%, 100% {
            box-shadow: 0 8px 30px rgba(217, 119, 6, 0.4), 0 0 0 0 rgba(251, 191, 36, 0.7);
          }
          50% {
            box-shadow: 0 8px 30px rgba(217, 119, 6, 0.6), 0 0 20px 10px rgba(251, 191, 36, 0.4);
          }
        }
        @keyframes pulse-glow {
          0%, 100% {
            opacity: 0.5;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.05);
          }
        }
        .animate-pulse-gold {
          animation: pulse-gold 2s ease-in-out infinite;
        }
        .animate-pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};
