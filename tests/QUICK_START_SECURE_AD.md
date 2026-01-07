# Quick Start: Secure Ad Reward

## 🚀 Quick Implementation

### 1. Apply SQL Migration

Run in Supabase SQL Editor:
```sql
-- File: supabase_migrations/create_claim_ad_reward_function.sql
```

Or use Supabase CLI:
```bash
supabase db push
```

### 2. Use in React

```typescript
import { claimAdRewardGems } from '../services/supabase';

// In your AdMob onUserEarnedReward callback:
await adService.showRewardedAd(placement, async (amount) => {
  const result = await claimAdRewardGems();
  
  if (result.success) {
    // Success! Gems added
    console.log('New balance:', result.newGemBalance);
  } else {
    // Handle error (cooldown, auth, etc.)
    console.error(result.error);
  }
});
```

### 3. That's It!

The function:
- ✅ Uses `auth.uid()` server-side (no spoofing)
- ✅ Enforces 30-second cooldown
- ✅ Only works for authenticated users
- ✅ Returns new gem balance

## 📋 Function Signature

```typescript
claimAdRewardGems(): Promise<{
  success: boolean;
  newGemBalance?: number;
  error?: string;
  cooldownRemaining?: number;
}>
```

## 🔒 Security Features

- **Server-Side Auth:** Uses `auth.uid()` - cannot be spoofed
- **Cooldown:** 30 seconds enforced server-side
- **Role-Based:** Only `authenticated` users can call
- **SECURITY DEFINER:** Proper permissions for table updates

## 📝 Example Usage

```typescript
// Simple usage
const result = await claimAdRewardGems();

if (result.success) {
  // Update UI with result.newGemBalance
} else if (result.error === 'Cooldown active') {
  // Show cooldown message: "Wait ${result.cooldownRemaining}s"
} else {
  // Show error: result.error
}
```

---

See `SECURE_AD_REWARD_IMPLEMENTATION.md` for full details.
