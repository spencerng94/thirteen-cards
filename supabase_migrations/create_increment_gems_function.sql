-- Create RPC function to increment gems for a user
-- This is a simple, secure way to increment gems that prevents manipulation
-- The function uses SECURITY DEFINER to ensure only the database can modify gems

CREATE OR REPLACE FUNCTION increment_gems(user_id UUID, gem_amount INTEGER)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_balance INTEGER;
BEGIN
  -- Validate input
  IF gem_amount <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Gem amount must be positive'
    );
  END IF;

  -- Update the user's gem balance
  UPDATE profiles
  SET gems = COALESCE(gems, 0) + gem_amount
  WHERE id = user_id
  RETURNING gems INTO new_balance;

  -- If user doesn't exist, return error
  IF new_balance IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;

  -- Return success with new balance
  RETURN json_build_object(
    'success', true,
    'new_balance', new_balance
  );
END;
$$;

-- Grant execute permission to authenticated users and anonymous users
GRANT EXECUTE ON FUNCTION increment_gems(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_gems(UUID, INTEGER) TO anon;
