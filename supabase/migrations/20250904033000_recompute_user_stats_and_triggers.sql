-- Server-side source of truth for user XP: recompute from approved, completed sessions

CREATE OR REPLACE FUNCTION public.recompute_user_stats(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_xp bigint := 0;
  v_current_level int := 1;
  v_longest_streak int := 0;
  v_total_quizzes bigint := 0;
  v_last_quiz_date date := CURRENT_DATE;
BEGIN
  SET LOCAL row_security = off;

  SELECT
    COALESCE(SUM(qs.total_points + COALESCE(qs.bonus_xp, 0)), 0),
    COUNT(*),
    COALESCE(MAX(DATE(qs.completed_at)), CURRENT_DATE)
  INTO v_total_xp, v_total_quizzes, v_last_quiz_date
  FROM public.quiz_sessions qs
  WHERE qs.user_id = p_user_id
    AND qs.status = 'completed'
    AND qs.approval_status = 'approved';

  WITH daily AS (
    SELECT DISTINCT DATE(completed_at) AS d
    FROM public.quiz_sessions
    WHERE user_id = p_user_id AND status = 'completed' AND approval_status = 'approved' AND completed_at IS NOT NULL
  ), numbered AS (
    SELECT d, ROW_NUMBER() OVER (ORDER BY d) AS rn FROM daily
  ), grouped AS (
    SELECT d, rn, d - (rn || ' days')::interval AS grp FROM numbered
  )
  SELECT COALESCE(MAX(cnt), 0) INTO v_longest_streak
  FROM (
    SELECT COUNT(*) AS cnt FROM grouped GROUP BY grp
  ) s;

  -- Match client formula: 500 XP per level, floor(xp/500)+1
  v_current_level := GREATEST(1, FLOOR(v_total_xp / 500)::int + 1);

  INSERT INTO public.user_stats (user_id, total_xp, current_level, longest_streak, last_quiz_date)
  VALUES (p_user_id, v_total_xp, v_current_level, v_longest_streak, v_last_quiz_date)
  ON CONFLICT (user_id) DO UPDATE SET
    total_xp = EXCLUDED.total_xp,
    current_level = EXCLUDED.current_level,
    longest_streak = EXCLUDED.longest_streak,
    last_quiz_date = EXCLUDED.last_quiz_date;

  SET LOCAL row_security = on; 
END;
$$;

GRANT EXECUTE ON FUNCTION public.recompute_user_stats(uuid) TO authenticated;

-- Trigger helper: call recompute on session changes
CREATE OR REPLACE FUNCTION public.tg_recompute_user_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    _user_id := NEW.user_id;
  ELSIF TG_OP = 'UPDATE' THEN
    _user_id := COALESCE(NEW.user_id, OLD.user_id);
  ELSIF TG_OP = 'DELETE' THEN
    _user_id := OLD.user_id;
  END IF;

  PERFORM public.recompute_user_stats(_user_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Attach triggers to quiz_sessions on relevant events
DROP TRIGGER IF EXISTS quiz_sessions_recompute_after_ins ON public.quiz_sessions;
DROP TRIGGER IF EXISTS quiz_sessions_recompute_after_upd ON public.quiz_sessions;
DROP TRIGGER IF EXISTS quiz_sessions_recompute_after_del ON public.quiz_sessions;

CREATE TRIGGER quiz_sessions_recompute_after_ins
AFTER INSERT ON public.quiz_sessions
FOR EACH ROW EXECUTE FUNCTION public.tg_recompute_user_stats();

CREATE TRIGGER quiz_sessions_recompute_after_upd
AFTER UPDATE OF status, approval_status, total_points, bonus_xp, completed_at ON public.quiz_sessions
FOR EACH ROW EXECUTE FUNCTION public.tg_recompute_user_stats();

CREATE TRIGGER quiz_sessions_recompute_after_del
AFTER DELETE ON public.quiz_sessions
FOR EACH ROW EXECUTE FUNCTION public.tg_recompute_user_stats();