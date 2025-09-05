/*
  # Fix Team Members and Invitations Policies

  This migration fixes the infinite recursion issues in team_members policies
  by removing circular dependencies and using direct team ownership checks.
*/

-- Drop all existing policies that might cause recursion
DROP POLICY IF EXISTS "Team members can view team membership" ON team_members;
DROP POLICY IF EXISTS "Team owners and admins can manage memberships" ON team_members;
DROP POLICY IF EXISTS "Users can manage their own membership" ON team_members;
DROP POLICY IF EXISTS "Team owners can manage invitations" ON team_invitations;
DROP POLICY IF EXISTS "Team owners and admins can manage invitations" ON team_invitations;
DROP POLICY IF EXISTS "Users can view invitations sent to them" ON team_invitations;
DROP POLICY IF EXISTS "Invited users can update invitation status" ON team_invitations;
DROP POLICY IF EXISTS "Invited users can update their invitation status" ON team_invitations;

-- ========================================
-- TEAM_MEMBERS POLICIES (Non-recursive)
-- ========================================

-- Users can always view their own membership records
CREATE POLICY "Users can view their own membership"
  ON team_members
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Team owners can view all memberships in their teams
CREATE POLICY "Team owners can view all memberships"
  ON team_members
  FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      SELECT id FROM teams WHERE owner_id = auth.uid()
    )
  );

-- Team owners can insert new memberships in their teams
CREATE POLICY "Team owners can add memberships"
  ON team_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    team_id IN (
      SELECT id FROM teams WHERE owner_id = auth.uid()
    )
  );

-- Team owners can update memberships in their teams
CREATE POLICY "Team owners can update memberships"
  ON team_members
  FOR UPDATE
  TO authenticated
  USING (
    team_id IN (
      SELECT id FROM teams WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    team_id IN (
      SELECT id FROM teams WHERE owner_id = auth.uid()
    )
  );

-- Team owners can delete memberships in their teams
CREATE POLICY "Team owners can delete memberships"
  ON team_members
  FOR DELETE
  TO authenticated
  USING (
    team_id IN (
      SELECT id FROM teams WHERE owner_id = auth.uid()
    )
  );

-- Users can update their own membership (for changing status, etc.)
CREATE POLICY "Users can update their own membership"
  ON team_members
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own membership (for leaving teams)
CREATE POLICY "Users can leave teams"
  ON team_members
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own membership (for accepting invitations)
CREATE POLICY "Users can join teams"
  ON team_members
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ========================================
-- TEAM_INVITATIONS POLICIES (Non-recursive)
-- ========================================

-- Team owners can view invitations for their teams
CREATE POLICY "Team owners can view invitations"
  ON team_invitations
  FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      SELECT id FROM teams WHERE owner_id = auth.uid()
    )
  );

-- Team owners can create invitations for their teams
CREATE POLICY "Team owners can create invitations"
  ON team_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    team_id IN (
      SELECT id FROM teams WHERE owner_id = auth.uid()
    )
  );

-- Team owners can update invitations for their teams
CREATE POLICY "Team owners can update invitations"
  ON team_invitations
  FOR UPDATE
  TO authenticated
  USING (
    team_id IN (
      SELECT id FROM teams WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    team_id IN (
      SELECT id FROM teams WHERE owner_id = auth.uid()
    )
  );

-- Team owners can delete invitations for their teams
CREATE POLICY "Team owners can delete invitations"
  ON team_invitations
  FOR DELETE
  TO authenticated
  USING (
    team_id IN (
      SELECT id FROM teams WHERE owner_id = auth.uid()
    )
  );

-- Users can view invitations sent to their email
CREATE POLICY "Users can view their invitations"
  ON team_invitations
  FOR SELECT
  TO authenticated
  USING (
    email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
    AND status = 'pending'
    AND expires_at > now()
  );

-- Users can accept/decline invitations sent to their email
CREATE POLICY "Users can respond to invitations"
  ON team_invitations
  FOR UPDATE
  TO authenticated
  USING (
    email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
    AND status = 'pending'
    AND expires_at > now()
  )
  WITH CHECK (
    status IN ('accepted', 'declined')
  );