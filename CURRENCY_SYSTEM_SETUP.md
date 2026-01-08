# Cross-Platform Currency System Setup Guide

This document explains how to set up and use the cross-platform currency system for Thirteen Cards, which supports:
- **Mobile IAP**: RevenueCat for iOS/Android
- **Web Payments**: Stripe Checkout for web browsers
- **Database**: Supabase for transaction tracking and gem balance management

## 📋 Prerequisites

1. Supabase project with `profiles` table
2. RevenueCat account (for mobile IAP)
3. Stripe account (for web payments)
4. Node.js server (Render, Vercel, or similar)

## 🗄️ Database Setup

### 1. Run SQL Migrations

Execute these migrations in your Supabase SQL editor:

1. **`create_gem_transactions_table.sql`**
   - Creates `gem_transactions` table to track all gem transactions
   - Prevents double-counting via `provider_id` unique constraint
   - Tracks transaction type (purchase, spend, reward) and provider (stripe, revenuecat, internal)

2. **`add_gem_balance_rls_policy.sql`**
   - Adds RLS policies to prevent direct gem balance updates from frontend
   - Creates `update_user_gems()` function for secure server-side updates
   - Users can read their gem balance but cannot update it directly

### 2. Verify RLS Policies

Ensure your `profiles` table has:
- ✅ SELECT policy: Users can view their own profile
- ✅ UPDATE policy: Only via RPC functions (SECURITY DEFINER)
- ✅ No direct gem updates allowed from frontend

## 📱 Mobile Setup (RevenueCat)

### 1. Install Dependencies

```bash
npm install @revenuecat/purchases-capacitor
```

### 2. Configure Environment Variables

Add to your `.env` or environment:

```env
VITE_REVENUECAT_API_KEY=your_revenuecat_api_key
REVENUECAT_WEBHOOK_SECRET=your_revenuecat_webhook_secret
```

### 3. Initialize RevenueCat in Your App

The `useGems` hook automatically initializes RevenueCat on mobile platforms. Use it in your authentication flow:

```tsx
import { useGems } from '../hooks/useGems';
import { supabase } from '../services/supabase';

function App() {
  const { loginToRevenueCat, purchasePackage, getPackages } = useGems();
  
  // After user signs in with Supabase
  useEffect(() => {
    const handleAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Link RevenueCat to Supabase user ID
        await loginToRevenueCat(session.user.id);
      }
    };
    handleAuth();
  }, []);
  
  // Handle purchase
  const handlePurchase = async (pack: PurchasesPackage) => {
    const result = await purchasePackage(pack);
    if (result.success) {
      // Purchase successful - webhook will credit gems
      console.log('Purchase completed!');
    }
  };
}
```

### 4. Configure RevenueCat Webhook

In RevenueCat dashboard:
1. Go to **Project Settings** → **Webhooks**
2. Add webhook URL: `https://your-domain.com/api/webhooks/payments/revenuecat`
3. Select events:
   - `SUBSCRIBER_ALIAS_UPDATED` (when user ID is linked)
   - `PURCHASE` (when purchase completes)
4. Set webhook secret as `REVENUECAT_WEBHOOK_SECRET` environment variable

### 5. Map Product IDs to Gem Amounts

Update the `GEM_PACK_MAP` in `server/server.ts` to match your RevenueCat offerings:

```typescript
const GEM_PACK_MAP: Record<string, number> = {
  'gem_1': 250,
  'gem_2': 700,
  'gem_3': 1500,
  'gem_4': 3200,
  'gem_5': 8500,
  'gem_6': 18000,
};
```

## 🌐 Web Setup (Stripe)

### 1. Install Dependencies

```bash
cd server
npm install stripe @supabase/supabase-js
```

### 2. Configure Environment Variables

Add to your server environment:

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Use Stripe Checkout in Frontend

