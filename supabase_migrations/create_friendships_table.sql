-- Create friendships table
CREATE TABLE IF NOT EXISTS friendships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS friendships_user_id_idx ON friendships(user_id);
CREATE INDEX IF NOT EXISTS friendships_friend_id_idx ON friendships(friend_id);

-- Enable RLS
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own friendships"
  ON friendships FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can insert their own friendships"
  ON friendships FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own friendships"
  ON friendships FOR DELETE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Function to create bidirectional friendship
CREATE OR REPLACE FUNCTION create_bidirectional_friendship()
RETURNS TRIGGER AS $$
BEGIN
  -- Check friend limit for the user (10 friends max)
  IF (SELECT COUNT(*) FROM friendships WHERE user_id = NEW.user_id) >= 10 THEN
    RAISE EXCEPTION 'Friend limit reached. Maximum 10 friends allowed.';
  END IF;
  
  -- Check friend limit for the friend (10 friends max)
  IF (SELECT COUNT(*) FROM friendships WHERE user_id = NEW.friend_id) >= 10 THEN
    RAISE EXCEPTION 'Friend limit reached. The user you are trying to add has reached their friend limit.';
  END IF;
  
  -- Prevent self-friending
  IF NEW.user_id = NEW.friend_id THEN
    RAISE EXCEPTION 'Cannot add yourself as a friend.';
  END IF;
  
  -- Create reverse friendship if it doesn't exist
  INSERT INTO friendships (user_id, friend_id)
  VALUES (NEW.friend_id, NEW.user_id)
  ON CONFLICT (user_id, friend_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create bidirectional friendship and enforce limits
CREATE TRIGGER friendships_bidirectional_trigger
  AFTER INSERT ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION create_bidirectional_friendship();

-- Function to delete bidirectional friendship
CREATE OR REPLACE FUNCTION delete_bidirectional_friendship()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete reverse friendship
  DELETE FROM friendships
  WHERE user_id = OLD.friend_id AND friend_id = OLD.user_id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger to delete reverse friendship
CREATE TRIGGER friendships_delete_trigger
  AFTER DELETE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION delete_bidirectional_friendship();
