/*
  # Fix study assignments RLS policies

  1. Security Updates
    - Update RLS policies to allow team owners and admins to view all team assignments
    - Maintain existing policies for users to view their own assignments
    - Ensure proper access control for different team roles

  2. Changes
    - Drop existing restrictive SELECT policy
    - Create new comprehensive SELECT policy for team-based access
    - Recreate UPDATE and ALL policies with proper syntax
*/

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view their own assignments" ON public.study_assignments;
DROP POLICY IF EXISTS "Users can update their own assignment completion" ON public.study_assignments;
DROP POLICY IF EXISTS "Team owners can manage team assignments" ON public.study_assignments;

-- Create new comprehensive SELECT policy
CREATE POLICY "Users can view assignments based on team role"
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

-- Users can update their own assignment completion
CREATE POLICY "Users can update their own assignment completion"
ON public.study_assignments FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Team owners and admins can manage team assignments
CREATE POLICY "Team owners can manage team assignments"
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