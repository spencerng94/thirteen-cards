import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { InventoryGrid } from './InventoryGrid';
import { BoardSurface } from './UserHub';
import { claimAdRewardGems, fetchWeeklyRewardStatus } from '../services/supabase';
import { adService, AdPlacement } from '../services/adService';
import { audioService } from '../services/audio';
import { CurrencyIcon } from './Store';
import { GemRain } from './GemRain';
import { Toast } from './Toast';

interface InventoryModalProps {
  onClose: () => void;
  profile: UserProfile;
  onRefreshProfile: () => void;
}

const WatchEarnButton: React.FC<{ profile: UserProfile, onRefresh: () => void }> = ({ profile, onRefresh }) => {
  const [adState, setAdState] = useState<'idle' | 'loading' | 'playing' | 'rewarded' | 'error'>('idle');
  const [showGemRain, setShowGemRain] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [weeklyGemTotal, setWeeklyGemTotal] = useState<number>(0);
  const [isCapReached, setIsCapReached] = useState<boolean>(false);
  const [previousWeeklyGems, setPreviousWeeklyGems] = useState<number>(0);
  const placement: AdPlacement = 'inventory';

  useEffect(() => {
    const unsubscribe = adService.onStateChange(placement, setAdState);
    return unsubscribe;
  }, [placement]);

  // Fetch weekly reward status on mount and when profile changes
  useEffect(() => {
    if (profile.id && profile.id !== 'guest') {
      fetchWeeklyRewardStatus(profile.id).then((status) => {
        if (status) {
          setWeeklyGemTotal(status.weeklyGemTotal);
          setIsCapReached(status.isCapReached);
          setPreviousWeeklyGems(status.weeklyGemTotal);
        }
      });
    }
  }, [profile.id]);

  const isAvailable = adService.isAdAvailable(placement);
  const cooldownString = adService.getCooldownString(placement);

  const handleWatchAd = async () => {
    // SECURITY: Prevent spam-clicking - button is disabled, but double-check state
    if (!isAvailable || adState !== 'idle') {
      console.warn('Ad button clicked while not available or not idle. State:', adState);
      return;
    }

    try {
      const adShown = await adService.showRewardedAd(placement, async (amount) => {
        // SECURITY: This callback is ONLY triggered AFTER AdMob's onUserEarnedReward event fires
        // This ensures server-side verification - we never award gems without AdMob confirming the reward
        try {
          // Call secure RPC function that uses auth.uid() server-side to prevent spoofing
          const result = await claimAdRewardGems();
          
          if (result.success) {
            audioService.playPurchase();
            
            // Update weekly gem total
            if (result.weeklyGems !== undefined) {
              const wasUnderCap = previousWeeklyGems < 500;
              const nowAtCap = result.weeklyGems >= 500;
              
              setWeeklyGemTotal(result.weeklyGems);
              setIsCapReached(result.hitCap || false);
              
              // Show cap transition toast if user just hit the cap
              if (wasUnderCap && nowAtCap && result.hitCap) {
                setToastMessage('Gem Limit Reached - Earning Gold Now!');
                setToastType('success');
                setShowToast(true);
              }
            }
            
            // Handle reward display based on type
            if (result.rewardType === 'gems' && result.newGemBalance !== undefined) {
              setShowGemRain(true);
              setToastMessage(`Boba secured! +${result.rewardAmount || 20} Gems`);
              setToastType('success');
              setShowToast(true);
            } else if (result.rewardType === 'coins' && result.newCoinBalance !== undefined) {
              setToastMessage(`Gold secured! +${result.rewardAmount || 50} Coins`);
              setToastType('success');
              setShowToast(true);
            }
            
            onRefresh();
          } else {
            // Handle cooldown or other errors
            console.error('InventoryModal: claimAdRewardGems failed:', result.error);
            if (result.error === 'Cooldown active' && result.cooldownRemaining) {
              setToastMessage(`Please wait ${result.cooldownRemaining}s before claiming again`);
            } else {
              setToastMessage(result.error || 'Failed to process reward');
            }
            setToastType('error');
            setShowToast(true);
          }
        } catch (rewardError: any) {
          console.error('InventoryModal: Error in reward callback:', rewardError);
          setToastMessage('Failed to process reward. Please try again.');
          setToastType('error');
          setShowToast(true);
        }
      }, () => {
        // Early close callback - user closed ad early
        setToastMessage('No ads available right now. Take a boba break and try again later!');
        setToastType('error');
        setShowToast(true);
      });
      
      if (!adShown) {
        console.warn('InventoryModal: Ad was not shown successfully');
        setToastMessage('No ads available right now. Take a boba break and try again later!');
        setToastType('error');
        setShowToast(true);
      }
    } catch (error: any) {
      console.error('InventoryModal: Ad error:', error);
      // Handle ad loading/showing errors
      if (error.message?.includes('failed to load') || error.message?.includes('not available')) {
        setToastMessage('No ads available right now. Take a boba break and try again later!');
      } else {
        setToastMessage(error.message || 'No ads available right now. Take a boba break and try again later!');
      }
      setToastType('error');
      setShowToast(true);
    }
  };

  const getButtonText = () => {
    if (adState === 'loading') return 'Loading Ad...';
    if (adState === 'playing') return 'Playing...';
    if (adState === 'rewarded') return 'Rewarded!';
    if (!isAvailable) return `Next: ${cooldownString}`;
    return isCapReached ? 'Watch for 50 Coins' : 'Watch for 20 Gems';
  };

  return (
    <>
      <button 
        onClick={handleWatchAd} 
        // Disable button when loading, playing, or not available to prevent spam-clicking
        disabled={!isAvailable || adState !== 'idle'}
        className={`group relative overflow-hidden px-5 py-3 sm:px-6 sm:py-3.5 rounded-2xl backdrop-blur-md border transition-all duration-300 active:scale-95 min-h-[48px] touch-manipulation
          ${!isAvailable || adState !== 'idle'
            ? 'bg-white/5 border-white/10 opacity-60 cursor-not-allowed' 
            : 'bg-gradient-to-br from-pink-500/90 via-pink-600/90 to-rose-600/90 border-pink-400/30 shadow-[0_0_30px_rgba(236,72,153,0.4)] hover:shadow-[0_0_40px_rgba(236,72,153,0.6)] hover:scale-105 hover:border-pink-400/50'}`}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
        <div className="relative z-10 flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-2.5">
            <span className="text-xs sm:text-sm font-bold text-white drop-shadow-md">
              {getButtonText()}
            </span>
            {isAvailable && adState === 'idle' && (
              <div className="flex items-center gap-1">
                <span className="text-xs sm:text-sm font-bold text-pink-200">
                  +{isCapReached ? '50' : '20'}
                </span>
                <CurrencyIcon 
                  type={isCapReached ? "GOLD" : "GEMS"} 
                  size="sm" 
                  className="drop-shadow-[0_0_8px_rgba(236,72,153,0.6)]" 
                />
              </div>
            )}
          </div>
          {isAvailable && adState === 'idle' && (
            <span className="text-[10px] sm:text-xs text-white/60 font-medium">
              Weekly Gem Limit: {weeklyGemTotal}/500
            </span>
          )}
        </div>
      </button>
      {showGemRain && (
        <GemRain 
          gemCount={20} 
          onComplete={() => setShowGemRain(false)} 
        />
      )}
      {showToast && (
        <Toast
          message={toastMessage}
          onClose={() => setShowToast(false)}
          type={toastType}
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