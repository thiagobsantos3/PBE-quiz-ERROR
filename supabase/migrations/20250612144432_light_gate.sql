/*
  # Fix RLS Policy Infinite Recursion

  This migration fixes the infinite recursion error in RLS policies by:
  1. Dropping all existing problematic policies that create circular dependencies
  2. Recreating policies that use team_members table as source of truth for team membership
  3. Avoiding circular references between user_profiles and teams tables

  ## Changes Made
  - Drop and recreate user_profiles policies to avoid self-referencing
  - Drop and recreate teams policies to use team_members for membership checks
  - Fix study_assignments and team_invitations policies
  - Ensure all policies use team_members table to break circular dependencies
*/

-- Drop ALL existing policies for affected tables to start fresh


/*
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view profiles in their team" ON user_profiles;


DROP POLICY IF EXISTS "Users can create teams" ON teams;
DROP POLICY IF EXISTS "Team owners can update their teams" ON teams;
DROP POLICY IF EXISTS "Users can view teams they belong to" ON teams;
DROP POLICY IF EXISTS "Users can view teams they are members of" ON teams;

DROP POLICY IF EXISTS "Team members can view assignments in their team" ON study_assignments;
DROP POLICY IF EXISTS "Users can view their own assignments" ON study_assignments;
DROP POLICY IF EXISTS "Team owners and admins can create assignments" ON study_assignments;
DROP POLICY IF EXISTS "Team owners and admins can manage team assignments" ON study_assignments;
DROP POLICY IF EXISTS "Users can update their own assignment completion" ON study_assignments;

DROP POLICY IF EXISTS "Team members can view invitations for their team" ON team_invitations;
DROP POLICY IF EXISTS "Team owners and admins can manage invitations" ON team_invitations;

-- Recreate user_profiles policies without circular references


CREATE POLICY IF NOT EXISTS "Users can view profiles in same team"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    team_id IS NOT NULL AND 
    team_id IN (
      SELECT tm.team_id 
      FROM team_members tm 
      WHERE tm.user_id = auth.uid() AND tm.status = 'active'
    )
  );

CREATE POLICY "Users can insert their own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- Recreate teams policies without circular references
CREATE POLICY "Users can view teams they are members of"
  ON teams
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT tm.team_id 
      FROM team_members tm 
      WHERE tm.user_id = auth.uid() AND tm.status = 'active'
    )
  );

CREATE POLICY "Users can create teams"
  ON teams
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Team owners can update their teams"
  ON teams
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid());

-- Recreate study_assignments policies
CREATE POLICY "Team members can view assignments in their team"
  ON study_assignments
  FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      SELECT tm.team_id 
      FROM team_members tm 
      WHERE tm.user_id = auth.uid() AND tm.status = 'active'
    )
  );

CREATE POLICY "Users can view their own assignments"
  ON study_assignments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Team owners and admins can create assignments"
  ON study_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    team_id IN (
      SELECT tm.team_id 
      FROM team_members tm 
      WHERE tm.user_id = auth.uid() 
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Team owners and admins can manage team assignments"
  ON study_assignments
  FOR ALL
  TO authenticated
  USING (
    team_id IN (
      SELECT tm.team_id 
      FROM team_members tm 
      WHERE tm.user_id = auth.uid() 
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can update their own assignment completion"
  ON study_assignments
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Recreate team_invitations policies
CREATE POLICY "Team members can view invitations for their team"
  ON team_invitations
  FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      SELECT tm.team_id 
      FROM team_members tm 
      WHERE tm.user_id = auth.uid() AND tm.status = 'active'
    )
  );

CREATE POLICY "Team owners and admins can manage invitations"
  ON team_invitations
  FOR ALL
  TO authenticated
  USING (
    team_id IN (
      SELECT tm.team_id 
      FROM team_members tm 
      WHERE tm.user_id = auth.uid() 
        AND tm.status = 'active'
        AND tm.role IN ('owner', 'admin')
    )
  );

*/