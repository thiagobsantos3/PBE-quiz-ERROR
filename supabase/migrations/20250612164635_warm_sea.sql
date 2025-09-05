/*
  # Fix RLS Policy Infinite Recursion - CORRECTED VERSION
  
  The issue was circular dependencies between policies. The solution is to:
  1. Use direct column comparisons instead of subqueries where possible
  2. Break circular references by using simpler policy logic
  3. Ensure team_members policies don't reference other tables that reference back
  
  Key Changes:
  - Removed circular subqueries
  - Used direct user_id checks for team_members
  - Simplified team access logic
  - Maintained security while avoiding recursion
*/

-- Drop all existing problematic policies
DROP POLICY IF EXISTS "Users can view teams they belong to" ON teams;
DROP POLICY IF EXISTS "Users can view profiles in their team" ON user_profiles;
DROP POLICY IF EXISTS "Team members can view invitations for their team" ON team_invitations;
DROP POLICY IF EXISTS "Team members can view assignments in their team" ON study_assignments;
DROP POLICY IF EXISTS "Users can view team members in their team" ON team_members;
DROP POLICY IF EXISTS "Users can view team member records" ON team_members;
DROP POLICY IF EXISTS "Team owners can view their teams" ON teams;
DROP POLICY IF EXISTS "Team members can view their team" ON teams;
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Team members can view other team member profiles" ON user_profiles;
DROP POLICY IF EXISTS "Team owners and admins can view team invitations" ON team_invitations;
DROP POLICY IF EXISTS "Team members can view team assignments" ON study_assignments;

-- 1. TEAM_MEMBERS policies (base level - no dependencies)
CREATE POLICY "Users can view their own team memberships"
  ON team_members
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 2. TEAMS policies (can reference team_members safely)
CREATE POLICY "Team owners can manage their teams"
  ON teams
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Team members can view teams they belong to"
  ON teams
  FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid() OR
    id IN (
      SELECT team_id 
      FROM team_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- 3. USER_PROFILES policies (avoid circular reference)
CREATE POLICY "Users can view their own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- For team member profiles, use a separate policy that doesn't create circular dependency
CREATE POLICY "Team members can view teammate profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    id != auth.uid() AND
    team_id IS NOT NULL AND
    EXISTS (
      SELECT 1 
      FROM team_members tm1, team_members tm2
      WHERE tm1.user_id = auth.uid() 
      AND tm2.user_id = user_profiles.id
      AND tm1.team_id = tm2.team_id
      AND tm1.status = 'active'
      AND tm2.status = 'active'
    )
  );

-- 4. TEAM_INVITATIONS policies
CREATE POLICY "Users can view invitations sent to them"
  ON team_invitations
  FOR SELECT
  TO authenticated
  USING (email = auth.email());

CREATE POLICY "Team owners can manage invitations"
  ON team_invitations
  FOR ALL
  TO authenticated
  USING (
    team_id IN (
      SELECT id FROM teams WHERE owner_id = auth.uid()
    )
  );

-- 5. STUDY_ASSIGNMENTS policies
CREATE POLICY "Team members can view assignments"
  ON study_assignments
  FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id 
      FROM team_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Team owners can manage assignments"
  ON study_assignments
  FOR ALL
  TO authenticated
  USING (
    team_id IN (
      SELECT id FROM teams WHERE owner_id = auth.uid()
    )
  );