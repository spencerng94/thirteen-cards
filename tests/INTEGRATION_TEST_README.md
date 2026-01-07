# Integration Test Suite

## Overview

This test suite (`integration.test.tsx`) provides comprehensive integration tests based on the Pre-Launch Bug Bash Checklist. It tests critical user flows with mocked Supabase and AdMob clients to avoid real network calls.

## Test Scenarios

### 1. Economy Loop: AdMob Reward → RPC → Gem Update
- Tests that a successful AdMob reward event triggers the `process_ad_reward` RPC call
- Verifies that the correct user ID and gem amount are passed
- Confirms that local gem_count state updates correctly (+20 gems)

### 2. Social Logic: Add Friend Component
- Tests that clicking 'Add Friend' sends a request to the Supabase friendships table
- Verifies the 'Duplicate Request' scenario by ensuring the button disables after one click
- Uses valid UUID format for user IDs to match database constraints

### 3. Legacy Emote Mapping
- Tests that legacy emote IDs (4, 9, 16) are handled correctly
- Verifies that non-trigger-code emotes render as text (legacy/bot fallback)
- Ensures the VisualEmote component handles both trigger codes and legacy IDs

### 4. Victory Flow: Game Win → Stats → Reset
- Tests that VictoryScreen renders when a game is won
- Verifies that `recordGameResult` writes win data to stats
- Confirms that 'Play Again' button correctly resets game engine state

### 5. Web Safety: AdMob Undefined Handling
- Tests that the app doesn't crash when `window.admob` is undefined
- Verifies that `isSupported` flag is set to false when AdMob is unavailable
- Ensures graceful error handling during AdMob initialization failures

## Running the Tests

```bash
# Run all integration tests
npm test integration.test.tsx

# Run with watch mode
npm test integration.test.tsx --watch

# Run specific test suite
npm test integration.test.tsx --run -t "Economy Loop"
```

## Mock Setup

### Supabase Mock
The Supabase client is fully mocked to avoid real database calls:
- `from()` - Returns a chainable mock for table operations
- `rpc()` - Mocks RPC function calls
- `storage.from().getPublicUrl()` - Mocks file URL generation

### AdMob Mock
The AdMob SDK is mocked via `window.google.mobileads`:
- `initialize()` - Mocks SDK initialization
- `RewardedAd` - Mocks rewarded ad creation
- Event listeners are mocked to simulate ad completion

## Test Data

The tests use mock data that matches the application's type definitions:
- `mockUserProfile` - Complete user profile with all required fields
- `mockPlayers` - Array of player objects for game state
- `mockEmotes` - Array of emote definitions

## Notes

- Tests use valid UUID format for user IDs to match database constraints
- The `processAdReward` function may take the guest path if `VITE_SUPABASE_ANON_KEY` is not set in the test environment
- Some tests use dynamic imports to avoid module resolution issues with Vitest
- Timeout values are adjusted for async operations (ad loading, component rendering)

## Troubleshooting

### Test Timeouts
If tests timeout, increase the timeout value:
```typescript
it('test name', async () => {
  // test code
}, 10000); // 10 second timeout
```

### Module Resolution Issues
If you see "Cannot find module" errors, ensure you're using dynamic imports:
```typescript
const module = await import('../services/supabase');
vi.spyOn(module, 'functionName').mockResolvedValue(...);
```

### UUID Format Errors
Ensure all user IDs use valid UUID format:
```typescript
const userId = '123e4567-e89b-12d3-a456-426614174000';
```
