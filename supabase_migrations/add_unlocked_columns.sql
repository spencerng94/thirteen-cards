-- Add all unlocked columns to profiles table if they don't exist
-- These columns store arrays of unlocked cosmetic items

-- Add unlocked_sleeves column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS unlocked_sleeves TEXT[] DEFAULT '{}';

-- Add unlocked_avatars column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS unlocked_avatars TEXT[] DEFAULT '{}';

-- Add unlocked_boards column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS unlocked_boards TEXT[] DEFAULT '{}';

-- Add unlocked_finishers column (if not already added by add_unlocked_finishers_column.sql)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS unlocked_finishers TEXT[] DEFAULT '{}';

-- Update existing rows that have NULL values to have the default empty array
UPDATE profiles 
SET unlocked_sleeves = '{}' 
WHERE unlocked_sleeves IS NULL;

UPDATE profiles 
SET unlocked_avatars = '{}' 
WHERE unlocked_avatars IS NULL;

UPDATE profiles 
SET unlocked_boards = '{}' 
WHERE unlocked_boards IS NULL;

UPDATE profiles 
SET unlocked_finishers = '{}' 
WHERE unlocked_finishers IS NULL;

-- Add comments to document the columns
COMMENT ON COLUMN profiles.unlocked_sleeves IS 'Array of unlocked card sleeve styles (e.g., ["RED", "BLUE", "ROYAL_CROSS"])';
COMMENT ON COLUMN profiles.unlocked_avatars IS 'Array of unlocked avatar emote triggers (e.g., [":cool:", ":blush:", ":annoyed:"])';
COMMENT ON COLUMN profiles.unlocked_boards IS 'Array of unlocked board theme IDs (e.g., ["EMERALD", "CYBER_BLUE", "CRIMSON_VOID"])';
COMMENT ON COLUMN profiles.unlocked_finishers IS 'Array of unlocked finisher animation keys (e.g., ["shiba_slam", "ethereal_blade"])';
