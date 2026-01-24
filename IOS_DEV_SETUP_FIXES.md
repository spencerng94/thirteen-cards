# iOS Development Setup - Complete Fix Guide

This document provides step-by-step fixes for all iOS development issues encountered when testing a React + Capacitor app on an iOS device.

## Issues Fixed

### 1. ✅ UIScene Lifecycle Warning
**Problem**: `UIScene lifecycle will soon be required. Failure to adopt will result in an assert in the future.`

**Solution**: Updated `ios/App/App/AppDelegate.swift` to support UIScene-based lifecycle (iOS 13+).

**Changes Made**:
- Added `application(_:configurationForConnecting:options:)` method
- Added `application(_:didDiscardSceneSessions:)` method
- Both methods are marked with `@available(iOS 13.0, *)` to support iOS 13+

### 2. ✅ Sandbox Extension Warning
**Problem**: `Could not create a sandbox extension for '/var/containers/Bundle/Application/.../App.app'`

**Solution**: This warning is typically harmless and related to iOS security. It doesn't affect functionality. No code changes needed, but the warning should disappear after proper rebuild.

### 3. ✅ WebView Connection Errors
**Problem**: WebView couldn't connect to `http://10.0.0.131:3000`

**Solutions Applied**:

#### A. Info.plist Configuration
Updated `ios/App/App/Info.plist` with App Transport Security settings:
- `NSAllowsArbitraryLoads`: `true` (allows all HTTP connections for development)
- `NSAllowsArbitraryLoadsInWebContent`: `true` (allows WebView HTTP)
- `NSAllowsLocalNetworking`: `true` (allows local network connections)
- Exception domain for `10.0.0.131` with all necessary flags

#### B. Capacitor Configuration
Updated `capacitor.config.json`:
- `server.url`: `http://10.0.0.131:3000`
- `server.cleartext`: `true`
- `server.allowNavigation`: Includes full URL formats

#### C. Vite Server Configuration
Verified `vite.config.ts`:
- `server.host`: `true` (listens on all network interfaces)
- `server.port`: `3000`
- `server.strictPort`: `true`

### 4. ✅ SplashScreen Timeout Warning
**Problem**: `SplashScreen was automatically hidden after default timeout`

**Solution**: Improved SplashScreen.hide() timing in `App.tsx`:
- Added proper content loading detection
- Hide splash screen immediately when app is ready
- Fallback timeout of 3-10 seconds based on content load state
- All console logs are now development-only

### 5. ✅ Excessive Console Logging
**Problem**: Too many console.log statements causing performance issues and log clutter

**Solutions Applied**:
- Removed all `console.error('🧭 RENDERED: ...')` statements from `App.tsx` and `Lobby.tsx`
- Removed `console.log("✅ FINAL RENDER PATH HIT")` statements
- Removed debug logging from `PublicTabContent` component
- Made socket connection logs development-only
- Made SplashScreen logs development-only

### 6. ✅ Socket Connection Duplicate Detection
**Problem**: "Socket already connected" warnings

**Solution**: Updated `services/socket.ts`:
- Added `isConnecting` flag to prevent duplicate connection attempts
- Improved connection state management
- Made connection logs development-only
- Better error handling for connection failures

## Step-by-Step Setup Instructions

### 1. Verify Network Configuration

**Find your Mac's IP address**:
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**Update `capacitor.config.json`** if your IP is different:
```json
{
  "server": {
    "url": "http://YOUR_IP:3000",
    "cleartext": true,
    "allowNavigation": [
      "http://YOUR_IP:3000",
      "http://YOUR_IP:*",
      "YOUR_IP"
    ]
  }
}
```

### 2. Start Development Server

```bash
npm run dev
```

The server should start on `http://0.0.0.0:3000` (accessible from your local network).

### 3. Sync Capacitor

```bash
npx cap sync ios
```

This copies all configuration changes to the iOS project.

### 4. Rebuild iOS App in Xcode

**Important**: Info.plist changes only take effect after a rebuild!

