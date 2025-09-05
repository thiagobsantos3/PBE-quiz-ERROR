/*
  # Restrict Assignment Updates for Team Members

  1. Security Changes
    - Remove the policy that allows individual users to update their own assignment completion
    - This ensures only team owners and admins can modify assignments
    - Team members can still view their assignments and start quizzes

  2. Policy Updates
    - Keep the policy for team owners/admins to manage assignments
    - Keep the policy for users to view assignments based on team role
    - Remove the policy for users to update their own assignment completion

  This change ensures that:
  - Team members can view their study schedules
  - Team members can start and resume quizzes
  - Only team owners and admins can create, update, or delete assignments
*/

-- Drop the policy that allows users to update their own assignment completion
DROP POLICY IF EXISTS "Users can update their own assignment completion" ON public.study_assignments;

-- The remaining policies will handle:
-- 1. "Users can view assignments based on team role" - allows viewing
-- 2. "Team owners can manage team assignments" - allows full management for owners/admins