-- Fix player_feedback orphaned records issue
-- Since player_feedback uses TEXT user_id (to support 'guest'), we can't use a foreign key constraint
-- Instead, we add a trigger that deletes feedback when a user is deleted from auth.users

-- Create function to cleanup player_feedback when user is deleted
CREATE OR REPLACE FUNCTION cleanup_player_feedback_on_user_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete all feedback records for the deleted user
  -- user_id is stored as TEXT in player_feedback, so we convert UUID to TEXT
  DELETE FROM public.player_feedback WHERE user_id = OLD.id::text;
  
  -- Return OLD to allow the deletion to proceed
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that fires AFTER a user is deleted from auth.users
-- This ensures feedback is cleaned up when accounts are deleted
DROP TRIGGER IF EXISTS cleanup_feedback_on_user_delete ON auth.users;
CREATE TRIGGER cleanup_feedback_on_user_delete
  AFTER DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_player_feedback_on_user_delete();

-- Add comment for documentation
COMMENT ON FUNCTION cleanup_player_feedback_on_user_delete() IS 
  'Cleans up player_feedback records when a user is deleted from auth.users. Required for GDPR compliance.';
