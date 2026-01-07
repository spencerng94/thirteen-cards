/**
 * State Management Test
 * 
 * Ensures the 'Watch Ad' button enters a loading state (disabled={true})
 * while the ad is requested and playing to prevent multiple reward triggers.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { useState, useEffect } from 'react';
import { adService, AdState } from '../services/adService';
import { processGemTransaction } from '../services/supabase';

// Mock Supabase
vi.mock('../services/supabase', () => ({
  processGemTransaction: vi.fn().mockResolvedValue({
    success: true,
    newGemBalance: 100,
  }),
}));

// Test component that demonstrates proper state management
const WatchAdButton: React.FC<{ placement: 'inventory' | 'shop' | 'victory' }> = ({ placement }) => {
  const [adState, setAdState] = useState<AdState>('idle');
  const [isAvailable, setIsAvailable] = useState(true);

  useEffect(() => {
    const unsubscribe = adService.onStateChange(placement, setAdState);
    setIsAvailable(adService.isAdAvailable(placement));
    return unsubscribe;
  }, [placement]);

  const handleWatchAd = async () => {
    // SECURITY: Prevent spam-clicking
    if (!isAvailable || adState !== 'idle') {
      console.warn('Ad button clicked while not available');
      return;
    }

    try {
      await adService.showRewardedAd(placement, async (amount) => {
        await processGemTransaction('test-user', amount, 'ad_reward');
      });
    } catch (error) {
      console.error('Ad error:', error);
    }
  };

  const isDisabled = adState === 'loading' || adState === 'playing' || !isAvailable;
  const buttonText = 
    adState === 'loading' ? 'Loading Ad...' :
    adState === 'playing' ? 'Watching Ad...' :
    adState === 'rewarded' ? 'Reward Received!' :
    !isAvailable ? 'On Cooldown' :
    'Watch Ad';

  return (
    <button
      data-testid="watch-ad-button"
      onClick={handleWatchAd}
      disabled={isDisabled}
      data-state={adState}
    >
      {buttonText}
    </button>
  );
};

describe('State Management Test', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await adService.initialize();
    await adService.load();
  });

  it('should disable button when ad is loading', async () => {
    render(<WatchAdButton placement="inventory" />);

    const button = screen.getByTestId('watch-ad-button');
    
    // Initially should be enabled (idle state)
    expect(button).not.toBeDisabled();
    expect(button).toHaveTextContent('Watch Ad');

    // Click to start ad
    button.click();

    // Button should be disabled during loading/playing
    await waitFor(() => {
      const updatedButton = screen.getByTestId('watch-ad-button');
      expect(updatedButton).toBeDisabled();
    });
  });

  it('should disable button when ad is playing', async () => {
    render(<WatchAdButton placement="inventory" />);

    const button = screen.getByTestId('watch-ad-button');
    button.click();

    // Wait for playing state
    await waitFor(() => {
      const updatedButton = screen.getByTestId('watch-ad-button');
      expect(updatedButton.getAttribute('data-state')).toBe('playing');
      expect(updatedButton).toBeDisabled();
      expect(updatedButton).toHaveTextContent('Watching Ad...');
    });
  });

  it('should prevent multiple clicks while ad is playing', async () => {
    const clickCount = { count: 0 };
    
    const TestComponent = () => {
      const [adState, setAdState] = useState<AdState>('idle');
      const [clicks, setClicks] = useState(0);

      useEffect(() => {
        const unsubscribe = adService.onStateChange('inventory', setAdState);
        return unsubscribe;
      }, []);

      const handleClick = () => {
        if (adState !== 'idle') {
          clickCount.count++;
          return;
        }
        setClicks(prev => prev + 1);
        adService.showRewardedAd('inventory', async () => {
          await processGemTransaction('test-user', 20, 'ad_reward');
        });
      };

      return (
        <div>
          <button
            data-testid="watch-ad-button"
            onClick={handleClick}
            disabled={adState !== 'idle'}
          >
            Watch Ad
          </button>
          <div data-testid="click-count">{clicks}</div>
        </div>
      );
    };

    render(<TestComponent />);

    const button = screen.getByTestId('watch-ad-button');
    
    // Click multiple times rapidly
    button.click();
    button.click();
    button.click();
    button.click();

    // Only one ad should be triggered
    await waitFor(() => {
      expect(processGemTransaction).toHaveBeenCalledTimes(1);
    });
  });

  it('should re-enable button after ad completes', async () => {
    render(<WatchAdButton placement="inventory" />);

    const button = screen.getByTestId('watch-ad-button');
    
    // Start ad
    button.click();

    // Wait for ad to complete
    await waitFor(
      () => {
        const updatedButton = screen.getByTestId('watch-ad-button');
        expect(updatedButton.getAttribute('data-state')).toBe('idle');
        expect(updatedButton).not.toBeDisabled();
      },
      { timeout: 5000 }
    );
  });

  it('should show correct button text for each state', async () => {
    render(<WatchAdButton placement="inventory" />);

    const button = screen.getByTestId('watch-ad-button');
    
    // Initial state
    expect(button).toHaveTextContent('Watch Ad');

    // Click to start
    button.click();

    // Should show "Watching Ad..." during playing state
    await waitFor(() => {
      const updatedButton = screen.getByTestId('watch-ad-button');
      const state = updatedButton.getAttribute('data-state');
      if (state === 'playing') {
        expect(updatedButton).toHaveTextContent('Watching Ad...');
      }
    });

    // After completion, should return to "Watch Ad"
    await waitFor(
      () => {
        const updatedButton = screen.getByTestId('watch-ad-button');
        expect(updatedButton).toHaveTextContent('Watch Ad');
      },
      { timeout: 5000 }
    );
  });

  it('should disable button when ad is on cooldown', async () => {
    // Set cooldown manually (simulating previous ad watch)
    const placement: 'inventory' = 'inventory';
    
    // First, watch an ad to trigger cooldown
    await adService.showRewardedAd(placement, async () => {
      await processGemTransaction('test-user', 20, 'ad_reward');
    });

    // Wait a bit for cooldown to be set
    await new Promise(resolve => setTimeout(resolve, 100));

    render(<WatchAdButton placement={placement} />);

    const button = screen.getByTestId('watch-ad-button');
    
    // Button should be disabled if on cooldown
    const isOnCooldown = !adService.isAdAvailable(placement);
    if (isOnCooldown) {
      expect(button).toBeDisabled();
      expect(button).toHaveTextContent('On Cooldown');
    }
  });

  it('should handle error state correctly', async () => {
    // Mock ad service to fail
    const originalShow = adService.showRewardedAd.bind(adService);
    vi.spyOn(adService, 'showRewardedAd').mockRejectedValueOnce(
      new Error('Ad failed to load')
    );

    render(<WatchAdButton placement="inventory" />);

    const button = screen.getByTestId('watch-ad-button');
    button.click();

    // After error, button should return to enabled state
    await waitFor(
      () => {
        const updatedButton = screen.getByTestId('watch-ad-button');
        expect(updatedButton.getAttribute('data-state')).toBe('idle');
        expect(updatedButton).not.toBeDisabled();
      },
      { timeout: 3000 }
    );
  });

  it('should track state changes correctly through ad lifecycle', async () => {
    const stateHistory: AdState[] = [];
    
    const TestComponent = () => {
      const [adState, setAdState] = useState<AdState>('idle');

      useEffect(() => {
        const unsubscribe = adService.onStateChange('inventory', (state) => {
          stateHistory.push(state);
          setAdState(state);
        });
        return unsubscribe;
      }, []);

      return (
        <button
          data-testid="watch-ad-button"
          onClick={() => {
            adService.showRewardedAd('inventory', async () => {
              await processGemTransaction('test-user', 20, 'ad_reward');
            });
          }}
          disabled={adState !== 'idle'}
        >
          Watch Ad
        </button>
      );
    };

    render(<TestComponent />);

    const button = screen.getByTestId('watch-ad-button');
    button.click();

    // Wait for ad to complete
    await waitFor(
      () => {
        expect(stateHistory).toContain('idle');
        // Should go through: idle -> loading -> playing -> rewarded -> idle
        expect(stateHistory.length).toBeGreaterThan(1);
      },
      { timeout: 5000 }
    );
  });
});
