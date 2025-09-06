-- Add suspicion fields to quiz_sessions and quiz_question_logs, and update view

-- 1) quiz_sessions: semaphore + score + summary
ALTER TABLE public.quiz_sessions
  ADD COLUMN IF NOT EXISTS suspicion_status text CHECK (suspicion_status IN ('green','amber','red')),
  ADD COLUMN IF NOT EXISTS suspicion_score numeric,
  ADD COLUMN IF NOT EXISTS suspicious_summary jsonb;

-- 2) quiz_question_logs: per-question flags and show-answer tracking
ALTER TABLE public.quiz_question_logs
  ADD COLUMN IF NOT EXISTS suspicious boolean,
  ADD COLUMN IF NOT EXISTS suspicious_reason text,
  ADD COLUMN IF NOT EXISTS threshold_seconds integer,
  ADD COLUMN IF NOT EXISTS show_answer_used boolean DEFAULT false;

-- 3) Extend (or create) quiz_sessions_view to include suspicion fields
DROP VIEW IF EXISTS public.quiz_sessions_view;
CREATE VIEW public.quiz_sessions_view AS
SELECT
  qs.id,
  qs.user_id,
  qs.team_id,
  qs.title,
  qs.type,
  qs.status,
  qs.created_at,
  qs.completed_at,
  qs.total_points,
  qs.max_points,
  qs.total_actual_time_spent_seconds,
  COALESCE((CASE WHEN qs.questions IS NOT NULL AND jsonb_typeof(qs.questions) = 'array' THEN jsonb_array_length(qs.questions) ELSE 0 END), 0) AS questions_count,
  qs.approval_status,
  qs.suspicion_status,
  qs.suspicion_score,
  qs.suspicious_summary
FROM public.quiz_sessions qs;

