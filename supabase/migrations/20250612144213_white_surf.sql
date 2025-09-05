/*
  # Fix RLS Policy Infinite Recursion

  1. Problem
    - Current policies create circular dependencies between user_profiles and teams tables
    - user_profiles policies check team membership via subqueries
    - teams policies check user_profiles for ownership/membership
    - This creates infinite recursion when both tables are accessed together

  2. Solution
    - Simplify user_profiles policies to rely primarily on auth.uid()
    - Remove circular references between user_profiles and teams
    - Use direct foreign key relationships instead of complex subqueries
    - Ensure policies don't trigger recursive evaluations

  3. Changes
    - Drop existing problematic policies on user_profiles and teams
    - Create new simplified policies that avoid circular references
    - Use team_members table for membership checks to break the cycle
*/

-- Drop existing problematic policies

/*
DROP POLICY IF EXISTS "Users can view profiles in their team" ON user_profiles;
DROP POLICY IF EXISTS "Users can view teams they belong to" ON teams;
DROP POLICY IF EXISTS "Team members can view assignments in their team" ON study_assignments;
DROP POLICY IF EXISTS "Team members can view invitations for their team" ON team_invitations;



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

-- Fix study_assignments policies
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

-- Fix team_invitations policies
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

*/