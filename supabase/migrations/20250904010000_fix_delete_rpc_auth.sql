-- Fix delete RPC to authorize via auth.uid() and allow team owners/admins

CREATE OR REPLACE FUNCTION public.delete_quiz_and_adjust_gamification(
  p_quiz_session_id uuid,
  p_user_id uuid -- kept for backward-compat; ignored
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_response jsonb := jsonb_build_object('success', false);
  v_session record;
  v_caller uuid := auth.uid();
  v_total_xp bigint := 0;
  v_current_level int := 1;
  v_longest_streak int := 0;
  v_total_quizzes bigint := 0;
  v_can_manage boolean := false;
BEGIN
  SET LOCAL row_security = off;

  -- Fetch target session
  SELECT id, user_id, team_id, status, completed_at
    INTO v_session
  FROM public.quiz_sessions
  WHERE id = p_quiz_session_id;

  IF v_session.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quiz session not found');
  END IF;

  -- Determine whether caller can manage this session
  v_can_manage := (
    v_session.user_id = v_caller OR
    (v_session.team_id IS NOT NULL AND public.can_manage_team(v_session.team_id)) OR
    COALESCE(public.is_admin(), false)
  );

  IF NOT v_can_manage THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized to delete this quiz session');
  END IF;

  -- Active (not completed): delete only
  IF v_session.status IS DISTINCT FROM 'completed' THEN
    DELETE FROM public.quiz_question_logs WHERE quiz_session_id = v_session.id;
    DELETE FROM public.quiz_sessions WHERE id = v_session.id;
    RETURN jsonb_build_object('success', true, 'adjusted', false);
  END IF;

  -- Completed: delete logs and session, then recalc stats and revoke invalid achievements
  DELETE FROM public.quiz_question_logs WHERE quiz_session_id = v_session.id;
  DELETE FROM public.quiz_sessions WHERE id = v_session.id;

  -- Recalc totals
  SELECT COALESCE(SUM(total_points + COALESCE(bonus_xp, 0)), 0), COUNT(*)
    INTO v_total_xp, v_total_quizzes
  FROM public.quiz_sessions
  WHERE user_id = v_session.user_id AND status = 'completed';

  -- Longest streak
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

  -- Revoke invalid achievements for that user
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

GRANT EXECUTE ON FUNCTION public.delete_quiz_and_adjust_gamification(uuid, uuid) TO authenticated;