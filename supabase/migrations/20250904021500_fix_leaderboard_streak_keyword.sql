-- Fix reserved-word usage and compute current streak contiguously from today/yesterday

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
    total_time_spent_minutes integer,
    study_streak integer,
    total_points_earned numeric,
    total_possible_points numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    current_report_date DATE := COALESCE(DATE(p_end_date AT TIME ZONE 'Europe/London'), DATE(NOW() AT TIME ZONE 'Europe/London'));
BEGIN
  SET LOCAL row_security = off;

  RETURN QUERY
  SELECT
    tm.user_id,
    COALESCE(p.name, p.email) as user_name,
    tm.role,
    COALESCE(SUM(
      CASE WHEN qs.status = 'completed'
             AND qs.approval_status = 'approved'
             AND (p_start_date IS NULL OR qs.completed_at >= p_start_date)
             AND (p_end_date IS NULL OR qs.completed_at <= p_end_date)
           THEN 1 ELSE 0 END
    ), 0)::bigint AS total_quizzes_completed,
    COALESCE(SUM(
      CASE WHEN qs.status = 'completed'
             AND qs.approval_status = 'approved'
             AND (p_start_date IS NULL OR qs.completed_at >= p_start_date)
             AND (p_end_date IS NULL OR qs.completed_at <= p_end_date)
             AND qs.results IS NOT NULL AND jsonb_typeof(qs.results) = 'array'
           THEN jsonb_array_length(qs.results) ELSE 0 END
    ), 0) AS total_questions_answered,
    CASE WHEN COALESCE(SUM(
      CASE WHEN qs.status = 'completed'
             AND qs.approval_status = 'approved'
             AND (p_start_date IS NULL OR qs.completed_at >= p_start_date)
             AND (p_end_date IS NULL OR qs.completed_at <= p_end_date)
           THEN qs.max_points ELSE 0 END
    ), 0) > 0
    THEN ROUND(
      COALESCE(SUM(
        CASE WHEN qs.status = 'completed'
               AND qs.approval_status = 'approved'
               AND (p_start_date IS NULL OR qs.completed_at >= p_start_date)
               AND (p_end_date IS NULL OR qs.completed_at <= p_end_date)
             THEN qs.total_points ELSE 0 END
      ), 0) * 100.0 /
      COALESCE(SUM(
        CASE WHEN qs.status = 'completed'
               AND qs.approval_status = 'approved'
               AND (p_start_date IS NULL OR qs.completed_at >= p_start_date)
               AND (p_end_date IS NULL OR qs.completed_at <= p_end_date)
             THEN qs.max_points ELSE 0 END
      ), 0)
    , 2) ELSE 0 END AS average_score,
    COALESCE(ROUND(SUM(
      CASE WHEN qs.status = 'completed'
             AND qs.approval_status = 'approved'
             AND (p_start_date IS NULL OR qs.completed_at >= p_start_date)
             AND (p_end_date IS NULL OR qs.completed_at <= p_end_date)
           THEN CASE
             WHEN qs.total_actual_time_spent_seconds > 0 THEN qs.total_actual_time_spent_seconds / 60.0
             ELSE GREATEST(1, CASE WHEN qs.questions IS NOT NULL AND jsonb_typeof(qs.questions) = 'array' THEN jsonb_array_length(qs.questions) * 2 ELSE 2 END)
           END
           ELSE 0 END
    )), 0)::integer AS total_time_spent_minutes,
    (
      WITH daily AS (
        SELECT DISTINCT DATE(qs2.completed_at AT TIME ZONE 'Europe/London') AS quiz_date
        FROM public.quiz_sessions qs2
        WHERE qs2.user_id = tm.user_id
          AND qs2.status = 'completed'
          AND qs2.approval_status = 'approved'
          AND (p_start_date IS NULL OR qs2.completed_at >= p_start_date)
          AND (p_end_date IS NULL OR qs2.completed_at <= p_end_date)
      ), anchor AS (
        SELECT MAX(quiz_date) AS start_date FROM daily
      ), ordered AS (
        SELECT d.quiz_date, ROW_NUMBER() OVER (ORDER BY d.quiz_date DESC) AS rn
        FROM daily d, anchor a
        WHERE d.quiz_date <= a.start_date
      )
      SELECT CASE
        WHEN (SELECT start_date FROM anchor) IN (current_report_date, current_report_date - INTERVAL '1 day') THEN (
          SELECT COUNT(*) FROM ordered o, anchor a
          WHERE o.quiz_date = a.start_date - (o.rn - 1) * INTERVAL '1 day'
        )
        ELSE 0
      END
    )::integer AS study_streak,
    COALESCE(SUM(
      CASE WHEN qs.status = 'completed'
             AND qs.approval_status = 'approved'
             AND (p_start_date IS NULL OR qs.completed_at >= p_start_date)
             AND (p_end_date IS NULL OR qs.completed_at <= p_end_date)
           THEN qs.total_points + COALESCE(qs.bonus_xp, 0) ELSE 0 END
    ), 0)::numeric AS total_points_earned,
    COALESCE(SUM(
      CASE WHEN qs.status = 'completed'
             AND qs.approval_status = 'approved'
             AND (p_start_date IS NULL OR qs.completed_at >= p_start_date)
             AND (p_end_date IS NULL OR qs.completed_at <= p_end_date)
           THEN qs.max_points ELSE 0 END
    ), 0)::numeric AS total_possible_points
  FROM public.team_members tm
  JOIN public.user_profiles p ON tm.user_id = p.id
  LEFT JOIN public.quiz_sessions qs ON tm.user_id = qs.user_id
  WHERE tm.team_id = p_team_id
  GROUP BY tm.user_id, p.name, p.email, tm.role
  ORDER BY total_points_earned DESC, average_score DESC;

  SET LOCAL row_security = on;
END;
$function$;