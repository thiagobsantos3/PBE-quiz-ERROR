-- Ensure bonus_xp is included in points totals for analytics and leaderboard

-- 1) Update get_user_analytics_data totals to include bonus_xp
CREATE OR REPLACE FUNCTION public.get_user_analytics_data(
  p_user_id UUID,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
  total_quizzes_completed BIGINT,
  total_questions_answered BIGINT,
  average_score NUMERIC,
  total_time_spent_minutes BIGINT,
  study_streak INTEGER,
  total_points_earned BIGINT,
  total_possible_points BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date TIMESTAMP WITH TIME ZONE;
  v_end_date TIMESTAMP WITH TIME ZONE;
BEGIN
  v_start_date := COALESCE(p_start_date, NOW() - INTERVAL '30 days');
  v_end_date := COALESCE(p_end_date, NOW());

  RETURN QUERY
  WITH filtered AS (
    SELECT *
    FROM public.quiz_sessions
    WHERE user_id = p_user_id
      AND status = 'completed'
      AND completed_at BETWEEN v_start_date AND v_end_date
  )
  SELECT
    COUNT(*)::bigint,
    COALESCE(SUM(
      CASE WHEN results IS NOT NULL AND jsonb_typeof(results) = 'array'
           THEN jsonb_array_length(results)
           ELSE 0 END
    ), 0)::bigint,
    CASE WHEN COALESCE(SUM(max_points), 0) > 0
         THEN ROUND(COALESCE(SUM(total_points), 0) * 100.0 / COALESCE(SUM(max_points), 0), 2)
         ELSE 0 END,
    COALESCE(SUM(
      CASE WHEN total_actual_time_spent_seconds IS NOT NULL AND total_actual_time_spent_seconds > 0
           THEN (total_actual_time_spent_seconds / 60)
           WHEN estimated_minutes IS NOT NULL AND estimated_minutes > 0
           THEN estimated_minutes
           ELSE GREATEST(1,
             CASE WHEN questions IS NOT NULL AND jsonb_typeof(questions) = 'array'
                  THEN jsonb_array_length(questions) * 2
                  ELSE 2 END)
      END
    ), 0)::bigint,
    (
      WITH daily_activity AS (
        SELECT DISTINCT DATE(completed_at) AS study_date
        FROM filtered
      ),
      streak_calc AS (
        SELECT
          study_date,
          ROW_NUMBER() OVER (ORDER BY study_date DESC) AS rn,
          study_date - (ROW_NUMBER() OVER (ORDER BY study_date DESC) || ' days')::INTERVAL AS grp
        FROM daily_activity
      )
      SELECT COALESCE(COUNT(*), 0)
      FROM streak_calc
      WHERE grp = (SELECT grp FROM streak_calc ORDER BY study_date DESC LIMIT 1)
    )::integer,
    -- total_points_earned includes bonus_xp
    COALESCE(SUM(total_points + COALESCE(bonus_xp, 0)), 0)::bigint,
    COALESCE(SUM(max_points), 0)::bigint
  FROM filtered;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_analytics_data(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;

-- 2) Update get_team_leaderboard_data to include bonus_xp in totals
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
SECURITY DEFINER
SET search_path = public
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
    COALESCE(SUM(
      CASE
        WHEN qs.status = 'completed'
         AND qs.approval_status = 'approved'
         AND (p_start_date IS NULL OR qs.completed_at >= p_start_date)
         AND (p_end_date IS NULL OR qs.completed_at <= p_end_date)
        THEN 1 ELSE 0
      END
    ), 0)::bigint as total_quizzes_completed,
    COALESCE(SUM(
      CASE
        WHEN qs.status = 'completed'
         AND qs.approval_status = 'approved'
         AND (p_start_date IS NULL OR qs.completed_at >= p_start_date)
         AND (p_end_date IS NULL OR qs.completed_at <= p_end_date)
         AND qs.results IS NOT NULL
         AND jsonb_typeof(qs.results) = 'array'
        THEN jsonb_array_length(qs.results)
        ELSE 0
      END
    ), 0) as total_questions_answered,
    CASE
      WHEN COALESCE(SUM(
        CASE
          WHEN qs.status = 'completed'
           AND qs.approval_status = 'approved'
           AND (p_start_date IS NULL OR qs.completed_at >= p_start_date)
           AND (p_end_date IS NULL OR qs.completed_at <= p_end_date)
          THEN qs.max_points ELSE 0
        END
      ), 0) > 0 THEN
        ROUND(
          COALESCE(SUM(
            CASE
              WHEN qs.status = 'completed'
               AND qs.approval_status = 'approved'
               AND (p_start_date IS NULL OR qs.completed_at >= p_start_date)
               AND (p_end_date IS NULL OR qs.completed_at <= p_end_date)
              THEN qs.total_points ELSE 0
            END
          ), 0) * 100.0 /
          COALESCE(SUM(
            CASE
              WHEN qs.status = 'completed'
               AND qs.approval_status = 'approved'
               AND (p_start_date IS NULL OR qs.completed_at >= p_start_date)
               AND (p_end_date IS NULL OR qs.completed_at <= p_end_date)
              THEN qs.max_points ELSE 0
            END
          ), 0)
        , 2)
      ELSE 0
    END as average_score,
    COALESCE(
      SUM(
        CASE
          WHEN qs.status = 'completed'
           AND qs.approval_status = 'approved'
           AND (p_start_date IS NULL OR qs.completed_at >= p_start_date)
           AND (p_end_date IS NULL OR qs.completed_at <= p_end_date)
          THEN CASE
            WHEN qs.total_actual_time_spent_seconds > 0 THEN qs.total_actual_time_spent_seconds / 60.0
            ELSE GREATEST(1,
              CASE
                WHEN qs.questions IS NOT NULL AND jsonb_typeof(qs.questions) = 'array' THEN jsonb_array_length(qs.questions) * 2
                ELSE 2
              END
            )
          END
          ELSE 0
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
              AND (p_start_date IS NULL OR qs_inner.completed_at >= p_start_date)
              AND (p_end_date IS NULL OR qs_inner.completed_at <= p_end_date)
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
    -- Include bonus_xp in total points earned
    COALESCE(SUM(
      CASE
        WHEN qs.status = 'completed'
         AND qs.approval_status = 'approved'
         AND (p_start_date IS NULL OR qs.completed_at >= p_start_date)
         AND (p_end_date IS NULL OR qs.completed_at <= p_end_date)
        THEN qs.total_points + COALESCE(qs.bonus_xp, 0) ELSE 0
      END
    ), 0)::numeric as total_points_earned,
    COALESCE(SUM(
      CASE
        WHEN qs.status = 'completed'
         AND qs.approval_status = 'approved'
         AND (p_start_date IS NULL OR qs.completed_at >= p_start_date)
         AND (p_end_date IS NULL OR qs.completed_at <= p_end_date)
        THEN qs.max_points ELSE 0
      END
    ), 0)::numeric as total_possible_points
  FROM public.team_members tm
  JOIN public.user_profiles p ON tm.user_id = p.id
  LEFT JOIN public.quiz_sessions qs ON tm.user_id = qs.user_id
  WHERE tm.team_id = p_team_id
  GROUP BY tm.user_id, p.name, p.email, tm.role
  ORDER BY total_points_earned DESC, average_score DESC;

  SET LOCAL row_security.enable = on;
END;
$function$;