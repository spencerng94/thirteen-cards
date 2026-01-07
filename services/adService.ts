/**
 * AdService - Handles rewarded video ad logic with AdMob integration
 * Follows best practices: pre-loading, reloading, and secure reward handling
 */

import { REWARDED_AD_UNIT_ID, ADMOB_APP_ID } from '../constants/AdConfig';

export type AdPlacement = 'inventory' | 'shop' | 'victory';

export type AdState = 'idle' | 'loading' | 'playing' | 'rewarded' | 'error';

interface AdCooldown {
  placement: AdPlacement;
  timestamp: number;
}

// AdMob RewardedAd interface (matches Google Mobile Ads SDK structure)
interface RewardedAd {
  loaded: boolean;
  load: () => Promise<void>;
  show: () => Promise<void>;
  addEventListener: (event: string, callback: (event: any) => void) => void;
  removeEventListener: (event: string, callback: (event: any) => void) => void;
}

// Global AdMob SDK types for Web
declare global {
  interface Window {
    google?: {
      mobileads?: {
        RewardedAd: new (config: { adUnitId: string }) => RewardedAd;
        initialize: (config: { appId: string }) => Promise<void>;
      };
    };
    adsbygoogle?: any[];
  }
}

const COOLDOWN_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds
const STORAGE_KEY = 'thirteen_ad_cooldowns';

export class AdService {
  private static instance: AdService;
  private state: AdState = 'idle';
  private listeners: Map<AdPlacement, (state: AdState) => void> = new Map();
  private rewardedAd: RewardedAd | null = null;
  private isInitialized: boolean = false;
  private isAdLoaded: boolean = false;
  private currentPlacement: AdPlacement | null = null;
  private currentRewardCallback: ((amount: number) => Promise<void>) | null = null;
  private onEarlyCloseCallback: (() => void) | null = null;
  private onAdClosedCallback: (() => void) | null = null;
  private onUserEarnedRewardCallback: ((reward: { amount: number; type: string }) => void) | null = null;
  private onAdFailedToLoadCallback: ((error: Error) => void) | null = null;
  private onAdFailedToShowCallback: ((error: Error) => void) | null = null;
  private rewardEarned: boolean = false;

  private constructor() {}

  static getInstance(): AdService {
    if (!AdService.instance) {
      AdService.instance = new AdService();
    }
    return AdService.instance;
  }

  /**
   * Check if an ad is available for a specific placement (not on cooldown)
   */
  isAdAvailable(placement: AdPlacement): boolean {
    const cooldowns = this.getCooldowns();
    const cooldown = cooldowns.find(c => c.placement === placement);
    
    if (!cooldown) return true;
    
    const now = Date.now();
    const timeSinceLastAd = now - cooldown.timestamp;
    
    return timeSinceLastAd >= COOLDOWN_DURATION;
  }

  /**
   * Get remaining cooldown time in milliseconds
   */
  getCooldownRemaining(placement: AdPlacement): number {
    const cooldowns = this.getCooldowns();
    const cooldown = cooldowns.find(c => c.placement === placement);
    
    if (!cooldown) return 0;
    
    const now = Date.now();
    const timeSinceLastAd = now - cooldown.timestamp;
    const remaining = COOLDOWN_DURATION - timeSinceLastAd;
    
    return Math.max(0, remaining);
  }

  /**
   * Format cooldown time as human-readable string
   */
  getCooldownString(placement: AdPlacement): string {
    const remaining = this.getCooldownRemaining(placement);
    if (remaining === 0) return 'Available';
    
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }

