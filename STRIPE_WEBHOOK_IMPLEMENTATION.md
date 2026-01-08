# Stripe Webhook Implementation Guide

## Overview

The Stripe webhook endpoint is fully implemented and ready to process payments. This document outlines the implementation details and setup instructions.

## Implementation Details

### 1. Webhook Route (`/api/webhooks/stripe`)

**Location:** `server/server.ts` (line ~1243)

**Key Features:**
- Uses `express.raw({ type: 'application/json' })` to preserve raw body for signature verification
- Properly handles Stripe signature verification
- Calls Supabase RPC function `add_gems_to_user` to credit gems

**Route Configuration:**
```typescript
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  // Handles Stripe webhook events
});
```

### 2. Signature Verification

The webhook uses `stripe.webhooks.constructEvent()` to verify the Stripe signature:
- Uses `process.env.STRIPE_WEBHOOK_SECRET` for verification
- Returns 401 if signature is invalid
- Logs all verification attempts for debugging

### 3. Event Handling

**Event Type:** `checkout.session.completed`

**Process Flow:**
1. Webhook receives `checkout.session.completed` event
2. Extracts `supabase_user_id` and `gem_amount` from `session.metadata`
3. Calls Supabase RPC: `add_gems_to_user(user_id, amount, session_id)`
4. Returns success response to Stripe

**RPC Function Call:**
```typescript
await supabase.rpc('add_gems_to_user', {
  user_id: supabaseUserId,
  amount: gemAmount,
  session_id: session.id
});
```

### 4. Diagnostic Logging

The implementation includes comprehensive logging:
- `🔔 Stripe webhook endpoint hit` - When route is accessed
- `📥 Stripe webhook received: [event.type]` - Event type received
- `Stripe Webhook received for user: [userId]` - User ID from metadata
- `📥 Calling add_gems_to_user RPC` - Before RPC call
- `✅ Stripe purchase processed` - After successful processing
- Error logs for all failure cases

## Environment Variables

### Required on Render Backend:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_... # or sk_live_... for production
STRIPE_WEBHOOK_SECRET=whsec_... # From Stripe Dashboard > Webhooks

# Supabase Configuration (for RPC calls)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### How to Get Stripe Webhook Secret:

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter your webhook URL: `https://your-render-app.onrender.com/api/webhooks/stripe`
4. Select event: `checkout.session.completed`
5. Click "Add endpoint"
6. Copy the "Signing secret" (starts with `whsec_`)
7. Add to Render environment variables as `STRIPE_WEBHOOK_SECRET`

## Stripe Price IDs

The following Price IDs are configured in the frontend:

| Pack | Price | Gems | Stripe Price ID |
|------|-------|------|-----------------|
| gem_1 | $1.99 | 250 | `price_1SnKGnBkgBBl4oR7dpSEBZi2` |
| gem_2 | $4.99 | 700 | `price_1SnKJPBkgBBl4oR73f3SbUEB` |
| gem_3 | $9.99 | 1,500 | `price_1SnKJlBkgBBl4oR7j1NG2RHA` |
| gem_4 | $19.99 | 3,200 | `price_1SnKK1BkgBBl4oR7syKR0aVL` |
| gem_5 | $49.99 | 8,500 | `price_1SnKKHBkgBBl4oR72Bmxygd1` |
| gem_6 | $99.99 | 18,000 | `price_1SnKKVBkgBBl4oR7IzVPVDyf` |

## Testing

### Local Testing with Stripe CLI:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3001/api/webhooks/stripe

# Trigger test event
stripe trigger checkout.session.completed
```

### Check Render Logs:

After deploying to Render, check the logs for:
- `🔔 Stripe webhook endpoint hit` - Confirms route is accessible
- `Stripe Webhook received for user: [userId]` - Confirms user ID extraction
- `✅ Stripe purchase processed` - Confirms successful processing

## Troubleshooting

### 404 Error:
- Verify the route is `/api/webhooks/stripe` (not `/api/webhook/stripe`)
- Check that the server is running and accessible
- Verify Render deployment is successful

### 401 Invalid Signature:
- Verify `STRIPE_WEBHOOK_SECRET` is set correctly in Render
- Ensure webhook secret matches the one in Stripe Dashboard
- Check that `express.raw()` is used (not `express.json()`)

### Missing Metadata:
- Verify checkout session creation includes metadata:
  ```typescript
  metadata: {
    supabase_user_id: userId,
    gem_amount: gemAmount.toString()
  }
  ```

### RPC Function Error:
- Verify `add_gems_to_user` function exists in Supabase
- Check function signature matches: `(user_id UUID, amount INTEGER, session_id TEXT)`
- Verify `SUPABASE_SERVICE_ROLE_KEY` has permissions to call RPC

## Next Steps

1. ✅ Webhook route implemented
2. ✅ Signature verification implemented
3. ✅ RPC function call implemented
4. ⏳ Deploy to Render
5. ⏳ Configure webhook in Stripe Dashboard
6. ⏳ Test with real purchase
7. ⏳ Monitor Render logs for webhook events
