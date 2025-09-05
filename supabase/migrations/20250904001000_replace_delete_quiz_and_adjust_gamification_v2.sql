-- Replace RPC to handle deletion for active vs completed sessions differently

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
  -- Work with RLS disabled inside function
  SET LOCAL row_security.enable = off;

  -- Validate ownership and fetch session
  SELECT id, user_id, status, completed_at
    INTO v_session
  FROM public.quiz_sessions
  WHERE id = p_quiz_session_id AND user_id = p_user_id;

  IF v_session.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quiz session not found or not owned by user');
  END IF;

  -- Case 1: Active (or not completed) session: just delete, no gamification adjustments
  IF v_session.status IS DISTINCT FROM 'completed' THEN
    DELETE FROM public.quiz_sessions WHERE id = v_session.id;
    RETURN jsonb_build_object('success', true, 'adjusted', false);
  END IF;

  -- Case 2: Completed session: delete and recalc stats, revoke invalid achievements
  DELETE FROM public.quiz_sessions WHERE id = v_session.id;

  -- Recalculate totals from remaining completed sessions; include bonus_xp
  SELECT COALESCE(SUM(total_points + COALESCE(bonus_xp, 0)), 0), COUNT(*)
    INTO v_total_xp, v_total_quizzes
  FROM public.quiz_sessions
  WHERE user_id = p_user_id AND status = 'completed';

  -- Recalculate longest streak from remaining completed sessions
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

  -- Level: simple 100 XP per level unless you have a dedicated function
  v_current_level := GREATEST(1, FLOOR(v_total_xp / 100)::int);

  -- Upsert recalculated user_stats
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

  -- Revoke any achievements that are no longer valid
  -- Note: We do not grant new achievements here to avoid duplication; the app unlocks them elsewhere
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

  RETURN jsonb_build_object('success', true, 'adjusted', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_quiz_and_adjust_gamification(uuid, uuid) TO authenticated;