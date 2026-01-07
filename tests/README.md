# Ad Testing Quick Reference

## Quick Start

### 1. Enable Mock Mode

Add to `.env`:
```bash
VITE_MOCK_ADS=true
```

### 2. Run Tests

```bash
# All tests
npm test

# Specific test
npm test adIntegration
npm test secureCallback
npm test gemSync
npm test stateManagement
npm test integration
```

### 3. Use Test Panel

```tsx
import { AdTestPanel } from '../components/AdTestPanel';

// In your component:
const [showTestPanel, setShowTestPanel] = useState(false);

{showTestPanel && (
  <AdTestPanel
    userId={userId}
    profile={profile}
    onRefreshProfile={handleRefreshProfile}
  />
)}
```

## Test Files

- **adIntegration.test.ts** - SDK initialization and ad loading
- **secureCallback.test.ts** - Reward callback security
- **gemSync.test.tsx** - UI gem counter synchronization
- **stateManagement.test.tsx** - Button state management
- **integration.test.tsx** - Comprehensive integration tests for Pre-Launch Bug Bash scenarios

## Mock Mode

When `VITE_MOCK_ADS=true`:
- ✅ Ads instantly reward (no 30-second wait)
- ✅ Perfect for testing Supabase logic
- ✅ Fast development iteration

## Integration Tests

The `integration.test.tsx` file contains comprehensive integration tests based on the Pre-Launch Bug Bash Checklist:

1. **Economy Loop** - Tests AdMob reward → `process_ad_reward` RPC → gem count update
2. **Social Logic** - Tests Add Friend component and duplicate request prevention
3. **Legacy Emote Mapping** - Tests legacy emote ID mapping to new emojis
4. **Victory Flow** - Tests game win → VictoryScreen → stats update → Play Again reset
5. **Web Safety** - Tests graceful handling when AdMob is undefined

These tests use mocked Supabase and AdMob clients to avoid real network calls.

See [AD_TESTING_GUIDE.md](./AD_TESTING_GUIDE.md) for full documentation.
