# Supabase Tables & RPC Functions Status

## Current Database Tables (from your Supabase)

✅ **Tables that exist and match the code:**
- `profiles` - User profiles (31 columns)
- `emotes` - Emote definitions (7 columns)
- `finishers` - Finisher animations (8 columns)
- `chat_presets` - Quick chat presets (7 columns)
- `friendships` - Friend relationships (5 columns)
- `gem_transactions` - Gem transaction history (6 columns)
- `player_feedback` - User feedback (6 columns)
- `user_reports` - User reports (7 columns)
- `board_themes` - Board theme definitions (4 columns)
- `friends` - Friends table (5 columns)
- `fun_bot_names` - Bot names (3 columns)
- `gem_purchases` - Gem purchase records (4 columns)
- `shop_bundles` - Shop bundles (8 columns)
- `user_mutes` - User mutes (3 columns)
- `ad_logs` - Ad logs (5 columns)

## Missing Tables

❌ **Tables referenced in code but NOT in your database:**
1. **`reward_tracking`** - Weekly gem reward tracking
   - **Purpose**: Tracks weekly gem totals from ad rewards (resets every Sunday)
   - **Migration file**: `supabase_migrations/create_reward_tracking_table.sql`
   - **Impact**: Required for `fetchWeeklyRewardStatus()` and the `claim_ad_reward` RPC function
   - **Status**: Code now handles missing table gracefully (returns defaults)

## Required RPC Functions

The following RPC functions are called by the code. Check if they exist in your Supabase database:

1. **`claim_ad_reward()`** - Claims ad reward with dual-currency system
   - **Migration file**: `supabase_migrations/update_claim_ad_reward_dual_currency.sql`
   - **Dependencies**: Requires `reward_tracking` table
   - **Status**: Code now falls back to simple gem increment if missing

2. **`migrate_guest_data()`** - Migrates guest account data to authenticated account
   - **Usage**: Called during guest-to-user migration

3. **`process_gem_transaction()`** - Processes gem transactions
   - **Purpose**: Creates transaction records and updates gem balance

4. **`handle_gem_purchase()`** - Handles gem pack purchases with first-time 2x bonus
   - **Purpose**: Applies 2x bonus for first-time purchasers

5. **`increment_gems()`** - Simple function to increment gems
   - **Purpose**: Fallback for simple gem increments

6. **`process_ad_reward()`** - Processes ad rewards
   - **Purpose**: Alternative ad reward processing

7. **`reward_user_for_ad()`** - Legacy ad reward function (deprecated)
   - **Purpose**: Simple gem increment for ad rewards

8. **`add_gems_to_user()`** - Adds gems to user (used by webhooks)
   - **Purpose**: Server-side gem addition (Stripe/RevenueCat webhooks)

9. **`delete_user_account()`** - Deletes user account and related data
   - **Purpose**: Account deletion functionality

10. **`reset_weekly_reward_tracking()`** - Resets weekly gem totals (scheduled job)
    - **Migration file**: `supabase_migrations/create_weekly_reset_function.sql`
    - **Purpose**: Resets weekly_gem_total every Sunday at midnight UTC
    - **Dependencies**: Requires `reward_tracking` table

## Current Fixes Applied

✅ **Graceful handling of missing tables/functions:**
- `fetchWeeklyRewardStatus()` now returns defaults if `reward_tracking` table is missing
- `claimAdRewardGems()` falls back to simple gem increment if RPC function or table is missing
- Code handles missing table errors gracefully without breaking the UI

## Recommended Actions

### Option 1: Run Missing Migrations (Recommended)
Run these migrations in your Supabase SQL editor in order:

1. **Create reward_tracking table:**
   ```sql
   -- Run: supabase_migrations/create_reward_tracking_table.sql
   ```

2. **Create claim_ad_reward RPC function:**
   ```sql
   -- Run: supabase_migrations/update_claim_ad_reward_dual_currency.sql
   ```

3. **Create weekly reset function (optional - for automatic resets):**
   ```sql
   -- Run: supabase_migrations/create_weekly_reset_function.sql
   ```

### Option 2: Continue Without Full Ad Reward System
The code now works without these tables/functions, but:
- Weekly gem cap tracking will not work
- Ad rewards will use simple 20-gem increment (no weekly limit)
- No dual-currency system (gems vs coins based on weekly cap)

## Table Structure Verification

To verify your tables match the expected structure, check these key columns:

### `profiles` table should have:
- `id` (UUID, primary key)
- `username`, `discriminator`
- `gems`, `coins`, `xp`, `level`
- `unlocked_sleeves[]`, `unlocked_avatars[]`, `unlocked_boards[]`, `unlocked_emotes[]`, `unlocked_finishers[]`, `unlocked_phrases[]`
- `equipped_sleeve`, `equipped_board`, `equipped_finisher`
- `inventory` (JSONB)
- `last_ad_claim` (TIMESTAMPTZ)

### `emotes` table should have:
- `id`, `name`, `trigger_code`, `file_path`, `price`, `currency`, `unlock_type`

### `finishers` table should have:
- `id`, `name`, `animation_key`, `price`, `currency`, `unlock_type`

### `chat_presets` table should have:
- `id`, `phrase`, `price`, `currency`, `unlock_type`

## Testing

After applying fixes, test:
1. ✅ Fetching emotes (`fetchEmotes()`)
2. ✅ Fetching finishers (`fetchFinishers()`)
3. ✅ Fetching chat presets (`fetchChatPresets()`)
4. ⚠️ Claiming ad rewards (`claimAdRewardGems()`) - will work with fallback, but better with RPC
5. ⚠️ Weekly reward status (`fetchWeeklyRewardStatus()`) - returns defaults without table
