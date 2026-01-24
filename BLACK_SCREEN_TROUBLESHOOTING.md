# Black Screen & Connection Error Troubleshooting

## Current Issues
1. **UIScene Warning**: Fixed by adding `UIApplicationSceneManifest` to Info.plist
2. **Connection Error -1004**: WebView cannot connect to `http://10.0.0.131:3000`

## Connection Error -1004 Analysis

Error code `-1004` means "Could not connect to the server" (NSURLErrorCannotConnectToHost).

### Possible Causes:
1. **Network Timing**: WebView tries to connect before network is ready
2. **IP Address Mismatch**: Device and Mac on different networks
3. **Firewall**: Mac firewall blocking connections
4. **Server Not Running**: Dev server not accessible on that IP
5. **WebView Configuration**: Capacitor WebView needs additional setup

## Step-by-Step Fix

### 1. Verify Network Connectivity

**On your iPhone:**
1. Open Safari
2. Navigate to `http://10.0.0.131:3000`
3. If Safari **can** connect → Network is fine, issue is WebView config
4. If Safari **cannot** connect → Network issue, check IP/firewall

### 2. Verify Your Mac's IP Address

```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**Current IP shown**: `192.168.86.248`

If your actual IP is different from `10.0.0.131`, update:

**`capacitor.config.json`:**
```json
{
  "server": {
    "url": "http://YOUR_ACTUAL_IP:3000"
  }
}
```

**`ios/App/App/Info.plist`**: Add your IP to `NSExceptionDomains`

Then run:
```bash
npx cap sync ios
```

### 3. Check Mac Firewall

**System Settings → Network → Firewall**

1. Temporarily disable firewall to test
2. Or add an exception for port 3000
3. Ensure "Block all incoming connections" is OFF

### 4. Verify Dev Server is Running

```bash
# Check if server is listening
lsof -i :3000 | grep LISTEN

# Test from Mac
curl http://localhost:3000

# Test from iPhone (if on same network)
curl http://10.0.0.131:3000
```

### 5. Alternative: Use Your Actual IP

If `10.0.0.131` doesn't work, try using your Mac's actual IP:

**Update `capacitor.config.json`:**
```json
{
  "server": {
    "url": "http://192.168.86.248:3000",
    "cleartext": true,
    "allowNavigation": [
      "http://192.168.86.248:3000",
      "http://192.168.86.248:*",
      "192.168.86.248"
    ]
  }
}
```

**Update `ios/App/App/Info.plist`** - Already added `192.168.86.248` to exception domains.

Then:
```bash
npx cap sync ios
```

### 6. Rebuild in Xcode

**Important**: After any config changes, rebuild:

1. Open Xcode: `open ios/App/App.xcworkspace`
2. **Clean Build Folder**: Product → Clean Build Folder (Shift+Cmd+K)
3. **Build**: Product → Build (Cmd+B)
4. **Run**: Product → Run (Cmd+R)

### 7. Check Safari Web Inspector

1. **On Mac**: Safari → Preferences → Advanced → "Show Develop menu"
2. **On iPhone**: Settings → Safari → Advanced → Web Inspector (ON)
3. **Connect iPhone to Mac via USB**
4. **In Safari on Mac**: Develop → [Your iPhone] → [Your App]
5. **Check Console tab** for JavaScript errors
6. **Check Network tab** to see if requests are failing

### 8. Test with Bundled Web Assets (Fallback)

If dev server connection continues to fail, test with bundled assets:

**Temporarily in `capacitor.config.json`:**
```json
{
  "server": {
    "url": ""
  }
}
```

This will use bundled assets from `dist/` instead of dev server.

**Build and sync:**
```bash
npm run build
npx cap sync ios
```

If this works, the issue is definitely network/server connectivity.

## Debugging Checklist

- [ ] Safari on iPhone can access `http://10.0.0.131:3000`
- [ ] Mac and iPhone are on same Wi-Fi network
- [ ] Mac firewall allows port 3000
- [ ] Dev server is running and accessible
- [ ] IP address in config matches Mac's actual IP
- [ ] Info.plist has exception domains for the IP
- [ ] App rebuilt in Xcode after config changes
- [ ] Safari Web Inspector shows no JavaScript errors
- [ ] Network tab shows connection attempts

## If Still Not Working

1. **Try different IP**: Use your Mac's actual IP (`192.168.86.248`) instead of `10.0.0.131`
2. **Check router settings**: Some routers block device-to-device communication
3. **Use localhost proxy**: Use a tool like `ngrok` to create a tunnel
4. **Test with production build**: Build the app and test with bundled assets

## Additional Notes

- The UIScene warning should be suppressed now with `UIApplicationSceneManifest`
- The sandbox extension warning is harmless and can be ignored
- Connection errors are usually network/firewall related, not code issues
