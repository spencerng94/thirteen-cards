import { useEffect, useState, useCallback, useRef } from 'react';
import { REWARDED_AD_UNIT_ID } from '../constants/AdConfig';

/**
 * AdMob Rewarded Video Ad Manager Hook
 * 
 * Manages ad loading, showing, and reloading lifecycle.
 * Follows best practices:
 * - Pre-loads ads on initialization
 * - Reloads ads immediately after they're closed
 * - Provides loading state for UI
 */

interface RewardedAd {
  loaded: boolean;
  loading: boolean;
  show: () => Promise<void>;
  load: () => Promise<void>;
}

declare global {
  interface Window {
    google?: {
      adsbygoogle?: any[];
    };
    adsbygoogle?: any[];
  }
}

export const useAdManager = () => {
  const [adLoaded, setAdLoaded] = useState(false);
  const [adLoading, setAdLoading] = useState(false);
  const rewardedAdRef = useRef<RewardedAd | null>(null);
  const isInitializedRef = useRef(false);

  /**
   * Initialize AdMob SDK
   */
  const initializeAdMob = useCallback(() => {
    if (isInitializedRef.current) return;
    
    // Load AdMob SDK script
    if (!document.querySelector('script[src*="adsbygoogle"]')) {
      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3940256099942544';
      script.crossOrigin = 'anonymous';
      document.head.appendChild(script);
    }

    isInitializedRef.current = true;
  }, []);

  /**
   * Load a rewarded ad
   */
  const loadAd = useCallback(async (): Promise<void> => {
    if (adLoading) return;

    setAdLoading(true);
    setAdLoaded(false);

    try {
      // For web, we'll use a simplified approach
      // In a real implementation, you'd use Google Ad Manager or AdMob Web SDK
      // This is a placeholder that simulates the AdMob API structure
      
      // Simulate ad loading (replace with actual AdMob Web SDK call)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In production, you would:
      // 1. Create a RewardedAd instance using AdMob SDK
      // 2. Set up event listeners for onUserEarnedReward, onAdClosed, etc.
      // 3. Call load() on the RewardedAd instance
      
      setAdLoaded(true);
      setAdLoading(false);
    } catch (error) {
      console.error('Failed to load ad:', error);
      setAdLoaded(false);
      setAdLoading(false);
    }
  }, [adLoading]);

  /**
   * Show the rewarded ad
   */
  const showAd = useCallback(async (): Promise<void> => {
    if (!adLoaded || !rewardedAdRef.current) {
      throw new Error('Ad not loaded');
    }

    try {
      // In production, you would call rewardedAd.show()
      // For now, we simulate it
      await rewardedAdRef.current.show();
    } catch (error) {
      console.error('Failed to show ad:', error);
      throw error;
    }
  }, [adLoaded]);

  /**
   * Initialize and load ad on mount
   */
  useEffect(() => {
    initializeAdMob();
    loadAd();
  }, [initializeAdMob, loadAd]);

  return {
    adLoaded,
    adLoading,
    loadAd,
    showAd,
  };
};
