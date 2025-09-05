/*
  # Fix Study Assignments Policies

  This migration updates the study_assignments table policies to allow proper access
  based on team roles while avoiding syntax errors.

  ## Changes Made:
  1. Drop existing restrictive policies safely
  2. Create comprehensive SELECT policy for team-based access
  3. Recreate UPDATE and management policies with proper permissions
*/

-- Drop existing policies safely
DROP POLICY IF EXISTS "Users can view their own assignments" ON public.study_assignments;
DROP POLICY IF EXISTS "Users can update their own assignment completion" ON public.study_assignments;
DROP POLICY IF EXISTS "Team owners can manage team assignments" ON public.study_assignments;
DROP POLICY IF EXISTS "study_assignments_manage_team_policy" ON public.study_assignments;
DROP POLICY IF EXISTS "study_assignments_select_policy" ON public.study_assignments;
DROP POLICY IF EXISTS "study_assignments_update_own_policy" ON public.study_assignments;

-- Create new comprehensive SELECT policy
CREATE POLICY "study_assignments_select_policy"
ON public.study_assignments FOR SELECT
TO authenticated
USING (
  -- Users can view their own assignments
  user_id = auth.uid()
  OR
  -- Team owners and admins can view all team assignments
  team_id IN (
    SELECT tm.team_id 
    FROM public.team_members tm 
    WHERE tm.user_id = auth.uid() 
    AND tm.status = 'active'
    AND tm.role IN ('owner', 'admin')
  )
);

-- Users can update their own assignment completion status
CREATE POLICY "study_assignments_update_own_policy"
ON public.study_assignments FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Team owners and admins can manage all team assignments
CREATE POLICY "study_assignments_manage_team_policy"
ON public.study_assignments FOR ALL
TO authenticated
USING (
  team_id IN (
    SELECT tm.team_id 
    FROM public.team_members tm 
    WHERE tm.user_id = auth.uid() 
    AND tm.status = 'active'
    AND tm.role IN ('owner', 'admin')
  )
)
WITH CHECK (
  team_id IN (
    SELECT tm.team_id 
    FROM public.team_members tm 
    WHERE tm.user_id = auth.uid() 
    AND tm.status = 'active'
    AND tm.role IN ('owner', 'admin')
  )
);