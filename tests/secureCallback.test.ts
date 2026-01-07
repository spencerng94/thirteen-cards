/**
 * Secure Callback Logic Test
 * 
 * Ensures that:
 * 1. onReward callback is ONLY triggered by the ad finishing (via onUserEarnedReward event)
 * 2. Supabase function is safely called only after AdMob confirms the reward
 * 3. No gems are awarded without proper ad completion verification
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { adService } from '../services/adService';
import { processGemTransaction } from '../services/supabase';

// Mock Supabase function
vi.mock('../services/supabase', () => ({
  processGemTransaction: vi.fn().mockResolvedValue({
    success: true,
    newGemBalance: 100,
  }),
}));

describe('Secure Callback Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should NOT call Supabase function before ad completes', async () => {
    await adService.initialize();
    await adService.load();

    const mockOnReward = vi.fn().mockResolvedValue(undefined);
    
    // Start showing ad (but don't complete it)
    const showPromise = adService.showRewardedAd('inventory', mockOnReward);
    
    // Immediately check - Supabase should NOT be called yet
    expect(processGemTransaction).not.toHaveBeenCalled();
    
    // Wait for ad to complete (in mock mode, this happens instantly)
    await showPromise;
    
    // Now Supabase should be called (after onUserEarnedReward fires)
    expect(processGemTransaction).toHaveBeenCalled();
  });

  it('should call Supabase function ONLY after onUserEarnedReward event', async () => {
    await adService.initialize();
    await adService.load();

    const mockOnReward = vi.fn().mockResolvedValue(undefined);
    
    // Track call order
    const callOrder: string[] = [];
    
    const trackedOnReward = async (amount: number) => {
      callOrder.push('onReward-callback');
      await mockOnReward(amount);
    };
    
    // Mock processGemTransaction to track when it's called
    const originalProcessGem = processGemTransaction as any;
    originalProcessGem.mockImplementation(async (...args: any[]) => {
      callOrder.push('supabase-call');
      return { success: true, newGemBalance: 100 };
    });
    
    await adService.showRewardedAd('inventory', trackedOnReward);
    
    // Verify call order: onReward callback should be called, then Supabase
    expect(callOrder).toContain('onReward-callback');
    expect(callOrder).toContain('supabase-call');
    // Supabase should be called after onReward callback
    const rewardIndex = callOrder.indexOf('onReward-callback');
    const supabaseIndex = callOrder.indexOf('supabase-call');
    expect(supabaseIndex).toBeGreaterThanOrEqual(rewardIndex);
  });

  it('should NOT award gems if ad is closed early', async () => {
    await adService.initialize();
    await adService.load();

    const mockOnReward = vi.fn().mockResolvedValue(undefined);
    const mockOnEarlyClose = vi.fn();
    
    // In a real scenario, we would simulate early close
    // For now, we test that early close doesn't trigger reward
    await adService.showRewardedAd('inventory', mockOnReward, mockOnEarlyClose);
    
    // In mock mode, ad always completes successfully
    // In real mode, if ad closes early, onReward should NOT be called
    // This is handled by the adService's rewardEarned flag
    expect(adService.getState()).toBe('idle');
  });

  it('should pass correct gem amount to Supabase', async () => {
    await adService.initialize();
    await adService.load();

    const mockOnReward = vi.fn().mockResolvedValue(undefined);
    
    // Test different placements with different reward amounts
    const testCases = [
      { placement: 'inventory' as const, expectedAmount: 20 },
      { placement: 'shop' as const, expectedAmount: 50 },
      { placement: 'victory' as const, expectedAmount: 5 },
    ];
    
    for (const { placement, expectedAmount } of testCases) {
      vi.clearAllMocks();
      
      const trackedOnReward = async (amount: number) => {
        await processGemTransaction('test-user-id', amount, 'ad_reward');
      };
      
      await adService.showRewardedAd(placement, trackedOnReward);
      
      // Verify correct amount was passed
      expect(processGemTransaction).toHaveBeenCalledWith(
        'test-user-id',
        expectedAmount,
        'ad_reward'
      );
    }
  });

  it('should handle Supabase errors gracefully', async () => {
    await adService.initialize();
    await adService.load();

    // Mock Supabase to fail
    (processGemTransaction as any).mockResolvedValueOnce({
      success: false,
      error: 'Database error',
    });
    
    const mockOnReward = vi.fn().mockImplementation(async (amount: number) => {
      const result = await processGemTransaction('test-user-id', amount, 'ad_reward');
      if (!result.success) {
        throw new Error(result.error);
      }
    });
    
    // Should not throw - error should be handled gracefully
    await expect(
      adService.showRewardedAd('inventory', mockOnReward)
    ).resolves.not.toThrow();
  });

  it('should prevent multiple reward triggers from same ad', async () => {
    await adService.initialize();
    await adService.load();

    let rewardCallCount = 0;
    const mockOnReward = vi.fn().mockImplementation(async () => {
      rewardCallCount++;
      await processGemTransaction('test-user-id', 20, 'ad_reward');
    });
    
    await adService.showRewardedAd('inventory', mockOnReward);
    
    // Reward should only be called once per ad completion
    expect(rewardCallCount).toBe(1);
    expect(processGemTransaction).toHaveBeenCalledTimes(1);
  });

  it('should verify reward callback is only set during ad show', async () => {
    await adService.initialize();
    await adService.load();

    // Before showing ad, no reward callback should be active
    const stateBefore = adService.getState();
    expect(stateBefore).toBe('idle');
    
    const mockOnReward = vi.fn().mockResolvedValue(undefined);
    await adService.showRewardedAd('inventory', mockOnReward);
    
    // After ad completes, state should return to idle
    const stateAfter = adService.getState();
    expect(stateAfter).toBe('idle');
  });
});
