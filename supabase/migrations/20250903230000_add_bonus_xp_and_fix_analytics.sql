-- Add missing bonus_xp column and harden analytics function

-- 1) Add bonus_xp column if missing
ALTER TABLE public.quiz_sessions
ADD COLUMN IF NOT EXISTS bonus_xp integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.quiz_sessions.bonus_xp IS 'Bonus XP awarded for special conditions (e.g., on-time study schedule completion).';

-- 2) Update analytics function to guard jsonb_array_length and prefer actual time
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
    -- total_quizzes_completed
    COUNT(*)::bigint,
    -- total_questions_answered (guard results type)
    COALESCE(SUM(
      CASE WHEN results IS NOT NULL AND jsonb_typeof(results) = 'array'
           THEN jsonb_array_length(results)
           ELSE 0 END
    ), 0)::bigint,
    -- average_score
    CASE WHEN COALESCE(SUM(max_points), 0) > 0
         THEN ROUND(COALESCE(SUM(total_points), 0) * 100.0 / COALESCE(SUM(max_points), 0), 2)
         ELSE 0 END,
    -- total_time_spent_minutes prefers actual time if available
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
    -- study_streak
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
    -- total_points_earned
    COALESCE(SUM(total_points), 0)::bigint,
    -- total_possible_points
    COALESCE(SUM(max_points), 0)::bigint
  FROM filtered;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_analytics_data(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;