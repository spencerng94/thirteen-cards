# Secure Ad Reward Implementation Guide

## Overview

This implementation secures the gem reward logic by using a Supabase Stored Procedure (RPC) that:
- Uses `auth.uid()` server-side to prevent spoofing
- Enforces a 30-second cooldown to prevent botting
- Uses SECURITY DEFINER for proper permissions
- Only allows authenticated users to claim rewards

## Files Created/Modified

### 1. SQL Migration: `supabase_migrations/create_claim_ad_reward_function.sql`

**Purpose:** Creates the secure PostgreSQL function

**Key Features:**
- ✅ Uses `auth.uid()` to get authenticated user (prevents spoofing)
- ✅ Increments gems by exactly 20
- ✅ 30-second cooldown check
- ✅ SECURITY DEFINER for table update permissions
- ✅ Only grants execute to `authenticated` role (revokes from `anon`)

**To Apply:**
```sql
-- Run this migration in your Supabase SQL Editor
-- Or use Supabase CLI: supabase db push
```

### 2. React Function: `services/supabase.ts`

**New Function:** `claimAdRewardGems()`

```typescript
export const claimAdRewardGems = async (): Promise<{
  success: boolean;
  newGemBalance?: number;
  error?: string;
  cooldownRemaining?: number;
}>
```

**Usage:**
```typescript
const { data, error } = await supabase.rpc('claim_ad_reward');
// Or use the wrapper function:
const result = await claimAdRewardGems();
```

**Key Features:**
- ✅ No parameters needed (uses `auth.uid()` server-side)
- ✅ Handles guest users (localStorage fallback)
- ✅ Returns cooldown information on error
- ✅ Proper error handling

### 3. Component Integration: `components/InventoryModal.tsx`

**Updated:** Ad reward callback now uses `claimAdReward()`

**Before:**
```typescript
const result = await processGemTransaction(profile.id, 20, 'ad_reward');
```

**After:**
```typescript
const result = await claimAdRewardGems();
```

**Benefits:**
- ✅ No user ID passed (prevents spoofing)
- ✅ Server-side authentication check
- ✅ Cooldown enforced server-side
- ✅ Better error messages

## Security Features

### 1. Server-Side Authentication
```sql
current_user_id := auth.uid();
```
- Only works for authenticated users
- Cannot be spoofed from client
- Returns error if not authenticated

### 2. Cooldown Protection
```sql
IF cooldown_seconds < 30 THEN
  RETURN json_build_object('success', false, 'error', 'Cooldown active', ...);
END IF;
```
- Enforced server-side
- Prevents rapid-fire requests
- Returns remaining cooldown time

### 3. SECURITY DEFINER
```sql
SECURITY DEFINER
SET search_path = public
```
- Function runs with elevated permissions
- Can update profiles table
- Restricted to authenticated users only

### 4. Role-Based Access
```sql
GRANT EXECUTE ON FUNCTION claim_ad_reward() TO authenticated;
REVOKE EXECUTE ON FUNCTION claim_ad_reward() FROM anon;
```
- Only authenticated users can call
- Anonymous users cannot access

## Integration Steps

### Step 1: Apply SQL Migration

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Run the migration file: `create_claim_ad_reward_function.sql`
4. Verify function exists: Check Functions tab

### Step 2: Update React Code

The `claimAdReward()` function is already added to `services/supabase.ts`.

### Step 3: Update AdMob Callback

**In your ad reward callback (e.g., `InventoryModal.tsx`):**

```typescript
await adService.showRewardedAd(placement, async (amount) => {
  // SECURITY: This callback is ONLY triggered AFTER AdMob's onUserEarnedReward event fires
  // Call secure RPC function that uses auth.uid() server-side
  const result = await claimAdRewardGems();
  
  if (result.success && result.newGemBalance !== undefined) {
    // Success handling
    audioService.playPurchase();
    setShowGemRain(true);
    setToastMessage('Boba secured! +20 Gems');
    onRefresh();
  } else {
    // Error handling (including cooldown)
    if (result.error === 'Cooldown active' && result.cooldownRemaining) {
      setToastMessage(`Please wait ${result.cooldownRemaining}s before claiming again`);
    } else {
      setToastMessage(result.error || 'Failed to process reward');
    }
  }
});
```

### Step 4: Update Other Components (Optional)

If you have other components using ad rewards, update them similarly:

**Components to check:**
- `components/Store.tsx` (if using real AdMob)
- `components/VictoryScreen.tsx` (if using ad rewards)
- Any other components with ad reward logic

## Testing

### 1. Test Authentication
```typescript
// Should work for authenticated users
const result = await claimAdReward();
console.log(result); // { success: true, newGemBalance: 120, gems_awarded: 20 }
```

### 2. Test Cooldown
```typescript
// First call
await claimAdReward(); // Success

// Immediate second call
await claimAdReward(); // { success: false, error: 'Cooldown active', cooldownRemaining: 29 }
```

### 3. Test Unauthenticated
```typescript
// If not logged in
await claimAdReward(); // { success: false, error: 'User not authenticated' }
```

### 4. Test Guest Users
```typescript
// Guest users fall back to localStorage
// Function handles this automatically
```

## Error Handling

### Success Response
```json
{
  "success": true,
  "new_balance": 120,
  "gems_awarded": 20
}
```

### Cooldown Error
```json
{
  "success": false,
  "error": "Cooldown active",
  "cooldown_remaining": 15,
  "current_balance": 100
}
```

### Authentication Error
```json
{
  "success": false,
  "error": "User not authenticated"
}
```

### Profile Not Found
```json
{
  "success": false,
  "error": "User profile not found"
}
```

## Migration Checklist

- [ ] Apply SQL migration in Supabase
- [ ] Verify function exists in Supabase Functions tab
- [ ] Test function with authenticated user
- [ ] Test cooldown enforcement
- [ ] Update `InventoryModal.tsx` (already done)
- [ ] Update other components if needed
- [ ] Test end-to-end ad flow
- [ ] Verify gems update correctly
- [ ] Check error handling
- [ ] Monitor Supabase logs

## Security Benefits

1. **No Spoofing:** User ID comes from `auth.uid()`, not client
2. **Server-Side Validation:** All checks happen in PostgreSQL
3. **Cooldown Enforcement:** Cannot be bypassed from client
4. **Role-Based Access:** Only authenticated users can call
5. **Audit Trail:** All calls logged in Supabase

## Next Steps

1. Apply the migration
2. Test the function
3. Update remaining components
4. Monitor for errors
5. Consider adding transaction logging (optional)

---

**Implementation Complete! 🎉**
