-- Add friend request system with status and sender/receiver
-- This migration adds support for pending/accepted friend requests

-- Add status column to friendships table
ALTER TABLE friendships 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'accepted' CHECK (status IN ('pending', 'accepted'));

-- Add sender_id and receiver_id columns (for friend requests)
ALTER TABLE friendships 
ADD COLUMN IF NOT EXISTS sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- For existing friendships, set sender_id = user_id and receiver_id = friend_id
-- and status = 'accepted'
UPDATE friendships 
SET sender_id = user_id, 
    receiver_id = friend_id,
    status = 'accepted'
WHERE sender_id IS NULL;

-- Make sender_id and receiver_id NOT NULL after backfilling
ALTER TABLE friendships 
ALTER COLUMN sender_id SET NOT NULL,
ALTER COLUMN receiver_id SET NOT NULL;

-- Update the unique constraint to allow pending requests from same user
-- But still prevent duplicate accepted friendships
DROP INDEX IF EXISTS friendships_user_id_friend_id_idx;
CREATE UNIQUE INDEX IF NOT EXISTS friendships_user_id_friend_id_accepted_idx 
ON friendships(user_id, friend_id) 
WHERE status = 'accepted';

-- Allow multiple pending requests (but not duplicate pending from same sender to same receiver)
CREATE UNIQUE INDEX IF NOT EXISTS friendships_sender_receiver_pending_idx 
ON friendships(sender_id, receiver_id) 
WHERE status = 'pending';

-- Update RLS policies to allow viewing received friend requests
CREATE POLICY IF NOT EXISTS "Users can view received friend requests"
  ON friendships FOR SELECT
  USING (auth.uid() = receiver_id OR auth.uid() = user_id);

-- Update insert policy to allow creating friend requests
DROP POLICY IF EXISTS "Users can insert their own friendships" ON friendships;
CREATE POLICY "Users can insert their own friendships"
  ON friendships FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Add policy for updating friend requests (accepting)
CREATE POLICY IF NOT EXISTS "Users can update received friend requests"
  ON friendships FOR UPDATE
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

-- Update the bidirectional friendship trigger to only work for accepted friendships
CREATE OR REPLACE FUNCTION create_bidirectional_friendship()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create reverse relationship for accepted friendships
  IF NEW.status != 'accepted' THEN
    RETURN NEW;
  END IF;
  
  -- Check friend limit for the user (20 friends max)
  IF (SELECT COUNT(*) FROM friendships WHERE user_id = NEW.user_id AND status = 'accepted') >= 20 THEN
    RAISE EXCEPTION 'Friend limit reached. Maximum 20 friends allowed.';
  END IF;
  
  -- Check friend limit for the friend (20 friends max)
  IF (SELECT COUNT(*) FROM friendships WHERE user_id = NEW.friend_id AND status = 'accepted') >= 20 THEN
    RAISE EXCEPTION 'Friend limit reached. The user you are trying to add has reached their friend limit.';
  END IF;
  
  -- Prevent self-friending
  IF NEW.user_id = NEW.friend_id THEN
    RAISE EXCEPTION 'Cannot add yourself as a friend.';
  END IF;
  
  -- Create reverse friendship if it doesn't exist (only for accepted)
  INSERT INTO friendships (user_id, friend_id, sender_id, receiver_id, status)
  VALUES (NEW.friend_id, NEW.user_id, NEW.friend_id, NEW.user_id, 'accepted')
  ON CONFLICT (user_id, friend_id) WHERE status = 'accepted' DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
