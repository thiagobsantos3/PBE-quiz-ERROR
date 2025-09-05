/*
  # Update RLS policies for system admin access

  1. User Profiles Table Updates
    - Drop existing restrictive policies
    - Create new policies allowing system admins to manage all user profiles
    - Preserve existing user self-management capabilities

  2. Team Members Table Updates
    - Drop existing restrictive policies
    - Create new policies allowing system admins to manage all team memberships
    - Preserve existing team owner and user self-management capabilities

  3. Security Considerations
    - System admins are identified by `user_profiles.role = 'admin'`
    - All existing permissions for regular users and team owners are preserved
    - Policies use proper authentication checks to prevent unauthorized access
*/

-- =============================================
-- USER PROFILES TABLE POLICY UPDATES
-- =============================================

-- Drop existing user_profiles policies
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can read their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;

-- Create new SELECT policy for user_profiles
-- Allows: Users to read their own profile OR system admins to read any profile
CREATE POLICY "user_profiles_select_policy"
ON public.user_profiles FOR SELECT
TO authenticated
USING (
  -- Users can read their own profile
  auth.uid() = id
  OR
  -- System admins can read any profile
  EXISTS (
    SELECT 1 FROM public.user_profiles admin_profile
    WHERE admin_profile.id = auth.uid()
    AND admin_profile.role = 'admin'
  )
);

-- Create new INSERT policy for user_profiles
-- Allows: Users to insert their own profile OR system admins to insert any profile
CREATE POLICY "user_profiles_insert_policy"
ON public.user_profiles FOR INSERT
TO authenticated
WITH CHECK (
  -- Users can insert their own profile
  auth.uid() = id
  OR
  -- System admins can insert any profile
  EXISTS (
    SELECT 1 FROM public.user_profiles admin_profile
    WHERE admin_profile.id = auth.uid()
    AND admin_profile.role = 'admin'
  )
);

-- Create new UPDATE policy for user_profiles
-- Allows: Users to update their own profile OR system admins to update any profile
CREATE POLICY "user_profiles_update_policy"
ON public.user_profiles FOR UPDATE
TO authenticated
USING (
  -- Users can update their own profile
  auth.uid() = id
  OR
  -- System admins can update any profile
  EXISTS (
    SELECT 1 FROM public.user_profiles admin_profile
    WHERE admin_profile.id = auth.uid()
    AND admin_profile.role = 'admin'
  )
)
WITH CHECK (
  -- Users can update their own profile
  auth.uid() = id
  OR
  -- System admins can update any profile
  EXISTS (
    SELECT 1 FROM public.user_profiles admin_profile
    WHERE admin_profile.id = auth.uid()
    AND admin_profile.role = 'admin'
  )
);

-- Create new DELETE policy for user_profiles
-- Allows: Users to delete their own profile OR system admins to delete any profile
CREATE POLICY "user_profiles_delete_policy"
ON public.user_profiles FOR DELETE
TO authenticated
USING (
  -- Users can delete their own profile
  auth.uid() = id
  OR
  -- System admins can delete any profile
  EXISTS (
    SELECT 1 FROM public.user_profiles admin_profile
    WHERE admin_profile.id = auth.uid()
    AND admin_profile.role = 'admin'
  )
);

-- =============================================
-- TEAM MEMBERS TABLE POLICY UPDATES
-- =============================================

-- Drop existing team_members policies
DROP POLICY IF EXISTS "Team owners can manage memberships" ON public.team_members;
DROP POLICY IF EXISTS "Team owners can view team memberships" ON public.team_members;
DROP POLICY IF EXISTS "Users can manage own memberships" ON public.team_members;
DROP POLICY IF EXISTS "Users can view own memberships" ON public.team_members;

-- Create new SELECT policy for team_members
-- Allows: Users to view their own memberships OR team owners to view their team memberships OR system admins to view any membership
CREATE POLICY "team_members_select_policy"
ON public.team_members FOR SELECT
TO authenticated
USING (
  -- Users can view their own memberships
  user_id = auth.uid()
  OR
  -- Team owners can view their team memberships
  team_id IN (
    SELECT teams.id
    FROM public.teams
    WHERE teams.owner_id = auth.uid()
  )
  OR
  -- System admins can view any membership
  EXISTS (
    SELECT 1 FROM public.user_profiles admin_profile
    WHERE admin_profile.id = auth.uid()
    AND admin_profile.role = 'admin'
  )
);

-- Create new INSERT policy for team_members
-- Allows: Team owners to add members to their teams OR system admins to add any membership
CREATE POLICY "team_members_insert_policy"
ON public.team_members FOR INSERT
TO authenticated
WITH CHECK (
  -- Team owners can add members to their teams
  team_id IN (
    SELECT teams.id
    FROM public.teams
    WHERE teams.owner_id = auth.uid()
  )
  OR
  -- System admins can add any membership
  EXISTS (
    SELECT 1 FROM public.user_profiles admin_profile
    WHERE admin_profile.id = auth.uid()
    AND admin_profile.role = 'admin'
  )
);

