-- Add unlocked_finishers column to profiles table if it doesn't exist
-- unlocked_finishers is a TEXT[] array that stores unlocked finisher animation keys

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS unlocked_finishers TEXT[] DEFAULT '{}';

-- Update existing rows that have NULL unlocked_finishers to have the default value
UPDATE profiles 
SET unlocked_finishers = '{}' 
WHERE unlocked_finishers IS NULL;

-- Add comment to document the column
COMMENT ON COLUMN profiles.unlocked_finishers IS 'Array of unlocked finisher animation keys (e.g., ["shiba_slam", "ethereal_blade"])';
