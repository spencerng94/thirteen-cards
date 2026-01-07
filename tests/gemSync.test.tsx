/**
 * Gem Sync Test
 * 
 * Tests that the UI gem counter automatically refreshes from Supabase
 * as soon as the database update is confirmed.
 * 
 * Uses React useEffect hook to verify real-time gem updates.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { useState, useEffect } from 'react';
import { fetchProfile, processGemTransaction } from '../services/supabase';
import { adService } from '../services/adService';

// Mock Supabase functions
vi.mock('../services/supabase', () => ({
  fetchProfile: vi.fn(),
  processGemTransaction: vi.fn(),
}));

// Test component that demonstrates gem sync
const GemCounter: React.FC<{ userId: string }> = ({ userId }) => {
  const [gems, setGems] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  // This useEffect simulates the gem sync pattern
  useEffect(() => {
    const refreshGems = async () => {
      setLoading(true);
      try {
        const profile = await fetchProfile(userId);
        if (profile) {
          setGems(profile.gems || 0);
        }
      } catch (error) {
        console.error('Failed to fetch gems:', error);
      } finally {
        setLoading(false);
      }
    };

    refreshGems();
  }, [userId]);

  return (
    <div>
      <div data-testid="gem-count">{gems}</div>
      {loading && <div data-testid="loading">Loading...</div>}
    </div>
  );
};

// Component that watches for gem updates after ad reward
const GemCounterWithAdReward: React.FC<{ userId: string }> = ({ userId }) => {
  const [gems, setGems] = useState<number>(50);
  const [isWatchingAd, setIsWatchingAd] = useState(false);

  // Initial load
  useEffect(() => {
    const loadGems = async () => {
      const profile = await fetchProfile(userId);
      if (profile) {
        setGems(profile.gems || 0);
      }
    };
    loadGems();
  }, [userId]);

  // Watch for gem updates after ad reward
  useEffect(() => {
    if (!isWatchingAd) return;

    const checkForUpdates = async () => {
      const profile = await fetchProfile(userId);
      if (profile && profile.gems !== gems) {
        setGems(profile.gems || 0);
        setIsWatchingAd(false);
      }
    };

    // Poll for updates (in real app, you might use Supabase realtime subscriptions)
    const interval = setInterval(checkForUpdates, 500);
    return () => clearInterval(interval);
  }, [isWatchingAd, userId, gems]);

  const handleWatchAd = async () => {
    setIsWatchingAd(true);
    try {
      await adService.showRewardedAd('inventory', async (amount) => {
        const result = await processGemTransaction(userId, amount, 'ad_reward');
        if (result.success && result.newGemBalance !== undefined) {
          // Trigger refresh
          const profile = await fetchProfile(userId);
          if (profile) {
            setGems(profile.gems || 0);
          }
        }
      });
    } catch (error) {
      console.error('Ad error:', error);
      setIsWatchingAd(false);
    }
  };

  return (
    <div>
      <div data-testid="gem-count">{gems}</div>
      <button 
        data-testid="watch-ad-button"
        onClick={handleWatchAd}
        disabled={isWatchingAd}
      >
        {isWatchingAd ? 'Watching Ad...' : 'Watch Ad'}
      </button>
    </div>
  );
};

describe('Gem Sync Test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetchProfile as any).mockResolvedValue({ gems: 50 });
    (processGemTransaction as any).mockResolvedValue({
      success: true,
      newGemBalance: 70,
    });
  });

  it('should load initial gem count from Supabase', async () => {
    render(<GemCounter userId="test-user" />);

    await waitFor(() => {
      expect(screen.getByTestId('gem-count')).toHaveTextContent('50');
    });

    expect(fetchProfile).toHaveBeenCalledWith('test-user');
  });

  it('should refresh gems after ad reward is processed', async () => {
    // Setup: Initial gems = 50
    (fetchProfile as any)
      .mockResolvedValueOnce({ gems: 50 }) // Initial load
      .mockResolvedValueOnce({ gems: 70 }); // After ad reward

    render(<GemCounterWithAdReward userId="test-user" />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('gem-count')).toHaveTextContent('50');
    });

    // Click watch ad button
    const watchAdButton = screen.getByTestId('watch-ad-button');
    watchAdButton.click();

    // Wait for ad to complete and gems to update
    await waitFor(
      () => {
        expect(screen.getByTestId('gem-count')).toHaveTextContent('70');
      },
      { timeout: 3000 }
    );

    // Verify Supabase was called
    expect(processGemTransaction).toHaveBeenCalledWith(
      'test-user',
      20,
      'ad_reward'
    );

    // Verify profile was fetched again to sync gems
    expect(fetchProfile).toHaveBeenCalledTimes(2);
  });

  it('should update UI immediately after Supabase confirms gem increment', async () => {
    let gemUpdateCallback: (() => void) | null = null;

    // Mock fetchProfile to allow manual triggering of updates
    (fetchProfile as any).mockImplementation(async (userId: string) => {
      if (gemUpdateCallback) {
        gemUpdateCallback();
      }
      return { gems: 70 };
    });

    render(<GemCounterWithAdReward userId="test-user" />);

    await waitFor(() => {
      expect(screen.getByTestId('gem-count')).toHaveTextContent('50');
    });

    // Simulate ad reward completion
    const watchAdButton = screen.getByTestId('watch-ad-button');
    watchAdButton.click();

    // Wait for gem update
    await waitFor(
      () => {
        expect(screen.getByTestId('gem-count')).toHaveTextContent('70');
      },
      { timeout: 3000 }
    );
  });

  it('should handle gem sync errors gracefully', async () => {
    (fetchProfile as any)
      .mockResolvedValueOnce({ gems: 50 })
      .mockRejectedValueOnce(new Error('Network error'));

    render(<GemCounterWithAdReward userId="test-user" />);

    await waitFor(() => {
      expect(screen.getByTestId('gem-count')).toHaveTextContent('50');
    });

    const watchAdButton = screen.getByTestId('watch-ad-button');
    watchAdButton.click();

    // Should not crash, gems should remain at previous value
    await waitFor(() => {
      expect(screen.getByTestId('gem-count')).toHaveTextContent('50');
    });
  });

  it('should sync gems using useEffect dependency on profile updates', async () => {
    const TestComponent: React.FC<{ userId: string }> = ({ userId }) => {
      const [gems, setGems] = useState<number>(0);
      const [refreshTrigger, setRefreshTrigger] = useState(0);

      useEffect(() => {
        const syncGems = async () => {
          const profile = await fetchProfile(userId);
          if (profile) {
            setGems(profile.gems || 0);
          }
        };
        syncGems();
      }, [userId, refreshTrigger]);

      const handleAdComplete = async () => {
        await processGemTransaction(userId, 20, 'ad_reward');
        // Trigger refresh
        setRefreshTrigger(prev => prev + 1);
      };

      return (
        <div>
          <div data-testid="gem-count">{gems}</div>
          <button data-testid="trigger-refresh" onClick={handleAdComplete}>
            Complete Ad
          </button>
        </div>
      );
    };

    (fetchProfile as any)
      .mockResolvedValueOnce({ gems: 50 })
      .mockResolvedValueOnce({ gems: 70 });

    render(<TestComponent userId="test-user" />);

    await waitFor(() => {
      expect(screen.getByTestId('gem-count')).toHaveTextContent('50');
    });

    const refreshButton = screen.getByTestId('trigger-refresh');
    refreshButton.click();

    await waitFor(() => {
      expect(screen.getByTestId('gem-count')).toHaveTextContent('70');
    });
  });
});