```tsx
import { createStripeCheckout } from '../services/stripe';

const handlePurchase = async (pack: GemPack) => {
  const result = await createStripeCheckout(
    userId,
    pack.id,
    pack.totalGems,
    parseFloat(pack.price.replace('$', ''))
  );
  
  if (result.success && result.checkoutUrl) {
    // Redirect to Stripe Checkout
    window.location.href = result.checkoutUrl;
  }
};
```

### 4. Configure Stripe Webhook

In Stripe dashboard:
1. Go to **Developers** → **Webhooks**
2. Add endpoint: `https://your-domain.com/api/webhooks/payments/stripe`
3. Select event: `checkout.session.completed`
4. Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`

## 🔒 Security

### Webhook Signature Verification

Both RevenueCat and Stripe webhooks verify signatures to prevent unauthorized requests:

- **RevenueCat**: Uses HMAC-SHA256 with webhook secret
- **Stripe**: Uses HMAC-SHA256 with timestamp and signature

### Double-Counting Prevention

The `gem_transactions` table has a unique constraint on `provider_id`:
- Each Stripe `payment_intent_id` can only be processed once
- Each RevenueCat `transaction_id` can only be processed once
- Duplicate webhook calls are safely ignored

### RLS Policies

- Users can **read** their own gem balance
- Users **cannot** directly update gems (only via RPC/webhooks)
- All gem updates go through server-side functions with `SECURITY DEFINER`

## 📊 Transaction Flow

### Mobile Purchase Flow:
1. User taps "Purchase" in app
2. `purchasePackage()` triggers native payment sheet
3. Apple/Google processes payment
4. RevenueCat receives purchase event
5. RevenueCat webhook calls `/api/webhooks/payments/revenuecat`
6. Server verifies signature and credits gems
7. Transaction recorded in `gem_transactions` table

### Web Purchase Flow:
1. User clicks "Purchase" on web
2. `createStripeCheckout()` creates checkout session
3. User redirected to Stripe Checkout
4. User completes payment
5. Stripe webhook calls `/api/webhooks/payments/stripe`
6. Server verifies signature and credits gems
7. Transaction recorded in `gem_transactions` table

## 🧪 Testing

### Test RevenueCat Webhook:
```bash
curl -X POST https://your-domain.com/api/webhooks/payments/revenuecat \
  -H "Authorization: your_webhook_secret_signature" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "PURCHASE",
    "transaction_id": "test_123",
    "app_user_id": "user_uuid",
    "product_id": "gem_1"
  }'
```

### Test Stripe Webhook:
Use Stripe CLI:
```bash
stripe listen --forward-to localhost:3001/api/webhooks/payments/stripe
stripe trigger checkout.session.completed
```

## 📝 Environment Variables Summary

### Frontend (.env):
```env
VITE_REVENUECAT_API_KEY=rc_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_...
VITE_BACKEND_URL=https://your-api.com
```

### Backend (server environment):
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
REVENUECAT_WEBHOOK_SECRET=your_webhook_secret
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## 🐛 Troubleshooting

### RevenueCat not initializing:
- Check `VITE_REVENUECAT_API_KEY` is set
- Verify you're on a mobile device (iOS/Android)
- Check browser console for errors

### Stripe checkout not working:
- Verify `STRIPE_SECRET_KEY` is set on server
- Check `VITE_BACKEND_URL` points to correct server
- Ensure CORS allows your frontend domain

### Webhooks not receiving events:
- Verify webhook URLs are publicly accessible
- Check webhook secrets match in dashboard and environment
- Review server logs for signature verification errors
- Ensure webhook endpoints are POST routes

### Gems not crediting:
- Check `gem_transactions` table for duplicate `provider_id`
- Verify user ID matches between webhook and Supabase
- Check server logs for errors in `processGemPurchase()`
- Ensure `update_user_gems()` function exists in Supabase

## 📚 Additional Resources

- [RevenueCat Documentation](https://docs.revenuecat.com/)
- [Stripe Checkout Documentation](https://stripe.com/docs/payments/checkout)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
