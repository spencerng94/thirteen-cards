-- Add all missing finishers
-- This migration ensures all finishers that exist in the codebase are in the database

INSERT INTO finishers (name, animation_key, price)
VALUES 
  ('The Shiba Slam', 'shiba_slam', 1500),
  ('The Ethereal Blade', 'ethereal_blade', 1500),
  ('KISS MY SHIBA', 'kiss_my_shiba', 1500),
  ('Salt Shaker', 'salt_shaker', 1500),
  ('Sanctum Snap', 'sanctum_snap', 1500),
  ('Seductive Finish', 'seductive_finish', 1500),
  ('Bashful Finish', 'bashful_finish', 1500)
ON CONFLICT (animation_key) DO UPDATE
SET 
  name = EXCLUDED.name,
  price = EXCLUDED.price;
