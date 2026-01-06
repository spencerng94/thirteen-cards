import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { ITEM_REGISTRY, RegistryItem } from '../constants/ItemRegistry';
import { activateBooster } from '../services/supabase';
import { audioService } from '../services/audio';

interface InventoryGridProps {
  profile: UserProfile;
  onRefresh: () => void;
}

/* Premium Item Icon components - Final Boss Style */
const XpBoosterIcon = () => (
  <svg viewBox="0 0 100 100" className="w-14 h-14 drop-shadow-[0_0_20px_rgba(59,130,246,0.6)]">
    <defs>
      <linearGradient id="xpGradInv" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#60a5fa" />
        <stop offset="50%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#1e40af" />
      </linearGradient>
      <filter id="xpGlow">
        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <path d="M50 5 L90 25 V75 L50 95 L10 75 V25 Z" fill="url(#xpGradInv)" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" opacity="0.95" filter="url(#xpGlow)" />
    <path d="M30 40 L50 20 L70 40 M30 65 L50 45 L70 65" stroke="white" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
  </svg>
);

const GoldBoosterIcon = () => (
  <svg viewBox="0 0 100 100" className="w-14 h-14 drop-shadow-[0_0_20px_rgba(250,204,21,0.6)]">
    <defs>
      <linearGradient id="goldBoostGradInv" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fde047" />
        <stop offset="50%" stopColor="#facc15" />
        <stop offset="100%" stopColor="#ca8a04" />
      </linearGradient>
      <filter id="goldGlow">
        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <path d="M50 5 L90 25 V75 L50 95 L10 75 V25 Z" fill="url(#goldBoostGradInv)" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" opacity="0.95" filter="url(#goldGlow)" />
    <text x="50" y="65" textAnchor="middle" fontSize="38" fontWeight="900" fill="white" opacity="0.95">$</text>
  </svg>
);

const VoucherIcon = () => (
  <svg viewBox="0 0 100 100" className="w-14 h-14 drop-shadow-[0_0_20px_rgba(16,185,129,0.6)]">
    <defs>
      <linearGradient id="voucherGradInv" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#34d399" />
        <stop offset="50%" stopColor="#10b981" />
        <stop offset="100%" stopColor="#047857" />
      </linearGradient>
      <filter id="voucherGlow">
        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <rect x="10" y="25" width="80" height="50" rx="5" fill="url(#voucherGradInv)" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" opacity="0.95" filter="url(#voucherGlow)" />
    <circle cx="10" cy="50" r="7" fill="black" opacity="0.3" />
    <circle cx="90" cy="50" r="7" fill="black" opacity="0.3" />
    <text x="75" y="60" textAnchor="middle" fontSize="20" fontWeight="900" fill="white" opacity="0.9">%</text>
  </svg>
);

const BoosterTimer: React.FC<{ expiration: number, type: string }> = ({ expiration, type }) => {
  // Check if this is a game-based booster (negative value = games remaining)
  const isGameBased = expiration < 0;
  const gamesRemaining = isGameBased ? Math.abs(expiration) : 0;
  
  const [timeLeft, setTimeLeft] = useState(isGameBased ? 0 : Math.max(0, expiration - Date.now()));

  useEffect(() => {
    if (isGameBased) {
      // Game-based boosters don't need a timer
      return;
    }
    
    // Time-based booster - update timer every second
    const interval = setInterval(() => {
      const remaining = expiration - Date.now();
      if (remaining <= 0) {
        clearInterval(interval);
        setTimeLeft(0);
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiration, isGameBased]);

  // Don't show if expired
  if (isGameBased && gamesRemaining <= 0) return null;
  if (!isGameBased && timeLeft <= 0) return null;

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500/20 via-emerald-600/15 to-emerald-700/20 backdrop-blur-sm border border-emerald-400/30 px-4 py-2 rounded-full flex items-center gap-2.5 shadow-[0_0_20px_rgba(16,185,129,0.3)] group">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
      <div className="relative w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.8)] animate-pulse"></div>
      <span className="relative text-[10px] font-bold text-white/90 uppercase tracking-wide font-mono drop-shadow-md">
        {isGameBased 
          ? `${type}: ${gamesRemaining} game${gamesRemaining !== 1 ? 's' : ''}`
          : `${type}: ${minutes}:${seconds.toString().padStart(2, '0')}`
        }
      </span>
    </div>
  );
};

export const InventoryGrid: React.FC<InventoryGridProps> = ({ profile, onRefresh }) => {
  const [activating, setActivating] = useState<string | null>(null);
  const inventory = profile.inventory || { items: {}, active_boosters: {} };
  const items = (Object.entries(inventory.items) as [string, number][]).filter(([_, qty]) => qty > 0);
  const activeBoosters = (Object.entries(inventory.active_boosters) as [string, number][]).filter(([_, exp]) => {
    if (exp < 0) return true; // Game-based booster (negative = games remaining, show if any games left)
    return exp > Date.now(); // Time-based booster (positive = expiration timestamp)
  });

  const handleActivate = async (itemId: string) => {
    setActivating(itemId);
    try {
      await activateBooster(profile.id, itemId);
      audioService.playPurchase();
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setActivating(null);
    }
  };

  const getItemIcon = (id: string, type: string) => {
    if (id.includes('XP')) return <XpBoosterIcon />;
    if (id.includes('GOLD')) return <GoldBoosterIcon />;
    if (type === 'VOUCHER' || id.includes('OFF')) return <VoucherIcon />;
    return <span className="text-3xl drop-shadow-lg">🎁</span>;
  };

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Active Boosters - Premium Display */}
      {activeBoosters.length > 0 && (
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-950/30 via-emerald-900/20 to-emerald-950/30 backdrop-blur-md border border-emerald-500/20 rounded-3xl p-5 shadow-[0_0_40px_rgba(16,185,129,0.15)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.1),transparent_70%)]"></div>
          <div className="relative flex flex-wrap gap-3">
            <div className="flex items-center gap-2 mb-2 w-full">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></div>
              <span className="text-[11px] font-bold text-emerald-300/90 uppercase tracking-wider">Active Boosters</span>
            </div>
            {activeBoosters.map(([type, exp]) => (
              <BoosterTimer key={type} type={type} expiration={exp} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State - Premium */}
      {items.length === 0 ? (
        <div className="relative flex flex-col items-center justify-center py-16 sm:py-20 opacity-30 select-none border-2 border-dashed border-white/10 rounded-3xl bg-gradient-to-br from-white/[0.02] to-transparent backdrop-blur-sm overflow-hidden group">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.05),transparent_70%)]"></div>
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-3xl border border-white/10 flex items-center justify-center mb-5 bg-gradient-to-br from-white/[0.05] to-transparent backdrop-blur-sm shadow-lg group-hover:scale-110 transition-transform duration-500">
            <span className="text-3xl sm:text-4xl italic font-serif text-white/40">!</span>
          </div>
          <p className="relative text-[10px] sm:text-[11px] font-semibold text-white/50 text-center max-w-xs leading-relaxed px-6">
            Your inventory is currently empty.<br />
            Acquire items via Level Rewards or Events.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.map(([id, qty], idx) => {
            const item = ITEM_REGISTRY[id];
            if (!item) return null;

            const isBooster = item.type === 'BOOSTER';
            const isVoucher = item.type === 'VOUCHER';

            return (
              <div 
                key={id} 
                className="group relative overflow-hidden bg-gradient-to-br from-white/[0.03] via-white/[0.02] to-white/[0.01] backdrop-blur-md border border-white/10 rounded-3xl p-5 sm:p-6 transition-all duration-500 hover:border-white/20 hover:bg-white/[0.05] hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:scale-[1.02] active:scale-[0.98]"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                {/* Dramatic Background Effects */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.05),transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/[0.02] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>

                {/* Content */}
                <div className="relative z-10">
                  {/* Header with Icon and Quantity */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-br from-black/40 to-black/60 border border-white/10 flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.5)] group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 group-hover:shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                      {getItemIcon(id, item.type)}
                    </div>
                    <div className="relative bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 text-black px-3 py-1.5 rounded-full text-[11px] font-black tracking-tight shadow-[0_0_15px_rgba(250,204,21,0.5)] border border-yellow-300/30">
                      <span className="relative z-10">×{qty}</span>
                      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-full"></div>
                    </div>
                  </div>

                  {/* Item Info */}
                  <div className="space-y-1.5 mb-5">
                    <h4 className="text-sm sm:text-base font-bold text-white/95 uppercase tracking-wide drop-shadow-md">{item.name}</h4>
                    <p className="text-[10px] sm:text-[11px] text-white/50 leading-relaxed font-medium">{item.description}</p>
                  </div>

                  {/* Action Button */}
                  {isBooster && (
                    <button
                      onClick={() => handleActivate(id)}
                      disabled={activating === id}
                      className="relative w-full overflow-hidden py-3.5 bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 hover:from-emerald-400 hover:via-emerald-500 hover:to-emerald-600 text-white rounded-2xl text-[11px] font-bold uppercase tracking-wide transition-all duration-300 active:scale-95 shadow-[0_0_25px_rgba(16,185,129,0.4)] hover:shadow-[0_0_35px_rgba(16,185,129,0.6)] disabled:opacity-50 disabled:cursor-not-allowed group/btn"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000"></div>
                      <span className="relative z-10 drop-shadow-md">
                        {activating === id ? 'Activating...' : 'Activate'}
                      </span>
                    </button>
                  )}

                  {isVoucher && (
                    <div className="relative w-full overflow-hidden py-3.5 bg-gradient-to-br from-white/5 via-white/[0.03] to-white/5 border border-white/10 rounded-2xl text-white/40 text-[10px] font-semibold uppercase tracking-wide text-center backdrop-blur-sm">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
                      <span className="relative z-10">Auto-Applied in Store</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};