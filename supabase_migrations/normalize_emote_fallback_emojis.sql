-- Normalize old Apple emoji characters in emotes.fallback_emoji to modern Unicode standard
-- This migration updates legacy emotes that may have old Apple emoji variations as fallback

-- STEP 1: First, identify which emotes have emojis in fallback_emoji
-- Run this query to see what needs updating:
/*
SELECT 
  id,
  name,
  shortcode,
  fallback_emoji,
  encode(fallback_emoji::bytea, 'hex') as emoji_hex,
  length(fallback_emoji) as emoji_length
FROM public.emotes
WHERE fallback_emoji ~ '[^\x00-\x7F]'
ORDER BY name;
*/

-- STEP 2: Common emoji normalization mappings
-- Old Apple emojis often use different Unicode sequences or variation selectors
-- Update these UPDATE statements based on what you find in your database

-- Example: Normalize common old Apple emoji variations to modern Unicode standard
-- Adjust these UPDATE statements based on your findings

-- Common emoji mappings (uncomment and modify based on your findings):
/*
-- Smile/Blush emoji normalization
UPDATE public.emotes 
SET fallback_emoji = '😊'
WHERE fallback_emoji ~ '[^\x00-\x7F]' 
  AND (fallback_emoji LIKE '%😊%' OR fallback_emoji LIKE '%🙂%')
  AND fallback_emoji != '😊';

-- Heart eyes emoji normalization  
UPDATE public.emotes 
SET fallback_emoji = '😍'
WHERE fallback_emoji ~ '[^\x00-\x7F]'
  AND fallback_emoji LIKE '%😍%'
  AND fallback_emoji != '😍';

-- Cool/Sunglasses emoji normalization
UPDATE public.emotes 
SET fallback_emoji = '😎'
WHERE fallback_emoji ~ '[^\x00-\x7F]'
  AND fallback_emoji LIKE '%😎%'
  AND fallback_emoji != '😎';

-- Money mouth emoji normalization
UPDATE public.emotes 
SET fallback_emoji = '🤑'
WHERE fallback_emoji ~ '[^\x00-\x7F]'
  AND fallback_emoji LIKE '%🤑%'
  AND fallback_emoji != '🤑';

-- Robot emoji normalization
UPDATE public.emotes 
SET fallback_emoji = '🤖'
WHERE fallback_emoji ~ '[^\x00-\x7F]'
  AND fallback_emoji LIKE '%🤖%'
  AND fallback_emoji != '🤖';

-- Devil emoji normalization
UPDATE public.emotes 
SET fallback_emoji = '😈'
WHERE fallback_emoji ~ '[^\x00-\x7F]'
  AND fallback_emoji LIKE '%😈%'
  AND fallback_emoji != '😈';

-- Annoyed emoji normalization
UPDATE public.emotes 
SET fallback_emoji = '😒'
WHERE fallback_emoji ~ '[^\x00-\x7F]'
  AND fallback_emoji LIKE '%😒%'
  AND fallback_emoji != '😒';

-- Girly/Nail polish emoji normalization
UPDATE public.emotes 
SET fallback_emoji = '💅'
WHERE fallback_emoji ~ '[^\x00-\x7F]'
  AND fallback_emoji LIKE '%💅%'
  AND fallback_emoji != '💅';

-- Shiba/Dog emoji normalization
UPDATE public.emotes 
SET fallback_emoji = '🐕'
WHERE fallback_emoji ~ '[^\x00-\x7F]'
  AND fallback_emoji LIKE '%🐕%'
  AND fallback_emoji != '🐕';
*/

-- STEP 3: Create a function to normalize emojis (for batch processing)
-- This function normalizes common old Apple emoji patterns
CREATE OR REPLACE FUNCTION normalize_emoji(emoji_text text)
RETURNS text AS $$
BEGIN
  -- If text is NULL or empty, return default
  IF emoji_text IS NULL OR emoji_text = '' THEN
    RETURN '👤';
  END IF;
  
  -- Remove common old Apple emoji modifiers/variation selectors
  -- Variation Selector-16 (VS16): U+FE0F - often used by old Apple
  -- Zero Width Joiner (ZWJ): U+200D - usually fine, but may cause issues
  -- These are usually fine, but old Apple-specific variations may need updating
  
  -- For now, return as-is (add specific normalization logic based on findings)
  -- You can add REPLACE statements here for specific old emoji patterns
  
  RETURN emoji_text;
END;
$$ LANGUAGE plpgsql;

-- STEP 4: Apply normalization to all emotes (uncomment when ready):
/*
UPDATE public.emotes 
SET fallback_emoji = normalize_emoji(fallback_emoji)
WHERE fallback_emoji ~ '[^\x00-\x7F]';
*/

-- STEP 5: Specific normalization based on trigger codes
-- Match fallback emojis to the expected modern Unicode versions
-- Update these based on your EMOJI_FALLBACK mapping in VisualEmote.tsx

-- Standard fallback emoji mappings (from EMOJI_FALLBACK in VisualEmote.tsx):
/*
UPDATE public.emotes 
SET fallback_emoji = '😊'
WHERE shortcode IN (':smile:', ':blush:')
  AND fallback_emoji ~ '[^\x00-\x7F]'
  AND fallback_emoji != '😊';

UPDATE public.emotes 
SET fallback_emoji = '😍'
WHERE shortcode = ':heart_eyes:'
  AND fallback_emoji ~ '[^\x00-\x7F]'
  AND fallback_emoji != '😍';

UPDATE public.emotes 
SET fallback_emoji = '😎'
WHERE shortcode = ':cool:'
  AND fallback_emoji ~ '[^\x00-\x7F]'
  AND fallback_emoji != '😎';

UPDATE public.emotes 
SET fallback_emoji = '🤑'
WHERE shortcode = ':money_mouth_face:'
  AND fallback_emoji ~ '[^\x00-\x7F]'
  AND fallback_emoji != '🤑';

UPDATE public.emotes 
SET fallback_emoji = '🤖'
WHERE shortcode = ':robot:'
  AND fallback_emoji ~ '[^\x00-\x7F]'
  AND fallback_emoji != '🤖';

UPDATE public.emotes 
SET fallback_emoji = '😈'
WHERE shortcode = ':devil:'
  AND fallback_emoji ~ '[^\x00-\x7F]'
  AND fallback_emoji != '😈';

UPDATE public.emotes 
SET fallback_emoji = '😒'
WHERE shortcode = ':annoyed:'
  AND fallback_emoji ~ '[^\x00-\x7F]'
  AND fallback_emoji != '😒';

UPDATE public.emotes 
SET fallback_emoji = '💅'
WHERE shortcode = ':girly:'
  AND fallback_emoji ~ '[^\x00-\x7F]'
  AND fallback_emoji != '💅';

UPDATE public.emotes 
SET fallback_emoji = '🐕'
WHERE shortcode = ':shiba:'
  AND fallback_emoji ~ '[^\x00-\x7F]'
  AND fallback_emoji != '🐕';
*/

-- Summary:
-- 1. First run the SELECT query above to see which emotes have emojis
-- 2. Identify the specific old emoji characters by checking the hex values
-- 3. Uncomment and modify the UPDATE statements for the specific emoji patterns you find
-- 4. Run the migration

-- Note: If you see emojis being displayed overlaid on emotes, it means:
-- - The PNG image is still loading (shows fallback emoji temporarily)
-- - OR the fallback_emoji contains old Apple emoji characters
-- This migration fixes the database, but you may also need to ensure images load properly
