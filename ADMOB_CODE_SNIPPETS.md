# AdMob Setup - Exact Code Snippets

This document contains the exact code you need to copy/paste for AdMob setup.

---

## 🍎 iOS Setup

### Terminal Commands

```bash
# Navigate to project root
cd /Users/spencerng/Desktop/2025_Projects/thirteen-cards

# Add iOS platform (if not already added)
npx cap add ios

# Sync web assets to iOS
npx cap sync ios
```

### Info.plist Configuration

**File**: `ios/App/App/Info.plist`

Add these keys inside the `<dict>` tag (before the closing `</dict>`):

```xml
<key>GADApplicationIdentifier</key>
<string>ca-app-pub-2492802068591531~3275870689</string>
<key>SKAdNetworkItems</key>
<array>
	<dict>
		<key>SKAdNetworkIdentifier</key>
		<string>cstr6suwn9.skadnetwork</string>
	</dict>
	<dict>
		<key>SKAdNetworkIdentifier</key>
		<string>4fzdc2evr5.skadnetwork</string>
	</dict>
	<dict>
		<key>SKAdNetworkIdentifier</key>
		<string>4pfyvq9l8r.skadnetwork</string>
	</dict>
	<dict>
		<key>SKAdNetworkIdentifier</key>
		<string>2fnua5tdw4.skadnetwork</string>
	</dict>
	<dict>
		<key>SKAdNetworkIdentifier</key>
		<string>ydx93a7ass.skadnetwork</string>
	</dict>
	<dict>
		<key>SKAdNetworkIdentifier</key>
		<string>5a6flpkh64.skadnetwork</string>
	</dict>
	<dict>
		<key>SKAdNetworkIdentifier</key>
		<string>p78axxw29r.skadnetwork</string>
	</dict>
	<dict>
		<key>SKAdNetworkIdentifier</key>
		<string>v72qych5uu.skadnetwork</string>
	</dict>
	<dict>
		<key>SKAdNetworkIdentifier</key>
		<string>ludvb6z3bs.skadnetwork</string>
	</dict>
	<dict>
		<key>SKAdNetworkIdentifier</key>
		<string>cp8zw746q7.skadnetwork</string>
	</dict>
	<dict>
		<key>SKAdNetworkIdentifier</key>
		<string>3sh42y64q3.skadnetwork</string>
	</dict>
	<dict>
		<key>SKAdNetworkIdentifier</key>
		<string>c6k4g5qg8m.skadnetwork</string>
	</dict>
	<dict>
		<key>SKAdNetworkIdentifier</key>
		<string>s39g8k73mm.skadnetwork</string>
	</dict>
	<dict>
		<key>SKAdNetworkIdentifier</key>
		<string>3qy4746246.skadnetwork</string>
	</dict>
	<dict>
		<key>SKAdNetworkIdentifier</key>
		<string>f38h382jlk.skadnetwork</string>
	</dict>
	<dict>
		<key>SKAdNetworkIdentifier</key>
		<string>hs6bdukanm.skadnetwork</string>
	</dict>
	<dict>
		<key>SKAdNetworkIdentifier</key>
		<string>v4nxqhlyqp.skadnetwork</string>
	</dict>
	<dict>
		<key>SKAdNetworkIdentifier</key>
		<string>wzmmz9fp6w.skadnetwork</string>
	</dict>
	<dict>
		<key>SKAdNetworkIdentifier</key>
		<string>yclnxrl5pm.skadnetwork</string>
	</dict>
	<dict>
		<key>SKAdNetworkIdentifier</key>
		<string>t38b2kh725.skadnetwork</string>
	</dict>
	<dict>
		<key>SKAdNetworkIdentifier</key>
		<string>7ug5zh24hu.skadnetwork</string>
	</dict>
	<dict>
		<key>SKAdNetworkIdentifier</key>
		<string>gta9lk7p23.skadnetwork</string>
	</dict>
	<dict>
		<key>SKAdNetworkIdentifier</key>
		<string>vutu7akeur.skadnetwork</string>
	</dict>
	<dict>
		<key>SKAdNetworkIdentifier</key>
		<string>y5ghdn5j9q.skadnetwork</string>
	</dict>
	<dict>
		<key>SKAdNetworkIdentifier</key>
		<string>n6fk4nfna4.skadnetwork</string>
	</dict>
	<dict>
		<key>SKAdNetworkIdentifier</key>
		<string>v9wttpbfk9.skadnetwork</string>
	</dict>
	<dict>
		<key>SKAdNetworkIdentifier</key>
		<string>n38lu8286q.skadnetwork</string>
	</dict>
	<dict>
		<key>SKAdNetworkIdentifier</key>
		<string>47vhws6wlr.skadnetwork</string>
	</dict>
	<dict>
		<key>SKAdNetworkIdentifier</key>
		<string>kbd757ywx3.skadnetwork</string>
	</dict>
	<dict>
		<key>SKAdNetworkIdentifier</key>
		<string>9t245vhmpl.skadnetwork</string>
	</dict>
	<dict>
		<key>SKAdNetworkIdentifier</key>
		<string>eh6m2bh4zr.skadnetwork</string>
	</dict>
	<dict>
		<key>SKAdNetworkIdentifier</key>
		<string>a2p9lx4jpn.skadnetwork</string>
	</dict>
	<dict>
		<key>SKAdNetworkIdentifier</key>
		<string>22mmun2rn5.skadnetwork</string>
	</dict>
	<dict>
		<key>SKAdNetworkIdentifier</key>
		<string>4468km3ulz.skadnetwork</string>
	</dict>
	<dict>
		<key>SKAdNetworkIdentifier</key>
		<string>2u9pt9hc89.skadnetwork</string>
	</dict>
	<dict>
		<key>SKAdNetworkIdentifier</key>
		<string>8s468mfl3y.skadnetwork</string>
	</dict>
	<dict>
		<key>SKAdNetworkIdentifier</key>
		<string>klf5c3l5q5.skadnetwork</string>
	</dict>
	<dict>
		<key>SKAdNetworkIdentifier</key>
		<string>ppxm28t8ap.skadnetwork</string>
	</dict>
	<dict>
		<key>SKAdNetworkIdentifier</key>
		<string>ecpz2srf59.skadnetwork</string>
	</dict>
	<dict>
		<key>SKAdNetworkIdentifier</key>
		<string>uw77j35x4d.skadnetwork</string>
	</dict>
	<dict>
		<key>SKAdNetworkIdentifier</key>
		<string>pwa83g58t8.skadnetwork</string>
	</dict>
	<dict>
		<key>SKAdNetworkIdentifier</key>
		<string>mlmmfzh3r3.skadnetwork</string>
	</dict>
	<dict>
		<key>SKAdNetworkIdentifier</key>
		<string>578prtvx9j.skadnetwork</string>
	</dict>
	<dict>
		<key>SKAdNetworkIdentifier</key>
		<string>4dzt52r2t5.skadnetwork</string>
	</dict>
	<dict>
		<key>SKAdNetworkIdentifier</key>
		<string>e5fvkxwrpn.skadnetwork</string>
	</dict>
	<dict>
		<key>SKAdNetworkIdentifier</key>
		<string>8c4e2ghe7u.skadnetwork</string>
	</dict>
	<dict>
		<key>SKAdNetworkIdentifier</key>
		<string>zq492l623r.skadnetwork</string>
	</dict>
	<dict>
		<key>SKAdNetworkIdentifier</key>
		<string>3qcr597p9d.skadnetwork</string>
	</dict>
</array>
<key>NSUserTrackingUsageDescription</key>
<string>We use your data to deliver personalized ads and rewards that enhance your gaming experience.</string>
```

