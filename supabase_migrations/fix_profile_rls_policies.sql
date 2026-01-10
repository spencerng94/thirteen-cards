-- Fix RLS policies for profiles table to allow users to insert their own profile
-- This is needed for new user signups via OAuth
-- This fixes the "server_error Database error saving new user" error

-- First, ensure RLS is enabled on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
-- Use IF EXISTS to avoid errors if policies don't exist
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;

-- IMPORTANT: Create SELECT policy FIRST (most critical for existing users)
-- This allows users to read their own profile
CREATE POLICY "Users can view their own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Create policy to allow users to update their own profile
-- This is needed for profile updates
CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Create policy to allow users to insert their own profile
-- This is critical for OAuth signups where the profile is created after authentication
-- The WITH CHECK ensures users can only insert profiles where the id matches their auth.uid()
CREATE POLICY "Users can insert their own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Grant necessary permissions to authenticated users
GRANT ALL ON profiles TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Create a SECURITY DEFINER function to create profiles (bypasses RLS)
-- This is useful if there's a database trigger or if client-side creation fails
CREATE OR REPLACE FUNCTION create_user_profile(
  user_id UUID,
  username TEXT DEFAULT NULL,
  avatar_url TEXT DEFAULT ':cool:'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_exists BOOLEAN;
  generated_username TEXT;
  user_email TEXT;
BEGIN
  -- Check if profile already exists
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = user_id) INTO profile_exists;
  
  IF profile_exists THEN
    RETURN json_build_object('success', false, 'error', 'Profile already exists');
  END IF;
  
  -- Generate username if not provided
  IF username IS NULL OR username = '' THEN
    -- Generate a unique username with discriminator
    SELECT 'AGENT#' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0') INTO generated_username;
    
    -- Ensure uniqueness (try up to 10 times)
    FOR i IN 1..10 LOOP
      IF NOT EXISTS(SELECT 1 FROM profiles WHERE profiles.username = generated_username) THEN
        EXIT;
      END IF;
      SELECT 'AGENT#' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0') INTO generated_username;
    END LOOP;
  ELSE
    generated_username := username;
  END IF;
  
  -- Get email from auth.users if available
  SELECT email INTO user_email FROM auth.users WHERE id = user_id;
  
  -- Insert the profile (SECURITY DEFINER bypasses RLS)
  INSERT INTO profiles (
    id,
    username,
    avatar_url,
    email,
    wins,
    games_played,
    currency,
    coins,
    gems,
    xp,
    level,
    unlocked_sleeves,
    unlocked_avatars,
    unlocked_boards,
    sfx_enabled,
    turbo_enabled,
    sleeve_effects_enabled,
    play_animations_enabled,
    turn_timer_setting,
    undo_count,
    finish_dist,
    total_chops,
    total_cards_left_sum,
    current_streak,
    longest_streak,
    inventory,
    event_stats
  ) VALUES (
    user_id,
    generated_username,
    avatar_url,
    user_email, -- email from auth.users
    0, -- wins
    0, -- games_played
    500, -- currency
    500, -- coins
    0, -- gems
    0, -- xp
    1, -- level
    ARRAY['RED', 'BLUE'], -- unlocked_sleeves
    ARRAY[':cool:', ':blush:', ':annoyed:'], -- unlocked_avatars
    ARRAY['EMERALD'], -- unlocked_boards
    true, -- sfx_enabled
    true, -- turbo_enabled
    true, -- sleeve_effects_enabled
    true, -- play_animations_enabled
    0, -- turn_timer_setting
    0, -- undo_count
    ARRAY[0, 0, 0, 0], -- finish_dist
    0, -- total_chops
    0, -- total_cards_left_sum
    0, -- current_streak
    0, -- longest_streak
    '{"items": {"XP_2X_10M": 1, "GOLD_2X_10M": 1}, "active_boosters": {}}'::jsonb, -- inventory
    '{"daily_games_played": 0, "daily_wins": 0, "weekly_games_played": 0, "weekly_wins": 0, "weekly_bombs_played": 0, "weekly_chops_performed": 0, "weekly_challenge_progress": {}, "total_hands_played": 0, "new_player_login_days": 1, "claimed_events": [], "ready_to_claim": []}'::jsonb -- event_stats
  );
  
  RETURN json_build_object('success', true, 'username', generated_username);
EXCEPTION
  WHEN others THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_user_profile(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_profile(UUID, TEXT, TEXT) TO anon;

-- Also ensure the table exists and has the necessary structure
-- (This won't fail if table already exists)
DO $$
BEGIN
  -- Check if profiles table exists, if not this migration will need to be run after table creation
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    RAISE NOTICE 'Profiles table exists, RLS policies and function created successfully';
  ELSE
    RAISE WARNING 'Profiles table does not exist yet. Please ensure the profiles table is created before running this migration.';
  END IF;
END $$;
