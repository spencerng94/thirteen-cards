-- Update claim_ad_reward function to implement dual-currency system
-- Gem Phase: If weekly_gem_total + 20 <= 500, award 20 Gems
-- Gold Phase: If weekly_gem_total >= 500, award 50 Gold Coins instead

CREATE OR REPLACE FUNCTION claim_ad_reward()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  current_gems INTEGER;
  current_coins INTEGER;
  last_claim_time TIMESTAMPTZ;
  weekly_gem_total INTEGER;
  last_reset_date TIMESTAMPTZ;
  new_balance INTEGER;
  new_coin_balance INTEGER;
  new_weekly_gems INTEGER;
  cooldown_seconds INTEGER;
  now_timestamp TIMESTAMPTZ := NOW();
  current_sunday TIMESTAMPTZ;
  reward_type TEXT;
  reward_amount INTEGER;
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

  -- Calculate the most recent Sunday at midnight UTC for reset check
  current_sunday := DATE_TRUNC('week', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';

  -- Get or create reward tracking record
  SELECT COALESCE(rt.weekly_gem_total, 0), COALESCE(rt.last_reset_date, current_sunday)
  INTO weekly_gem_total, last_reset_date
  FROM reward_tracking rt
  WHERE rt.user_id = current_user_id;

  -- If no record exists, create one
  IF weekly_gem_total IS NULL THEN
    INSERT INTO reward_tracking (user_id, weekly_gem_total, last_reset_date)
    VALUES (current_user_id, 0, current_sunday)
    ON CONFLICT (user_id) DO NOTHING;
    weekly_gem_total := 0;
    last_reset_date := current_sunday;
  END IF;

  -- Check if we need to reset (new week has started)
  IF last_reset_date < current_sunday THEN
    weekly_gem_total := 0;
    UPDATE reward_tracking
    SET 
      weekly_gem_total = 0,
      last_reset_date = current_sunday,
      updated_at = NOW()
    WHERE user_id = current_user_id;
  END IF;

  -- Get current gems, coins, and last claim time
  SELECT 
    COALESCE(gems, 0),
    COALESCE(coins, 0),
    COALESCE(last_ad_claim, '1970-01-01'::TIMESTAMPTZ)
  INTO current_gems, current_coins, last_claim_time
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
      'current_balance', current_gems,
      'weekly_gem_total', weekly_gem_total
    );
  END IF;

  -- DUAL-CURRENCY LOGIC
  -- Gem Phase: If weekly_gem_total + 20 <= 500, award 20 Gems
  -- Gold Phase: If weekly_gem_total >= 500, award 50 Gold Coins instead
  IF weekly_gem_total + 20 <= 500 THEN
    -- Gem Phase: Award 20 Gems
    reward_type := 'gems';
    reward_amount := 20;
    new_weekly_gems := weekly_gem_total + 20;
    
    -- Update gems and reward tracking
    UPDATE profiles
    SET 
      gems = COALESCE(gems, 0) + 20,
      last_ad_claim = NOW()
    WHERE id = current_user_id
    RETURNING gems INTO new_balance;
    
    -- Update reward tracking
    UPDATE reward_tracking
    SET 
      weekly_gem_total = new_weekly_gems,
      updated_at = NOW()
    WHERE user_id = current_user_id;
    
    -- Return success with gem reward
    RETURN json_build_object(
      'success', true,
      'reward_type', 'gems',
      'reward_amount', 20,
      'new_balance', new_balance,
      'new_coin_balance', current_coins,
      'weekly_gem_total', new_weekly_gems,
      'hit_cap', new_weekly_gems >= 500
    );
  ELSE
    -- Gold Phase: Award 50 Gold Coins (weekly limit reached)
    reward_type := 'coins';
    reward_amount := 50;
    
    -- Update coins only (don't increment weekly_gem_total beyond 500)
    UPDATE profiles
    SET 
      coins = COALESCE(coins, 0) + 50,
      last_ad_claim = NOW()
    WHERE id = current_user_id
    RETURNING coins INTO new_coin_balance;
    
    -- Return success with coin reward
    RETURN json_build_object(
      'success', true,
      'reward_type', 'coins',
      'reward_amount', 50,
      'new_balance', current_gems,
      'new_coin_balance', new_coin_balance,
      'weekly_gem_total', weekly_gem_total,
      'hit_cap', true
    );
  END IF;
END;
$$;

-- Grant execute permission to authenticated users only
GRANT EXECUTE ON FUNCTION claim_ad_reward() TO authenticated;

-- Revoke from anon to ensure only authenticated users can use it
REVOKE EXECUTE ON FUNCTION claim_ad_reward() FROM anon;

-- Add comment for documentation
COMMENT ON FUNCTION claim_ad_reward() IS 
  'Securely claims ad reward with dual-currency system: 20 Gems if under weekly cap (500), 50 Gold Coins if cap reached. Includes 30-second cooldown. Uses auth.uid() for security.';
