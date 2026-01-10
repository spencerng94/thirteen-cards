# Capacitor Assets Setup Guide

This guide explains how to prepare and manage your app's visual assets (icons and splash screens) for both iOS and Android using `@capacitor/assets`.

## 1. File Requirements

Create the following files in your `/assets` folder at the project root:

### Required Files:

- **`icon-only.png`** - Standalone app icon without background (required for iOS)
  - **Minimum dimensions**: 1024×1024 pixels
  - **Format**: PNG (transparent background recommended)
  - **Usage**: Used for iOS app icon and fallback for Android

- **`icon-foreground.png`** - Foreground layer for Android adaptive icons
  - **Minimum dimensions**: 1024×1024 pixels
  - **Format**: PNG (transparent background)
  - **Usage**: Android adaptive icon foreground layer
  - **Important**: Keep important content within the center safe zone (66% of canvas) to prevent clipping on different launcher shapes

- **`icon-background.png`** - Background layer for Android adaptive icons
  - **Minimum dimensions**: 1024×1024 pixels
  - **Format**: PNG (solid color or simple pattern)
  - **Usage**: Android adaptive icon background layer
  - **Note**: Can be a simple solid color that complements your foreground

- **`splash.png`** - Primary splash screen (light mode)
  - **Minimum dimensions**: 2732×2732 pixels
  - **Format**: PNG or JPG
  - **Usage**: Default splash screen for both iOS and Android
  - **Background**: Should match your app's launch theme

- **`splash-dark.png`** - Splash screen for dark mode (optional but recommended)
  - **Minimum dimensions**: 2732×2732 pixels
  - **Format**: PNG or JPG
  - **Usage**: Dark mode splash screen for iOS and Android
  - **Background**: Should match your app's dark theme

### File Structure:
```
/assets
├── icon-only.png (1024×1024)
├── icon-foreground.png (1024×1024)
├── icon-background.png (1024×1024)
├── splash.png (2732×2732)
└── splash-dark.png (2732×2732) [optional]
```

## 2. Asset Configuration

The splash screen behavior is configured in `capacitor.config.json`:

```json
{
  "plugins": {
    "SplashScreen": {
      "launchShowDuration": 0,
      "launchAutoHide": false,
      "backgroundColor": "#000000",
      "androidSplashResourceName": "splash",
      "androidScaleType": "CENTER_CROP",
      "showSpinner": false,
      "androidSpinnerStyle": "large",
      "iosSpinnerStyle": "small",
      "spinnerColor": "#FFFFFF",
      "splashFullScreen": true,
      "splashImmersive": true
    }
  }
}
```

### Configuration Options Explained:

- **`launchShowDuration`**: Duration (ms) splash shows before auto-hiding (0 = manual control)
- **`launchAutoHide`**: Set to `false` to manually control when splash hides (recommended)
- **`backgroundColor`**: Background color behind splash image (matches your app theme)
- **`androidSplashResourceName`**: Android resource name for splash screen
- **`androidScaleType`**: How splash image scales (`CENTER_CROP`, `FIT_XY`, `FIT_CENTER`)
- **`showSpinner`**: Show loading spinner on splash (set to `false` for cleaner look)
- **`splashFullScreen`**: Use full screen for splash (recommended)
- **`splashImmersive`**: Use immersive mode on Android (hides system bars)

**Important**: With `launchAutoHide: false`, you must manually hide the splash screen in your app code (see Section 5).

## 3. Command & Automation

### Generate Assets:

Run this command to generate icons and splash screens for both iOS and Android:

```bash
npm run assets
```

This command:
- Reads your source assets from `/assets` folder
- Generates all required sizes and formats for iOS
- Generates all required sizes and formats for Android
- Updates native project files automatically

### Manual Command:

If you prefer to run it directly:

```bash
npx @capacitor/assets generate
```

### When to Run:

Run `npm run assets` whenever you update:
- App icon (any of the icon files)
- Splash screen images
- After adding iOS platform (if not already present)

**Note**: After generating assets, you may need to rebuild your native apps:
- iOS: `npx cap sync ios`
- Android: `npx cap sync android`

## 4. Android Adaptive Icons

Android adaptive icons require special attention to prevent clipping on different launcher shapes.

### Understanding Safe Zones:

Android launchers can display icons in various shapes:
- **Circle** (Pixel, most Samsung devices)
- **Square with rounded corners** (some manufacturers)
- **Squircle** (iOS-like rounded square)

### Best Practices:

1. **Keep Critical Content in Safe Zone**:
   - Design your foreground icon so all important elements fit within the center 66% of the canvas
   - The outer 33% (edges) may be cropped or masked depending on the launcher

2. **Foreground Layer (`icon-foreground.png`)**:
   - Remove any background - it should be transparent
   - Center your main icon content
   - Avoid placing text or important details near the edges
   - Use padding around important elements

3. **Background Layer (`icon-background.png`)**:
   - Can be a solid color or simple gradient
   - Should complement the foreground
   - Avoid complex patterns that might clash when masked