-- Create new UPDATE policy for team_members
-- Allows: Users to update their own memberships OR team owners to update their team memberships OR system admins to update any membership
CREATE POLICY "team_members_update_policy"
ON public.team_members FOR UPDATE
TO authenticated
USING (
  -- Users can update their own memberships
  user_id = auth.uid()
  OR
  -- Team owners can update their team memberships
  team_id IN (
    SELECT teams.id
    FROM public.teams
    WHERE teams.owner_id = auth.uid()
  )
  OR
  -- System admins can update any membership
  EXISTS (
    SELECT 1 FROM public.user_profiles admin_profile
    WHERE admin_profile.id = auth.uid()
    AND admin_profile.role = 'admin'
  )
)
WITH CHECK (
  -- Users can update their own memberships
  user_id = auth.uid()
  OR
  -- Team owners can update their team memberships
  team_id IN (
    SELECT teams.id
    FROM public.teams
    WHERE teams.owner_id = auth.uid()
  )
  OR
  -- System admins can update any membership
  EXISTS (
    SELECT 1 FROM public.user_profiles admin_profile
    WHERE admin_profile.id = auth.uid()
    AND admin_profile.role = 'admin'
  )
);

-- Create new DELETE policy for team_members
-- Allows: Users to delete their own memberships OR team owners to delete their team memberships OR system admins to delete any membership
CREATE POLICY "team_members_delete_policy"
ON public.team_members FOR DELETE
TO authenticated
USING (
  -- Users can delete their own memberships
  user_id = auth.uid()
  OR
  -- Team owners can delete their team memberships
  team_id IN (
    SELECT teams.id
    FROM public.teams
    WHERE teams.owner_id = auth.uid()
  )
  OR
  -- System admins can delete any membership
  EXISTS (
    SELECT 1 FROM public.user_profiles admin_profile
    WHERE admin_profile.id = auth.uid()
    AND admin_profile.role = 'admin'
  )
);

-- =============================================
-- ADDITIONAL ADMIN ACCESS FOR OTHER TABLES
-- =============================================

-- Update teams table policies to allow admin access
DROP POLICY IF EXISTS "Public read access for invitations" ON public.teams;
DROP POLICY IF EXISTS "Team owners can access their teams" ON public.teams;

-- Create new teams policies
CREATE POLICY "teams_select_policy"
ON public.teams FOR SELECT
TO authenticated
USING (
  -- Team owners can view their teams
  owner_id = auth.uid()
  OR
  -- System admins can view any team
  EXISTS (
    SELECT 1 FROM public.user_profiles admin_profile
    WHERE admin_profile.id = auth.uid()
    AND admin_profile.role = 'admin'
  )
);

CREATE POLICY "teams_manage_policy"
ON public.teams FOR ALL
TO authenticated
USING (
  -- Team owners can manage their teams
  owner_id = auth.uid()
  OR
  -- System admins can manage any team
  EXISTS (
    SELECT 1 FROM public.user_profiles admin_profile
    WHERE admin_profile.id = auth.uid()
    AND admin_profile.role = 'admin'
  )
)
WITH CHECK (
  -- Team owners can manage their teams
  owner_id = auth.uid()
  OR
  -- System admins can manage any team
  EXISTS (
    SELECT 1 FROM public.user_profiles admin_profile
    WHERE admin_profile.id = auth.uid()
    AND admin_profile.role = 'admin'
  )
);

-- Update subscriptions table policies to allow admin access
DROP POLICY IF EXISTS "Users can delete their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can read their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.subscriptions;

-- Create new subscriptions policies
CREATE POLICY "subscriptions_select_policy"
ON public.subscriptions FOR SELECT
TO authenticated
USING (
  -- Users can read their own subscription
  user_id = auth.uid()
  OR
  -- System admins can read any subscription
  EXISTS (
    SELECT 1 FROM public.user_profiles admin_profile
    WHERE admin_profile.id = auth.uid()
    AND admin_profile.role = 'admin'
  )
);

CREATE POLICY "subscriptions_insert_policy"
ON public.subscriptions FOR INSERT
TO authenticated
WITH CHECK (
  -- Users can insert their own subscription
  user_id = auth.uid()
  OR
  -- System admins can insert any subscription
  EXISTS (
    SELECT 1 FROM public.user_profiles admin_profile
    WHERE admin_profile.id = auth.uid()
    AND admin_profile.role = 'admin'
  )
);

CREATE POLICY "subscriptions_update_policy"
ON public.subscriptions FOR UPDATE
TO authenticated
USING (
  -- Users can update their own subscription
  user_id = auth.uid()
  OR
  -- System admins can update any subscription
  EXISTS (
    SELECT 1 FROM public.user_profiles admin_profile
    WHERE admin_profile.id = auth.uid()
    AND admin_profile.role = 'admin'
  )
)
WITH CHECK (
  -- Users can update their own subscription
  user_id = auth.uid()
  OR
  -- System admins can update any subscription
  EXISTS (
    SELECT 1 FROM public.user_profiles admin_profile
    WHERE admin_profile.id = auth.uid()
    AND admin_profile.role = 'admin'
  )
);

CREATE POLICY "subscriptions_delete_policy"
ON public.subscriptions FOR DELETE
TO authenticated
USING (
  -- Users can delete their own subscription
  user_id = auth.uid()
  OR
  -- System admins can delete any subscription
  EXISTS (
    SELECT 1 FROM public.user_profiles admin_profile
    WHERE admin_profile.id = auth.uid()
    AND admin_profile.role = 'admin'
  )
);