/**
 * AdMob Configuration
 * 
 * 🔧 TO GO LIVE: Simply change IS_PRODUCTION to true when ready!
 * 
 * The code automatically switches between:
 * - Test ID (when IS_PRODUCTION = false) - for development/testing
 * - Production ID (when IS_PRODUCTION = true) - for live deployment
 */

// Set to false for development/testing, true for production
// 🔧 TO GO LIVE: Change this to true when ready to use production ads
export const IS_PRODUCTION = false;

// Enable mock mode for development (bypasses actual ad SDK, instantly rewards)
// Set to true to test Supabase logic without waiting for ads
export const ENABLE_MOCK_ADS = import.meta.env.DEV && import.meta.env.VITE_MOCK_ADS === 'true';

// Google Test Ad Unit ID for Rewarded Video Ads (Google's official test ad)
export const TEST_REWARDED_AD_UNIT_ID = 'ca-app-pub-3940256099942544/5224354917';

// Production Ad Unit ID (Your real AdMob Rewarded Ad Unit)
export const PRODUCTION_REWARDED_AD_UNIT_ID = 'ca-app-pub-2492802068591531/9717780674';

// AdMob App ID (Your real AdMob App ID)
// Android App ID
export const ADMOB_APP_ID = 'ca-app-pub-2492802068591531~8080926061';
// iOS App ID
export const ADMOB_IOS_APP_ID = 'ca-app-pub-2492802068591531~3275870689';

// Get the appropriate ad unit ID based on environment
// This is automatically used throughout the codebase
export const REWARDED_AD_UNIT_ID = IS_PRODUCTION 
  ? PRODUCTION_REWARDED_AD_UNIT_ID 
  : TEST_REWARDED_AD_UNIT_ID;
