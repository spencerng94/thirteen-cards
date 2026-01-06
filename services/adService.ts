/**
 * AdService - Handles rewarded video ad logic
 * Simulates AdMob integration for development, ready for production AdMob integration
 */

export type AdPlacement = 'inventory' | 'shop' | 'victory';

export type AdState = 'idle' | 'loading' | 'playing' | 'rewarded' | 'error';

interface AdCooldown {
  placement: AdPlacement;
  timestamp: number;
}

const COOLDOWN_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds
const STORAGE_KEY = 'thirteen_ad_cooldowns';

export class AdService {
  private static instance: AdService;
  private state: AdState = 'idle';
  private listeners: Map<AdPlacement, (state: AdState) => void> = new Map();

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
   * Request and show a rewarded ad
   */
  async showRewardedAd(
    placement: AdPlacement,
    onReward: (amount: number) => Promise<void>
  ): Promise<boolean> {
    // Check cooldown
    if (!this.isAdAvailable(placement)) {
      throw new Error(`Ad is on cooldown. Available in ${this.getCooldownString(placement)}`);
    }

    // Set loading state
    this.setState('loading', placement);

    try {
      // Simulate ad loading (in production, this would initialize AdMob)
      await this.simulateAdLoad();

      // Set playing state
      this.setState('playing', placement);

      // Simulate ad playback (in production, this would show the actual ad)
      await this.simulateAdPlayback();

      // Ad completed successfully
      this.setState('rewarded', placement);

      // Call reward callback
      await onReward(this.getRewardAmount(placement));

      // Set cooldown
      this.setCooldown(placement);

      // Reset state after a delay
      setTimeout(() => {
        this.setState('idle', placement);
      }, 2000);

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
   * Get reward amount based on placement
   */
  private getRewardAmount(placement: AdPlacement): number {
    switch (placement) {
      case 'inventory':
      case 'shop':
        return 20; // 20 gems
      case 'victory':
        return 5; // 5 gems (or double gold handled separately)
      default:
        return 20;
    }
  }

  /**
   * Simulate ad loading (replace with actual AdMob initialization)
   */
  private async simulateAdLoad(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, 500); // Simulate 500ms load time
    });
  }

  /**
   * Simulate ad playback (replace with actual AdMob ad display)
   */
  private async simulateAdPlayback(): Promise<void> {
    return new Promise((resolve) => {
      // In production, this would wait for the actual ad to finish
      // For now, simulate a 3-second ad
      setTimeout(resolve, 3000);
    });
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
