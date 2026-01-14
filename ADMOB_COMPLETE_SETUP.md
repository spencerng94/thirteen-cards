# Complete AdMob Setup Guide for Capacitor/React

This guide provides step-by-step instructions for setting up AdMob on both iOS and Android platforms.

## 📱 App IDs

- **Android App ID**: `ca-app-pub-2492802068591531~8080926061`
- **iOS App ID**: `ca-app-pub-2492802068591531~3275870689`

---

## 🍎 iOS Setup

### Step 1: Add iOS Platform (if not already added)

```bash
# Navigate to your project root
cd /Users/spencerng/Desktop/2025_Projects/thirteen-cards

# Add iOS platform (if not already added)
npx cap add ios

# Sync web assets to iOS
npx cap sync ios
```

### Step 2: Configure Info.plist

The `ios/App/App/Info.plist` file has been configured with:

1. **GADApplicationIdentifier** - Your iOS AdMob App ID
2. **SKAdNetworkItems** - Complete list of Google SKAdNetwork identifiers (required for iOS 14+)
3. **NSUserTrackingUsageDescription** - Privacy description for ATT prompt

**Location**: `ios/App/App/Info.plist`

The configuration is already in place. Verify it contains:
- `GADApplicationIdentifier` with value: `ca-app-pub-2492802068591531~3275870689`
- `SKAdNetworkItems` array with 50+ network identifiers
- `NSUserTrackingUsageDescription` with privacy text

---

## 🤖 Android Setup

### AndroidManifest.xml Configuration

The Android setup is already configured. The `AndroidManifest.xml` references the App ID from `strings.xml`.

**Location**: `android/app/src/main/AndroidManifest.xml`

The `<meta-data>` block is already present:
```xml
<!-- AdMob App ID -->
<meta-data
    android:name="com.google.android.gms.ads.APPLICATION_ID"
    android:value="@string/admob_app_id"/>
```

**Location**: `android/app/src/main/res/values/strings.xml`

The string resource is already set:
```xml
<string name="admob_app_id">ca-app-pub-2492802068591531~8080926061</string>
```

**Alternative Direct Value** (if you prefer not using string resources):

If you want to use the App ID directly in AndroidManifest.xml instead of referencing strings.xml, you can replace the meta-data block with:

```xml
<!-- AdMob App ID -->
<meta-data
    android:name="com.google.android.gms.ads.APPLICATION_ID"
    android:value="ca-app-pub-2492802068591531~8080926061"/>
```

---

## ⚙️ Capacitor Configuration

The `capacitor.config.json` has been updated with AdMob plugin configuration.

**Location**: `capacitor.config.json`

The configuration includes:
- Platform-specific App IDs
- Testing device configuration
- ATT request settings for iOS

---

## ⚛️ React Initialization

### Clean initAdMob() Function

A production-ready `initAdMob()` function has been created in `hooks/useAdMobInitialization.ts`.

**Key Features:**
- ✅ Automatically detects iOS/Android platform
- ✅ Uses correct App ID per platform
- ✅ Requests ATT permission on iOS (iOS 14.5+)
- ✅ Handles errors gracefully (non-blocking)
- ✅ Prevents multiple initializations
- ✅ Production-ready with development reminders

### Usage in App.tsx

The function is already integrated in `App.tsx` via the `useAdMobInitialization()` hook.

**For manual initialization** (if needed), you can use:

```typescript
import { initializeAdMobWithATT } from './hooks/useAdMobInitialization';

// Call this once at app startup
await initializeAdMobWithATT();
```

---

## 🧪 Development vs Production

### ⚠️ IMPORTANT: Use Test Ad Unit IDs for Development

**For Development:**
- Use Google's test ad unit IDs
- Set `initializeForTesting: false` in production
- Test on real devices before going live

**Test Ad Unit IDs:**
- Rewarded Video: `ca-app-pub-3940256099942544/5224354917`
- Banner: `ca-app-pub-3940256099942544/6300978111`
- Interstitial: `ca-app-pub-3940256099942544/1033173712`

**For Production:**
- Use your actual AdMob ad unit IDs
- Ensure `IS_PRODUCTION = true` in `constants/AdConfig.ts`
- Test thoroughly before release

---

## ✅ Verification Checklist

### iOS
- [ ] Info.plist contains `GADApplicationIdentifier`
- [ ] Info.plist contains `SKAdNetworkItems` array
- [ ] Info.plist contains `NSUserTrackingUsageDescription`
- [ ] ATT prompt appears on first launch (iOS 14.5+)
- [ ] Ads load correctly after ATT permission

### Android
- [ ] AndroidManifest.xml contains AdMob meta-data
- [ ] strings.xml contains `admob_app_id` (or direct value in manifest)
- [ ] Ads load correctly on Android devices

### General
- [ ] Capacitor config includes AdMob plugin settings
- [ ] React initialization function is called at app startup
- [ ] Test ads work in development
- [ ] Production ad unit IDs are configured
- [ ] Privacy policy includes AdMob disclosure

---

## 📚 Additional Resources

- [Google AdMob iOS Setup](https://developers.google.com/admob/ios/quick-start)
- [Google AdMob Android Setup](https://developers.google.com/admob/android/quick-start)
- [Apple App Tracking Transparency](https://developer.apple.com/documentation/apptrackingtransparency)
- [Capacitor AdMob Plugin](https://github.com/capacitor-community/admob)

---

## 🐛 Troubleshooting

### iOS Issues
- **ATT prompt not showing**: Delete and reinstall app (prompt only shows once per install)
- **Ads not loading**: Check that Info.plist has correct App ID
- **SKAdNetwork errors**: Ensure all SKAdNetworkItems are present in Info.plist

### Android Issues
- **Ads not loading**: Verify AndroidManifest.xml has correct meta-data
- **App crashes on startup**: Check that AdMob App ID is correct
- **Build errors**: Ensure AdMob plugin is installed: `npm install @capacitor-community/admob`

---

## 📝 Next Steps

1. Test on iOS device (ATT prompt should appear)
2. Test on Android device (ads should load)
3. Switch to production ad unit IDs when ready
4. Submit to App Store/Play Store with privacy disclosures
