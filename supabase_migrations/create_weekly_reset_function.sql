-- Create function to reset weekly_gem_total every Sunday at midnight UTC
-- This function should be called by a scheduled job (pg_cron extension)

CREATE OR REPLACE FUNCTION reset_weekly_reward_tracking()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reset_count INTEGER := 0;
  current_sunday TIMESTAMPTZ;
  last_sunday TIMESTAMPTZ;
BEGIN
  -- Calculate the most recent Sunday at midnight UTC
  -- Extract day of week (0=Sunday, 6=Saturday) and adjust to get last Sunday
  current_sunday := DATE_TRUNC('week', NOW() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
  
  -- Reset all users whose last_reset_date is before the current Sunday
  -- This ensures we only reset once per week
  UPDATE reward_tracking
  SET 
    weekly_gem_total = 0,
    last_reset_date = current_sunday,
    updated_at = NOW()
  WHERE last_reset_date < current_sunday;
  
  GET DIAGNOSTICS reset_count = ROW_COUNT;
  
  -- Also initialize tracking for users who don't have a record yet
  -- (This handles new users who haven't claimed any rewards yet)
  INSERT INTO reward_tracking (user_id, weekly_gem_total, last_reset_date)
  SELECT id, 0, current_sunday
  FROM profiles
  WHERE id NOT IN (SELECT user_id FROM reward_tracking)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN reset_count;
END;
$$;

-- Grant execute permission (typically called by pg_cron or admin)
GRANT EXECUTE ON FUNCTION reset_weekly_reward_tracking() TO authenticated;
GRANT EXECUTE ON FUNCTION reset_weekly_reward_tracking() TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION reset_weekly_reward_tracking() IS 
  'Resets weekly_gem_total to 0 for all users every Sunday at midnight UTC. Should be scheduled via pg_cron.';

-- Example pg_cron schedule (run this in Supabase SQL editor):
-- SELECT cron.schedule(
--   'reset-weekly-rewards',
--   '0 0 * * 0',  -- Every Sunday at midnight UTC
--   $$SELECT reset_weekly_reward_tracking()$$
-- );
