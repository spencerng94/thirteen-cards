/**
 * Ad Test Panel Component
 * 
 * Comprehensive test panel for AdMob Rewarded Ads and gem economy.
 * Use this component to manually test all ad functionality.
 * 
 * Usage:
 * 1. Add <AdTestPanel /> to your app (e.g., in Lobby or Settings)
 * 2. Enable mock mode by setting VITE_MOCK_ADS=true in .env
 * 3. Test all ad flows and gem sync
 */

import React, { useState, useEffect } from 'react';
import { adService, AdState, AdPlacement } from '../services/adService';
import { processGemTransaction, fetchProfile } from '../services/supabase';
import { ENABLE_MOCK_ADS } from '../constants/AdConfig';
import { UserProfile } from '../types';

interface AdTestPanelProps {
  userId: string;
  profile: UserProfile | null;
  onRefreshProfile: () => void;
  onClose?: () => void;
}

export const AdTestPanel: React.FC<AdTestPanelProps> = ({
  userId,
  profile,
  onRefreshProfile,
  onClose,
}) => {
  const [adState, setAdState] = useState<AdState>('idle');
  const [placement, setPlacement] = useState<AdPlacement>('inventory');
  const [testResults, setTestResults] = useState<string[]>([]);
  const [gemsBefore, setGemsBefore] = useState<number>(0);
  const [gemsAfter, setGemsAfter] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = adService.onStateChange(placement, setAdState);
    return unsubscribe;
  }, [placement]);

  useEffect(() => {
    if (profile) {
      setGemsBefore(profile.gems || 0);
    }
  }, [profile]);

  const addTestResult = (message: string, success: boolean = true) => {
    const timestamp = new Date().toLocaleTimeString();
    const icon = success ? '✅' : '❌';
    setTestResults(prev => [`${icon} [${timestamp}] ${message}`, ...prev]);
  };

  // Test 1: Ad Integration Verification
  const testAdIntegration = async () => {
    addTestResult('Testing Ad Integration...');
    setIsLoading(true);

    try {
      await adService.initialize();
      addTestResult('AdMob SDK initialized', true);

      await adService.load();
      const isLoaded = adService.isLoaded();
      addTestResult(`Ad loaded: ${isLoaded}`, isLoaded);

      if (ENABLE_MOCK_ADS) {
        addTestResult('🎭 Mock Mode Enabled - Instant rewards for testing', true);
      } else {
        addTestResult('Using real AdMob SDK', true);
      }
    } catch (error: any) {
      addTestResult(`Ad integration failed: ${error.message}`, false);
    } finally {
      setIsLoading(false);
    }
  };

  // Test 2: Secure Callback Logic
  const testSecureCallback = async () => {
    addTestResult('Testing Secure Callback Logic...');
    setIsLoading(true);

    let rewardCallbackCalled = false;
    let supabaseCalled = false;
    const callOrder: string[] = [];

    try {
      const onReward = async (amount: number) => {
        rewardCallbackCalled = true;
        callOrder.push('onReward');
        addTestResult(`Reward callback triggered with ${amount} gems`, true);

        // Call Supabase
        const result = await processGemTransaction(userId, amount, 'ad_reward');
        supabaseCalled = true;
        callOrder.push('supabase');

        if (result.success) {
          addTestResult('Supabase function called successfully', true);
          addTestResult(`Call order: ${callOrder.join(' -> ')}`, true);
        } else {
          addTestResult(`Supabase error: ${result.error}`, false);
        }
      };

      await adService.showRewardedAd(placement, onReward);

      // Verify callback was called
      if (rewardCallbackCalled && supabaseCalled) {
        addTestResult('✅ Secure callback test passed', true);
      } else {
        addTestResult('❌ Secure callback test failed', false);
      }
    } catch (error: any) {
      addTestResult(`Secure callback test error: ${error.message}`, false);
    } finally {
      setIsLoading(false);
    }
  };

  // Test 3: Gem Sync Test
  const testGemSync = async () => {
    addTestResult('Testing Gem Sync...');
    setIsLoading(true);

    try {
      // Get initial gem count
      const initialProfile = await fetchProfile(userId);
      const initialGems = initialProfile?.gems || 0;
      setGemsBefore(initialGems);
      addTestResult(`Initial gems: ${initialGems}`, true);

      // Watch ad
      await adService.showRewardedAd(placement, async (amount) => {
        const result = await processGemTransaction(userId, amount, 'ad_reward');
        if (result.success) {
          addTestResult(`Gems incremented in Supabase: ${result.newGemBalance}`, true);

          // Refresh profile to sync
          const updatedProfile = await fetchProfile(userId);
          const updatedGems = updatedProfile?.gems || 0;
          setGemsAfter(updatedGems);

          if (updatedGems === result.newGemBalance) {
            addTestResult('✅ Gem sync successful - UI matches database', true);
          } else {
            addTestResult(
              `⚠️ Gem sync mismatch: UI=${updatedGems}, DB=${result.newGemBalance}`,
              false
            );
          }
        }
      });

      // Trigger profile refresh
      onRefreshProfile();
    } catch (error: any) {
      addTestResult(`Gem sync test error: ${error.message}`, false);
    } finally {
      setIsLoading(false);
    }
  };

  // Test 4: State Management Test
  const testStateManagement = async () => {
    addTestResult('Testing State Management...');
    setIsLoading(true);

    const stateHistory: AdState[] = [];
    const unsubscribe = adService.onStateChange(placement, (state) => {
      stateHistory.push(state);
      addTestResult(`State changed: ${state}`, true);
    });

    try {
      // Verify initial state
      const initialState = adService.getState();
      addTestResult(`Initial state: ${initialState}`, initialState === 'idle');

      // Start ad
      await adService.showRewardedAd(placement, async (amount) => {
        await processGemTransaction(userId, amount, 'ad_reward');
      });

      // Verify final state
      const finalState = adService.getState();
      addTestResult(`Final state: ${finalState}`, finalState === 'idle');

      // Verify state transitions
      const hasLoading = stateHistory.includes('loading');
      const hasPlaying = stateHistory.includes('playing');
      addTestResult(`State transitions: ${stateHistory.join(' -> ')}`, true);
      addTestResult(`Button disabled during loading: ${hasLoading}`, hasLoading);
      addTestResult(`Button disabled during playing: ${hasPlaying}`, hasPlaying);
    } catch (error: any) {
      addTestResult(`State management test error: ${error.message}`, false);
    } finally {
      unsubscribe();
      setIsLoading(false);
    }
  };

  // Run all tests
  const runAllTests = async () => {
    setTestResults([]);
    addTestResult('🚀 Starting comprehensive ad tests...', true);

    await testAdIntegration();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await testSecureCallback();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await testGemSync();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await testStateManagement();
    addTestResult('✨ All tests completed!', true);
  };

  const isAvailable = adService.isAdAvailable(placement);
  const cooldownString = adService.getCooldownString(placement);
  const isDisabled = adState === 'loading' || adState === 'playing' || !isAvailable || isLoading;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-gray-900 to-black border-2 border-white/20 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black text-white">Ad Test Panel</h2>
          <button
            onClick={() => onClose?.()}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm font-bold transition-colors"
          >
            Close
          </button>
        </div>

        {/* Mock Mode Indicator */}
        {ENABLE_MOCK_ADS && (
          <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
            <p className="text-yellow-400 text-sm font-bold">
              🎭 Mock Mode Enabled - Ads will instantly reward for testing
            </p>
          </div>
        )}

        {/* Current State */}
        <div className="mb-6 p-4 bg-white/5 rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-white/60">Ad State:</span>
              <span className="ml-2 text-white font-bold">{adState}</span>
            </div>
            <div>
              <span className="text-white/60">Available:</span>
              <span className={`ml-2 font-bold ${isAvailable ? 'text-green-400' : 'text-red-400'}`}>
                {isAvailable ? 'Yes' : `No (${cooldownString})`}
              </span>
            </div>
            <div>
              <span className="text-white/60">Gems Before:</span>
              <span className="ml-2 text-white font-bold">{gemsBefore}</span>
            </div>
            <div>
              <span className="text-white/60">Gems After:</span>
              <span className="ml-2 text-white font-bold">{gemsAfter}</span>
            </div>
          </div>
        </div>

        {/* Placement Selector */}
        <div className="mb-4">
          <label className="block text-white/60 text-sm mb-2">Placement:</label>
          <select
            value={placement}
            onChange={(e) => setPlacement(e.target.value as AdPlacement)}
            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
            disabled={isDisabled}
          >
            <option value="inventory">Inventory (20 gems)</option>
            <option value="shop">Shop (50 gems)</option>
            <option value="victory">Victory (5 gems)</option>
          </select>
        </div>

        {/* Test Buttons */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={testAdIntegration}
            disabled={isDisabled}
            className="px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-400 rounded-lg text-white font-bold transition-colors"
          >
            Test Integration
          </button>
          <button
            onClick={testSecureCallback}
            disabled={isDisabled}
            className="px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-400 rounded-lg text-white font-bold transition-colors"
          >
            Test Callback
          </button>
          <button
            onClick={testGemSync}
            disabled={isDisabled}
            className="px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-400 rounded-lg text-white font-bold transition-colors"
          >
            Test Gem Sync
          </button>
          <button
            onClick={testStateManagement}
            disabled={isDisabled}
            className="px-4 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 disabled:text-gray-400 rounded-lg text-white font-bold transition-colors"
          >
            Test State
          </button>
        </div>

        {/* Run All Tests */}
        <button
          onClick={runAllTests}
          disabled={isDisabled}
          className="w-full mb-6 px-4 py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-400 rounded-lg text-white font-black text-lg transition-all"
        >
          🚀 Run All Tests
        </button>

        {/* Manual Watch Ad Button */}
        <button
          onClick={async () => {
            setIsLoading(true);
            try {
              await adService.showRewardedAd(placement, async (amount) => {
                const result = await processGemTransaction(userId, amount, 'ad_reward');
                if (result.success) {
                  addTestResult(`✅ Reward received: +${amount} gems`, true);
                  onRefreshProfile();
                }
              });
            } catch (error: any) {
              addTestResult(`❌ Ad error: ${error.message}`, false);
            } finally {
              setIsLoading(false);
            }
          }}
          disabled={isDisabled}
          className="w-full mb-6 px-4 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-400 rounded-lg text-white font-black text-lg transition-all"
        >
          {adState === 'loading' ? 'Loading Ad...' :
           adState === 'playing' ? 'Watching Ad...' :
           !isAvailable ? `On Cooldown (${cooldownString})` :
           'Watch Ad (+20 Gems)'}
        </button>

        {/* Test Results */}
        <div className="bg-black/50 rounded-lg p-4 max-h-64 overflow-y-auto">
          <h3 className="text-white font-bold mb-3">Test Results:</h3>
          {testResults.length === 0 ? (
            <p className="text-white/40 text-sm">No tests run yet</p>
          ) : (
            <div className="space-y-1">
              {testResults.map((result, index) => (
                <div key={index} className="text-sm font-mono text-white/80">
                  {result}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
