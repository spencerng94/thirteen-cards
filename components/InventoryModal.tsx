import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { InventoryGrid } from './InventoryGrid';
import { BoardSurface } from './UserHub';
import { claimAdReward } from '../services/supabase';
import { audioService } from '../services/audio';
import { CurrencyIcon } from './Store';

interface InventoryModalProps {
  onClose: () => void;
  profile: UserProfile;
  onRefreshProfile: () => void;
}

const WatchEarnButton: React.FC<{ profile: UserProfile, onRefresh: () => void }> = ({ profile, onRefresh }) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const update = () => {
      const last = profile.last_ad_claim ? new Date(profile.last_ad_claim).getTime() : 0;
      const cooldown = 4 * 60 * 60 * 1000;
      const remaining = Math.max(0, cooldown - (Date.now() - last));
      setTimeLeft(remaining);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [profile.last_ad_claim]);

  const handleClaim = async () => {
    if (timeLeft > 0 || loading) return;
    setLoading(true);
    const res = await claimAdReward(profile.id);
    if (res.success) {
      audioService.playPurchase();
      onRefresh();
    }
    setLoading(false);
  };

  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const mins = Math.floor((timeLeft / (1000 * 60)) % 60);

  return (
    <button 
      onClick={handleClaim} 
      disabled={timeLeft > 0 || loading}
      className={`group relative overflow-hidden px-6 py-2.5 rounded-full border-2 transition-all duration-300 active:scale-95
        ${timeLeft > 0 ? 'bg-black/20 border-white/5 opacity-50 grayscale' : 'bg-gradient-to-br from-pink-600 to-pink-900 border-pink-400 shadow-[0_0_20px_rgba(236,72,153,0.3)] hover:scale-105'}`}
    >
      <div className="relative z-10 flex items-center gap-3">
         <span className="text-[10px] font-black uppercase tracking-widest text-white drop-shadow-md">
            {loading ? 'LOADING...' : timeLeft > 0 ? `NEXT: ${hours}H ${mins}M` : 'WATCH & EARN +250'}
         </span>
         <CurrencyIcon type="GOLD" size="sm" className="drop-shadow-[0_0_5px_rgba(255,215,0,0.4)]" />
      </div>
    </button>
  );
};

export const InventoryModal: React.FC<InventoryModalProps> = ({ onClose, profile, onRefreshProfile }) => {
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 backdrop-blur-3xl p-4 animate-in fade-in duration-300" onClick={onClose}>
      <BoardSurface themeId={profile.active_board as any || 'EMERALD'} isMini />
      
      {/* Scanning lines for tech aesthetic */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-10" style={{ 
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1.5px, transparent 1.5px), linear-gradient(90deg, rgba(255,255,255,0.1) 1.5px, transparent 1.5px)`, 
          backgroundSize: '80px 80px' 
      }}></div>

      <div className="relative border border-white/10 w-full max-w-2xl max-h-[90vh] rounded-[3.5rem] overflow-hidden shadow-[0_0_150px_rgba(0,0,0,1)] flex flex-col bg-black/40 backdrop-blur-2xl" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="relative z-10 p-10 border-b border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent flex justify-between items-start">
          <div className="flex flex-col">
            <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-white/90 to-white/40 uppercase italic tracking-tighter leading-none font-serif">INVENTORY</h2>
            <div className="flex items-center gap-3 mt-4">
               <div className="w-1.5 h-1.5 rounded-full bg-pink-500 shadow-[0_0_10px_#ec4899] animate-pulse"></div>
               <p className="text-[10px] font-black uppercase tracking-[0.5em] text-pink-400">Tactical Assets & Boosters</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-4">
            <button 
              onClick={onClose} 
              className="group flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-gray-400 hover:text-white transition-all active:scale-90 shadow-xl"
            >
              <span className="text-[10px] font-black uppercase tracking-widest transition-transform group-hover:-translate-x-1">← Back</span>
            </button>
            <WatchEarnButton profile={profile} onRefresh={onRefreshProfile} />
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex-1 overflow-y-auto p-10 space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
               <InventoryGrid profile={profile} onRefresh={onRefreshProfile} />
            </div>
        </div>

        <div className="relative z-10 p-6 bg-black/60 border-t border-white/5 flex items-center justify-center">
            <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.6em]">Encrypted Inventory Management System</span>
        </div>
      </div>
    </div>
  );
};