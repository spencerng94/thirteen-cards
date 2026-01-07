-- Create RPC function to migrate guest data to permanent account
-- SECURITY: Only allows migration for accounts created in the last 5 minutes
-- This prevents users from repeatedly adding guest gems to old accounts
-- Includes one-time 50 gem signup bonus for linking account (only for new signups)

CREATE OR REPLACE FUNCTION migrate_guest_data(
  user_id UUID,
  guest_gems INTEGER DEFAULT 0,
  guest_xp INTEGER DEFAULT 0,
  guest_coins INTEGER DEFAULT 0,
  is_signup BOOLEAN DEFAULT false
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  profile_created_at TIMESTAMPTZ;
  five_minutes_ago TIMESTAMPTZ;
  is_new_account BOOLEAN;
  bonus_claimed BOOLEAN;
  bonus_gems INTEGER := 0;
  new_gems INTEGER;
  migrated_gems INTEGER;
  migrated_xp INTEGER;
  migrated_coins INTEGER;
BEGIN
  -- Get the profile's created_at timestamp and signup_bonus_claimed status
  SELECT created_at, COALESCE(signup_bonus_claimed, false) INTO profile_created_at, bonus_claimed
  FROM profiles
  WHERE id = user_id;

  -- If profile doesn't exist, return error
  IF profile_created_at IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Profile not found'
    );
  END IF;

  -- Check if account was created in the last 5 minutes
  five_minutes_ago := NOW() - INTERVAL '5 minutes';
  is_new_account := profile_created_at >= five_minutes_ago;

  -- Only allow migration for new accounts (created in last 5 minutes)
  IF NOT is_new_account THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Account is not new. Migration only allowed for accounts created in the last 5 minutes.'
    );
  END IF;

  -- Validate input values (prevent negative values)
  IF guest_gems < 0 OR guest_xp < 0 OR guest_coins < 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid guest data values'
    );
  END IF;

  -- Calculate bonus gems (50 if bonus not claimed AND this is a signup, not a signin)
  -- Only award bonus for new signups, not when signing into existing linked accounts
  IF NOT bonus_claimed AND is_signup THEN
    bonus_gems := 50;
  END IF;

  -- Calculate total gems to add
  migrated_gems := guest_gems;
  migrated_xp := guest_xp;
  migrated_coins := guest_coins;

  -- Migrate guest data: add gems (including bonus), xp, and coins to the profile
  -- Only mark bonus as claimed if we actually awarded it (is_signup=true and bonus_gems > 0)
  UPDATE profiles
  SET 
    gems = COALESCE(gems, 0) + guest_gems + bonus_gems,
    xp = COALESCE(xp, 0) + guest_xp,
    coins = COALESCE(coins, 0) + guest_coins,
    signup_bonus_claimed = CASE WHEN bonus_gems > 0 THEN true ELSE signup_bonus_claimed END
  WHERE id = user_id
  RETURNING gems INTO new_gems;

  -- Return success with breakdown
  RETURN json_build_object(
    'success', true,
    'migrated_gems', migrated_gems,
    'bonus_gems', bonus_gems,
    'migrated_xp', migrated_xp,
    'migrated_coins', migrated_coins,
    'new_gem_balance', new_gems
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION migrate_guest_data(UUID, INTEGER, INTEGER, INTEGER, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION migrate_guest_data(UUID, INTEGER, INTEGER, INTEGER, BOOLEAN) TO anon;
