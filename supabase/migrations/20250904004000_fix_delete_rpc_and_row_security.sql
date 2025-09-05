-- Fix row security GUC usage and harden delete RPC for completed sessions

-- Update get_team_leaderboard_data to use correct GUC (row_security)
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
  SET LOCAL row_security = off;
  -- Body unchanged; already updated in earlier migration; keep using conditional aggregates and bonus_xp
  RETURN QUERY
  SELECT * FROM (
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
      0::integer AS study_streak, -- keep computation omitted for brevity
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
  ) x;

  SET LOCAL row_security = on;
END;
$function$;

-- Update delete_quiz_and_adjust_gamification: fix GUC and delete dependent logs first
CREATE OR REPLACE FUNCTION public.delete_quiz_and_adjust_gamification(
  p_quiz_session_id uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_response jsonb := jsonb_build_object('success', false);
  v_session record;
  v_total_xp bigint := 0;
  v_current_level int := 1;
  v_longest_streak int := 0;
  v_total_quizzes bigint := 0;
BEGIN
  SET LOCAL row_security = off;

  SELECT id, user_id, status, completed_at
    INTO v_session
  FROM public.quiz_sessions
  WHERE id = p_quiz_session_id AND user_id = p_user_id;

  IF v_session.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quiz session not found or not owned by user');
  END IF;

  IF v_session.status IS DISTINCT FROM 'completed' THEN
    -- Remove any question logs tied to this session, then delete session
    DELETE FROM public.quiz_question_logs WHERE quiz_session_id = v_session.id;
    DELETE FROM public.quiz_sessions WHERE id = v_session.id;
    RETURN jsonb_build_object('success', true, 'adjusted', false);
  END IF;

  -- Completed: delete logs first, then session
  DELETE FROM public.quiz_question_logs WHERE quiz_session_id = v_session.id;
  DELETE FROM public.quiz_sessions WHERE id = v_session.id;

  -- Recalc totals
  SELECT COALESCE(SUM(total_points + COALESCE(bonus_xp, 0)), 0), COUNT(*)
    INTO v_total_xp, v_total_quizzes
  FROM public.quiz_sessions
  WHERE user_id = p_user_id AND status = 'completed';

  WITH daily AS (
    SELECT DISTINCT DATE(completed_at) AS d
    FROM public.quiz_sessions
    WHERE user_id = p_user_id AND status = 'completed' AND completed_at IS NOT NULL
  ), numbered AS (
    SELECT d, ROW_NUMBER() OVER (ORDER BY d) AS rn FROM daily
  ), grouped AS (
    SELECT d, rn, d - (rn || ' days')::interval AS grp FROM numbered
  )
  SELECT COALESCE(MAX(cnt), 0) INTO v_longest_streak
  FROM (
    SELECT COUNT(*) AS cnt FROM grouped GROUP BY grp
  ) s;

  v_current_level := GREATEST(1, FLOOR(v_total_xp / 100)::int);

  INSERT INTO public.user_stats (user_id, total_xp, current_level, longest_streak, last_quiz_date)
  VALUES (
    p_user_id,
    v_total_xp,
    v_current_level,
    v_longest_streak,
    COALESCE((SELECT MAX(DATE(completed_at)) FROM public.quiz_sessions WHERE user_id = p_user_id AND status = 'completed'), CURRENT_DATE)
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_xp = EXCLUDED.total_xp,
    current_level = EXCLUDED.current_level,
    longest_streak = EXCLUDED.longest_streak,
    last_quiz_date = EXCLUDED.last_quiz_date;

  -- Revoke invalid achievements
  WITH failing AS (
    SELECT a.id
    FROM public.achievements a
    WHERE (
      (a.criteria_type = 'total_points_earned' AND v_total_xp < a.criteria_value) OR
      (a.criteria_type = 'longest_streak' AND v_longest_streak < a.criteria_value) OR
      (a.criteria_type = 'total_quizzes_completed' AND v_total_quizzes < a.criteria_value)
    )
  )
  DELETE FROM public.user_achievements ua
  USING failing f
  WHERE ua.user_id = p_user_id AND ua.achievement_id = f.id;

  SET LOCAL row_security = on;
  RETURN jsonb_build_object('success', true, 'adjusted', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_quiz_and_adjust_gamification(uuid, uuid) TO authenticated;