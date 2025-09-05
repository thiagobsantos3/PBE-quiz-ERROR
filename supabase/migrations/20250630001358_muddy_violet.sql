/*
  # Restore RLS Policies for Questions and Other Tables
  
  This migration restores the essential RLS policies that were removed,
  fixing the "No Questions Available" error and other access issues.
  
  ## Changes:
  1. Questions table policies with direct subscription checks
  2. Team invitations policies
  3. Study assignments policies  
  4. Quiz sessions policies
  
  Note: Using CREATE OR REPLACE and DROP IF EXISTS to handle existing policies
*/

-- ========================================
-- 1. QUESTIONS TABLE POLICIES
-- ========================================

-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can view questions based on their subscription tier" ON questions;
DROP POLICY IF EXISTS "Anonymous users can view free questions" ON questions;
DROP POLICY IF EXISTS "System admins can manage all questions" ON questions;
DROP POLICY IF EXISTS "Users without subscriptions can view free questions" ON questions;

-- Allow users to view questions based on their subscription tier
-- Using direct subscription table lookup instead of function
CREATE POLICY "Users can view questions based on their subscription tier"
  ON questions
  FOR SELECT
  TO authenticated
  USING (
    CASE tier
      WHEN 'free' THEN true
      WHEN 'pro' THEN EXISTS (
        SELECT 1 FROM subscriptions s
        WHERE s.user_id = auth.uid() 
        AND s.status = 'active'
        AND s.plan IN ('pro', 'enterprise')
      )
      WHEN 'enterprise' THEN EXISTS (
        SELECT 1 FROM subscriptions s
        WHERE s.user_id = auth.uid() 
        AND s.status = 'active'
        AND s.plan = 'enterprise'
      )
      ELSE false
    END
  );

-- Allow anonymous users to view free questions
CREATE POLICY "Anonymous users can view free questions"
  ON questions
  FOR SELECT
  TO anon
  USING (tier = 'free');

-- System admins can manage all questions
CREATE POLICY "System admins can manage all questions"
  ON questions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Allow users without subscriptions to view free questions
-- This handles cases where users don't have subscription records yet
CREATE POLICY "Users without subscriptions can view free questions"
  ON questions
  FOR SELECT
  TO authenticated
  USING (
    tier = 'free' AND NOT EXISTS (
      SELECT 1 FROM subscriptions s
      WHERE s.user_id = auth.uid() 
      AND s.status = 'active'
    )
  );

-- ========================================
-- 2. TEAM_INVITATIONS TABLE POLICIES
-- ========================================

-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can view invitations sent to them" ON team_invitations;
DROP POLICY IF EXISTS "Team owners can manage invitations" ON team_invitations;
DROP POLICY IF EXISTS "Invited users can update their invitation status" ON team_invitations;

-- Users can view invitations sent to them
CREATE POLICY "Users can view invitations sent to them"
  ON team_invitations
  FOR SELECT
  TO authenticated
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND status = 'pending'
    AND expires_at > now()
  );

-- Team owners can manage invitations for their teams
CREATE POLICY "Team owners can manage invitations"
  ON team_invitations
  FOR ALL
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

-- Invited users can update their invitation status (accept/decline)
CREATE POLICY "Invited users can update their invitation status"
  ON team_invitations
  FOR UPDATE
  TO authenticated
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND status = 'pending'
    AND expires_at > now()
  )
  WITH CHECK (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND status IN ('accepted', 'declined')
  );

-- ========================================
-- 3. STUDY_ASSIGNMENTS TABLE POLICIES
-- ========================================

-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own assignments" ON study_assignments;
DROP POLICY IF EXISTS "Team owners can manage team assignments" ON study_assignments;
DROP POLICY IF EXISTS "Users can update their own assignment completion" ON study_assignments;

-- Users can view their own assignments
CREATE POLICY "Users can view their own assignments"
  ON study_assignments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Team owners can view and manage all assignments in their teams
CREATE POLICY "Team owners can manage team assignments"
  ON study_assignments
  FOR ALL
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

-- Users can update their own assignment completion status
CREATE POLICY "Users can update their own assignment completion"
  ON study_assignments
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ========================================
-- 4. QUIZ_SESSIONS TABLE POLICIES
-- ========================================

-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can manage their own quiz sessions" ON quiz_sessions;

-- Users can manage their own quiz sessions
CREATE POLICY "Users can manage their own quiz sessions"
  ON quiz_sessions
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

/*
  ## Summary of Restored Policies:
  
  ✅ questions: 
    - Users can view based on subscription tier (direct DB lookup)
    - Anonymous users can view free questions
    - Users without subscriptions can view free questions
    - System admins can manage all questions
    
  ✅ team_invitations: 
    - Users can view their invitations
    - Team owners can manage invitations
    - Users can accept/decline invitations
    
  ✅ study_assignments: 
    - Users can view their own assignments
    - Team owners can manage all team assignments
    - Users can update their completion status
    
  ✅ quiz_sessions: 
    - Users can manage their own quiz sessions
  
  These policies restore the security model while avoiding function dependencies
  and recursion issues that were present in earlier migrations.
*/