-- Create atomic RPC function to handle item purchases
-- This function ensures currency deduction and item addition happen atomically
-- Returns JSON with success status, error message, and updated balances

CREATE OR REPLACE FUNCTION handle_purchase(
  user_id UUID,
  item_name TEXT,
  item_type TEXT,
  item_price INTEGER,
  currency_type TEXT DEFAULT 'GOLD'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_coins INTEGER;
  current_gems INTEGER;
  new_coins INTEGER;
  new_gems INTEGER;
  current_inventory JSONB;
  current_unlocked_sleeves TEXT[];
  current_unlocked_avatars TEXT[];
  current_unlocked_boards TEXT[];
  current_unlocked_finishers TEXT[];
BEGIN
  -- Validate input
  IF item_price <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid price',
      'error_code', 'INVALID_PRICE'
    );
  END IF;

  IF currency_type NOT IN ('GOLD', 'GEMS') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid currency type',
      'error_code', 'INVALID_CURRENCY'
    );
  END IF;

  -- Get current balances and inventory
  SELECT 
    COALESCE(coins, 0),
    COALESCE(gems, 0),
    COALESCE(inventory, '{"items": {}, "active_boosters": {}}'::jsonb),
    COALESCE(unlocked_sleeves, ARRAY[]::TEXT[]),
    COALESCE(unlocked_avatars, ARRAY[]::TEXT[]),
    COALESCE(unlocked_boards, ARRAY[]::TEXT[]),
    COALESCE(unlocked_finishers, ARRAY[]::TEXT[])
  INTO 
    current_coins,
    current_gems,
    current_inventory,
    current_unlocked_sleeves,
    current_unlocked_avatars,
    current_unlocked_boards,
    current_unlocked_finishers
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

  -- Check if user has enough currency
  IF currency_type = 'GEMS' AND current_gems < item_price THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient gems',
      'error_code', 'INSUFFICIENT_FUNDS',
      'current_balance', current_gems,
      'required', item_price
    );
  END IF;

  IF currency_type = 'GOLD' AND current_coins < item_price THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient coins',
      'error_code', 'INSUFFICIENT_FUNDS',
      'current_balance', current_coins,
      'required', item_price
    );
  END IF;

  -- Calculate new balances
  IF currency_type = 'GEMS' THEN
    new_gems := current_gems - item_price;
    new_coins := current_coins;
  ELSE
    new_coins := current_coins - item_price;
    new_gems := current_gems;
  END IF;

  -- Update based on item type
  IF item_type = 'SLEEVE' THEN
    -- Add to unlocked_sleeves array if not already present
    IF NOT (item_name = ANY(current_unlocked_sleeves)) THEN
      current_unlocked_sleeves := array_append(current_unlocked_sleeves, item_name);
    END IF;
    
    UPDATE profiles
    SET 
      coins = new_coins,
      gems = new_gems,
      unlocked_sleeves = current_unlocked_sleeves
    WHERE id = user_id;

  ELSIF item_type = 'AVATAR' THEN
    -- Add to unlocked_avatars array if not already present
    IF NOT (item_name = ANY(current_unlocked_avatars)) THEN
      current_unlocked_avatars := array_append(current_unlocked_avatars, item_name);
    END IF;
    
    UPDATE profiles
    SET 
      coins = new_coins,
      gems = new_gems,
      unlocked_avatars = current_unlocked_avatars
    WHERE id = user_id;

  ELSIF item_type = 'BOARD' THEN
    -- Add to unlocked_boards array if not already present
    IF NOT (item_name = ANY(current_unlocked_boards)) THEN
      current_unlocked_boards := array_append(current_unlocked_boards, item_name);
    END IF;
    
    UPDATE profiles
    SET 
      coins = new_coins,
      gems = new_gems,
      unlocked_boards = current_unlocked_boards
    WHERE id = user_id;

  ELSIF item_type = 'FINISHER' THEN
    -- Add to unlocked_finishers array if not already present
    IF NOT (item_name = ANY(current_unlocked_finishers)) THEN
      current_unlocked_finishers := array_append(current_unlocked_finishers, item_name);
    END IF;
    
    UPDATE profiles
    SET 
      coins = new_coins,
      gems = new_gems,
      unlocked_finishers = current_unlocked_finishers
    WHERE id = user_id;

  ELSIF item_type = 'ITEM' THEN
    -- Handle inventory items
    -- Handle bundles
    IF item_name = 'BOOSTER_PACK_XP' THEN
      current_inventory := jsonb_set(
        jsonb_set(
          current_inventory,
          '{items,XP_2X_30M}',
          to_jsonb(COALESCE((current_inventory->'items'->>'XP_2X_30M')::INTEGER, 0) + 1)
        ),
        '{items,XP_2X_10M}',
        to_jsonb(COALESCE((current_inventory->'items'->>'XP_2X_10M')::INTEGER, 0) + 2)
      );
    ELSIF item_name = 'BOOSTER_PACK_GOLD' THEN
      current_inventory := jsonb_set(
        jsonb_set(
          current_inventory,
          '{items,GOLD_2X_30M}',
          to_jsonb(COALESCE((current_inventory->'items'->>'GOLD_2X_30M')::INTEGER, 0) + 1)
        ),
        '{items,GOLD_2X_10M}',
        to_jsonb(COALESCE((current_inventory->'items'->>'GOLD_2X_10M')::INTEGER, 0) + 2)
      );
    ELSE
      -- Regular single item
      current_inventory := jsonb_set(
        current_inventory,
        ARRAY['items', item_name],
        to_jsonb(COALESCE((current_inventory->'items'->>item_name)::INTEGER, 0) + 1),
        true
      );
    END IF;
    
    UPDATE profiles
    SET 
      coins = new_coins,
      gems = new_gems,
      inventory = current_inventory
    WHERE id = user_id;

  ELSE
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid item type',
      'error_code', 'INVALID_ITEM_TYPE'
    );
  END IF;

  -- Return success with updated balances
  RETURN json_build_object(
    'success', true,
    'new_coins', new_coins,
    'new_gems', new_gems,
    'item_name', item_name,
    'item_type', item_type
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
GRANT EXECUTE ON FUNCTION handle_purchase(UUID, TEXT, TEXT, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION handle_purchase(UUID, TEXT, TEXT, INTEGER, TEXT) TO anon;
