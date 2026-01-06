-- Create RPC function to reward user for watching an ad
-- This function adds gems to the user's balance and returns the new balance

CREATE OR REPLACE FUNCTION reward_user_for_ad(user_id UUID, gem_amount INTEGER DEFAULT 20)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_balance INTEGER;
BEGIN
  -- Update the user's gem balance
  UPDATE profiles
  SET gems = COALESCE(gems, 0) + gem_amount
  WHERE id = user_id
  RETURNING gems INTO new_balance;

  -- If user doesn't exist, return error
  IF new_balance IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Return success with new balance
  RETURN json_build_object(
    'success', true,
    'new_balance', new_balance
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION reward_user_for_ad(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION reward_user_for_ad(UUID, INTEGER) TO anon;
