# RevenueCat & Supabase Integration Guide

This document explains how RevenueCat is integrated with Supabase Auth in the Thirteen Cards app.

## Overview

The integration ensures that:
1. **Secure Configuration**: API keys are stored in environment variables
2. **Identity Sync**: RevenueCat user ID matches Supabase user ID for cross-platform gem sync
3. **Environment Guard**: RevenueCat only initializes on native platforms (iOS/Android)
4. **Shop Logic**: Gem packages are fetched from RevenueCat and purchases are handled securely
5. **Global State**: Gem balance is updated when purchases complete
6. **Cleanup**: RevenueCat identity is cleared on logout

## Architecture

### BillingProvider Component

Located at `components/BillingProvider.tsx`, this component:

- **Initializes RevenueCat** only on native platforms using `Capacitor.isNativePlatform()`
- **Uses environment variables** for API keys:
  - `VITE_REVENUECAT_IOS_KEY` for iOS
  - `VITE_REVENUECAT_ANDROID_KEY` for Android
- **Logs in to RevenueCat** when Supabase session is available using `Purchases.logIn(session.user.id)`
- **Logs out from RevenueCat** when user signs out using `Purchases.logOut()`
- **Provides context** via `useBilling()` hook for:
  - `fetchOfferings()` - Get available gem packages
  - `buyGems(pack)` - Purchase a gem pack
  - `restorePurchases()` - Restore previous purchases
  - `isInitialized` - Check if RevenueCat is ready
  - `userGems` - Current gem balance (synced from Supabase)

### Integration in App.tsx

The `BillingProvider` wraps the entire app in `App.tsx`:

```tsx
<BillingProvider 
  session={session} 
  onGemsUpdate={() => {
    // Trigger profile refresh when gems are updated via RevenueCat
    if (session?.user?.id) {
      handleRefreshProfile();
    }
  }}
>
  {/* App content */}
</BillingProvider>
```

### GemPacks Component

The `GemPacks` component (`components/GemPacks.tsx`) uses the billing context:

- **On Web**: Uses Stripe placeholder (to be implemented)
- **On Mobile**: Uses RevenueCat via `useBilling()` hook
  - Fetches offerings on mount
  - Matches local gem packs to RevenueCat packages by identifier
  - Calls `buyGems()` to process purchases
  - Refreshes profile after purchase to sync gems from webhook

## Environment Variables

Add these to your `.env` file or deployment platform:

```bash
# RevenueCat API Keys
VITE_REVENUECAT_IOS_KEY=your_ios_api_key_here
VITE_REVENUECAT_ANDROID_KEY=your_android_api_key_here
```

## RevenueCat Setup

1. **Create Products in RevenueCat Dashboard**:
   - Product IDs should match your gem pack IDs: `gem_1`, `gem_2`, `gem_3`, `gem_4`, `gem_5`, `gem_6`
   - Configure prices in App Store Connect / Google Play Console
   - Create an Offering named "Gem Packages" with all products

2. **Configure Webhooks**:
   - Set up a webhook endpoint that receives RevenueCat purchase events
   - When a purchase completes, update the user's gems in Supabase
   - Use the `app_user_id` from RevenueCat (which matches Supabase `user.id`)

3. **Test Purchases**:
   - Use RevenueCat's sandbox environment for testing
   - Test on both iOS and Android devices
   - Verify gems sync correctly after purchase

## Purchase Flow

1. User taps "Purchase" on a gem pack
2. `GemPacks` component calls `billing.buyGems(revenueCatPack)`
3. RevenueCat handles the native IAP flow
4. Purchase completes and RevenueCat sends webhook to your server
5. Server updates Supabase `profiles.gems` for the user
6. `BillingProvider` triggers `onGemsUpdate()` callback
7. App refreshes profile to show updated gem count

## Identity Sync

The critical identity sync happens in `BillingProvider`:

```tsx
useEffect(() => {
  if (isInitialized && session?.user?.id && !hasLoggedIn) {
    await Purchases.logIn(session.user.id);
    setHasLoggedIn(true);
  }
}, [isInitialized, session, hasLoggedIn]);
```

This ensures:
- Gems purchased on iPhone sync to web (same user ID)
- Gems purchased on Android sync to web (same user ID)
- User identity is consistent across platforms

## Logout Cleanup

When user signs out:

```tsx
useEffect(() => {
  if (!session && hasLoggedIn && isInitialized) {
    await Purchases.logOut();
    setHasLoggedIn(false);
  }
}, [session, hasLoggedIn, isInitialized]);
```

This clears the RevenueCat identity so the next user doesn't inherit purchases.

## Troubleshooting

### RevenueCat not initializing
- Check environment variables are set correctly
- Verify you're on a native platform (not web browser)
- Check console logs for initialization errors

### Purchases not syncing
- Verify webhook is configured in RevenueCat dashboard
- Check webhook endpoint is updating Supabase correctly
- Ensure `app_user_id` in RevenueCat matches Supabase `user.id`

### Packages not loading
- Verify products are configured in RevenueCat dashboard
- Check Offering is published and active
- Ensure product identifiers match (`gem_1`, `gem_2`, etc.)

## Next Steps

1. Implement Stripe integration for web purchases
2. Set up RevenueCat webhook endpoint
3. Test purchase flow on iOS and Android
4. Monitor webhook logs for purchase events
5. Add error handling for edge cases (network failures, etc.)
