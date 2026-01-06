-- Create finishers table
CREATE TABLE IF NOT EXISTS finishers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  animation_key TEXT UNIQUE NOT NULL,
  price INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add finisher-related columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS equipped_finisher TEXT REFERENCES finishers(animation_key);

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS unlocked_finishers TEXT[] DEFAULT '{}';

-- Insert finishers
INSERT INTO finishers (name, animation_key, price)
VALUES 
  ('The Shiba Slam', 'shiba_slam', 1500),
  ('The Ethereal Blade', 'ethereal_blade', 1500)
ON CONFLICT (animation_key) DO NOTHING;

-- Add RLS policies
ALTER TABLE finishers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Finishers are viewable by everyone"
  ON finishers FOR SELECT
  USING (true);
