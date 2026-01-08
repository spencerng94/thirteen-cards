# Supabase Redirect URL Configuration

## Overview
After moving OAuth code exchange to a dedicated `/auth/callback` route, you need to update your Supabase Dashboard redirect URL settings.

## Required Changes

### 1. Supabase Dashboard Settings

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to: **Authentication** → **URL Configuration**
3. Find the **Redirect URLs** section

### 2. Update Redirect URLs

**For Web (Production):**
```
https://your-domain.com/auth/callback
```

**For Web (Development/Local):**
```
http://localhost:5173/auth/callback
http://localhost:3000/auth/callback
```

**For Native Apps (iOS/Android):**
```
com.playthirteen.app://auth/callback
```

### 3. Site URL

Update the **Site URL** to your production domain:
```
https://your-domain.com
```

For development:
```
http://localhost:5173
```

## Why This Change?

Previously, OAuth code exchange happened in `App.tsx`, which could be interrupted by React re-renders, causing `AbortError`. 

By moving the exchange to a dedicated `/auth/callback` route:
- The exchange runs in isolation, outside the main app lifecycle
- No risk of component unmounts aborting the exchange
- Cleaner separation of concerns
- More reliable OAuth flow

## Testing

After updating the redirect URLs:

1. **Test Web OAuth:**
   - Click "Sign in with Google" on your web app
   - You should be redirected to Google
   - After authorizing, you should be redirected to `/auth/callback`
   - The callback page will exchange the code and redirect to home (`/`)

2. **Test Native OAuth:**
   - Ensure your native app's custom URL scheme is configured
   - OAuth should redirect to `com.playthirteen.app://auth/callback`
   - The callback will handle the exchange and redirect appropriately

## Troubleshooting

**Error: "redirect_uri_mismatch"**
- Ensure the redirect URL in Supabase Dashboard exactly matches what you're using in `AuthScreen.tsx`
- Check for trailing slashes, http vs https, and port numbers

**Error: "Invalid redirect URL"**
- Verify the URL is added to the allowed redirect URLs list in Supabase
- Check that the URL format matches exactly (no typos)

**OAuth completes but user isn't signed in**
- Check browser console for errors in `AuthCallback.tsx`
- Verify the code exchange is completing successfully
- Check that `onAuthStateChange` in `App.tsx` is receiving the `SIGNED_IN` event