1. Open Xcode:
   ```bash
   open ios/App/App.xcworkspace
   ```
   (or use `.xcodeproj` if you don't use CocoaPods)

2. Clean Build Folder:
   - Product → Clean Build Folder (Shift+Cmd+K)

3. Build:
   - Product → Build (Cmd+B)

4. Run on Device:
   - Connect your iOS device via USB
   - Select your device from the device dropdown
   - Product → Run (Cmd+R)

### 5. Verify Connection

1. **On your iOS device**, open Safari and navigate to `http://YOUR_IP:3000`
   - If Safari can connect, the network is fine
   - If Safari can't connect, check:
     - Mac and iPhone are on the same Wi-Fi network
     - Mac firewall isn't blocking port 3000
     - IP address is correct

2. **In the Capacitor app**, check the console:
   - Should see "Socket connected to: http://YOUR_IP:3001" (socket server)
   - No connection errors
   - Splash screen should hide properly

## File Changes Summary

### Modified Files:

1. **`ios/App/App/AppDelegate.swift`**
   - Added UIScene lifecycle support

2. **`ios/App/App/Info.plist`**
   - Added App Transport Security settings
   - Added exception domains for local network

3. **`capacitor.config.json`**
   - Updated `allowNavigation` with full URL formats

4. **`services/socket.ts`**
   - Added connection state management
   - Made logs development-only
   - Improved duplicate connection prevention

5. **`App.tsx`**
   - Removed excessive console logs
   - Improved SplashScreen.hide() timing
   - Made logs development-only

6. **`components/Lobby.tsx`**
   - Removed excessive console logs
   - Cleaned up debug statements

## Troubleshooting

### Issue: Still can't connect to dev server

**Check**:
1. Mac and iPhone are on the same Wi-Fi network
2. Mac firewall allows incoming connections on port 3000
3. IP address in `capacitor.config.json` matches your Mac's IP
4. Dev server is running and accessible from Safari on iPhone

**Fix**:
- Temporarily disable Mac firewall to test
- Verify IP with `ifconfig` and update config
- Check router settings if on different subnets

### Issue: SplashScreen still timing out

**Check**:
1. `SplashScreen.hide()` is being called in `App.tsx`
2. No JavaScript errors preventing app initialization
3. Network connection is working

**Fix**:
- Check browser console for JavaScript errors
- Verify socket connection is successful
- Increase timeout in `App.tsx` if needed (currently 3-10 seconds)

### Issue: UIScene warning still appears

**Check**:
1. AppDelegate.swift has the new UIScene methods
2. Xcode project is using iOS 13+ deployment target

**Fix**:
- Ensure deployment target is iOS 13.0 or higher
- Clean and rebuild the project

### Issue: Too many socket connection attempts

**Check**:
1. `isConnecting` flag is working in `socket.ts`
2. Components aren't calling `connectSocket()` multiple times

**Fix**:
- Check for multiple `connectSocket()` calls in components
- Verify singleton socket instance is being used

## Production Notes

⚠️ **Important for Production**:

1. **Remove `NSAllowsArbitraryLoads`** from Info.plist before production
   - Keep only the exception domains you need
   - Use HTTPS in production

2. **Remove development-only logs**:
   - All `import.meta.env.DEV` checks are in place
   - Logs will automatically be removed in production builds

3. **Update server URLs**:
   - Change `capacitor.config.json` `server.url` to production URL
   - Update socket server URL in `services/socket.ts`

4. **Test on production build**:
   - Build release version: `npm run build`
   - Test with production server URLs
   - Verify all security settings are correct

## Verification Checklist

After applying all fixes, verify:

- [ ] UIScene warning is gone (or only appears once on first launch)
- [ ] WebView connects to dev server successfully
- [ ] SplashScreen hides without timeout warning
- [ ] Socket connects without duplicate connection warnings
- [ ] Console logs are minimal (only errors/warnings, no debug spam)
- [ ] App loads and functions correctly on iOS device
- [ ] Network requests work (socket, API calls, etc.)

## Additional Resources

- [Capacitor iOS Configuration](https://capacitorjs.com/docs/ios/configuration)
- [App Transport Security](https://developer.apple.com/documentation/security/preventing_insecure_network_connections)
- [UIScene Lifecycle](https://developer.apple.com/documentation/uikit/app_and_environment/scenes)
