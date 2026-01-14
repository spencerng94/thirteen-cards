# Mobile Assets Setup Guide

This guide will help you set up icons and splash screens for your Capacitor project using `@capacitor/assets`.

## 📁 1. Folder Structure

Place your source image files in the **`/assets`** folder at the project root:

```
/assets
├── icon.png          (1024×1024 - your logo.png renamed/copied)
└── splash.png        (2732×2732 - your splash.png)
```

### Quick Setup:

Since you have `logo.png` (1024×1024), you have two options:

**Option A: Simple (Recommended for getting started)**
- Copy/rename `logo.png` → `assets/icon.png`
- This will create a simple icon for both iOS and Android

**Option B: Android Adaptive Icons (Better Android support)**
- Copy `logo.png` → `assets/icon-only.png` (for iOS)
- Copy `logo.png` → `assets/icon-foreground.png` (transparent background recommended)
- Create `assets/icon-background.png` (solid color or simple pattern, 1024×1024)
- This gives you adaptive icons on Android that look better on different launcher shapes

**For Splash:**
- Copy your `splash.png` (2732×2732) → `assets/splash.png`

## 🛠️ 2. Terminal Commands

### Install the Tool (Already Installed ✅)

The tool is already in your `package.json` as a dev dependency:
```bash
# Already installed, but if you need to reinstall:
npm install @capacitor/assets --save-dev
```

### Generate Assets

Run the generate command (you already have this as an npm script):

```bash
npm run assets
```

Or run directly:
```bash
npx @capacitor/assets generate --iconBackgroundColor '#000000' --iconBackgroundColorDark '#000000' --splashBackgroundColor '#000000' --splashBackgroundColorDark '#000000'
```

The tool will:
- Read source images from `/assets` folder
- Generate all required sizes for iOS (in `ios/App/App/Assets.xcassets/`)
- Generate all required sizes for Android (in `android/app/src/main/res/`)
- Update native project configuration files automatically

### Sync to Native Projects

After generating assets, sync them to your native projects:

```bash
# For iOS
npx cap sync ios

# For Android
npx cap sync android

# Or both
npx cap sync
```

## ⚙️ 3. Config Update

Your `capacitor.config.json` needs updates for splash screen timing and scaling:

### Current Config Issues:
- `launchShowDuration: 0` and `launchAutoHide: false` means manual control
- To show splash for 3 seconds automatically, we should use auto-hide

### Recommended Config:

Update your `capacitor.config.json` SplashScreen plugin config:

```json
{
  "plugins": {
    "SplashScreen": {
      "launchShowDuration": 3000,
      "launchAutoHide": true,
      "backgroundColor": "#000000",
      "androidSplashResourceName": "splash",
      "androidScaleType": "CENTER_CROP",
      "showSpinner": false,
      "splashFullScreen": true,
      "splashImmersive": true
    }
  }
}
```

**Key Changes:**
- `launchShowDuration: 3000` - Shows splash for 3 seconds
- `launchAutoHide: true` - Automatically hides after duration
- `androidScaleType: "CENTER_CROP"` - Prevents stretching (maintains aspect ratio, crops edges if needed)

**Alternative Scale Types (if CENTER_CROP doesn't work well):**
- `FIT_CENTER` - Fits entire image, may have letterboxing
- `FIT_XY` - Stretches to fill (not recommended)

**Note:** If you prefer manual control (like your current setup), keep `launchAutoHide: false` and the splash will hide when your app calls `SplashScreen.hide()` in code.

## 🔍 4. Verify Assets in Native Projects

### iOS (Xcode)

1. **Open Xcode Project:**
   ```bash
   npx cap open ios
   ```

2. **Check App Icon:**
   - In Xcode, navigate to: `App/App/Assets.xcassets/AppIcon.appiconset/`
   - You should see multiple icon sizes (e.g., `AppIcon-20pt@2x.png`, `AppIcon-29pt@2x.png`, etc.)
   - Right-click → "Show in Finder" to see all generated files

3. **Check Splash Screen:**
   - Navigate to: `App/App/Assets.xcassets/Splash.imageset/`
   - Should contain `splash-2732x2732.png` and related files

4. **Visual Verification:**
   - Build and run on iOS Simulator or device
   - App icon should appear on home screen
   - Splash screen should show for 3 seconds on launch

### Android (Android Studio)

1. **Open Android Studio Project:**
   ```bash
   npx cap open android
   ```

2. **Check App Icons:**
   - Navigate to: `app/src/main/res/mipmap-*/`
   - You should see folders: `mipmap-hdpi/`, `mipmap-mdpi/`, `mipmap-xhdpi/`, `mipmap-xxhdpi/`, `mipmap-xxxhdpi/`
   - Each folder should contain: `ic_launcher.png`, `ic_launcher_foreground.png`, `ic_launcher_round.png`

3. **Check Splash Screen:**
   - Navigate to: `app/src/main/res/drawable-*/`
   - Should see multiple `splash.png` files in:
     - `drawable-port-*/` (portrait orientations)
     - `drawable-land-*/` (landscape orientations)
     - Various density folders (hdpi, mdpi, xhdpi, xxhdpi, xxxhdpi)

4. **Verify in AndroidManifest.xml:**
   - Check `android/app/src/main/AndroidManifest.xml`
   - Should reference: `android:icon="@mipmap/ic_launcher"`

5. **Visual Verification:**
   - Build and run on Android Emulator or device
   - App icon should appear in app drawer
   - Splash screen should show for 3 seconds on launch

### Quick File Check Commands

**iOS:**
```bash
# Check if icons were generated
ls -la ios/App/App/Assets.xcassets/AppIcon.appiconset/

# Check if splash was generated
ls -la ios/App/App/Assets.xcassets/Splash.imageset/
```

**Android:**
```bash
# Check if icons were generated
ls -la android/app/src/main/res/mipmap-xxxhdpi/

# Check if splash was generated
ls -la android/app/src/main/res/drawable-port-xxxhdpi/
```

## 📝 Summary Workflow

1. **Prepare source files:**
   ```bash
   # Copy your logo.png to assets folder
   cp /path/to/logo.png assets/icon.png
   
   # Copy your splash.png to assets folder
   cp /path/to/splash.png assets/splash.png
   ```

2. **Generate assets:**
   ```bash
   npm run assets
   ```

3. **Sync to native projects:**
   ```bash
   npx cap sync
   ```

4. **Verify in native IDEs:**
   ```bash
   npx cap open ios
   npx cap open android
   ```

5. **Build and test:**
   - Build and run on simulators/devices
   - Verify icon appears correctly
   - Verify splash shows for 3 seconds without stretching

## 🐛 Troubleshooting

### Assets not generating?
- Ensure source files are in `/assets` folder (not `/src/assets` or elsewhere)
- Check file names are exactly: `icon.png` (or `icon-only.png`) and `splash.png`
- Verify image dimensions meet minimum requirements (1024×1024 for icon, 2732×2732 for splash)

### Splash screen stretching?
- Ensure `androidScaleType` is set to `CENTER_CROP` or `FIT_CENTER`
- Verify your splash.png has correct aspect ratio (should be square or close to it)

### Icons not updating in native projects?
- Run `npx cap sync` after generating assets
- Clean build in Xcode: Product → Clean Build Folder (⇧⌘K)
- In Android Studio: Build → Clean Project, then Build → Rebuild Project

### Splash not showing for 3 seconds?
- Verify `launchShowDuration: 3000` and `launchAutoHide: true` in config
- If using manual control, ensure your code calls `SplashScreen.hide()` after app loads
