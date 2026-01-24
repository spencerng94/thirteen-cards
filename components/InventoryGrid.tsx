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
    <div className="relative overflow-hidden bg-gradient-to-br from-yellow-600/30 via-yellow-500/25 to-yellow-600/30 backdrop-blur-sm border-2 border-yellow-400/40 px-5 py-2.5 rounded-full flex items-center gap-3 shadow-[0_0_25px_rgba(234,179,8,0.4)] group">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
      <div className="relative w-2.5 h-2.5 rounded-full bg-yellow-400 shadow-[0_0_12px_rgba(234,179,8,0.9)] animate-pulse"></div>
      <span className="relative text-xs font-black text-black uppercase tracking-wide font-mono drop-shadow-md">
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Section Header */}
      <div className="mb-4">
        <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider">Inventory</h2>
      </div>

      {/* Active Boosters - Premium Display with Gold Theme */}
      {activeBoosters.length > 0 && (
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-900/20 via-yellow-800/10 to-yellow-900/20 rounded-3xl blur-2xl"></div>
          
          <div className="relative bg-gradient-to-br from-yellow-950/40 via-yellow-900/30 to-yellow-950/40 backdrop-blur-xl border-2 border-yellow-500/30 rounded-3xl p-6 sm:p-8 overflow-hidden shadow-[0_0_60px_rgba(234,179,8,0.2)]">
            {/* Decorative glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-yellow-500/20 to-transparent rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-yellow-600/20 to-transparent rounded-full blur-2xl"></div>
            
            <div className="relative flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.8)] animate-pulse"></div>
                <h3 className="text-base sm:text-lg font-black text-yellow-300 uppercase tracking-wider">
                  Active Boosters
                </h3>
              </div>
              
              <div className="flex flex-wrap gap-3">
                {activeBoosters.map(([type, exp]) => (
                  <BoosterTimer key={type} type={type} expiration={exp} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State - Premium Dark Theme */}
      {items.length === 0 ? (
        <div className="relative flex flex-col items-center justify-center py-20 sm:py-24 opacity-40 select-none border-2 border-dashed border-white/10 rounded-3xl bg-gradient-to-br from-black/40 via-black/30 to-black/40 backdrop-blur-sm overflow-hidden group">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(234,179,8,0.05),transparent_70%)]"></div>
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-3xl border-2 border-white/10 flex items-center justify-center mb-6 bg-gradient-to-br from-black/60 to-black/40 backdrop-blur-sm shadow-lg group-hover:scale-110 group-hover:border-yellow-500/30 transition-all duration-500">
            <span className="text-4xl sm:text-5xl text-yellow-500/40">📦</span>
          </div>
          <p className="relative text-xs sm:text-sm font-semibold text-white/60 text-center max-w-xs leading-relaxed px-6">
            Your inventory is currently empty.<br />
            <span className="text-yellow-400/60">Acquire items via Level Rewards or Events.</span>
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          {items.map(([id, qty], idx) => {
            const item = ITEM_REGISTRY[id];
            if (!item) return null;

            const isBooster = item.type === 'BOOSTER';
            const isVoucher = item.type === 'VOUCHER';

            return (
              <div 
                key={`${id}-${qty}`}
                className="group relative overflow-hidden bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-white/[0.08] backdrop-blur-xl border-2 border-white/20 rounded-3xl p-6 sm:p-7 transition-all duration-500 hover:border-yellow-500/40 hover:bg-gradient-to-br hover:from-white/[0.12] hover:via-white/[0.06] hover:to-white/[0.12] hover:shadow-[0_0_40px_rgba(234,179,8,0.2)] hover:scale-[1.02] active:scale-[0.98]"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                {/* Premium Background Effects */}
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-transparent to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(234,179,8,0.1)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute -inset-10 bg-gradient-to-br from-yellow-500/10 via-transparent to-pink-500/10 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>

                {/* Content */}
                <div className="relative z-10">
                  {/* Header with Icon and Quantity */}
                  <div className="flex justify-between items-start mb-5">
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-black/60 via-black/50 to-black/60 border-2 border-white/10 flex items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.6)] group-hover:scale-110 group-hover:rotate-3 group-hover:border-yellow-500/30 transition-all duration-500 group-hover:shadow-[0_12px_40px_rgba(234,179,8,0.3)]">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-2xl"></div>
                      <div className="relative z-10">
                        {getItemIcon(id, item.type)}
                      </div>
                    </div>
                    <div className="relative bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 text-black px-4 py-2 rounded-full text-xs font-black tracking-tight shadow-[0_0_20px_rgba(234,179,8,0.5)] border-2 border-yellow-300/40">
                      <span className="relative z-10">×{qty}</span>
                      <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent rounded-full"></div>
                    </div>
                  </div>

                  {/* Item Info */}
                  <div className="space-y-2 mb-6">
                    <h4 className="text-base sm:text-lg font-black text-white uppercase tracking-wide drop-shadow-md">{item.name}</h4>
                    <p className="text-xs sm:text-sm text-white/60 leading-relaxed font-medium">{item.description}</p>
                  </div>

                  {/* Action Button */}
                  {isBooster && (
                    <button
                      onClick={() => handleActivate(id)}
                      disabled={activating === id}
                      className="relative w-full overflow-hidden py-4 bg-gradient-to-br from-yellow-600 via-yellow-500 to-yellow-600 hover:from-yellow-500 hover:via-yellow-400 hover:to-yellow-500 text-black rounded-2xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all duration-300 active:scale-95 shadow-[0_0_30px_rgba(234,179,8,0.4)] hover:shadow-[0_0_40px_rgba(234,179,8,0.6)] disabled:opacity-50 disabled:cursor-not-allowed group/btn border-2 border-yellow-400/50"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000"></div>
                      <span className="relative z-10 drop-shadow-md">
                        {activating === id ? 'Activating...' : 'Activate Booster'}
                      </span>
                    </button>
                  )}

                  {isVoucher && (
                    <div className="relative w-full overflow-hidden py-4 bg-gradient-to-br from-white/5 via-white/[0.03] to-white/5 border-2 border-white/10 rounded-2xl text-white/50 text-xs font-bold uppercase tracking-wide text-center backdrop-blur-sm">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Auto-Applied in Store
                      </span>
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