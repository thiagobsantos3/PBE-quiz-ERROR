-- Migration to fix RLS infinite recursion and ensure proper team visibility
-- This migration will drop existing RLS policies on user_profiles, team_members, and teams
-- and then recreate them with non-recursive, permission-appropriate definitions.

-- IMPORTANT: This script assumes the existence of an 'is_admin()' function
-- and that 'auth.uid()' correctly returns the current user's ID.

-- Set session variables for the migration
SET session_replication_role = replica;
SET check_function_bodies = off;

-- 1. Drop existing RLS policies to avoid conflicts and start fresh
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS users_can_view_own_profile ON public.user_profiles;
DROP POLICY IF EXISTS team_members_can_view_teammates_profiles ON public.user_profiles;
DROP POLICY IF EXISTS admins_can_view_all_profiles ON public.user_profiles;
DROP POLICY IF EXISTS users_can_manage_own_profile ON public.user_profiles;
DROP POLICY IF EXISTS admins_can_manage_all_profiles ON public.user_profiles;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.team_members DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS team_members_delete_admin ON public.team_members;
DROP POLICY IF EXISTS team_members_delete_own ON public.team_members;
DROP POLICY IF EXISTS team_members_insert_admin ON public.team_members;
DROP POLICY IF EXISTS team_members_select_admin ON public.team_members;
DROP POLICY IF EXISTS team_members_select_own ON public.team_members;
DROP POLICY IF EXISTS team_members_update_admin ON public.team_members;
DROP POLICY IF EXISTS team_members_update_own ON public.team_members;
DROP POLICY IF EXISTS users_can_view_own_team_member_entry ON public.team_members;
DROP POLICY IF EXISTS team_members_can_view_teammates_entries ON public.team_members;
DROP POLICY IF EXISTS admins_can_manage_team_members ON public.team_members;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.teams DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS teams_delete_admin ON public.teams;
DROP POLICY IF EXISTS teams_delete_owner ON public.teams;
DROP POLICY IF EXISTS teams_insert_authenticated ON public.teams;
DROP POLICY IF EXISTS teams_select_admin ON public.teams;
DROP POLICY IF EXISTS teams_select_anon_invitation ON public.teams;
DROP POLICY IF EXISTS teams_select_member ON public.teams;
DROP POLICY IF EXISTS teams_select_owner ON public.teams;
DROP POLICY IF EXISTS teams_update_admin ON public.teams;
DROP POLICY IF EXISTS teams_update_owner ON public.teams;
DROP POLICY IF EXISTS users_can_view_their_team ON public.teams;
DROP POLICY IF EXISTS admins_can_view_all_teams ON public.teams;
DROP POLICY IF EXISTS owners_can_manage_their_team ON public.teams;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;


-- 2. Recreate RLS policies with non-recursive, explicit permissions

-- Policies for public.user_profiles
CREATE POLICY "users_can_view_own_profile"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "team_members_can_view_teammates_profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.team_members tm1
    WHERE tm1.user_id = auth.uid()
      AND tm1.team_id = user_profiles.team_id
  )
);

CREATE POLICY "admins_can_view_all_profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (is_admin());

CREATE POLICY "users_can_manage_own_profile"
ON public.user_profiles
FOR ALL
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "admins_can_manage_all_profiles"
ON public.user_profiles
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());


-- Policies for public.team_members
CREATE POLICY "users_can_view_own_team_member_entry"
ON public.team_members
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "team_members_can_view_teammates_entries"
ON public.team_members
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.team_members tm1
    WHERE tm1.user_id = auth.uid()
      AND tm1.team_id = team_members.team_id
  )
);

CREATE POLICY "admins_can_manage_team_members"
ON public.team_members
FOR ALL
TO authenticated
USING (
  is_admin() OR
  EXISTS (
    SELECT 1
    FROM public.teams
    WHERE id = team_members.team_id
      AND owner_id = auth.uid()
  )
)
WITH CHECK (
  is_admin() OR
  EXISTS (
    SELECT 1
    FROM public.teams
    WHERE id = team_members.team_id
      AND owner_id = auth.uid()
  )
);


-- Policies for public.teams
CREATE POLICY "users_can_view_their_team"
ON public.teams
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.team_id = teams.id
      AND tm.user_id = auth.uid()
  )
);

CREATE POLICY "admins_can_view_all_teams"
ON public.teams
FOR SELECT
TO authenticated
USING (is_admin());

CREATE POLICY "owners_can_manage_their_team"
ON public.teams
FOR ALL
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());


-- 3. Recreate the get_team_leaderboard_data function with SECURITY DEFINER
-- This ensures the function bypasses RLS for its internal queries, preventing recursion.
-- It will temporarily disable RLS for the duration of the function's execution.

