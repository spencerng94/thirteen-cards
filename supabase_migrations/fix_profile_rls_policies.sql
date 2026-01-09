-- Fix RLS policies for profiles table to allow users to insert their own profile
-- This is needed for new user signups via OAuth
-- This fixes the "server_error Database error saving new user" error

-- First, ensure RLS is enabled on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;

-- Create policy to allow users to insert their own profile
-- This is critical for OAuth signups where the profile is created after authentication
-- The WITH CHECK ensures users can only insert profiles where the id matches their auth.uid()
CREATE POLICY "Users can insert their own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Create policy to allow users to update their own profile
CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Create policy to allow users to view their own profile
CREATE POLICY "Users can view their own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Grant necessary permissions to authenticated users
GRANT ALL ON profiles TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Also ensure the table exists and has the necessary structure
-- (This won't fail if table already exists)
DO $$
BEGIN
  -- Check if profiles table exists, if not this migration will need to be run after table creation
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    RAISE NOTICE 'Profiles table exists, RLS policies created successfully';
  ELSE
    RAISE WARNING 'Profiles table does not exist yet. Please ensure the profiles table is created before running this migration.';
  END IF;
END $$;
