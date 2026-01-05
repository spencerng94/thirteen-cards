import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { ITEM_REGISTRY, RegistryItem } from '../constants/ItemRegistry';
import { activateBooster } from '../services/supabase';
import { audioService } from '../services/audio';

interface InventoryGridProps {
  profile: UserProfile;
  onRefresh: () => void;
}

/* Duplicated Item Icon components for visual parity */
const XpBoosterIcon = () => (
  <svg viewBox="0 0 100 100" className="w-12 h-12">
    <defs>
      <linearGradient id="xpGradInv" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#1e3a8a" />
      </linearGradient>
    </defs>
    <path d="M50 5 L90 25 V75 L50 95 L10 75 V25 Z" fill="url(#xpGradInv)" stroke="white" strokeWidth="2" opacity="0.9" />
    <path d="M30 40 L50 20 L70 40 M30 65 L50 45 L70 65" stroke="white" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const GoldBoosterIcon = () => (
  <svg viewBox="0 0 100 100" className="w-12 h-12">
    <defs>
      <linearGradient id="goldBoostGradInv" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#facc15" />
        <stop offset="100%" stopColor="#a16207" />
      </linearGradient>
    </defs>
    <path d="M50 5 L90 25 V75 L50 95 L10 75 V25 Z" fill="url(#goldBoostGradInv)" stroke="white" strokeWidth="2" opacity="0.9" />
    <text x="50" y="65" textAnchor="middle" fontSize="40" fontWeight="900" fill="white">$</text>
  </svg>
);

const VoucherIcon = () => (
  <svg viewBox="0 0 100 100" className="w-12 h-12">
    <defs>
      <linearGradient id="voucherGradInv" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#10b981" />
        <stop offset="100%" stopColor="#064e3b" />
      </linearGradient>
    </defs>
    <rect x="10" y="25" width="80" height="50" rx="4" fill="url(#voucherGradInv)" stroke="white" strokeWidth="2" opacity="0.9" />
    <circle cx="10" cy="50" r="8" fill="black" opacity="0.4" />
    <circle cx="90" cy="50" r="8" fill="black" opacity="0.4" />
    <text x="75" y="60" textAnchor="middle" fontSize="18" fontWeight="900" fill="white" opacity="0.8">%</text>
  </svg>
);

const BoosterTimer: React.FC<{ expiration: number, type: string }> = ({ expiration, type }) => {
  const [timeLeft, setTimeLeft] = useState(expiration - Date.now());

  useEffect(() => {
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
  }, [expiration]);

  if (timeLeft <= 0) return null;

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);

  return (
    <div className="bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 rounded-full flex items-center gap-2">
      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
      <span className="text-[9px] font-black text-white uppercase tracking-widest font-mono">
        {type}: {minutes}:{seconds.toString().padStart(2, '0')}
      </span>
    </div>
  );
};

export const InventoryGrid: React.FC<InventoryGridProps> = ({ profile, onRefresh }) => {
  const [activating, setActivating] = useState<string | null>(null);
  const inventory = profile.inventory || { items: {}, active_boosters: {} };
  const items = (Object.entries(inventory.items) as [string, number][]).filter(([_, qty]) => qty > 0);

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
    return <span className="text-2xl">🎁</span>;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-400">
      {(Object.entries(inventory.active_boosters) as [string, number][]).some(([_, exp]) => exp > Date.now()) && (
        <div className="flex flex-wrap gap-3 p-4 bg-emerald-950/20 border border-emerald-500/10 rounded-2xl">
          {(Object.entries(inventory.active_boosters) as [string, number][]).map(([type, exp]) => (
            <BoosterTimer key={type} type={type} expiration={exp} />
          ))}
        </div>
      )}

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 opacity-20 select-none border-2 border-dashed border-white/5 rounded-[2.5rem]">
           <div className="w-20 h-20 rounded-[2rem] border border-white/10 flex items-center justify-center mb-6">
              <span className="text-4xl italic font-serif">!</span>
           </div>
           <p className="text-[10px] font-black uppercase tracking-[0.5em] text-center max-w-xs leading-relaxed px-10">Your inventory is currently empty. Acquire items via Level Rewards or Events.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.map(([id, qty]) => {
            const item = ITEM_REGISTRY[id];
            if (!item) return null;

            return (
              <div key={id} className="relative bg-white/[0.02] border border-white/5 rounded-[2rem] p-6 group hover:bg-white/[0.04] transition-all duration-300">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-black border border-white/10 flex items-center justify-center shadow-xl group-hover:scale-105 transition-transform duration-500">
                    {getItemIcon(id, item.type)}
                  </div>
                  <div className="bg-yellow-500 text-black px-3 py-1 rounded-full text-[10px] font-black tracking-tighter">
                    x{qty}
                  </div>
                </div>

                <div className="space-y-1 mb-6">
                  <h4 className="text-xs font-black text-white uppercase tracking-widest">{item.name}</h4>
                  <p className="text-[9px] text-white/40 uppercase font-medium leading-relaxed">{item.description}</p>
                </div>

                {item.type === 'BOOSTER' && (
                  <button
                    onClick={() => handleActivate(id)}
                    disabled={activating === id}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg disabled:opacity-50"
                  >
                    {activating === id ? 'STABILIZING...' : 'ACTIVATE UNIT'}
                  </button>
                )}

                {item.type === 'VOUCHER' && (
                   <div className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-white/30 text-[9px] font-black uppercase tracking-widest text-center">
                      Auto-Applied in Store
                   </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};