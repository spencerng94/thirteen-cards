-- Add signup_bonus_claimed column to profiles table
-- This ensures the 50 gem bonus is only awarded once per person

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS signup_bonus_claimed BOOLEAN DEFAULT false;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS profiles_signup_bonus_claimed_idx ON profiles(signup_bonus_claimed) WHERE signup_bonus_claimed = false;

-- Add comment for documentation
COMMENT ON COLUMN profiles.signup_bonus_claimed IS 'Tracks whether the user has claimed their one-time 50 gem signup bonus when linking a guest account';