CREATE OR REPLACE FUNCTION public.get_team_leaderboard_data(
    p_team_id uuid,
    p_start_date timestamp with time zone DEFAULT NULL,
    p_end_date timestamp with time zone DEFAULT NULL
)
RETURNS TABLE (
    user_id uuid,
    user_name text,
    role text,
    total_quizzes_completed bigint,
    total_questions_answered bigint,
    average_score numeric,
    total_time_spent_minutes numeric,
    study_streak integer,
    total_points_earned numeric,
    total_possible_points numeric
)
LANGUAGE plpgsql
SECURITY DEFINER -- Crucial: runs with privileges of the function owner (usually postgres)
AS $function$
DECLARE
    current_report_date DATE;
    team_exists_check BOOLEAN;
BEGIN
  -- Temporarily disable RLS for the function's execution
  SET LOCAL row_security.enable = off;

  current_report_date := COALESCE(DATE(p_end_date AT TIME ZONE 'Europe/London'), DATE(NOW() AT TIME ZONE 'Europe/London'));

  -- Check if the team exists (this check will now bypass RLS due to SECURITY DEFINER)
  SELECT EXISTS (SELECT 1 FROM public.teams WHERE id = p_team_id) INTO team_exists_check;

  IF NOT team_exists_check THEN
      RAISE EXCEPTION 'Team with ID % does not exist.';
  END IF;

  RETURN QUERY
  SELECT
    tm.user_id,
    COALESCE(p.name, p.email) as user_name,
    tm.role,
    COUNT(qs.id) as total_quizzes_completed,
    COALESCE(SUM(
      CASE
        WHEN qs.results IS NOT NULL AND jsonb_typeof(qs.results) = 'array' THEN jsonb_array_length(qs.results)
        ELSE 0
      END
    ), 0) as total_questions_answered,
    CASE
      WHEN COALESCE(SUM(qs.max_points), 0) > 0 THEN
        ROUND(COALESCE(SUM(qs.total_points), 0) * 100.0 / COALESCE(SUM(qs.max_points), 0), 2)
      ELSE 0
    END as average_score,
    COALESCE(
      SUM(
        CASE
          WHEN qs.total_actual_time_spent_seconds > 0 THEN qs.total_actual_time_spent_seconds / 60.0
          ELSE GREATEST(1,
            CASE
              WHEN qs.questions IS NOT NULL AND jsonb_typeof(qs.questions) = 'array' THEN jsonb_array_length(qs.questions) * 2
              ELSE 2
            END
          )
        END
      ), 0
    ) as total_time_spent_minutes,
    (
        WITH user_completed_dates AS (
            SELECT DISTINCT DATE(qs_inner.completed_at AT TIME ZONE 'Europe/London') AS quiz_date
            FROM public.quiz_sessions qs_inner
            WHERE qs_inner.user_id = tm.user_id
              AND qs_inner.status = 'completed'
              AND qs_inner.approval_status = 'approved'
        ),
        dated_series AS (
            SELECT
                quiz_date,
                (current_report_date - quiz_date) AS days_ago
            FROM user_completed_dates
            ORDER BY quiz_date DESC
        ),
        most_recent_date AS (
            SELECT quiz_date
            FROM dated_series
            ORDER BY quiz_date DESC
            LIMIT 1
        ),
        streak_calculation AS (
            SELECT
                quiz_date,
                days_ago,
                (days_ago - ROW_NUMBER() OVER (ORDER BY quiz_date DESC)) AS streak_group
            FROM dated_series
        )
        SELECT
            CASE
                WHEN mrd.quiz_date = current_report_date OR mrd.quiz_date = current_report_date - INTERVAL '1 day' THEN
                    (SELECT COUNT(*)
                     FROM streak_calculation sc1
                     WHERE sc1.streak_group = (
                         SELECT sc2.streak_group
                         FROM streak_calculation sc2
                         WHERE sc2.quiz_date = mrd.quiz_date
                     ))
                ELSE 0
            END
        FROM most_recent_date mrd
    )::integer AS study_streak,
    COALESCE(SUM(qs.total_points), 0)::numeric as total_points_earned,
    COALESCE(SUM(qs.max_points), 0)::numeric as total_possible_points
  FROM public.team_members tm
  JOIN public.user_profiles p ON tm.user_id = p.id
  LEFT JOIN public.quiz_sessions qs ON tm.user_id = qs.user_id
  WHERE tm.team_id = p_team_id
    AND qs.status = 'completed'
    AND qs.approval_status = 'approved'
    AND (p_start_date IS NULL OR qs.completed_at >= p_start_date)
    AND (p_end_date IS NULL OR qs.completed_at <= p_end_date)
  GROUP BY tm.user_id, p.name, p.email, tm.role
  ORDER BY total_points_earned DESC, average_score DESC;

  -- Re-enable RLS for the session
  SET LOCAL row_security.enable = on;
END;
$function$;

-- Reset session variables
RESET session_replication_role;
RESET check_function_bodies;