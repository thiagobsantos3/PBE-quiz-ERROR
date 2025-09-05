/*
  # Fix Team Assignment Issue

  This migration addresses the issue where users don't have proper team assignments,
  causing the "No Team Found" error in the Schedule page.

  1. Identify users without team assignments
  2. Fix team_id assignments in user_profiles
  3. Ensure team_members table is properly populated
  4. Add data consistency checks
*/

-- First, let's identify and fix users who should have team assignments but don't
DO $$
DECLARE
  user_record RECORD;
  team_record RECORD;
BEGIN
  -- Find users who are team owners but don't have team_id set in their profile
  FOR user_record IN 
    SELECT up.id, up.name, t.id as team_id, t.name as team_name
    FROM user_profiles up
    JOIN teams t ON t.owner_id = up.id
    WHERE up.team_id IS NULL
  LOOP
    RAISE NOTICE 'Fixing team assignment for user % (%) - assigning to team % (%)', 
      user_record.name, user_record.id, user_record.team_name, user_record.team_id;
    
    -- Update user profile with correct team_id and team_role
    UPDATE user_profiles 
    SET 
      team_id = user_record.team_id,
      team_role = 'owner',
      updated_at = NOW()
    WHERE id = user_record.id;
    
    -- Ensure team_members entry exists
    INSERT INTO team_members (
      user_id,
      team_id,
      role,
      status,
      invited_by,
      joined_at
    ) VALUES (
      user_record.id,
      user_record.team_id,
      'owner',
      'active',
      user_record.id,
      NOW()
    )
    ON CONFLICT (user_id, team_id) 
    DO UPDATE SET
      role = 'owner',
      status = 'active',
      updated_at = NOW();
  END LOOP;

  -- Find users who are team members but don't have team_id set in their profile
  FOR user_record IN 
    SELECT up.id, up.name, tm.team_id, tm.role, t.name as team_name
    FROM user_profiles up
    JOIN team_members tm ON tm.user_id = up.id
    JOIN teams t ON t.id = tm.team_id
    WHERE up.team_id IS NULL
      AND tm.status = 'active'
  LOOP
    RAISE NOTICE 'Fixing team assignment for member % (%) - assigning to team % (%)', 
      user_record.name, user_record.id, user_record.team_name, user_record.team_id;
    
    -- Update user profile with correct team_id and team_role
    UPDATE user_profiles 
    SET 
      team_id = user_record.team_id,
      team_role = user_record.role,
      updated_at = NOW()
    WHERE id = user_record.id;
  END LOOP;

  -- Report on the fixes
  RAISE NOTICE 'Team assignment fixes completed';
END $$;

-- Add a function to maintain data consistency
CREATE OR REPLACE FUNCTION ensure_team_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- When a team_member is inserted or updated, ensure user_profile is in sync
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Update user profile to match team membership
    UPDATE user_profiles 
    SET 
      team_id = NEW.team_id,
      team_role = NEW.role,
      updated_at = NOW()
    WHERE id = NEW.user_id;
    
    RETURN NEW;
  END IF;
  
  -- When a team_member is deleted, clear user profile team info
  IF TG_OP = 'DELETE' THEN
    UPDATE user_profiles 
    SET 
      team_id = NULL,
      team_role = NULL,
      updated_at = NOW()
    WHERE id = OLD.user_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END $$;

-- Create trigger to maintain consistency
DROP TRIGGER IF EXISTS maintain_team_consistency ON team_members;
CREATE TRIGGER maintain_team_consistency
  AFTER INSERT OR UPDATE OR DELETE ON team_members
  FOR EACH ROW
  EXECUTE FUNCTION ensure_team_consistency();

-- Add a function to validate team data integrity
CREATE OR REPLACE FUNCTION validate_team_integrity()
RETURNS TABLE (
  issue_type TEXT,
  user_id UUID,
  user_name TEXT,
  team_id UUID,
  team_name TEXT,
  description TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check for users with team_id but no team_members entry
  RETURN QUERY
  SELECT 
    'missing_team_member'::TEXT,
    up.id,
    up.name,
    up.team_id,
    t.name,
    'User has team_id in profile but no team_members entry'::TEXT
  FROM user_profiles up
  JOIN teams t ON t.id = up.team_id
  LEFT JOIN team_members tm ON tm.user_id = up.id AND tm.team_id = up.team_id
  WHERE up.team_id IS NOT NULL 
    AND tm.id IS NULL;

  -- Check for team_members without corresponding user_profile team_id
  RETURN QUERY
  SELECT 
    'missing_profile_team'::TEXT,
    tm.user_id,
    up.name,
    tm.team_id,
    t.name,
    'User has team_members entry but no team_id in profile'::TEXT
  FROM team_members tm
  JOIN teams t ON t.id = tm.team_id
  JOIN user_profiles up ON up.id = tm.user_id
  WHERE tm.status = 'active'
    AND (up.team_id IS NULL OR up.team_id != tm.team_id);

  -- Check for role mismatches
  RETURN QUERY
  SELECT 
    'role_mismatch'::TEXT,
    tm.user_id,
    up.name,
    tm.team_id,
    t.name,
    'Role mismatch between team_members and user_profiles'::TEXT
  FROM team_members tm
  JOIN teams t ON t.id = tm.team_id
  JOIN user_profiles up ON up.id = tm.user_id
  WHERE tm.status = 'active'
    AND up.team_id = tm.team_id
    AND up.team_role != tm.role;
END $$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION validate_team_integrity() TO authenticated;
GRANT EXECUTE ON FUNCTION ensure_team_consistency() TO authenticated;

-- Run a final validation
DO $$
DECLARE
  validation_record RECORD;
  issue_count INTEGER := 0;
BEGIN
  FOR validation_record IN 
    SELECT * FROM validate_team_integrity()
  LOOP
    issue_count := issue_count + 1;
    RAISE NOTICE 'Data integrity issue: % - User: % (%) - Team: % (%) - %', 
      validation_record.issue_type,
      validation_record.user_name,
      validation_record.user_id,
      validation_record.team_name,
      validation_record.team_id,
      validation_record.description;
  END LOOP;
  
  IF issue_count = 0 THEN
    RAISE NOTICE 'All team data integrity checks passed!';
  ELSE
    RAISE NOTICE 'Found % data integrity issues that need attention', issue_count;
  END IF;
END $$;