---

## 🤖 Android Setup

### AndroidManifest.xml

**File**: `android/app/src/main/AndroidManifest.xml`

Add this `<meta-data>` block inside the `<application>` tag:

```xml
<!-- AdMob App ID -->
<meta-data
    android:name="com.google.android.gms.ads.APPLICATION_ID"
    android:value="ca-app-pub-2492802068591531~8080926061"/>
```

**Note**: The current setup uses `@string/admob_app_id` which references `strings.xml`. The direct value above is an alternative. Both work fine.

---

## ⚙️ Capacitor Configuration

### capacitor.config.json

**File**: `capacitor.config.json`

Add the AdMob plugin configuration to the `plugins` object:

```json
{
  "plugins": {
    "SplashScreen": {
      // ... existing SplashScreen config ...
    },
    "AdMob": {
      "appId": {
        "android": "ca-app-pub-2492802068591531~8080926061",
        "ios": "ca-app-pub-2492802068591531~3275870689"
      },
      "requestTrackingAuthorization": true,
      "testingDevices": [],
      "initializeForTesting": false
    }
  }
}
```

---

## ⚛️ React Initialization Function

### Clean initAdMob() Function

**File**: `hooks/useAdMobInitialization.ts` (already created)

**Usage in App.tsx**:

```typescript
import { initAdMob } from './hooks/useAdMobInitialization';

// In your App component, call once at startup:
useEffect(() => {
  // Initialize AdMob (handles ATT on iOS automatically)
  initAdMob().catch(error => {
    console.warn('AdMob initialization failed:', error);
  });
}, []);
```

