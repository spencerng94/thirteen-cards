-- Add description column to finishers table
ALTER TABLE finishers 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Update all existing finishers with descriptions
UPDATE finishers 
SET description = CASE
  WHEN animation_key = 'shiba_slam' THEN 'A legendary cinematic finisher that plays when you win a match. Feel the main character energy.'
  WHEN animation_key = 'ethereal_blade' THEN 'A legendary cinematic finisher that plays when you win a match. Feel the main character energy.'
  WHEN animation_key = 'kiss_my_shiba' THEN 'A legendary cinematic finisher that plays when you win a match. Feel the main character energy.'
  WHEN animation_key = 'salt_shaker' THEN 'A legendary cinematic finisher that plays when you win a match. Feel the main character energy.'
  WHEN animation_key = 'sanctum_snap' THEN 'A legendary cinematic finisher that plays when you win a match. Feel the main character energy.'
  WHEN animation_key = 'seductive_finish' THEN 'A legendary cinematic finisher that plays when you win a match. Feel the main character energy.'
  ELSE 'A legendary cinematic finisher that plays when you win a match. Feel the main character energy.'
END
WHERE description IS NULL;

-- Set default description for future finishers if not provided
ALTER TABLE finishers 
ALTER COLUMN description SET DEFAULT 'A legendary cinematic finisher that plays when you win a match. Feel the main character energy.';
