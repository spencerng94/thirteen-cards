-- Create RPC function to process ad reward with weekly limit (500 gems/week)
-- This function checks weekly limits, adds gems, and returns progress info

CREATE OR REPLACE FUNCTION process_ad_reward(user_id UUID, gem_amount INTEGER DEFAULT 20)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_weekly_gems INTEGER;
  first_claim_timestamp TIMESTAMPTZ;
  new_weekly_gems INTEGER;
  new_balance INTEGER;
  week_start TIMESTAMPTZ;
  now_timestamp TIMESTAMPTZ := NOW();
  reset_timestamp TIMESTAMPTZ;
BEGIN
  -- Get current weekly gems and first claim timestamp
  SELECT COALESCE(ad_weekly_gems, 0), first_ad_claim_week
  INTO current_weekly_gems, first_claim_timestamp
  FROM profiles
  WHERE id = user_id;

  -- If user doesn't exist, return error
  IF current_weekly_gems IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found'
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
      'new_balance', (SELECT gems FROM profiles WHERE id = user_id)
    );
  END IF;

  -- Calculate new weekly gems (cap at 500)
  new_weekly_gems := LEAST(current_weekly_gems + gem_amount, 500);

  -- Update the user's gem balance and weekly tracking
  UPDATE profiles
  SET 
    gems = COALESCE(gems, 0) + gem_amount,
    ad_weekly_gems = new_weekly_gems,
    first_ad_claim_week = COALESCE(first_ad_claim_week, now_timestamp)
  WHERE id = user_id
  RETURNING gems INTO new_balance;

  -- Calculate reset time (7 days from first claim)
  reset_timestamp := first_claim_timestamp + INTERVAL '7 days';

  -- Return success with progress info
  RETURN json_build_object(
    'success', true,
    'new_balance', new_balance,
    'weekly_gems', new_weekly_gems,
    'reset_timestamp', reset_timestamp
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION process_ad_reward(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION process_ad_reward(UUID, INTEGER) TO anon;
