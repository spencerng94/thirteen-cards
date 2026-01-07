# AdMob Rewarded Ads & Gem Economy Testing Guide

This guide provides comprehensive instructions for testing AdMob Rewarded Ads integration and the gem economy in your React + Supabase application.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Mock Mode for Development](#mock-mode-for-development)
3. [Test Files Overview](#test-files-overview)
4. [Running Tests](#running-tests)
5. [Manual Testing with AdTestPanel](#manual-testing-with-adtestpanel)
6. [Test Scenarios](#test-scenarios)

## Quick Start

### 1. Enable Mock Mode (Recommended for Development)

Create a `.env` file in your project root:

```bash
VITE_MOCK_ADS=true
```

This enables instant ad rewards (no 30-second wait) for testing Supabase logic.

### 2. Run Automated Tests

```bash
npm test
```

Or run specific test files:

```bash
npm test adIntegration
npm test secureCallback
npm test gemSync
npm test stateManagement
```

### 3. Use the Test Panel Component

Add the `AdTestPanel` component to your app for manual testing:

```tsx
import { AdTestPanel } from './components/AdTestPanel';

// In your component:
<AdTestPanel
  userId={userId}
  profile={profile}
  onRefreshProfile={handleRefreshProfile}
/>
```

## Mock Mode for Development

### What is Mock Mode?

Mock mode bypasses the actual AdMob SDK and instantly rewards gems, allowing you to:
- Test Supabase gem increment logic without waiting 30 seconds
- Verify UI updates and state management
- Test error handling and edge cases
- Develop and debug faster

### How to Enable

**Option 1: Environment Variable (Recommended)**
```bash
# .env
VITE_MOCK_ADS=true
```

**Option 2: Direct Code Change**
```typescript
// constants/AdConfig.ts
export const ENABLE_MOCK_ADS = true; // Only in development!
```

### Mock Mode Behavior

- ✅ Ad initialization: Instant (no SDK loading)
- ✅ Ad loading: Instant (no network request)
- ✅ Ad showing: 500ms delay (for UI feedback)
- ✅ Reward callback: Fired immediately after "ad" completes
- ✅ Supabase call: Executed normally (real database update)

### Disabling Mock Mode

Remove `VITE_MOCK_ADS=true` from `.env` or set it to `false` to use real AdMob SDK.

## Test Files Overview

### 1. `adIntegration.test.ts`

**Purpose:** Verifies AdMob SDK initialization and ad loading.

**Tests:**
- ✅ SDK initializes with correct App ID
- ✅ RewardedAd instance created with correct ad unit ID
- ✅ Event listeners are properly attached
- ✅ Ad loads successfully
- ✅ Error handling works correctly

**Run:**
```bash
npm test adIntegration
```

### 2. `secureCallback.test.ts`

**Purpose:** Ensures secure reward callback logic.

**Tests:**
- ✅ Supabase is NOT called before ad completes
- ✅ Supabase is ONLY called after `onUserEarnedReward` event
- ✅ Early ad close does NOT trigger reward
- ✅ Correct gem amount is passed to Supabase
- ✅ Multiple reward triggers are prevented

**Run:**
```bash
npm test secureCallback
```

### 3. `gemSync.test.tsx`

**Purpose:** Verifies UI gem counter syncs with Supabase.

**Tests:**
- ✅ Initial gem count loads from Supabase
- ✅ Gems refresh after ad reward
- ✅ UI updates immediately after database update
- ✅ Error handling for sync failures
- ✅ useEffect dependency tracking works

**Run:**
```bash
npm test gemSync
```

### 4. `stateManagement.test.tsx`

**Purpose:** Ensures proper button state management.

**Tests:**
- ✅ Button disabled during ad loading
- ✅ Button disabled during ad playing
- ✅ Multiple clicks prevented
- ✅ Button re-enabled after ad completes
- ✅ Correct button text for each state
- ✅ Cooldown state handling

**Run:**
```bash
npm test stateManagement
```

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm test -- --watch
```

### Run Tests with Coverage

```bash
npm test -- --coverage
```

### Run Specific Test File

```bash
npm test adIntegration
npm test secureCallback
npm test gemSync
npm test stateManagement
```

## Manual Testing with AdTestPanel

The `AdTestPanel` component provides a comprehensive UI for manual testing.

### Adding to Your App

1. **Import the component:**
```tsx
import { AdTestPanel } from './components/AdTestPanel';
```

2. **Add a button to open it:**
```tsx
const [showTestPanel, setShowTestPanel] = useState(false);

// In your component:
{showTestPanel && (
  <AdTestPanel
    userId={userId}
    profile={profile}
    onRefreshProfile={handleRefreshProfile}
  />
)}

<button onClick={() => setShowTestPanel(true)}>
  Open Ad Test Panel
</button>
```

### Test Panel Features

- **Ad Integration Test:** Verifies SDK initialization
- **Secure Callback Test:** Tests reward callback flow
- **Gem Sync Test:** Verifies UI updates after reward
- **State Management Test:** Tests button states
- **Run All Tests:** Executes all tests sequentially
- **Manual Watch Ad:** Test ad flow manually
- **Real-time Results:** See test results as they run

## Test Scenarios

### Scenario 1: First-Time Ad Watch

1. User clicks "Watch Ad" button
2. Button becomes disabled (loading state)
3. Ad loads (or instantly in mock mode)
4. Ad plays (or simulates in mock mode)
5. User completes ad
6. `onUserEarnedReward` fires
7. Supabase function called with correct amount
8. UI gem counter updates
9. Button re-enabled

**Expected Result:** ✅ Gems increase by 20, UI updates, button works

### Scenario 2: Early Ad Close

1. User clicks "Watch Ad"
2. Ad starts playing
3. User closes ad early (before completion)
4. `onAdClosed` fires
5. `onUserEarnedReward` does NOT fire
6. Supabase is NOT called
7. Button re-enabled

**Expected Result:** ✅ No gems awarded, button re-enabled

### Scenario 3: Multiple Rapid Clicks

1. User rapidly clicks "Watch Ad" multiple times
2. First click starts ad
3. Subsequent clicks are ignored (button disabled)
4. Only one ad plays
5. Only one reward is given

**Expected Result:** ✅ Only one ad plays, only one reward

### Scenario 4: Network Error During Reward

1. User completes ad
2. `onUserEarnedReward` fires
3. Supabase call fails (network error)
4. Error is handled gracefully
5. User sees error message
6. Button re-enabled

**Expected Result:** ✅ Error handled, no crash, button works

### Scenario 5: Gem Sync After Reward

1. User has 50 gems (displayed in UI)
2. User watches ad (+20 gems)
3. Supabase updates to 70 gems
4. UI automatically refreshes
5. UI shows 70 gems

**Expected Result:** ✅ UI matches database (70 gems)

## Security Best Practices

### ✅ DO:

- Only call Supabase after `onUserEarnedReward` event
- Verify reward amount matches placement
- Handle errors gracefully
- Prevent multiple reward triggers
- Use server-side verification (Supabase RPC functions)

### ❌ DON'T:

- Award gems before ad completes
- Trust client-side state alone
- Allow multiple simultaneous ad requests
- Skip error handling
- Award gems on early ad close

## Troubleshooting

### Tests Fail in Mock Mode

**Issue:** Tests expect real SDK behavior but mock mode is enabled.

**Solution:** Disable mock mode for tests:
```typescript
// In test file
process.env.VITE_MOCK_ADS = 'false';
```

### Ad Not Loading

**Check:**
1. AdMob SDK script loaded correctly
2. App ID is correct
3. Ad unit ID is correct
4. Network connection
5. AdMob account status

### Gems Not Updating in UI

**Check:**
1. `onRefreshProfile` is called after reward
2. `useEffect` dependencies are correct
3. Supabase function returns success
4. Profile fetch is working

### Button Not Disabling

**Check:**
1. `adState` is being tracked correctly
2. `useEffect` subscribes to state changes
3. Button `disabled` prop uses correct state
4. State transitions are working

## Next Steps

1. ✅ Run all automated tests
2. ✅ Test manually with AdTestPanel
3. ✅ Verify in production (with real ads)
4. ✅ Monitor Supabase logs for errors
5. ✅ Track gem transaction history

## Support

For issues or questions:
1. Check test results in AdTestPanel
2. Review Supabase function logs
3. Check browser console for errors
4. Verify AdMob dashboard for ad status

---

**Happy Testing! 🚀**
