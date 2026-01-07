# AdTestPanel Integration Example

## Quick Integration

### Option 1: Add to Settings Modal

```tsx
// components/SettingsModal.tsx
import { useState } from 'react';
import { AdTestPanel } from './AdTestPanel';

export const SettingsModal: React.FC<{ profile: UserProfile; onRefresh: () => void }> = ({ 
  profile, 
  onRefresh 
}) => {
  const [showAdTest, setShowAdTest] = useState(false);

  return (
    <>
      {/* Your existing settings UI */}
      <button onClick={() => setShowAdTest(true)}>
        Test Ads
      </button>

      {showAdTest && (
        <AdTestPanel
          userId={profile.id}
          profile={profile}
          onRefreshProfile={onRefresh}
          onClose={() => setShowAdTest(false)}
        />
      )}
    </>
  );
};
```

### Option 2: Add to Lobby (Development Only)

```tsx
// components/Lobby.tsx
import { useState } from 'react';
import { AdTestPanel } from './AdTestPanel';

export const Lobby: React.FC<{ profile: UserProfile; onRefresh: () => void }> = ({ 
  profile, 
  onRefresh 
}) => {
  const [showAdTest, setShowAdTest] = useState(false);

  // Only show in development
  const isDev = import.meta.env.DEV;

  return (
    <>
      {/* Your existing lobby UI */}
      
      {isDev && (
        <>
          <button 
            onClick={() => setShowAdTest(true)}
            className="fixed bottom-4 right-4 bg-purple-600 text-white px-4 py-2 rounded-lg"
          >
            🧪 Test Ads
          </button>

          {showAdTest && (
            <AdTestPanel
              userId={profile.id}
              profile={profile}
              onRefreshProfile={onRefresh}
              onClose={() => setShowAdTest(false)}
            />
          )}
        </>
      )}
    </>
  );
};
```

### Option 3: Keyboard Shortcut (Development)

```tsx
// components/Lobby.tsx or App.tsx
import { useEffect, useState } from 'react';
import { AdTestPanel } from './AdTestPanel';

export const App: React.FC = () => {
  const [showAdTest, setShowAdTest] = useState(false);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Press Ctrl+Shift+A to open test panel (dev only)
      if (import.meta.env.DEV && e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        setShowAdTest(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <>
      {/* Your app */}
      {showAdTest && profile && (
        <AdTestPanel
          userId={profile.id}
          profile={profile}
          onRefreshProfile={handleRefreshProfile}
          onClose={() => setShowAdTest(false)}
        />
      )}
    </>
  );
};
```

## Testing Workflow

1. **Enable Mock Mode** (`.env`):
   ```bash
   VITE_MOCK_ADS=true
   ```

2. **Open Test Panel** (via button or keyboard shortcut)

3. **Run Tests**:
   - Click "Run All Tests" for comprehensive testing
   - Or run individual tests (Integration, Callback, Sync, State)

4. **Verify Results**:
   - Check test results panel
   - Verify gems update in UI
   - Check Supabase database

5. **Test Real Ads**:
   - Disable mock mode (`VITE_MOCK_ADS=false`)
   - Test with real AdMob test ads
   - Verify 30-second ad flow

## Tips

- Use mock mode for rapid development
- Test with real ads before production
- Check Supabase logs for transaction history
- Monitor gem balance changes in real-time
