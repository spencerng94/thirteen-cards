-- Add inventory column to profiles table if it doesn't exist
-- Inventory is a JSONB column that stores items and active boosters

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS inventory JSONB DEFAULT '{"items": {}, "active_boosters": {}}'::jsonb;

-- Update existing rows that have NULL inventory to have the default value
UPDATE profiles 
SET inventory = '{"items": {}, "active_boosters": {}}'::jsonb 
WHERE inventory IS NULL;

-- Add comment to document the column structure
COMMENT ON COLUMN profiles.inventory IS 'JSONB object with structure: {"items": {"ITEM_ID": quantity}, "active_boosters": {"BOOSTER_TYPE": expiration_timestamp}}';
