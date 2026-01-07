-- Create secure RPC function to claim ad reward
-- This function uses auth.uid() to ensure only the authenticated user can claim rewards
-- Includes 30-second cooldown to prevent botting
-- Tracks weekly limit (500 gems/week)
-- Uses SECURITY DEFINER to have permission to update the profiles table

-- Ensure columns exist (if not already present)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_ad_claim TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS ad_weekly_gems INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS first_ad_claim_week TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION claim_ad_reward()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  current_gems INTEGER;
  last_claim_time TIMESTAMPTZ;
  current_weekly_gems INTEGER;
  first_claim_timestamp TIMESTAMPTZ;
  new_balance INTEGER;
  new_weekly_gems INTEGER;
  cooldown_seconds INTEGER;
  week_start TIMESTAMPTZ;
  now_timestamp TIMESTAMPTZ := NOW();
  reset_timestamp TIMESTAMPTZ;
BEGIN
  -- Get the authenticated user's ID (SECURITY: Only works for logged-in users)
  current_user_id := auth.uid();
  
  -- If no authenticated user, return error
  IF current_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not authenticated'
    );
  END IF;

  -- Get current gems, last claim time, and weekly tracking
  SELECT 
    COALESCE(gems, 0),
    COALESCE(last_ad_claim, '1970-01-01'::TIMESTAMPTZ),
    COALESCE(ad_weekly_gems, 0),
    first_ad_claim_week
  INTO current_gems, last_claim_time, current_weekly_gems, first_claim_timestamp
  FROM profiles
  WHERE id = current_user_id;

  -- If user doesn't exist, return error
  IF current_gems IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User profile not found'
    );
  END IF;

  -- Check cooldown: 30 seconds since last claim
  cooldown_seconds := EXTRACT(EPOCH FROM (NOW() - last_claim_time))::INTEGER;
  
  IF cooldown_seconds < 30 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Cooldown active',
      'cooldown_remaining', 30 - cooldown_seconds,
      'current_balance', current_gems
    );
  END IF;

  -- Calculate week start (7 days from first claim, or current time if no first claim)
  IF first_claim_timestamp IS NULL THEN
    week_start := now_timestamp;
    first_claim_timestamp := now_timestamp;
  ELSE
    -- Check if we're in a new week (more than 7 days since first claim)
    IF now_timestamp - first_claim_timestamp >= INTERVAL '7 days' THEN
      -- Reset for new week
      week_start := now_timestamp;
      first_claim_timestamp := now_timestamp;
      current_weekly_gems := 0;
    ELSE
      week_start := first_claim_timestamp;
    END IF;
  END IF;

  -- Check if weekly limit reached
  IF current_weekly_gems >= 500 THEN
    -- Calculate reset time (7 days from first claim)
    reset_timestamp := week_start + INTERVAL '7 days';
    
    RETURN json_build_object(
      'success', false,
      'error', 'Weekly limit reached',
      'weekly_gems', current_weekly_gems,
      'reset_timestamp', reset_timestamp,
      'current_balance', current_gems
    );
  END IF;

  -- Calculate new weekly gems (cap at 500)
  new_weekly_gems := LEAST(current_weekly_gems + 20, 500);

  -- Update gems, last_ad_claim timestamp, and weekly tracking
  UPDATE profiles
  SET 
    gems = COALESCE(gems, 0) + 20,
    last_ad_claim = NOW(),
    ad_weekly_gems = new_weekly_gems,
    first_ad_claim_week = COALESCE(first_ad_claim_week, now_timestamp)
  WHERE id = current_user_id
  RETURNING gems INTO new_balance;

  -- Calculate reset time (7 days from first claim)
  reset_timestamp := first_claim_timestamp + INTERVAL '7 days';

  -- Return success with new balance and weekly progress
  RETURN json_build_object(
    'success', true,
    'new_balance', new_balance,
    'gems_awarded', 20,
    'weekly_gems', new_weekly_gems,
    'reset_timestamp', reset_timestamp
  );
END;
$$;

-- Grant execute permission to authenticated users only
-- SECURITY: This ensures only logged-in users can call this function
GRANT EXECUTE ON FUNCTION claim_ad_reward() TO authenticated;

-- Revoke from anon to ensure only authenticated users can use it
REVOKE EXECUTE ON FUNCTION claim_ad_reward() FROM anon;

-- Add comment for documentation
COMMENT ON FUNCTION claim_ad_reward() IS 
  'Securely claims ad reward (20 gems) for authenticated user. Includes 30-second cooldown and tracks weekly limit (500 gems/week). Uses auth.uid() for security.';
