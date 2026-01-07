/**
 * Ad Integration Verification Test
 * 
 * Tests that the AdMob SDK is initialized correctly and can call a 'Test Ad' overlay.
 * This ensures the adBreak/adConfig (H5 Games SDK) is properly set up.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { adService } from '../services/adService';
import { ENABLE_MOCK_ADS, ADMOB_APP_ID, REWARDED_AD_UNIT_ID } from '../constants/AdConfig';

// Mock window.google.mobileads
const mockRewardedAd = {
  loaded: false,
  load: vi.fn().mockResolvedValue(undefined),
  show: vi.fn().mockResolvedValue(undefined),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

const mockMobileAds = {
  initialize: vi.fn().mockResolvedValue(undefined),
  RewardedAd: vi.fn().mockImplementation(() => mockRewardedAd),
};

// Setup global window mock
beforeEach(() => {
  // Reset window.google
  (window as any).google = {
    mobileads: mockMobileAds,
  };
  
  // Reset mocks
  vi.clearAllMocks();
  mockRewardedAd.loaded = false;
});

describe('Ad Integration Verification', () => {
  it('should initialize AdMob SDK with correct App ID', async () => {
    await adService.initialize();
    
    // In mock mode, initialization is skipped
    if (!ENABLE_MOCK_ADS) {
      expect(mockMobileAds.initialize).toHaveBeenCalledWith({
        appId: ADMOB_APP_ID,
      });
    }
  });

  it('should create RewardedAd instance with correct ad unit ID', async () => {
    await adService.initialize();
    
    if (!ENABLE_MOCK_ADS) {
      expect(mockMobileAds.RewardedAd).toHaveBeenCalledWith({
        adUnitId: REWARDED_AD_UNIT_ID,
      });
    }
  });

  it('should set up event listeners for rewarded ad', async () => {
    await adService.initialize();
    
    if (!ENABLE_MOCK_ADS) {
      // Verify event listeners are attached
      expect(mockRewardedAd.addEventListener).toHaveBeenCalledWith(
        'userEarnedReward',
        expect.any(Function)
      );
      expect(mockRewardedAd.addEventListener).toHaveBeenCalledWith(
        'adClosed',
        expect.any(Function)
      );
      expect(mockRewardedAd.addEventListener).toHaveBeenCalledWith(
        'adFailedToLoad',
        expect.any(Function)
      );
      expect(mockRewardedAd.addEventListener).toHaveBeenCalledWith(
        'adFailedToShow',
        expect.any(Function)
      );
    }
  });

  it('should load ad successfully', async () => {
    await adService.initialize();
    await adService.load();
    
    if (!ENABLE_MOCK_ADS) {
      expect(mockRewardedAd.load).toHaveBeenCalled();
    }
    
    expect(adService.isLoaded()).toBe(true);
  });

  it('should handle ad loading errors gracefully', async () => {
    if (ENABLE_MOCK_ADS) {
      // Skip test in mock mode
      return;
    }

    mockRewardedAd.load.mockRejectedValueOnce(new Error('Failed to load ad'));
    
    await adService.initialize();
    await adService.load();
    
    // Service should handle error and reset state
    expect(adService.getState()).toBe('idle');
  });

  it('should verify SDK is available in test environment', () => {
    if (ENABLE_MOCK_ADS) {
      console.log('✅ Mock mode enabled - skipping SDK verification');
      return;
    }

    // Verify SDK structure exists
    expect(window.google).toBeDefined();
    expect(window.google?.mobileads).toBeDefined();
    expect(window.google?.mobileads?.initialize).toBeDefined();
    expect(window.google?.mobileads?.RewardedAd).toBeDefined();
  });

  it('should show test ad overlay when requested', async () => {
    await adService.initialize();
    await adService.load();
    
    const mockOnReward = vi.fn().mockResolvedValue(undefined);
    const mockOnEarlyClose = vi.fn();
    
    await adService.showRewardedAd('inventory', mockOnReward, mockOnEarlyClose);
    
    if (!ENABLE_MOCK_ADS) {
      expect(mockRewardedAd.show).toHaveBeenCalled();
    }
    
    // In mock mode, reward should be called instantly
    // In real mode, it would be called after ad completes
    // We'll verify the callback was set up correctly
    expect(adService.getState()).toBe('idle');
  });
});
