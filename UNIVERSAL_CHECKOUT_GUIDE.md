# Universal Checkout Controller Guide

This guide explains how to use the platform-agnostic Stripe checkout endpoint that works for Web, iOS, and Android.

## Backend Endpoint

**Endpoint:** `POST /api/stripe/create-checkout`

**Location:** `server/server.ts`

### Request Body

```typescript
{
  user_id: string;        // Supabase UUID (REQUIRED)
  priceId: string;        // Stripe Price ID (REQUIRED)
  gemAmount: number;      // Integer gem amount (REQUIRED)
  platform: 'web' | 'ios' | 'android'; // Platform identifier (REQUIRED)
  successUrl?: string;   // Optional custom success URL
  cancelUrl?: string;    // Optional custom cancel URL
}
```

### Standardized Metadata

Every checkout session includes these metadata fields (regardless of platform):

- `user_id` - The Supabase UUID (standardized field name)
- `gem_amount` - The integer amount of gems
- `platform` - Where the sale came from ('web', 'ios', or 'android')

The metadata also includes camelCase versions for backward compatibility:
- `supabaseUserId` - Same as user_id
- `gemAmount` - Same as gem_amount

### Cross-Platform Redirects

The endpoint automatically handles redirect URLs based on platform:

- **Web**: Uses HTTP/HTTPS URLs (e.g., `https://playthirteen.app/purchase-success`)
- **Mobile**: Uses deep links (e.g., `thirteencards://purchase-success`)

You can override these by providing `successUrl` and `cancelUrl` in the request.

---

## Frontend Implementation Examples

### Web (React/Vite)

**File:** `components/BillingProvider.tsx`

```typescript
const buyGemsWeb = async (priceId: string) => {
  const backendUrl = getEnv('VITE_BACKEND_URL') || 'http://localhost:3001';
  const { data: sessionData } = await supabase.auth.getSession();
  
  const response = await fetch(`${backendUrl}/api/stripe/create-checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionData.session.access_token}`,
    },
    body: JSON.stringify({
      user_id: session.user.id,
      priceId: priceId,
      gemAmount: 250, // Example: 250 gems
      platform: 'web',
    }),
  });
  
  const data = await response.json();
  if (data.checkoutUrl) {
    window.location.href = data.checkoutUrl; // Redirect to Stripe Checkout
  }
};
```

**Usage:**
```typescript
// In your component
const { buyGemsWeb } = useBilling();
await buyGemsWeb('price_1SnKGnBkgBBl4oR7dpSEBZi2'); // 250 gems pack
```

---

### Mobile (React Native / Capacitor)

**File:** `components/BillingProvider.tsx` (or mobile-specific service)

```typescript
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

const buyGemsMobile = async (priceId: string, gemAmount: number) => {
  const platform = Capacitor.getPlatform(); // 'ios' or 'android'
  const backendUrl = getEnv('VITE_BACKEND_URL') || 'https://your-render-app.onrender.com';
  const { data: sessionData } = await supabase.auth.getSession();
  
  // Deep link URLs for mobile
  const deepLinkScheme = 'thirteencards://';
  const successUrl = `${deepLinkScheme}purchase-success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${deepLinkScheme}purchase-cancel`;
  
  const response = await fetch(`${backendUrl}/api/stripe/create-checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionData.session.access_token}`,
    },
    body: JSON.stringify({
      user_id: session.user.id,
      priceId: priceId,
      gemAmount: gemAmount,
      platform: platform, // 'ios' or 'android'
      successUrl: successUrl,
      cancelUrl: cancelUrl,
    }),
  });
  
  const data = await response.json();
  
  if (data.checkoutUrl) {
    // Open Stripe Checkout in in-app browser
    // For Capacitor, use Browser plugin:
    import { Browser } from '@capacitor/browser';
    await Browser.open({ url: data.checkoutUrl });
    
    // Or use Capacitor's App plugin to handle deep links:
    App.addListener('appUrlOpen', (data) => {
      if (data.url.includes('purchase-success')) {
        // Handle successful purchase
        const sessionId = new URL(data.url).searchParams.get('session_id');
        // Refresh gem balance, show success message, etc.
      }
    });
  }
};
```

