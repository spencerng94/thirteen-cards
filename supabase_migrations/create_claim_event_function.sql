-- Create atomic RPC function to claim event rewards
-- This function ensures event is marked as claimed and reward is granted atomically
-- Returns JSON with success status, error message, and updated balances

CREATE OR REPLACE FUNCTION claim_event(
  user_id UUID,
  event_id TEXT,
  reward_type TEXT,
  reward_value TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_coins INTEGER;
  current_gems INTEGER;
  current_xp INTEGER;
  new_coins INTEGER;
  new_gems INTEGER;
  new_xp INTEGER;
  current_event_stats JSONB;
  current_claimed_events TEXT[];
  current_ready_to_claim TEXT[];
  current_unlocked_sleeves TEXT[];
BEGIN
  -- Validate input
  IF event_id IS NULL OR event_id = '' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid event ID',
      'error_code', 'INVALID_EVENT_ID'
    );
  END IF;

  IF reward_type NOT IN ('XP', 'GOLD', 'GEMS', 'SLEEVE', 'BOOSTER') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid reward type',
      'error_code', 'INVALID_REWARD_TYPE'
    );
  END IF;

  -- Get current profile data
  SELECT 
    COALESCE(coins, 0),
    COALESCE(gems, 0),
    COALESCE(xp, 0),
    COALESCE(event_stats, '{}'::jsonb),
    COALESCE(unlocked_sleeves, ARRAY[]::TEXT[])
  INTO 
    current_coins,
    current_gems,
    current_xp,
    current_event_stats,
    current_unlocked_sleeves
  FROM profiles
  WHERE id = user_id;

  -- Check if user exists
  IF current_coins IS NULL AND current_gems IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found',
      'error_code', 'USER_NOT_FOUND'
    );
  END IF;

  -- Extract claimed_events and ready_to_claim from event_stats
  current_claimed_events := COALESCE(
    ARRAY(SELECT jsonb_array_elements_text(current_event_stats->'claimed_events')),
    ARRAY[]::TEXT[]
  );
  current_ready_to_claim := COALESCE(
    ARRAY(SELECT jsonb_array_elements_text(current_event_stats->'ready_to_claim')),
    ARRAY[]::TEXT[]
  );

  -- Check if event is already claimed
  IF event_id = ANY(current_claimed_events) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Event already claimed',
      'error_code', 'ALREADY_CLAIMED'
    );
  END IF;

  -- Initialize new values
  new_coins := current_coins;
  new_gems := current_gems;
  new_xp := current_xp;

  -- Apply reward based on type
  IF reward_type = 'GOLD' THEN
    new_coins := current_coins + (reward_value::INTEGER);
  ELSIF reward_type = 'GEMS' THEN
    new_gems := current_gems + (reward_value::INTEGER);
  ELSIF reward_type = 'XP' THEN
    new_xp := current_xp + (reward_value::INTEGER);
  ELSIF reward_type = 'SLEEVE' THEN
    -- Add sleeve to unlocked_sleeves if not already present
    IF NOT (reward_value = ANY(current_unlocked_sleeves)) THEN
      current_unlocked_sleeves := array_append(current_unlocked_sleeves, reward_value);
    END IF;
  END IF;

  -- Update claimed_events and ready_to_claim
  current_claimed_events := array_append(current_claimed_events, event_id);
  current_ready_to_claim := array_remove(current_ready_to_claim, event_id);

  -- Update event_stats JSONB
  current_event_stats := jsonb_set(
    jsonb_set(
      current_event_stats,
      '{claimed_events}',
      to_jsonb(current_claimed_events)
    ),
    '{ready_to_claim}',
    to_jsonb(current_ready_to_claim)
  );

  -- Update profile atomically
  UPDATE profiles
  SET 
    coins = new_coins,
    gems = new_gems,
    xp = new_xp,
    event_stats = current_event_stats,
    unlocked_sleeves = CASE 
      WHEN reward_type = 'SLEEVE' THEN current_unlocked_sleeves 
      ELSE unlocked_sleeves 
    END
  WHERE id = user_id;

  -- Return success with updated balances
  RETURN json_build_object(
    'success', true,
    'new_coins', new_coins,
    'new_gems', new_gems,
    'new_xp', new_xp,
    'event_id', event_id
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
END;
$$;

-- Grant execute permission to authenticated users and anonymous users
GRANT EXECUTE ON FUNCTION claim_event(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION claim_event(UUID, TEXT, TEXT, TEXT) TO anon;
