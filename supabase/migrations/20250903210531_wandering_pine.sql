/*
  # Fix Teams RLS Policy for Team Members

  1. Policy Changes
    - Update teams_select_policy to allow team members to view their own team
    - Ensures team members can access leaderboard functionality

  2. Function Restoration
    - Revert get_team_leaderboard_data function to original state
    - Remove debug columns and restore exception handling
*/

-- First, drop the current debug version of the function
DROP FUNCTION IF EXISTS public.get_team_leaderboard_data(uuid, timestamp with time zone, timestamp with time zone);

-- Update the teams RLS policy to allow team members to view their own team
DROP POLICY IF EXISTS "teams_select_policy" ON public.teams;

CREATE POLICY "teams_select_policy"
ON public.teams
FOR SELECT
TO authenticated
USING (
  (owner_id = auth.uid()) OR 
  is_admin() OR
  (id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid() AND status = 'active'))
);

-- Recreate the original get_team_leaderboard_data function without debug columns
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
AS $function$
DECLARE
    current_report_date DATE;
    team_exists_check BOOLEAN;
BEGIN
  SET LOCAL row_security.enable = off;

  current_report_date := COALESCE(DATE(p_end_date AT TIME ZONE 'Europe/London'), DATE(NOW() AT TIME ZONE 'Europe/London'));

  SELECT EXISTS (SELECT 1 FROM public.teams WHERE id = p_team_id) INTO team_exists_check;

  IF NOT team_exists_check THEN
      RAISE EXCEPTION 'Team with ID % does not exist.', p_team_id;
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

  SET LOCAL row_security.enable = on;
END;
$function$;