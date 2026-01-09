-- Create user_reports table for reporting objectionable content
-- This table stores reports submitted by users about other users' content
-- Required for App Store and Google Play UGC compliance

CREATE TABLE IF NOT EXISTS user_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL CHECK (report_type IN ('offensive_content', 'harassment', 'spam', 'inappropriate_username', 'inappropriate_emote', 'other')),
  description TEXT,
  reported_content TEXT, -- Stores the specific content that was reported (username, emote, etc.)
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Users can create reports
CREATE POLICY "Users can create reports"
ON user_reports FOR INSERT
WITH CHECK (auth.uid() = reporter_id);

-- Policy: Users can view their own reports
CREATE POLICY "Users can view their own reports"
ON user_reports FOR SELECT
USING (auth.uid() = reporter_id);

-- Policy: Service role can view all reports (for moderation)
-- Note: This requires service role key, not anon key
-- Admins should use service role key to query reports

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_reports_reporter ON user_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_reported_user ON user_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_status ON user_reports(status);
CREATE INDEX IF NOT EXISTS idx_user_reports_created_at ON user_reports(created_at DESC);

-- Add comment
COMMENT ON TABLE user_reports IS 'Stores user reports for objectionable content. Required for UGC compliance.';
