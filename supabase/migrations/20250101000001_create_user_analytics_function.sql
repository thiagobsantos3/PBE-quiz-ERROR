-- Create function to get user analytics data
CREATE OR REPLACE FUNCTION get_user_analytics_data(
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
AS $$
DECLARE
  v_start_date TIMESTAMP WITH TIME ZONE;
  v_end_date TIMESTAMP WITH TIME ZONE;
  v_total_quizzes_completed BIGINT;
  v_total_questions_answered BIGINT;
  v_average_score NUMERIC;
  v_total_time_spent_minutes BIGINT;
  v_study_streak INTEGER;
  v_total_points_earned BIGINT;
  v_total_possible_points BIGINT;
BEGIN
  -- Set default date range if not provided (last 30 days)
  v_start_date := COALESCE(p_start_date, NOW() - INTERVAL '30 days');
  v_end_date := COALESCE(p_end_date, NOW());
  
  -- Calculate total quizzes completed
  SELECT COUNT(*)
  INTO v_total_quizzes_completed
  FROM quiz_sessions
  WHERE user_id = p_user_id
    AND status = 'completed'
    AND completed_at BETWEEN v_start_date AND v_end_date;
  
  -- Calculate total questions answered (from results JSONB)
  SELECT COALESCE(SUM(jsonb_array_length(results)), 0)
  INTO v_total_questions_answered
  FROM quiz_sessions
  WHERE user_id = p_user_id
    AND status = 'completed'
    AND completed_at BETWEEN v_start_date AND v_end_date;
  
  -- Calculate average score
  SELECT 
    CASE 
      WHEN SUM(qs.max_points) > 0 THEN 
        ROUND((SUM(qs.total_points)::NUMERIC / SUM(qs.max_points)::NUMERIC) * 100, 2)
      ELSE 0 
    END
  INTO v_average_score
  FROM quiz_sessions qs
  WHERE qs.user_id = p_user_id
    AND qs.status = 'completed'
    AND qs.completed_at BETWEEN v_start_date AND v_end_date;
  
  -- Calculate total time spent based on actual completion data
  -- Use estimated_minutes if available, otherwise estimate based on questions and average time per question
  SELECT COALESCE(
    SUM(
      CASE 
        WHEN estimated_minutes > 0 THEN estimated_minutes
        ELSE GREATEST(1, jsonb_array_length(questions) * 2) -- 2 minutes per question as fallback
      END
    ), 0
  )
  INTO v_total_time_spent_minutes
  FROM quiz_sessions
  WHERE user_id = p_user_id
    AND status = 'completed'
    AND completed_at BETWEEN v_start_date AND v_end_date;
  
  -- Calculate study streak (consecutive days with completed quizzes)
  WITH daily_activity AS (
    SELECT DISTINCT DATE(completed_at) as study_date
    FROM quiz_sessions
    WHERE user_id = p_user_id
      AND status = 'completed'
      AND completed_at BETWEEN v_start_date AND v_end_date
    ORDER BY study_date DESC
  ),
  streak_calc AS (
    SELECT 
      study_date,
      ROW_NUMBER() OVER (ORDER BY study_date DESC) as rn,
      study_date - (ROW_NUMBER() OVER (ORDER BY study_date DESC) || ' days')::INTERVAL as grp
    FROM daily_activity
  )
  SELECT COUNT(*)
  INTO v_study_streak
  FROM streak_calc
  WHERE grp = (SELECT grp FROM streak_calc ORDER BY study_date DESC LIMIT 1);
  
  -- Calculate total points earned
  SELECT COALESCE(SUM(total_points), 0)
  INTO v_total_points_earned
  FROM quiz_sessions
  WHERE user_id = p_user_id
    AND status = 'completed'
    AND completed_at BETWEEN v_start_date AND v_end_date;
  
  -- Calculate total possible points
  SELECT COALESCE(SUM(max_points), 0)
  INTO v_total_possible_points
  FROM quiz_sessions
  WHERE user_id = p_user_id
    AND status = 'completed'
    AND completed_at BETWEEN v_start_date AND v_end_date;
  
  -- Return the results
  RETURN QUERY SELECT 
    v_total_quizzes_completed,
    v_total_questions_answered,
    v_average_score,
    v_total_time_spent_minutes,
    v_study_streak,
    v_total_points_earned,
    v_total_possible_points;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_analytics_data(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;

-- Note: RLS policy already exists in the quiz_sessions table creation migration
-- The existing policy "Users can manage their own quiz sessions" covers SELECT operations