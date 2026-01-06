import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { InventoryGrid } from './InventoryGrid';
import { BoardSurface } from './UserHub';
import { rewardUserForAd } from '../services/supabase';
import { adService, AdPlacement } from '../services/adService';
import { audioService } from '../services/audio';
import { CurrencyIcon } from './Store';
import { GemRain } from './GemRain';

interface InventoryModalProps {
  onClose: () => void;
  profile: UserProfile;
  onRefreshProfile: () => void;
}

const WatchEarnButton: React.FC<{ profile: UserProfile, onRefresh: () => void }> = ({ profile, onRefresh }) => {
  const [adState, setAdState] = useState<'idle' | 'loading' | 'playing' | 'rewarded' | 'error'>('idle');
  const [showGemRain, setShowGemRain] = useState(false);
  const placement: AdPlacement = 'inventory';

  useEffect(() => {
    const unsubscribe = adService.onStateChange(placement, setAdState);
    return unsubscribe;
  }, [placement]);

  const isAvailable = adService.isAdAvailable(placement);
  const cooldownString = adService.getCooldownString(placement);

  const handleWatchAd = async () => {
    if (!isAvailable || adState !== 'idle') return;

    try {
      await adService.showRewardedAd(placement, async (amount) => {
        const result = await rewardUserForAd(profile.id, amount);
        if (result.success) {
          audioService.playPurchase();
          setShowGemRain(true);
          onRefresh();
        }
      });
    } catch (error: any) {
      console.error('Ad error:', error);
    }
  };

  const getButtonText = () => {
    if (adState === 'loading') return 'Loading Ad...';
    if (adState === 'playing') return 'Playing...';
    if (adState === 'rewarded') return 'Rewarded!';
    if (!isAvailable) return `Next: ${cooldownString}`;
    return 'Watch & Earn';
  };

  return (
    <>
      <button 
        onClick={handleWatchAd} 
        disabled={!isAvailable || adState !== 'idle'}
        className={`group relative overflow-hidden px-5 py-3 sm:px-6 sm:py-3.5 rounded-2xl backdrop-blur-md border transition-all duration-300 active:scale-95 min-h-[48px] touch-manipulation
          ${!isAvailable || adState !== 'idle'
            ? 'bg-white/5 border-white/10 opacity-60 cursor-not-allowed' 
            : 'bg-gradient-to-br from-pink-500/90 via-pink-600/90 to-rose-600/90 border-pink-400/30 shadow-[0_0_30px_rgba(236,72,153,0.4)] hover:shadow-[0_0_40px_rgba(236,72,153,0.6)] hover:scale-105 hover:border-pink-400/50'}`}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
        <div className="relative z-10 flex items-center gap-2.5">
          <span className="text-xs sm:text-sm font-bold text-white drop-shadow-md">
            {getButtonText()}
          </span>
          {isAvailable && adState === 'idle' && (
            <div className="flex items-center gap-1">
              <span className="text-xs sm:text-sm font-bold text-pink-200">+20</span>
              <CurrencyIcon type="GEMS" size="sm" className="drop-shadow-[0_0_8px_rgba(236,72,153,0.6)]" />
            </div>
          )}
        </div>
      </button>
      {showGemRain && (
        <GemRain 
          gemCount={20} 
          onComplete={() => setShowGemRain(false)} 
        />
      )}
    </>
  );
};

export const InventoryModal: React.FC<InventoryModalProps> = ({ onClose, profile, onRefreshProfile }) => {
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-3xl p-4 sm:p-6 animate-in fade-in duration-300" onClick={onClose}>
      <BoardSurface themeId={profile.active_board as any || 'EMERALD'} isMini />
      
      {/* Subtle ambient glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.03),transparent_70%)] pointer-events-none"></div>

      <div className="relative w-full max-w-3xl max-h-[92vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col bg-white/5 backdrop-blur-2xl border border-white/10" onClick={e => e.stopPropagation()}>
        
        {/* Premium Header - Apple Design Language */}
        <div className="relative z-10 p-6 sm:p-8 border-b border-white/10 bg-gradient-to-b from-white/5 to-transparent">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            {/* Title Section */}
            <div className="flex flex-col">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2 drop-shadow-lg">Inventory</h2>
              <p className="text-sm text-white/60 font-medium">Manage your items and boosters</p>
            </div>
            
            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <WatchEarnButton profile={profile} onRefresh={onRefreshProfile} />
              <button 
                onClick={onClose} 
                className="group flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/80 hover:text-white transition-all duration-300 active:scale-95 backdrop-blur-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="text-sm font-semibold">Close</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content - Premium Scrollable Area */}
        <div className="relative z-10 flex-1 overflow-y-auto p-6 sm:p-8 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <InventoryGrid profile={profile} onRefresh={onRefreshProfile} />
          </div>
        </div>
      </div>
    </div>
  );
};