**Alternative: Stripe Payment Sheet (Recommended for Native Apps)**

For better native app experience, consider using Stripe Payment Sheet instead of Checkout:

```typescript
import { loadStripe } from '@stripe/stripe-react-native';

const buyGemsNative = async (priceId: string, gemAmount: number) => {
  const platform = Capacitor.getPlatform();
  const backendUrl = getEnv('VITE_BACKEND_URL');
  const { data: sessionData } = await supabase.auth.getSession();
  
  // 1. Create Payment Intent on backend
  const response = await fetch(`${backendUrl}/api/stripe/create-payment-intent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sessionData.session.access_token}`,
    },
    body: JSON.stringify({
      user_id: session.user.id,
      priceId: priceId,
      gemAmount: gemAmount,
      platform: platform,
    }),
  });
  
  const { clientSecret } = await response.json();
  
  // 2. Initialize Stripe Payment Sheet
  const { initPaymentSheet, presentPaymentSheet } = loadStripe();
  
  await initPaymentSheet({
    paymentIntentClientSecret: clientSecret,
    merchantDisplayName: 'Thirteen Cards',
  });
  
  // 3. Present Payment Sheet
  const { error } = await presentPaymentSheet();
  
  if (error) {
    console.error('Payment failed:', error);
  } else {
    // Payment succeeded - webhook will credit gems
    // Refresh gem balance
  }
};
```

---

## Webhook Handler

The webhook handler (`/api/webhooks/stripe`) automatically extracts:

- `user_id` (or `supabaseUserId`, `supabase_user_id` for compatibility)
- `gem_amount` (or `gemAmount` for compatibility)
- `platform` (for analytics)

Example webhook log:
```
📊 Purchase from platform: ios
✅ Webhook Verified: Crediting 250 gems to abc-123-def-456
```

---

## Environment Variables

**Backend (Render):**
```bash
STRIPE_SECRET_KEY=sk_test_... # or sk_live_... for production
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=https://playthirteen.app # For web redirects
```

**Frontend:**
```bash
VITE_BACKEND_URL=https://your-render-app.onrender.com
```

---

## Testing

### Test Web Checkout:
```bash
curl -X POST https://your-render-app.onrender.com/api/stripe/create-checkout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_TOKEN" \
  -d '{
    "user_id": "your-user-id",
    "priceId": "price_1SnKGnBkgBBl4oR7dpSEBZi2",
    "gemAmount": 250,
    "platform": "web"
  }'
```

### Test Mobile Checkout:
```bash
curl -X POST https://your-render-app.onrender.com/api/stripe/create-checkout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_TOKEN" \
  -d '{
    "user_id": "your-user-id",
    "priceId": "price_1SnKGnBkgBBl4oR7dpSEBZi2",
    "gemAmount": 250,
    "platform": "ios",
    "successUrl": "thirteencards://purchase-success?session_id={CHECKOUT_SESSION_ID}",
    "cancelUrl": "thirteencards://purchase-cancel"
  }'
```

---

## Platform Detection

### Web:
```typescript
const platform = 'web';
```

### iOS (Capacitor):
```typescript
import { Capacitor } from '@capacitor/core';
const platform = Capacitor.getPlatform() === 'ios' ? 'ios' : 'android';
```

### React Native:
```typescript
import { Platform } from 'react-native';
const platform = Platform.OS; // 'ios' or 'android'
```

---

## Summary

✅ **Backend is platform-agnostic** - Same endpoint works for all platforms  
✅ **Standardized metadata** - Always includes `user_id`, `gem_amount`, `platform`  
✅ **Cross-platform redirects** - Handles web URLs and mobile deep links  
✅ **Backward compatible** - Still supports old field names (`supabase_user_id`, etc.)  
✅ **Analytics ready** - Platform tracking built-in for sales analysis
