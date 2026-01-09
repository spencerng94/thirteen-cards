-- Add eula_accepted column to profiles table
-- This column tracks whether the user has accepted the End User License Agreement
-- Required for App Store and Google Play UGC compliance

-- Add the column with default value of false
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS eula_accepted BOOLEAN NOT NULL DEFAULT false;

-- Add a comment to document the column
COMMENT ON COLUMN profiles.eula_accepted IS 'Tracks whether the user has accepted the End User License Agreement. Required for UGC compliance.';

-- Create an index for faster queries (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_profiles_eula_accepted ON profiles(eula_accepted) WHERE eula_accepted = false;
