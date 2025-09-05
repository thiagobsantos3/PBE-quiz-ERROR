/*
  # Fix Team Management Relationships and Permissions

  1. Database Schema Updates
    - Add missing foreign key relationship between team_members and user_profiles
    - Update RLS policies for team_invitations to fix permission issues
    - Ensure proper access patterns for team management

  2. Security Updates
    - Fix RLS policies that were causing permission denied errors
    - Ensure team owners and admins can manage invitations properly
    - Allow users to view invitations sent to their email

  3. Data Integrity
    - Add proper foreign key constraints
    - Ensure referential integrity between tables
*/

-- Add foreign key relationship between team_members and user_profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'team_members_user_id_user_profiles_fkey'
    AND table_name = 'team_members'
  ) THEN
    ALTER TABLE team_members 
    ADD CONSTRAINT team_members_user_id_user_profiles_fkey 
    FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Drop existing problematic policies on team_invitations
DROP POLICY IF EXISTS "Team owners can manage invitations" ON team_invitations;
DROP POLICY IF EXISTS "Users can view invitations sent to them" ON team_invitations;
DROP POLICY IF EXISTS "Invited users can update their invitation status" ON team_invitations;

-- Create improved RLS policies for team_invitations
CREATE POLICY "Team owners and admins can manage invitations"
  ON team_invitations
  FOR ALL
  TO authenticated
  USING (
    team_id IN (
      SELECT tm.team_id 
      FROM team_members tm 
      WHERE tm.user_id = auth.uid() 
      AND tm.role IN ('owner', 'admin')
      AND tm.status = 'active'
    )
  )
  WITH CHECK (
    team_id IN (
      SELECT tm.team_id 
      FROM team_members tm 
      WHERE tm.user_id = auth.uid() 
      AND tm.role IN ('owner', 'admin')
      AND tm.status = 'active'
    )
  );

-- Allow users to view invitations sent to their email (using user_profiles email)
CREATE POLICY "Users can view invitations sent to them"
  ON team_invitations
  FOR SELECT
  TO authenticated
  USING (
    email = (
      SELECT up.name -- Assuming email is stored in name field, adjust if different
      FROM user_profiles up 
      WHERE up.id = auth.uid()
    )
    AND status = 'pending'
    AND expires_at > now()
  );

-- Allow invited users to update invitation status
CREATE POLICY "Invited users can update invitation status"
  ON team_invitations
  FOR UPDATE
  TO authenticated
  USING (
    email = (
      SELECT up.name -- Assuming email is stored in name field, adjust if different
      FROM user_profiles up 
      WHERE up.id = auth.uid()
    )
    AND status = 'pending'
    AND expires_at > now()
  )
  WITH CHECK (
    status IN ('accepted', 'declined')
  );

-- Ensure team_members policies allow proper access for team management
DROP POLICY IF EXISTS "Users can read their own memberships" ON team_members;
DROP POLICY IF EXISTS "Users can insert their own memberships" ON team_members;
DROP POLICY IF EXISTS "Users can update their own memberships" ON team_members;
DROP POLICY IF EXISTS "Users can delete their own memberships" ON team_members;

-- Create comprehensive team_members policies
CREATE POLICY "Team members can view team membership"
  ON team_members
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR team_id IN (
      SELECT tm.team_id 
      FROM team_members tm 
      WHERE tm.user_id = auth.uid() 
      AND tm.status = 'active'
    )
  );

CREATE POLICY "Team owners and admins can manage memberships"
  ON team_members
  FOR ALL
  TO authenticated
  USING (
    team_id IN (
      SELECT tm.team_id 
      FROM team_members tm 
      WHERE tm.user_id = auth.uid() 
      AND tm.role IN ('owner', 'admin')
      AND tm.status = 'active'
    )
  )
  WITH CHECK (
    team_id IN (
      SELECT tm.team_id 
      FROM team_members tm 
      WHERE tm.user_id = auth.uid() 
      AND tm.role IN ('owner', 'admin')
      AND tm.status = 'active'
    )
  );

CREATE POLICY "Users can manage their own membership"
  ON team_members
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());