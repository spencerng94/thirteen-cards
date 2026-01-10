# iOS Production Build Configuration Guide

This document outlines the iOS configuration requirements for App Store submission.

## When to Configure

iOS configuration is required when you add the iOS platform to your Capacitor project:

```bash
npx cap add ios
```

After adding iOS, you'll need to configure the `Info.plist` file located at:
```
ios/App/App/Info.plist
```

## Required Info.plist Configuration

### 1. Privacy Usage Descriptions

**CRITICAL**: Even if your app doesn't use certain features, you must NOT include Privacy descriptions for unused features. Apple will reject apps that request permissions they don't use.

#### ✅ Required Privacy Keys (Only if feature is used)

If your app uses these features, add the corresponding keys:

```xml
<!-- Only add if you use camera -->
<key>NSCameraUsageDescription</key>
<string>We need access to your camera to...</string>

<!-- Only add if you use photo library -->
<key>NSPhotoLibraryUsageDescription</key>
<string>We need access to your photo library to...</string>

<!-- Only add if you use microphone -->
<key>NSMicrophoneUsageDescription</key>
<string>We need access to your microphone to...</string>

<!-- Only add if you use location -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>We need your location to...</string>
```

#### ❌ DO NOT Add Unused Privacy Keys

Do NOT add privacy descriptions for features you don't use, as this will trigger App Store rejection. Only include descriptions for features your app actually uses.

### 2. Encryption Declaration (REQUIRED)

**REQUIRED FOR ALL APPS**: You must declare your app's encryption usage.

```xml
<key>ITSAppUsesNonExemptEncryption</key>
<false/>
```

This key should be set to `false` if:
- Your app only uses standard HTTPS/TLS for network communication
- You don't implement custom encryption beyond what's provided by the system

Set to `true` only if you implement custom encryption beyond standard HTTPS.

**Note**: Even if set to `false`, you may still need to answer encryption questions during App Store submission, but this simplifies the process.

### 3. App Transport Security (Recommended)

Ensure your Supabase URL uses HTTPS (which it should):

```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <false/>
</dict>
```

This ensures only secure (HTTPS) connections are allowed.

## Checking Your Configuration

After adding iOS and configuring Info.plist:

1. Open the iOS project in Xcode:
   ```bash
   npx cap open ios
   ```

2. In Xcode, select the project in the navigator
3. Select your app target
4. Go to the "Info" tab
5. Verify:
   - No unused Privacy keys are present
   - `ITSAppUsesNonExemptEncryption` is set to `NO` (false)
   - All required privacy descriptions are present (only for used features)

## Common App Store Rejection Reasons

1. **Missing Privacy Descriptions**: If you use a feature (camera, location, etc.) but don't have a description
2. **Unused Privacy Descriptions**: If you have a privacy key but don't use that feature
3. **Missing Encryption Declaration**: `ITSAppUsesNonExemptEncryption` must be present

## Current App Status

Based on the codebase audit:
- ✅ No camera usage detected
- ✅ No microphone usage detected  
- ✅ No photo library access detected
- ✅ No location services detected
- ✅ Only standard HTTPS/TLS encryption used

**Recommendation**: Do NOT add any Privacy Usage Descriptions unless you add features that require them in the future.

## Environment Variables

Ensure your iOS build uses the same environment variables as Android:

- `VITE_SUPABASE_URL` - Production Supabase URL
- `VITE_SUPABASE_ANON_KEY` - Production Supabase anonymous key

For Capacitor iOS builds, you may need to configure these in Xcode build settings or use a build script.
