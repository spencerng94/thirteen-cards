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
  
  -- Explicitly delete from public.profiles first
  -- (Even though CASCADE should handle this, we do it explicitly for safety)
  DELETE FROM public.profiles WHERE id = current_user_id;
  GET DIAGNOSTICS deleted_profile = FOUND;
  
  -- Delete from auth.users (this will cascade to any other tables with foreign keys)
  -- Note: This requires SECURITY DEFINER to have permission to delete from auth.users
  DELETE FROM auth.users WHERE id = current_user_id;
  GET DIAGNOSTICS deleted_auth_user = FOUND;
  
  -- Verify deletion was successful
  IF deleted_auth_user THEN
    RETURN json_build_object(
      'success', true,
      'message', 'Account deleted successfully',
      'profile_deleted', deleted_profile,
      'auth_user_deleted', deleted_auth_user
    );
  ELSE
    -- If auth.users deletion failed, try to restore profile if it was deleted
    IF deleted_profile AND NOT deleted_auth_user THEN
      -- This shouldn't happen, but if it does, we've already deleted the profile
      -- and can't restore it without the user_id. Log this as an error case.
      RAISE WARNING 'Profile deleted but auth.users deletion failed for user %', current_user_id;
    END IF;
    
    RETURN json_build_object(
      'success', false,
      'error', 'Failed to delete account. User may not exist or deletion was blocked.'
    );
  END IF;
  
EXCEPTION
  WHEN others THEN
    -- Log the error and return failure
    RAISE WARNING 'Error deleting user account: %', SQLERRM;
    RETURN json_build_object(
      'success', false,
      'error', 'An error occurred while deleting the account: ' || SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users only
-- This ensures only logged-in users can call this function
GRANT EXECUTE ON FUNCTION delete_user_account() TO authenticated;

-- Revoke from anon to ensure only authenticated users can delete accounts
REVOKE EXECUTE ON FUNCTION delete_user_account() FROM anon;