**Or use the hook** (already integrated):

```typescript
import { useAdMobInitialization } from './hooks/useAdMobInitialization';

// In your component:
useAdMobInitialization(); // Automatically initializes on mount
```

### Standalone Function (if you prefer)

```typescript
import { Capacitor } from '@capacitor/core';
import { AdMob } from '@capacitor-community/admob';
import { ADMOB_APP_ID, ADMOB_IOS_APP_ID } from './constants/AdConfig';

/**
 * Initialize AdMob with iOS ATT support
 * 
 * ⚠️ REMINDER: Use Test Ad Unit IDs for development!
 * - Test Rewarded Video: ca-app-pub-3940256099942544/5224354917
 * - Set initializeForTesting: false in production
 */
export const initAdMob = async (): Promise<void> => {
  // Only initialize on native platforms
  if (!Capacitor.isNativePlatform()) {
    console.log('AdMob: Skipping initialization on web platform');
    return;
  }

  try {
    const appId = Capacitor.getPlatform() === 'ios' 
      ? ADMOB_IOS_APP_ID 
      : ADMOB_APP_ID;

    console.log(`AdMob: Initializing for ${Capacitor.getPlatform()} with App ID: ${appId}`);

    // Initialize AdMob with iOS ATT support
    await AdMob.initialize({
      requestTrackingAuthorization: true, // iOS only - requests ATT permission
      testingDevices: [], // Add test device IDs during development
      initializeForTesting: false, // ⚠️ Set to true ONLY during development
    });

    console.log('AdMob: Successfully initialized with ATT support');
  } catch (error) {
    // Non-blocking: Log error but don't prevent app from loading
    console.warn('AdMob: Initialization failed (non-blocking):', error);
  }
};
```

---

## ⚠️ Important Reminders

### Development
- ✅ Use Test Ad Unit IDs: `ca-app-pub-3940256099942544/5224354917`
- ✅ Test on real devices before production
- ✅ Set `initializeForTesting: false` in production

### Production
- ✅ Use your actual AdMob ad unit IDs
- ✅ Ensure `IS_PRODUCTION = true` in `constants/AdConfig.ts`
- ✅ Test thoroughly before release
- ✅ Add privacy disclosures to App Store/Play Store

---

## ✅ Verification

After setup, verify:

1. **iOS**: ATT prompt appears on first launch (iOS 14.5+)
2. **Android**: Ads load without errors
3. **Both**: Check console logs for "AdMob: Successfully initialized"
