-- Fix RLS infinite recursion by introducing SECURITY DEFINER helpers and non-recursive policies
-- This migration safely drops circular policies and recreates them using helper functions
-- that bypass RLS internally.

-- Assumptions:
-- - Function public.is_admin() exists and returns boolean for current user

-- 1) Helper functions (SECURITY DEFINER) to avoid recursive RLS

CREATE OR REPLACE FUNCTION public.can_access_team(p_team_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  membership_exists boolean := false;
  owner_exists boolean := false;
BEGIN
  -- Disable RLS for internal checks in this function only
  PERFORM set_config('row_security', 'off', true);

  -- Check membership
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.user_id = auth.uid()
      AND tm.team_id = p_team_id
      AND (tm.status IS NULL OR tm.status = 'active')
  ) INTO membership_exists;

  -- Check ownership
  SELECT EXISTS (
    SELECT 1
    FROM public.teams t
    WHERE t.id = p_team_id
      AND t.owner_id = auth.uid()
  ) INTO owner_exists;

  RETURN membership_exists OR owner_exists OR COALESCE(is_admin(), false);
END;
$$;

CREATE OR REPLACE FUNCTION public.is_team_owner(p_team_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_exists boolean := false;
BEGIN
  PERFORM set_config('row_security', 'off', true);

  SELECT EXISTS (
    SELECT 1
    FROM public.teams t
    WHERE t.id = p_team_id
      AND t.owner_id = auth.uid()
  ) INTO owner_exists;

  RETURN owner_exists;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_manage_team(p_team_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(is_admin(), false) OR public.is_team_owner(p_team_id);
$$;

-- Grant execute on helper functions
GRANT EXECUTE ON FUNCTION public.can_access_team(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_team_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_team(uuid) TO authenticated;

-- 2) Drop existing policies to avoid conflicts

-- user_profiles
DROP POLICY IF EXISTS users_can_view_own_profile ON public.user_profiles;
DROP POLICY IF EXISTS team_members_can_view_teammates_profiles ON public.user_profiles;
DROP POLICY IF EXISTS admins_can_view_all_profiles ON public.user_profiles;
DROP POLICY IF EXISTS users_can_manage_own_profile ON public.user_profiles;
DROP POLICY IF EXISTS admins_can_manage_all_profiles ON public.user_profiles;

-- team_members
DROP POLICY IF EXISTS users_can_view_own_team_member_entry ON public.team_members;
DROP POLICY IF EXISTS team_members_can_view_teammates_entries ON public.team_members;
DROP POLICY IF EXISTS admins_can_manage_team_members ON public.team_members;

-- teams
DROP POLICY IF EXISTS users_can_view_their_team ON public.teams;
DROP POLICY IF EXISTS admins_can_view_all_teams ON public.teams;
DROP POLICY IF EXISTS owners_can_manage_their_team ON public.teams;

-- 3) Recreate non-recursive policies using helper functions

-- user_profiles
CREATE POLICY users_can_view_own_profile
ON public.user_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY team_members_can_view_teammates_profiles
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
  team_id IS NOT NULL AND public.can_access_team(user_profiles.team_id)
);

CREATE POLICY admins_can_view_all_profiles
ON public.user_profiles
FOR SELECT
TO authenticated
USING (is_admin());

CREATE POLICY users_can_manage_own_profile
ON public.user_profiles
FOR ALL
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY admins_can_manage_all_profiles
ON public.user_profiles
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- team_members
CREATE POLICY users_can_view_own_team_member_entry
ON public.team_members
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY team_members_can_view_teammates_entries
ON public.team_members
FOR SELECT
TO authenticated
USING (
  public.can_access_team(team_members.team_id)
);

CREATE POLICY admins_can_manage_team_members
ON public.team_members
FOR ALL
TO authenticated
USING (public.can_manage_team(team_members.team_id))
WITH CHECK (public.can_manage_team(team_members.team_id));

-- teams
CREATE POLICY users_can_view_their_team
ON public.teams
FOR SELECT
TO authenticated
USING (
  public.can_access_team(teams.id)
);

CREATE POLICY admins_can_view_all_teams
ON public.teams
FOR SELECT
TO authenticated
USING (is_admin());

CREATE POLICY owners_can_manage_their_team
ON public.teams
FOR ALL
TO authenticated
USING (public.is_team_owner(teams.id))
WITH CHECK (public.is_team_owner(teams.id));