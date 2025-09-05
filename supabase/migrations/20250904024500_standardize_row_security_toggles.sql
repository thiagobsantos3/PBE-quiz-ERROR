-- Standardize RLS toggles to row_security off/on for critical functions

-- Drop existing functions to avoid signature conflicts
DROP FUNCTION IF EXISTS public.get_team_leaderboard_data(uuid, timestamptz, timestamptz);
DROP FUNCTION IF EXISTS public.delete_quiz_and_adjust_gamification(uuid, uuid);

-- Recreate get_team_leaderboard_data with proper authz and row_security toggles
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
    v_authorized boolean := false;
    v_team_exists boolean := false;
BEGIN
  SET LOCAL row_security = off;

  SELECT EXISTS(SELECT 1 FROM public.teams t WHERE t.id = p_team_id) INTO v_team_exists;
  IF NOT v_team_exists THEN
    RAISE EXCEPTION 'Team with ID % does not exist', p_team_id;
  END IF;

  SELECT (
    public.can_access_team(p_team_id) OR public.is_team_owner(p_team_id) OR COALESCE(public.is_admin(), false)
  ) INTO v_authorized;
  IF NOT v_authorized THEN
    RAISE EXCEPTION 'Not authorized to access team leaderboard for team %', p_team_id;
  END IF;

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

-- Recreate delete_quiz_and_adjust_gamification with proper row_security toggles
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

  SELECT id, user_id, team_id, status, completed_at
    INTO v_session
  FROM public.quiz_sessions
  WHERE id = p_quiz_session_id;

  IF v_session.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quiz session not found');
  END IF;

  -- Active: allow owner or team owner, delete only
  IF v_session.status IS DISTINCT FROM 'completed' THEN
    IF NOT (v_session.user_id = auth.uid() OR (v_session.team_id IS NOT NULL AND public.is_team_owner(v_session.team_id))) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Not authorized to delete this active session');
    END IF;
    DELETE FROM public.quiz_question_logs WHERE quiz_session_id = v_session.id;
    DELETE FROM public.quiz_sessions WHERE id = v_session.id;
    SET LOCAL row_security = on;
    RETURN jsonb_build_object('success', true, 'adjusted', false);
  END IF;

  -- Completed: only team owner may delete
  IF NOT (v_session.team_id IS NOT NULL AND public.is_team_owner(v_session.team_id)) THEN
    SET LOCAL row_security = on;
    RETURN jsonb_build_object('success', false, 'error', 'Only team owners can delete completed sessions');
  END IF;

  DELETE FROM public.quiz_question_logs WHERE quiz_session_id = v_session.id;
  DELETE FROM public.quiz_sessions WHERE id = v_session.id;

  SELECT COALESCE(SUM(total_points + COALESCE(bonus_xp, 0)), 0), COUNT(*)
    INTO v_total_xp, v_total_quizzes
  FROM public.quiz_sessions
  WHERE user_id = v_session.user_id AND status = 'completed';

  WITH daily AS (
    SELECT DISTINCT DATE(completed_at) AS d
    FROM public.quiz_sessions
    WHERE user_id = v_session.user_id AND status = 'completed' AND completed_at IS NOT NULL
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
    v_session.user_id,
    v_total_xp,
    v_current_level,
    v_longest_streak,
    COALESCE((SELECT MAX(DATE(completed_at)) FROM public.quiz_sessions WHERE user_id = v_session.user_id AND status = 'completed'), CURRENT_DATE)
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_xp = EXCLUDED.total_xp,
    current_level = EXCLUDED.current_level,
    longest_streak = EXCLUDED.longest_streak,
    last_quiz_date = EXCLUDED.last_quiz_date;

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
  WHERE ua.user_id = v_session.user_id AND ua.achievement_id = f.id;

  SET LOCAL row_security = on;
  RETURN jsonb_build_object('success', true, 'adjusted', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_team_leaderboard_data(uuid, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_quiz_and_adjust_gamification(uuid, uuid) TO authenticated;