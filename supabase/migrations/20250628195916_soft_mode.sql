/*
  # Fix RLS Policy Infinite Recursion - Final Solution
  
  This migration completely removes all problematic RLS policies and implements
  simple, non-recursive policies that avoid circular dependencies.
  
  ## Root Cause
  Multiple policies were creating circular dependencies between tables,
  particularly team_members querying itself and cross-references between
  teams and team_members tables.
  
  ## Solution
  - Drop ALL existing problematic policies
  - Implement simple, owner-based policies only
  - Avoid any cross-table references that could cause recursion
*/

-- Step 1: Drop ALL policies on teams table
DROP POLICY IF EXISTS "Users can create teams where they are owner" ON teams;
DROP POLICY IF EXISTS "Users can read teams they own or are members of" ON teams;
DROP POLICY IF EXISTS "Team owners can update their teams" ON teams;
DROP POLICY IF EXISTS "Team owners can delete their teams" ON teams;
DROP POLICY IF EXISTS "Users can read teams they own" ON teams;
DROP POLICY IF EXISTS "Users can read teams they are members of" ON teams;
DROP POLICY IF EXISTS "Team owners only can access teams" ON teams;

-- Step 2: Drop ALL policies on team_members table
DROP POLICY IF EXISTS "Users can read their own team memberships" ON team_members;
DROP POLICY IF EXISTS "Team owners can read all team memberships" ON team_members;
DROP POLICY IF EXISTS "Team owners can invite members" ON team_members;
DROP POLICY IF EXISTS "Team owners and users can update memberships" ON team_members;
DROP POLICY IF EXISTS "Team owners can remove members" ON team_members;
DROP POLICY IF EXISTS "Users can insert themselves as team members when accepting invitations" ON team_members;
DROP POLICY IF EXISTS "Users can read team memberships for their teams" ON team_members;
DROP POLICY IF EXISTS "Team admins can read team memberships" ON team_members;
DROP POLICY IF EXISTS "Users can read their own memberships" ON team_members;
DROP POLICY IF EXISTS "Users can insert their own memberships" ON team_members;
DROP POLICY IF EXISTS "Users can update their own memberships" ON team_members;
DROP POLICY IF EXISTS "Users can delete their own memberships" ON team_members;

-- Step 3: Create ONLY simple, non-recursive policies

-- Teams: Only owners can access (no membership checks to avoid recursion)
CREATE POLICY "Team owners only can access teams"
  ON teams
  FOR ALL
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Team members: Simple policies without cross-references
CREATE POLICY "Users can read their own memberships"
  ON team_members
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own memberships"
  ON team_members
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own memberships"
  ON team_members
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own memberships"
  ON team_members
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Note: This simplified approach means:
-- 1. Only team owners can see/manage teams (not members)
-- 2. Users can only see their own membership records
-- 3. Team management features may need to be handled in application code
-- 4. This prevents ALL recursion issues while maintaining basic security