4. **Visual Example**:
   ```
   ┌─────────────────────────────────┐
   │  ┌───────────────────────────┐  │  ← Outer 33% (may be masked)
   │  │  ┌─────────────────────┐  │  │
   │  │  │                     │  │  │  ← Safe Zone (66% center)
   │  │  │   [Your Icon]       │  │  │     (Always visible)
   │  │  │                     │  │  │
   │  │  └─────────────────────┘  │  │
   │  └───────────────────────────┘  │
   └─────────────────────────────────┘
   ```

5. **Testing Tips**:
   - Test on multiple Android devices if possible
   - Use Android Studio's Icon Preview tool to see how it looks in different shapes
   - Samsung devices often use circular icons, while Pixel uses squircles

### Icon Design Checklist:

- [ ] Foreground icon is centered on a 1024×1024 canvas
- [ ] Important content fits within center 66% (approximately 675×675 pixels)
- [ ] No important text or details near edges
- [ ] Background is simple and complementary
- [ ] Icon-only.png exists for iOS fallback

## 5. Splash Screen Logic

The splash screen is programmatically controlled in `App.tsx` to ensure a seamless transition.

### How It Works:

1. **Native Splash Shows First**: When the app launches, the native splash screen (configured in `capacitor.config.json`) is displayed immediately.

2. **App Initializes**: Your React app loads, checks session, loads profile, etc.

3. **App Ready State**: Once `isAppReady` becomes `true`, the native splash screen is hidden programmatically.

4. **Seamless Transition**: This prevents the "white flash" that would occur if the splash auto-hid before your app content was ready.

### Implementation in App.tsx:

```tsx
import { SplashScreen } from '@capacitor/splash-screen';
import { Capacitor } from '@capacitor/core';

// In your component:
const isAppReady = isInitialized && (session ? !!profile : true);

useEffect(() => {
  if (isAppReady && Capacitor.isNativePlatform()) {
    // Hide splash screen when app is ready
    SplashScreen.hide().catch((error) => {
      console.warn('Failed to hide splash screen:', error);
    });
  }
}, [isAppReady]);
```

### Key Points:

- **`Capacitor.isNativePlatform()`**: Only hide splash on native platforms (iOS/Android), not in browser
- **`isAppReady`**: Derived state that ensures your app has finished initializing before hiding splash
- **Error Handling**: Splash screen hide is wrapped in try-catch to prevent crashes if plugin fails
- **Timing**: The splash stays visible until your app is fully ready, ensuring smooth UX

### Customization:

You can modify `isAppReady` logic based on your app's initialization needs:

```tsx
// Example: Wait for additional conditions
const isAppReady = isInitialized && 
                   (session ? !!profile : true) && 
                   !isLoadingCriticalData &&
                   !isFetchingInitialContent;
```

## 6. Troubleshooting

### Issue: White flash between splash and app

**Solution**: Ensure `launchAutoHide: false` in config and hide splash programmatically only after `isAppReady` is true.

### Issue: Icons look clipped on some Android devices

**Solution**: Redesign foreground icon to keep all important content within the center 66% safe zone.

### Issue: Splash screen doesn't show

**Solution**: 
- Check that `splash.png` exists in `/assets` folder
- Run `npm run assets` to regenerate assets
- Run `npx cap sync` to update native projects
- Verify `backgroundColor` in config matches your splash design

### Issue: Assets not updating after regeneration

**Solution**:
1. Run `npm run assets`
2. Run `npx cap sync ios` or `npx cap sync android`
3. Clean and rebuild native project
4. For iOS: Clean build folder in Xcode (Product → Clean Build Folder)

### Issue: `@capacitor/assets` command not found

**Solution**: 
- Ensure package is installed: `npm install @capacitor/assets --save-dev`
- Try using npx: `npx @capacitor/assets generate`

## 7. Next Steps

1. **Prepare Your Assets**:
   - Create/design your icons and splash screens
   - Ensure they meet minimum dimension requirements
   - Follow Android adaptive icon best practices

2. **Place Files in `/assets`**:
   - Add all required PNG files to the `/assets` folder

3. **Generate Assets**:
   - Run `npm run assets`

4. **Sync to Native Projects**:
   - Run `npx cap sync ios` (if iOS project exists)
   - Run `npx cap sync android`

5. **Test**:
   - Build and run on devices
   - Verify splash screen behavior
   - Check icons on different devices/launchers

6. **Iterate**:
   - Make design adjustments as needed
   - Regenerate assets with `npm run assets`
   - Re-sync and rebuild

## Additional Resources

- [Capacitor Assets Documentation](https://capacitorjs.com/docs/guides/splash-screens-and-icons)
- [Android Adaptive Icons Guide](https://developer.android.com/guide/practices/ui_guidelines/icon_design_adaptive)
- [iOS App Icon Guidelines](https://developer.apple.com/design/human-interface-guidelines/app-icons)
