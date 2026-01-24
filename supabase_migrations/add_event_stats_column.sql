-- Add event_stats column to profiles table if it doesn't exist
-- event_stats is a JSONB column that stores event tracking data

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS event_stats JSONB DEFAULT '{"daily_games_played": 0, "daily_wins": 0, "weekly_games_played": 0, "weekly_wins": 0, "weekly_bombs_played": 0, "weekly_chops_performed": 0, "weekly_challenge_progress": {}, "total_hands_played": 0, "new_player_login_days": 1, "claimed_events": [], "ready_to_claim": []}'::jsonb;

-- Update existing rows that have NULL event_stats to have the default value
UPDATE profiles 
SET event_stats = '{"daily_games_played": 0, "daily_wins": 0, "weekly_games_played": 0, "weekly_wins": 0, "weekly_bombs_played": 0, "weekly_chops_performed": 0, "weekly_challenge_progress": {}, "total_hands_played": 0, "new_player_login_days": 1, "claimed_events": [], "ready_to_claim": []}'::jsonb 
WHERE event_stats IS NULL;

-- Add comment to document the column structure
COMMENT ON COLUMN profiles.event_stats IS 'JSONB object tracking daily/weekly events, challenges, and claimed rewards. Structure: {"daily_games_played": number, "daily_wins": number, "weekly_games_played": number, "weekly_wins": number, "weekly_bombs_played": number, "weekly_chops_performed": number, "weekly_challenge_progress": {}, "total_hands_played": number, "new_player_login_days": number, "claimed_events": [], "ready_to_claim": [], "gems_purchased": number, "online_games_played": number}';
