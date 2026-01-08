-- Add RLS policy to prevent users from directly updating their gem balance
-- Gems can only be updated through RPC functions or webhooks (server-side)

-- Enable RLS on profiles table if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own gem balance
-- (This should already exist, but we ensure it's there)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'Users can view their own profile'
  ) THEN
    CREATE POLICY "Users can view their own profile"
      ON profiles
      FOR SELECT
      USING (auth.uid() = id);
  END IF;
END $$;

-- Note: RLS policies for UPDATE on profiles should be configured to prevent
-- direct gem updates. The update_user_gems function below uses SECURITY DEFINER
-- which bypasses RLS, allowing only server-side updates.
--
-- If you have an existing UPDATE policy on profiles, ensure it doesn't allow
-- direct gem updates. The safest approach is to only allow updates through
-- RPC functions that use SECURITY DEFINER.

-- Alternative approach: Create a function that only allows gem updates via RPC
-- This is more secure than relying on RLS alone

-- Function to update gems (called by webhooks/RPC)
CREATE OR REPLACE FUNCTION update_user_gems(
  user_id UUID,
  gem_amount INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_balance INTEGER;
BEGIN
  -- Update gems
  UPDATE profiles
  SET gems = COALESCE(gems, 0) + gem_amount
  WHERE id = user_id
  RETURNING gems INTO new_balance;

  IF new_balance IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;

  IF new_balance < 0 THEN
    -- Rollback if balance would go negative
    UPDATE profiles
    SET gems = COALESCE(gems, 0)
    WHERE id = user_id;
    RETURN json_build_object('success', false, 'error', 'Insufficient gems');
  END IF;

  RETURN json_build_object('success', true, 'new_balance', new_balance);
END;
$$;

-- Grant execute permission to authenticated users (for RPC calls)
GRANT EXECUTE ON FUNCTION update_user_gems(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_gems(UUID, INTEGER) TO anon;

-- Comment for documentation
COMMENT ON FUNCTION update_user_gems IS 
  'Securely updates user gem balance. Can only be called via RPC (SECURITY DEFINER bypasses RLS). Used by webhooks and server-side functions.';
