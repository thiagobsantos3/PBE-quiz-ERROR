/*
  # Fix Recursive RLS Policy on team_members

  The issue is that the "Team admins can read team memberships" policy
  is querying team_members from within a policy on team_members itself,
  causing infinite recursion.

  Solution: Remove the recursive policy and use a simpler approach
  that doesn't create circular dependencies.
*/

-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Team admins can read team memberships" ON team_members;

-- Instead of trying to check admin status within the policy,
-- we'll rely on the existing policies which are sufficient:
-- 1. "Users can read their own team memberships" - users see their own records
-- 2. "Team owners can read all team memberships" - owners see all team records

-- If you need team admins (non-owners) to see team memberships,
-- handle this in your application code by:
-- 1. First checking if the user is an admin in the team
-- 2. Then fetching team memberships if they have admin rights

-- This approach avoids RLS recursion while maintaining security