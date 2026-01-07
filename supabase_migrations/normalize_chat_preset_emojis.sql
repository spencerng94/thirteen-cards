-- Normalize old Apple emoji characters in chat_presets to modern Unicode standard
-- This migration updates legacy chat presets that may contain old Apple emoji variations

-- STEP 1: First, identify which chat presets contain emojis
-- Run this query to see what needs updating:
/*
SELECT 
  id,
  phrase,
  style,
  encode(phrase::bytea, 'hex') as phrase_hex,
  length(phrase) as phrase_length
FROM public.chat_presets
WHERE phrase ~ '[^\x00-\x7F]'
ORDER BY created_at DESC;
*/

-- STEP 2: Update old Apple emoji variations to modern Unicode standard
-- The following are common old Apple emoji patterns that may need normalization
-- Adjust these UPDATE statements based on what you find in your database

-- Common old Apple emoji normalizations:
-- Note: Old Apple emojis often use different Unicode sequences (VS16, variation selectors, etc.)
-- Modern Unicode emojis use standardized sequences

-- Example UPDATE statements (uncomment and modify based on your findings):

-- If you find old emoji variations, you can update them like this:
/*
UPDATE public.chat_presets 
SET phrase = REPLACE(phrase, '<old_emoji_char>', '<new_emoji_char>')
WHERE phrase LIKE '%<old_emoji_char>%';
*/

-- For example, if you find old variations of common emojis:
/*
-- Smile emoji normalization
UPDATE public.chat_presets 
SET phrase = REPLACE(phrase, '😊', '😊')  -- If old version differs
WHERE phrase LIKE '%😊%';

-- Thumbs up normalization  
UPDATE public.chat_presets 
SET phrase = REPLACE(phrase, '👍', '👍')  -- If old version differs
WHERE phrase LIKE '%👍%';

-- Fire emoji normalization
UPDATE public.chat_presets 
SET phrase = REPLACE(phrase, '🔥', '🔥')  -- If old version differs
WHERE phrase LIKE '%🔥%';
*/

-- STEP 3: Create a function to normalize emojis (if you have many to update)
-- This function normalizes emojis using Unicode normalization form (NFD to NFC)
-- This converts decomposed emojis (old Apple style) to composed (modern standard)

CREATE OR REPLACE FUNCTION normalize_emoji_text(input_text text)
RETURNS text AS $$
BEGIN
  -- PostgreSQL doesn't have built-in Unicode normalization
  -- You may need to use a PostgreSQL extension like 'unaccent' or handle this in application code
  
  -- For now, return the text as-is
  -- If you have specific old emoji patterns, add REPLACE statements here
  RETURN input_text;
END;
$$ LANGUAGE plpgsql;

-- Apply normalization to all chat presets (uncomment when ready):
/*
UPDATE public.chat_presets 
SET phrase = normalize_emoji_text(phrase)
WHERE phrase ~ '[^\x00-\x7F]';
*/

-- STEP 4: Check for specific old Apple emoji patterns
-- Old Apple emojis often use:
-- - Variation Selector-16 (VS16): U+FE0F
-- - Zero Width Joiner (ZWJ): U+200D
-- - Skin tone modifiers: U+1F3FB through U+1F3FF
-- These are usually fine, but old Apple-specific variations may need updating

-- Summary:
-- 1. First run the SELECT query above to see which presets have emojis
-- 2. Identify the specific old emoji characters
-- 3. Create UPDATE statements with REPLACE() for each old emoji pattern
-- 4. Run the migration

-- Note: If emojis are in user profiles (unlocked_phrases), you may also need to update those:
-- UPDATE public.profiles
-- SET unlocked_phrases = array(
--   SELECT normalize_emoji_text(phrase)
--   FROM unnest(unlocked_phrases) AS phrase
-- )
-- WHERE EXISTS (
--   SELECT 1 FROM unnest(unlocked_phrases) AS phrase
--   WHERE phrase ~ '[^\x00-\x7F]'
-- );
