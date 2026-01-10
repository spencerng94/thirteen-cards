-- Create function to delete user account
-- This function deletes the user from both auth.users and public.profiles
-- It uses SECURITY DEFINER to have permission to delete from auth.users
-- It ensures users can only delete themselves using auth.uid()

CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  current_user_id UUID;
  deleted_profile BOOLEAN := false;
  deleted_auth_user BOOLEAN := false;
BEGIN
  -- Get the current authenticated user's ID
  current_user_id := auth.uid();
  
  -- Verify user is authenticated
  IF current_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User must be authenticated to delete account'
    );
  END IF;
  
  -- Begin transaction block (PostgreSQL functions run in transactions, but explicit is clearer)
  BEGIN
    -- Delete from auth.users FIRST (this will cascade to dependent tables with foreign keys)
    -- This also triggers cleanup_player_feedback_on_user_delete() to clean up player_feedback
    -- Note: This requires SECURITY DEFINER to have permission to delete from auth.users
    -- Order matters: Deleting auth.users first allows CASCADE and triggers to work properly
    DELETE FROM auth.users WHERE id = current_user_id;
    GET DIAGNOSTICS deleted_auth_user = FOUND;
    
    -- If auth.users deletion failed, abort early
    IF NOT deleted_auth_user THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Failed to delete account. User may not exist or deletion was blocked.'
      );
    END IF;
    
    -- Delete profile explicitly (profiles may not have FK to auth.users, so CASCADE might not work)
    -- If profiles has a trigger that deletes on auth.users deletion, this is a no-op
    DELETE FROM public.profiles WHERE id = current_user_id;
    GET DIAGNOSTICS deleted_profile = FOUND;
    
    -- Note: The following tables are automatically cleaned via CASCADE or triggers:
    -- - friendships (CASCADE from auth.users deletion)
    -- - gem_transactions (CASCADE from auth.users deletion)
    -- - user_reports (CASCADE from auth.users deletion)
    -- - reward_tracking (CASCADE from profiles deletion)
    -- - player_feedback (trigger cleanup_player_feedback_on_user_delete fires on auth.users deletion)
    -- - client_errors (SET NULL on auth.users deletion - acceptable for error logs)
    
    -- Verify deletion was successful
    RETURN json_build_object(
      'success', true,
      'message', 'Account deleted successfully',
      'profile_deleted', deleted_profile,
      'auth_user_deleted', deleted_auth_user
    );
    
  EXCEPTION
    WHEN others THEN
      -- Transaction will auto-rollback on exception
      -- Log the error and return failure
      RAISE WARNING 'Error deleting user account for user %: %', current_user_id, SQLERRM;
      RETURN json_build_object(
        'success', false,
        'error', 'An error occurred while deleting the account: ' || SQLERRM
      );
  END;
END;
$$;

-- Grant execute permission to authenticated users only
-- This ensures only logged-in users can call this function
GRANT EXECUTE ON FUNCTION delete_user_account() TO authenticated;

-- Revoke from anon to ensure only authenticated users can delete accounts
REVOKE EXECUTE ON FUNCTION delete_user_account() FROM anon;
