# AdMob iOS Setup Summary

This document contains the complete iOS AdMob setup for your Capacitor/React project.

## ✅ What's Been Configured

### 1. Info.plist Configuration
The `ios/App/App/Info.plist` file has been updated with:
- **GADApplicationIdentifier**: `ca-app-pub-2492802068591531~3275870689`
- **SKAdNetworkItems**: Complete list of 50+ Google SKAdNetwork identifiers
- **NSUserTrackingUsageDescription**: Privacy description for ATT prompt

### 2. React Hook for AdMob Initialization
Created `hooks/useAdMobInitialization.ts` which:
- Automatically detects iOS/Android platform
- Initializes AdMob with the correct App ID per platform
- Requests App Tracking Transparency (ATT) permission on iOS
- Handles errors gracefully (non-blocking)

### 3. App.tsx Integration
Updated `App.tsx` to use the new `useAdMobInitialization` hook for cleaner code organization.

## 📱 App Store Privacy Description

Add this sentence to your App Store Connect **Privacy** section under **"Data Used to Track You"**:

```
We use your data to deliver personalized ads and rewards that enhance your gaming experience.
```

**Alternative shorter version:**
```
To deliver personalized ads and rewards.
```

**Alternative longer version (if you need more detail):**
```
We use the Identifier for Advertisers (IDFA) to deliver personalized ads and provide rewards that enhance your gaming experience. This helps us show you relevant content and offer you valuable in-game rewards.
```

## 🔍 Verification Checklist

Before submitting to the App Store:

- [x] Info.plist contains `GADApplicationIdentifier` with your iOS App ID
- [x] Info.plist contains `SKAdNetworkItems` array with Google's network IDs
- [x] Info.plist contains `NSUserTrackingUsageDescription` with privacy description
- [x] React code initializes AdMob with `requestTrackingAuthorization: true`
- [ ] Test ATT prompt appears on first launch (iOS 14.5+)
- [ ] Test that ads load correctly after ATT permission is granted/denied
- [ ] Add privacy description to App Store Connect

## 📝 Notes

- The ATT prompt will automatically appear on iOS 14.5+ when AdMob initializes
- Users can deny tracking, and ads will still work (just without personalization)
- The `NSUserTrackingUsageDescription` text must match what you submit to App Store Connect
- SKAdNetworkItems are required for iOS 14+ ad attribution

## 🧪 Testing

To test the ATT prompt:
1. Delete and reinstall the app (ATT prompt only shows once per install)
2. Launch the app
3. The ATT prompt should appear automatically
4. Check console logs for "AdMob: Successfully initialized"

## 📚 Additional Resources

- [Google AdMob iOS Setup Guide](https://developers.google.com/admob/ios/quick-start)
- [Apple App Tracking Transparency](https://developer.apple.com/documentation/apptrackingtransparency)
- [SKAdNetwork Documentation](https://developer.apple.com/documentation/storekit/skadnetwork)
