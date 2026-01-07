-- Create reward_tracking table for weekly gem limit tracking
-- This table tracks weekly gem totals per user and last reset date

CREATE TABLE IF NOT EXISTS reward_tracking (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  weekly_gem_total INTEGER DEFAULT 0 NOT NULL,
  last_reset_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_reward_tracking_user_id ON reward_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_tracking_last_reset_date ON reward_tracking(last_reset_date);

-- Enable Row Level Security
ALTER TABLE reward_tracking ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own reward tracking
CREATE POLICY "Users can view their own reward tracking"
  ON reward_tracking
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Only the system (via RPC functions) can insert/update reward tracking
-- Users cannot directly modify their reward tracking
CREATE POLICY "System can manage reward tracking"
  ON reward_tracking
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Add comment for documentation
COMMENT ON TABLE reward_tracking IS 
  'Tracks weekly gem totals from ad rewards. Resets every Sunday at midnight UTC. When weekly_gem_total reaches 500, users earn Gold Coins instead of Gems.';
