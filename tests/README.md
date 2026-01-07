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

## Mock Mode

When `VITE_MOCK_ADS=true`:
- ✅ Ads instantly reward (no 30-second wait)
- ✅ Perfect for testing Supabase logic
- ✅ Fast development iteration

See [AD_TESTING_GUIDE.md](./AD_TESTING_GUIDE.md) for full documentation.
