-- Create client_errors table for remote error logging
-- This table captures client-side errors (React errors, unhandled rejections, etc.)
-- for production monitoring and debugging

CREATE TABLE IF NOT EXISTS client_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  component_stack TEXT,
  browser_info TEXT,
  url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on user_id for faster queries (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_client_errors_user_id ON client_errors(user_id);

-- Create index on created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_client_errors_created_at ON client_errors(created_at DESC);

-- Enable Row Level Security
ALTER TABLE client_errors ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow anyone (including guests/anonymous users) to INSERT errors
-- This is critical for capturing errors from unauthenticated users
CREATE POLICY "Anyone can insert client errors"
  ON client_errors
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- RLS Policy: Only service role (admin) can READ errors
-- Regular users cannot read error logs for privacy/security
CREATE POLICY "Only service role can read client errors"
  ON client_errors
  FOR SELECT
  TO service_role
  USING (true);

-- Optional: Allow authenticated users to read their own errors (uncomment if needed)
-- CREATE POLICY "Users can read their own errors"
--   ON client_errors
--   FOR SELECT
--   TO authenticated
--   USING (auth.uid() = user_id);

COMMENT ON TABLE client_errors IS 'Client-side error logs for production monitoring. Anyone can insert, only admins can read.';
COMMENT ON COLUMN client_errors.user_id IS 'Optional: User ID if error occurred for authenticated user, NULL for guests/anonymous';
COMMENT ON COLUMN client_errors.error_message IS 'The error message or error.toString() output';
COMMENT ON COLUMN client_errors.stack_trace IS 'JavaScript stack trace if available';
COMMENT ON COLUMN client_errors.component_stack IS 'React component stack trace if available';
COMMENT ON COLUMN client_errors.browser_info IS 'User Agent string and browser information';
COMMENT ON COLUMN client_errors.url IS 'The URL where the error occurred';
