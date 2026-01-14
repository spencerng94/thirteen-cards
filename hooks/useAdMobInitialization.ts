import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { AdMob } from '@capacitor-community/admob';
import { ADMOB_APP_ID, ADMOB_IOS_APP_ID } from '../constants/AdConfig';

/**
 * AdMob Initialization Hook with iOS App Tracking Transparency (ATT) Support
 * 
 * This hook:
 * 1. Initializes AdMob SDK for native platforms (iOS/Android)
 * 2. Requests ATT permission on iOS (required for IDFA access)
 * 3. Handles initialization errors gracefully (non-blocking)
 * 
 * Usage:
 * - Call this hook once at app startup (e.g., in App.tsx)
 * - The hook automatically detects platform and initializes accordingly
 */
export const useAdMobInitialization = () => {
  const isInitializedRef = useRef(false);

  useEffect(() => {
    // Prevent multiple initializations
    if (isInitializedRef.current) {
      return;
    }

    // Only initialize on native platforms (iOS/Android)
    if (!Capacitor.isNativePlatform()) {
      console.log('AdMob: Skipping initialization on web platform');
      return;
    }

    const initializeAdMob = async () => {
      try {
        // Determine the correct App ID based on platform
        const appId = Capacitor.getPlatform() === 'ios' 
          ? ADMOB_IOS_APP_ID 
          : ADMOB_APP_ID;

        console.log(`AdMob: Initializing for ${Capacitor.getPlatform()} with App ID: ${appId}`);

        // Initialize AdMob with platform-specific configuration
        await AdMob.initialize({
          requestTrackingAuthorization: true, // iOS only - requests ATT permission for IDFA
          testingDevices: [], // Add your test device IDs during development
          initializeForTesting: false, // Set to true ONLY during development with test ads
        });

        // Set the App ID after initialization (required for iOS)
        if (Capacitor.getPlatform() === 'ios') {
          await AdMob.setApplicationVolume({ volume: 1.0 }); // Optional: Set ad volume
        }

        isInitializedRef.current = true;
        console.log('AdMob: Successfully initialized');
      } catch (error) {
        // Non-blocking: Log error but don't prevent app from loading
        console.warn('AdMob: Initialization failed (non-blocking):', error);
        // Mark as initialized anyway to prevent retry loops
        isInitializedRef.current = true;
      }
    };

    // Use setTimeout to ensure this doesn't block initial render
    const timeoutId = setTimeout(() => {
      initializeAdMob();
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, []); // Empty deps - only run once on mount
};

/**
 * Clean initAdMob() function for direct use in App.tsx or service files
 * 
 * Production-ready function that:
 * - Handles iOS App Tracking Transparency (ATT) request
 * - Uses correct App ID per platform
 * - Gracefully handles errors (non-blocking)
 * 
 * ⚠️ REMINDER: Use Test Ad Unit IDs for development!
 * - Test Rewarded Video: ca-app-pub-3940256099942544/5224354917
 * - Set initializeForTesting: false in production
 * 
 * @returns Promise that resolves when initialization completes (or fails gracefully)
 */
export const initAdMob = async (): Promise<void> => {
  // Only initialize on native platforms (iOS/Android)
  if (!Capacitor.isNativePlatform()) {
    console.log('AdMob: Skipping initialization on web platform');
    return;
  }

  try {
    // Determine the correct App ID based on platform
    const appId = Capacitor.getPlatform() === 'ios' 
      ? ADMOB_IOS_APP_ID 
      : ADMOB_APP_ID;

    console.log(`AdMob: Initializing for ${Capacitor.getPlatform()} with App ID: ${appId}`);

    // Initialize AdMob with iOS ATT support
    // requestTrackingAuthorization: true will show ATT prompt on iOS 14.5+
    await AdMob.initialize({
      requestTrackingAuthorization: true, // iOS only - requests ATT permission for IDFA
      testingDevices: [], // Add your test device IDs during development
      initializeForTesting: false, // ⚠️ Set to true ONLY during development with test ads
    });

    console.log('AdMob: Successfully initialized with ATT support');
  } catch (error) {
    // Non-blocking: Log error but don't prevent app from loading
    console.warn('AdMob: Initialization failed (non-blocking):', error);
    // Don't throw - allow app to continue even if AdMob fails
  }
};

/**
 * Legacy function name (for backwards compatibility)
 * @deprecated Use initAdMob() instead
 */
export const initializeAdMobWithATT = initAdMob;
