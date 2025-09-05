/*
  # Fix remaining JSONB array length errors

  1. Updates
    - Fix any remaining instances of jsonb_array_length being called on non-array values
    - Ensure all database functions properly check JSONB types before calling array functions
    - Add comprehensive type checking for all JSONB operations

  2. Security
    - Maintain existing RLS policies
    - No changes to security model
*/

-- Drop and recreate the get_team_leaderboard_data function with proper JSONB type checking
DROP FUNCTION IF EXISTS get_team_leaderboard_data(uuid);

CREATE OR REPLACE FUNCTION get_team_leaderboard_data(p_team_id uuid)
RETURNS TABLE (
  user_id uuid,
  user_name text,
  role text,
  total_quizzes_completed bigint,
  total_questions_answered bigint,
  average_score numeric,
  total_time_spent_minutes bigint,
  study_streak bigint,
  total_points_earned bigint,
  total_possible_points bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tm.user_id,
    COALESCE(p.display_name, p.email) as user_name,
    tm.role,
    COUNT(qs.id) as total_quizzes_completed,
    COALESCE(SUM(
      CASE 
        WHEN qs.results IS NOT NULL AND jsonb_typeof(qs.results) = 'array' THEN jsonb_array_length(qs.results)
        ELSE 0 
      END
    ), 0) as total_questions_answered,
    CASE 
      WHEN COUNT(qs.id) > 0 THEN 
        ROUND(AVG(qs.score), 2)
      ELSE 0 
    END as average_score,
    COALESCE(
      SUM(
        CASE 
          WHEN qs.estimated_minutes > 0 THEN qs.estimated_minutes
          ELSE GREATEST(1, 
            CASE 
              WHEN qs.questions IS NOT NULL AND jsonb_typeof(qs.questions) = 'array' THEN jsonb_array_length(qs.questions) * 2
              ELSE 2
            END
          )
        END
      ), 0
    ) as total_time_spent_minutes,
    COALESCE(
      (SELECT calculate_study_streak(tm.user_id)), 0
    ) as study_streak,
    COALESCE(SUM(qs.points_earned), 0) as total_points_earned,
    COALESCE(SUM(qs.total_possible_points), 0) as total_possible_points
  FROM team_members tm
  JOIN profiles p ON tm.user_id = p.id
  LEFT JOIN quiz_sessions qs ON tm.user_id = qs.user_id
  WHERE tm.team_id = p_team_id
  GROUP BY tm.user_id, p.display_name, p.email, tm.role
  ORDER BY total_points_earned DESC, average_score DESC;
END;
$$;

-- Also ensure the get_user_analytics function is properly fixed
DROP FUNCTION IF EXISTS get_user_analytics(uuid);

CREATE OR REPLACE FUNCTION get_user_analytics(p_user_id uuid)
RETURNS TABLE (
  total_quizzes_completed bigint,
  total_questions_answered bigint,
  average_score numeric,
  total_time_spent_minutes bigint,
  study_streak bigint,
  total_points_earned bigint,
  total_possible_points bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_quizzes_completed bigint;
  v_total_questions_answered bigint;
  v_average_score numeric;
  v_total_time_spent_minutes bigint;
  v_study_streak bigint;
  v_total_points_earned bigint;
  v_total_possible_points bigint;
BEGIN
  -- Calculate total quizzes completed
  SELECT COUNT(*)
  INTO v_total_quizzes_completed
  FROM quiz_sessions
  WHERE user_id = p_user_id
    AND completed_at IS NOT NULL;

  -- Calculate total questions answered (from results JSONB)
  SELECT COALESCE(SUM(
    CASE 
      WHEN results IS NOT NULL AND jsonb_typeof(results) = 'array' THEN jsonb_array_length(results)
      ELSE 0 
    END
  ), 0)
  INTO v_total_questions_answered
  FROM quiz_sessions
  WHERE user_id = p_user_id
    AND completed_at IS NOT NULL;

  -- Calculate average score
  SELECT CASE 
    WHEN COUNT(*) > 0 THEN ROUND(AVG(score), 2)
    ELSE 0 
  END
  INTO v_average_score
  FROM quiz_sessions
  WHERE user_id = p_user_id
    AND completed_at IS NOT NULL;

  -- Calculate total time spent
  SELECT COALESCE(
    SUM(
      CASE 
        WHEN estimated_minutes > 0 THEN estimated_minutes
        ELSE GREATEST(1, 
          CASE 
            WHEN questions IS NOT NULL AND jsonb_typeof(questions) = 'array' THEN jsonb_array_length(questions) * 2
            ELSE 2
          END
        ) -- 2 minutes per question as fallback
      END
    ), 0
  )
  INTO v_total_time_spent_minutes
  FROM quiz_sessions
  WHERE user_id = p_user_id
    AND completed_at IS NOT NULL;

  -- Calculate study streak
  SELECT COALESCE(calculate_study_streak(p_user_id), 0)
  INTO v_study_streak;

  -- Calculate total points earned and possible
  SELECT 
    COALESCE(SUM(points_earned), 0),
    COALESCE(SUM(total_possible_points), 0)
  INTO v_total_points_earned, v_total_possible_points
  FROM quiz_sessions
  WHERE user_id = p_user_id
    AND completed_at IS NOT NULL;

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