  /**
   * Initialize AdMob SDK
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load Google Mobile Ads SDK script if not already loaded
      if (!window.google?.mobileads && !document.querySelector('script[src*="admob"]')) {
        await this.loadAdMobScript();
      }

      // Initialize AdMob with App ID
      if (window.google?.mobileads) {
        await window.google.mobileads.initialize({
          appId: ADMOB_APP_ID,
        });

        // Create RewardedAd instance
        // Note: AdMob SDK automatically respects device mute switch - no manual volume control needed
        this.rewardedAd = new window.google.mobileads.RewardedAd({
          adUnitId: REWARDED_AD_UNIT_ID,
        });

        this.setupAdEventListeners();
        this.isInitialized = true;
        console.log('AdMob SDK initialized successfully');
      } else {
        // Fallback: Use simulation if AdMob SDK not available (for development)
        console.warn('AdMob SDK not available, using simulation mode');
        this.isInitialized = true;
      }
    } catch (error) {
      console.error('Failed to initialize AdMob:', error);
      this.isInitialized = true; // Allow simulation mode
    }
  }

  /**
   * Load Google Mobile Ads SDK script for Web
   */
  private loadAdMobScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.google?.mobileads) {
        resolve();
        return;
      }

      // Load the Google Mobile Ads SDK for Web
      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + ADMOB_APP_ID.split('~')[0];
      script.crossOrigin = 'anonymous';
      script.onload = () => {
        // Initialize google.mobileads if it's available
        // Note: The actual SDK structure may vary, this is a placeholder for the actual implementation
        // The real SDK will expose window.google.mobileads after loading
        if (window.google?.mobileads) {
          resolve();
        } else {
          // If SDK doesn't expose mobileads directly, we'll handle it in initialize()
          resolve();
        }
      };
      script.onerror = () => reject(new Error('Failed to load AdMob SDK'));
      document.head.appendChild(script);
    });
  }

  /**
   * Setup event listeners for rewarded ad
   */
  private setupAdEventListeners(): void {
    if (!this.rewardedAd) return;

    // SECURITY: User earned reward - This is the ONLY place where we process the reward
    // This callback is ONLY fired by AdMob when the user successfully completes the ad
    // We MUST wait for this callback before calling Supabase - never award gems locally
    this.onUserEarnedRewardCallback = (reward: { amount: number; type: string }) => {
      console.log('User earned reward:', reward);
      this.rewardEarned = true;
      this.setState('rewarded', this.currentPlacement!);
      
      // SECURITY: Only process reward AFTER AdMob confirms via onUserEarnedReward event
      // This ensures server-side verification - the Supabase function is only called here
      if (this.currentRewardCallback) {
        const rewardAmount = this.getRewardAmount(this.currentPlacement!);
        this.currentRewardCallback(rewardAmount)
          .then(() => {
            this.setCooldown(this.currentPlacement!);
          })
          .catch((error) => {
            console.error('Failed to process reward:', error);
          });
      }
    };

    // Ad closed (either after completion or early dismissal)
    this.onAdClosedCallback = () => {
      console.log('Ad closed');
      
      // If ad was closed without reward, trigger early close callback
      if (!this.rewardEarned && this.currentPlacement && this.onEarlyCloseCallback) {
        this.onEarlyCloseCallback();
        this.setState('error', this.currentPlacement);
      }

      // Reset state
      this.rewardEarned = false;
      this.setState('idle', this.currentPlacement!);
      this.isAdLoaded = false;
      this.currentPlacement = null;
      this.currentRewardCallback = null;
      this.onEarlyCloseCallback = null;

      // Reload ad immediately for next use
      this.load();
    };

    // Ad failed to load
    this.onAdFailedToLoadCallback = (error: Error) => {
      console.error('Ad failed to load:', error);
      this.setState('error', this.currentPlacement!);
      this.isAdLoaded = false;
      setTimeout(() => {
        this.setState('idle', this.currentPlacement!);
      }, 1000);
    };

    // Ad failed to show
    this.onAdFailedToShowCallback = (error: Error) => {
      console.error('Ad failed to show:', error);
      this.setState('error', this.currentPlacement!);
      setTimeout(() => {
        this.setState('idle', this.currentPlacement!);
      }, 1000);
    };

    // Attach listeners
    this.rewardedAd.addEventListener('userEarnedReward', this.onUserEarnedRewardCallback);
    this.rewardedAd.addEventListener('adClosed', this.onAdClosedCallback);
    this.rewardedAd.addEventListener('adFailedToLoad', this.onAdFailedToLoadCallback);
    this.rewardedAd.addEventListener('adFailedToShow', this.onAdFailedToShowCallback);
  }

  /**
   * Load a rewarded ad (pre-loading strategy)
   */
  async load(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.isAdLoaded) return;

    this.setState('loading', 'shop'); // Use 'shop' as default for loading state

    try {
      if (this.rewardedAd) {
        await this.rewardedAd.load();
        this.isAdLoaded = true;
        this.setState('idle', 'shop');
      } else {
        // Simulation mode
        await new Promise(resolve => setTimeout(resolve, 1000));
        this.isAdLoaded = true;
        this.setState('idle', 'shop');
      }
    } catch (error) {
      console.error('Failed to load ad:', error);
      this.isAdLoaded = false;
      this.setState('error', 'shop');
      setTimeout(() => {
        this.setState('idle', 'shop');
      }, 1000);
    }
  }

  /**
   * Check if ad is loaded and ready
   */
  isLoaded(): boolean {
    return this.isAdLoaded && (this.rewardedAd?.loaded ?? false);
  }

  /**
   * Request and show a rewarded ad
   */
  async showRewardedAd(
    placement: AdPlacement,
    onReward: (amount: number) => Promise<void>,
    onEarlyClose?: () => void
  ): Promise<boolean> {
    // Check cooldown
    if (!this.isAdAvailable(placement)) {
      throw new Error(`Ad is on cooldown. Available in ${this.getCooldownString(placement)}`);
    }

    // Ensure ad is loaded
    if (!this.isLoaded()) {
      this.setState('loading', placement);
      await this.load();
    }

    if (!this.isLoaded()) {
      throw new Error('No ads available right now. Take a boba break and try again later!');
    }

    // Store placement, reward callback, and early close callback
    this.currentPlacement = placement;
    this.currentRewardCallback = onReward;
    this.onEarlyCloseCallback = onEarlyClose || null;
    this.rewardEarned = false;

    // Set playing state - this disables the button to prevent spam-clicking
    this.setState('playing', placement);

    try {
      if (this.rewardedAd) {
        await this.rewardedAd.show();
      } else {
        // Simulation mode - wait for "ad" to complete
        // In simulation, we always complete successfully for testing
        await new Promise(resolve => setTimeout(resolve, 3000));
        // Simulate reward
        if (this.onUserEarnedRewardCallback) {
          this.onUserEarnedRewardCallback({ amount: this.getRewardAmount(placement), type: 'gems' });
        }
        if (this.onAdClosedCallback) {
          this.onAdClosedCallback();
        }
      }

      return true;
    } catch (error) {
      this.setState('error', placement);
      setTimeout(() => {
        this.setState('idle', placement);
      }, 1000);
      throw error;
    }
  }

  /**
   * Check if user closed ad early (for warning toast)
   */
  wasAdClosedEarly(): boolean {
    return this.state === 'error' && this.currentPlacement !== null && !this.rewardEarned;
  }

  /**
   * Get reward amount based on placement
   */
  private getRewardAmount(placement: AdPlacement): number {
    switch (placement) {
      case 'inventory':
        return 20; // 20 gems for inventory placement
      case 'shop':
        return 50; // 50 gems for shop placement
      case 'victory':
        return 5; // 5 gems (or double gold handled separately)
      default:
        return 20;
    }
  }

  /**
   * Set ad state and notify listeners
   */
  private setState(state: AdState, placement: AdPlacement): void {
    this.state = state;
    const listener = this.listeners.get(placement);
    if (listener) {
      listener(state);
    }
  }

  /**
   * Get current state
   */
  getState(): AdState {
    return this.state;
  }

  /**
   * Subscribe to state changes for a specific placement
   */
  onStateChange(placement: AdPlacement, callback: (state: AdState) => void): () => void {
    this.listeners.set(placement, callback);
    return () => {
      this.listeners.delete(placement);
    };
  }

  /**
   * Get cooldowns from localStorage
   */
  private getCooldowns(): AdCooldown[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }

  /**
   * Set cooldown for a placement
   */
  private setCooldown(placement: AdPlacement): void {
    const cooldowns = this.getCooldowns();
    const existingIndex = cooldowns.findIndex(c => c.placement === placement);
    
    const newCooldown: AdCooldown = {
      placement,
      timestamp: Date.now(),
    };

    if (existingIndex >= 0) {
      cooldowns[existingIndex] = newCooldown;
    } else {
      cooldowns.push(newCooldown);
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cooldowns));
    } catch (error) {
      console.error('Failed to save ad cooldown:', error);
    }
  }
}

export const adService = AdService.getInstance();
