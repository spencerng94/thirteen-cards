-- Add email column to profiles table
-- This ensures all user profiles have their email address stored

-- Add email column if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Create index for faster lookups by email
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email) WHERE email IS NOT NULL;

-- Backfill existing profiles with emails from auth.users
-- This updates any profiles that have null emails with the email from the auth.users table
UPDATE profiles p
SET email = au.email
FROM auth.users au
WHERE p.id = au.id 
  AND p.email IS NULL 
  AND au.email IS NOT NULL;

-- Add comment to document the column
COMMENT ON COLUMN profiles.email IS 'User email address from auth.users, synced on profile creation';
