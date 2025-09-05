/*
  # Fix RLS Infinite Recursion in Team Policies

  1. Problem
    - Infinite recursion detected in policy for relation "team_members"
    - Caused by circular dependencies between teams and team_members RLS policies

  2. Solution
    - Simplify teams RLS policy to avoid referencing team_members table
    - Use direct user_profiles.team_id check instead of subquery to team_members
    - This breaks the circular dependency while maintaining proper access control

  3. Changes
    - Update teams_select_policy to use user_profiles.team_id directly
    - Remove complex subquery that was causing the recursion
*/

-- Drop and recreate the teams_select_policy to fix infinite recursion
DROP POLICY IF EXISTS "teams_select_policy" ON public.teams;

-- Create a simplified teams select policy that doesn't reference team_members
CREATE POLICY "teams_select_policy"
ON public.teams
FOR SELECT
TO authenticated
USING (
  (owner_id = auth.uid()) OR 
  is_admin() OR 
  (id IN (SELECT team_id FROM user_profiles WHERE id = auth.uid() AND team_id IS NOT NULL))
);

-- Also ensure the team_members policies are not causing recursion
-- Drop and recreate team_members_select_policy with simplified logic
DROP POLICY IF EXISTS "team_members_select_policy" ON public.team_members;

CREATE POLICY "team_members_select_policy"
ON public.team_members
FOR SELECT
TO authenticated
USING (
  (user_id = auth.uid()) OR 
  (team_id IN (SELECT team_id FROM user_profiles WHERE id = auth.uid() AND team_id IS NOT NULL)) OR
  is_admin()
);