-- Create player_feedback table
CREATE TABLE IF NOT EXISTS player_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Bug', 'Suggestion', 'Balance', 'Compliment')),
  message TEXT NOT NULL,
  game_version TEXT NOT NULL DEFAULT '1.0.0',
  was_finisher_tilting BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_player_feedback_user_id ON player_feedback(user_id);

-- Create index on created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_player_feedback_created_at ON player_feedback(created_at DESC);

-- Create index on category for filtering
CREATE INDEX IF NOT EXISTS idx_player_feedback_category ON player_feedback(category);

-- Add RLS policies
ALTER TABLE player_feedback ENABLE ROW LEVEL SECURITY;

-- Users can insert their own feedback
CREATE POLICY "Users can insert their own feedback"
  ON player_feedback FOR INSERT
  WITH CHECK (auth.uid()::text = user_id OR user_id = 'guest');

-- Users can view their own feedback
CREATE POLICY "Users can view their own feedback"
  ON player_feedback FOR SELECT
  USING (auth.uid()::text = user_id OR user_id = 'guest');

-- Note: Admin users would need additional policies to view all feedback
-- This can be added later if needed for moderation purposes
