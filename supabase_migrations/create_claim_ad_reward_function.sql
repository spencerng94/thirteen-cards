-- Create secure RPC function to claim ad reward
-- This function uses auth.uid() to ensure only the authenticated user can claim rewards
-- Includes 30-second cooldown to prevent botting
-- Uses SECURITY DEFINER to have permission to update the profiles table

-- Ensure last_ad_claim column exists (if not already present)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_ad_claim TIMESTAMPTZ;

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
  new_balance INTEGER;
  cooldown_seconds INTEGER;
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

  -- Get current gems and last claim time
  SELECT 
    COALESCE(gems, 0),
    COALESCE(last_ad_claim, '1970-01-01'::TIMESTAMPTZ)
  INTO current_gems, last_claim_time
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

  -- Update gems by exactly 20 and update last_ad_claim timestamp
  UPDATE profiles
  SET 
    gems = COALESCE(gems, 0) + 20,
    last_ad_claim = NOW()
  WHERE id = current_user_id
  RETURNING gems INTO new_balance;

  -- Return success with new balance
  RETURN json_build_object(
    'success', true,
    'new_balance', new_balance,
    'gems_awarded', 20
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
  'Securely claims ad reward (20 gems) for authenticated user. Includes 30-second cooldown. Uses auth.uid() for security.';
