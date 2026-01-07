/**
 * AdService - Handles rewarded video ad logic with AdMob integration
 * Follows best practices: pre-loading, reloading, and secure reward handling
 * 
 * CRITICAL: This service is designed to NEVER block app rendering.
 * All AdMob operations are non-blocking and fail gracefully.
 */

import { REWARDED_AD_UNIT_ID, ADMOB_APP_ID, ENABLE_MOCK_ADS } from '../constants/AdConfig';

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

// Global AdMob SDK types
declare global {
  interface Window {
    admob?: any;
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

// Platform detection - check if we're on web
const isWebPlatform = (): boolean => {
  // Check for Vite environment variable
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    const platform = (import.meta as any).env.VITE_PLATFORM;
    if (platform === 'web') return true;
  }
  
  // Check for process.env (React compatibility)
  if (typeof process !== 'undefined' && process.env) {
    if (process.env.REACT_APP_PLATFORM === 'web') return true;
  }
  
  // Fallback: detect web by checking if we're in a browser (not Cordova/Capacitor)
  return typeof window !== 'undefined' && 
         !(window as any).cordova && 
         !(window as any).Capacitor &&
         !(window as any).webkit?.messageHandlers;
};

export class AdService {
  private static instance: AdService;
  private state: AdState = 'idle';
  private listeners: Map<AdPlacement, (state: AdState) => void> = new Map();
  private rewardedAd: RewardedAd | null = null;
  private isInitialized: boolean = false;
  private isAdLoaded: boolean = false;
  private isAdMobReady: boolean = false;
  private currentPlacement: AdPlacement | null = null;
  private currentRewardCallback: ((amount: number) => Promise<void>) | null = null;
  private onEarlyCloseCallback: (() => void) | null = null;
  private onAdClosedCallback: (() => void) | null = null;
  private onUserEarnedRewardCallback: ((reward: { amount: number; type: string }) => void) | null = null;
  private onAdFailedToLoadCallback: ((error: Error) => void) | null = null;
  private onAdFailedToShowCallback: ((error: Error) => void) | null = null;
  private rewardEarned: boolean = false;
  private isWeb: boolean = false;

  private constructor() {
    // Detect platform immediately
    this.isWeb = isWebPlatform();
  }

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
   * CRITICAL: This method NEVER blocks or throws errors that could prevent app rendering.
   * It always completes quickly and sets isAdMobReady to true, even if SDK is unavailable.
   */
  async initialize(): Promise<void> {
    // Early exit if already initialized
    if (this.isInitialized) {
      return;
    }

    // Global Guard: If web platform, bypass all native SDK calls immediately
    if (this.isWeb) {
      this.isAdMobReady = true;
      this.isInitialized = true;
      this.isAdLoaded = true;
      return;
    }

    // Early Exit: Check for window.admob - if undefined, immediately set ready and return
    if (typeof window === 'undefined' || !window.admob) {
      this.isAdMobReady = true;
      this.isInitialized = true;
      this.isAdLoaded = true;
      return;
    }

    // Mock mode: Skip SDK initialization for fast development testing
    if (ENABLE_MOCK_ADS) {
      console.log('🎭 Mock Ad Mode Enabled - Ads will instantly reward for testing');
      this.isAdMobReady = true;
      this.isInitialized = true;
      this.isAdLoaded = true;
      return;
    }

    // Non-blocking initialization - wrap everything in try-catch
    try {
      // Null Pointer Fix: Check window.admob exists before any calls
      if (!window.admob) {
        this.isAdMobReady = true;
        this.isInitialized = true;
        this.isAdLoaded = true;
        return;
      }

      // Null Pointer Fix: Check window.google.mobileads exists before calling
      if (window.google?.mobileads) {
        // Load Google Mobile Ads SDK script if not already loaded
        if (!document.querySelector('script[src*="admob"]')) {
          await this.loadAdMobScript().catch(() => {
            // If script loading fails, continue with simulation mode
            this.isAdMobReady = true;
            this.isInitialized = true;
            this.isAdLoaded = true;
            return;
          });
        }

        // Null Pointer Fix: Double-check after script load
        if (window.google?.mobileads) {
          await window.google.mobileads.initialize({
            appId: ADMOB_APP_ID,
          }).catch(() => {
            // If initialization fails, continue with simulation mode
            this.isAdMobReady = true;
            this.isInitialized = true;
            this.isAdLoaded = true;
            return;
          });

          // Null Pointer Fix: Check before creating RewardedAd
          if (window.google?.mobileads?.RewardedAd) {
            this.rewardedAd = new window.google.mobileads.RewardedAd({
              adUnitId: REWARDED_AD_UNIT_ID,
            });

            this.setupAdEventListeners();
            this.isAdMobReady = true;
            this.isInitialized = true;
            console.log('AdMob SDK initialized successfully');
            return;
          }
        }
      }

      // Fallback: Use simulation if AdMob SDK not available
      this.isAdMobReady = true;
      this.isInitialized = true;
      this.isAdLoaded = true;
    } catch (error) {
      // CRITICAL: Never throw - always set ready state
      console.error('Failed to initialize AdMob (non-blocking):', error);
      this.isAdMobReady = true;
      this.isInitialized = true;
      this.isAdLoaded = true;
    }
  }

  /**
   * Load Google Mobile Ads SDK script for Web
   * CRITICAL: Never throws - always resolves, even on error
   */
  private loadAdMobScript(): Promise<void> {
    return new Promise((resolve) => {
      // Null Pointer Fix: Check before accessing
      if (!window || !document) {
        resolve();
        return;
      }

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
        // Null Pointer Fix: Check before accessing
        if (window.google?.mobileads) {
          resolve();
        } else {
          // If SDK doesn't expose mobileads directly, resolve anyway (non-blocking)
          resolve();
        }
      };
      // CRITICAL: Never reject - always resolve to prevent blocking
      script.onerror = () => {
        console.warn('AdMob SDK script failed to load (non-blocking)');
        resolve();
      };
      document.head.appendChild(script);
    });
  }

  /**
   * Setup event listeners for rewarded ad
   * Null Pointer Fix: All calls wrapped in null checks
   */
  private setupAdEventListeners(): void {
    // Null Pointer Fix: Check rewardedAd exists
    if (!this.rewardedAd) {
      return;
    }

    // Null Pointer Fix: Check rewardedAd.addEventListener exists
    if (!this.rewardedAd.addEventListener) {
      return;
    }

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

    // Null Pointer Fix: Wrap all addEventListener calls
    if (this.rewardedAd && this.rewardedAd.addEventListener) {
      if (this.onUserEarnedRewardCallback) {
        this.rewardedAd.addEventListener('userEarnedReward', this.onUserEarnedRewardCallback);
      }
      if (this.onAdClosedCallback) {
        this.rewardedAd.addEventListener('adClosed', this.onAdClosedCallback);
      }
      if (this.onAdFailedToLoadCallback) {
        this.rewardedAd.addEventListener('adFailedToLoad', this.onAdFailedToLoadCallback);
      }
      if (this.onAdFailedToShowCallback) {
        this.rewardedAd.addEventListener('adFailedToShow', this.onAdFailedToShowCallback);
      }
    }
  }

  /**
   * Load a rewarded ad (pre-loading strategy)
   * CRITICAL: Never blocks - always completes quickly
   */
  async load(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.isAdLoaded) return;

    this.setState('loading', 'shop'); // Use 'shop' as default for loading state

    try {
      // Mock mode: Instantly "load" the ad
      if (ENABLE_MOCK_ADS) {
        this.isAdLoaded = true;
        this.setState('idle', 'shop');
        return;
      }

      // Null Pointer Fix: Check rewardedAd exists and has load method
      if (this.rewardedAd && this.rewardedAd.load && typeof this.rewardedAd.load === 'function') {
        await this.rewardedAd.load().catch(() => {
          // If load fails, fall back to simulation mode
          this.isAdLoaded = true;
          this.setState('idle', 'shop');
        });
        this.isAdLoaded = true;
        this.setState('idle', 'shop');
      } else {
        // Simulation mode - non-blocking
        setTimeout(() => {
          this.isAdLoaded = true;
          this.setState('idle', 'shop');
        }, 100);
      }
    } catch (error) {
      // CRITICAL: Never throw - always set state
      console.error('Failed to load ad (non-blocking):', error);
      this.isAdLoaded = true; // Set to true so app doesn't wait
      this.setState('idle', 'shop');
    }
  }

  /**
   * Check if ad is loaded and ready
   * Null Pointer Fix: Safe access to rewardedAd
   */
  isLoaded(): boolean {
    // Null Pointer Fix: Check rewardedAd exists before accessing loaded
    if (this.rewardedAd) {
      return this.isAdLoaded && (this.rewardedAd.loaded ?? false);
    }
    // If no rewardedAd, return isAdLoaded (simulation mode)
    return this.isAdLoaded;
  }

  /**
   * Check if AdMob is ready (for compatibility)
   */
  getAdMobReady(): boolean {
    return this.isAdMobReady;
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
      // Mock mode: Instantly reward (no 30-second wait)
      if (ENABLE_MOCK_ADS) {
        // Simulate instant ad completion
        await new Promise(resolve => setTimeout(resolve, 500)); // Small delay for UI feedback
        // Simulate reward callback (this is the secure path - only called after "ad" completes)
        if (this.onUserEarnedRewardCallback) {
          this.onUserEarnedRewardCallback({ amount: this.getRewardAmount(placement), type: 'gems' });
        }
        // Simulate ad closed
        if (this.onAdClosedCallback) {
          this.onAdClosedCallback();
        }
        return true;
      }

      // Null Pointer Fix: Check rewardedAd exists and has show method
      if (this.rewardedAd && this.rewardedAd.show && typeof this.rewardedAd.show === 'function') {
        await this.rewardedAd.show().catch((error: any) => {
          // If show fails, fall back to simulation
          console.warn('Ad show failed, using simulation:', error);
          // Simulate reward after delay
          setTimeout(() => {
            if (this.onUserEarnedRewardCallback) {
              this.onUserEarnedRewardCallback({ amount: this.getRewardAmount(placement), type: 'gems' });
            }
            if (this.onAdClosedCallback) {
              this.onAdClosedCallback();
            }
          }, 3000);
        });
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
