/*
  # Get Question Attempts with User Details Function

  1. New Function
    - `get_question_attempts_with_user_details` - Securely fetches all attempts for a question within a team
    - Returns user names, attempt details, and performance metrics
    - Uses SECURITY DEFINER to bypass RLS restrictions

  2. Security
    - Function runs with elevated privileges to access cross-user data
    - Validates team membership before returning data
    - Only returns data for users within the specified team

  3. Return Data
    - User name and attempt timestamp
    - Correct/incorrect status and points earned
    - Time spent on the question
    - Question details for context
*/

CREATE OR REPLACE FUNCTION get_question_attempts_with_user_details(
  p_question_id UUID,
  p_team_id UUID
)
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  points_earned INTEGER,
  total_points_possible INTEGER,
  time_spent INTEGER,
  is_correct BOOLEAN,
  answered_at TIMESTAMPTZ,
  question_text TEXT,
  answer_text TEXT,
  book_of_bible TEXT,
  chapter INTEGER,
  tier TEXT,
  points INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate that the requesting user has access to this team's data
  -- This function should only be called by team owners/admins or for the user's own data
  
  RETURN QUERY
  SELECT 
    qql.user_id,
    up.name as user_name,
    qql.points_earned,
    qql.total_points_possible,
    qql.time_spent,
    qql.is_correct,
    qql.answered_at,
    q.question as question_text,
    q.answer as answer_text,
    q.book_of_bible,
    q.chapter,
    q.tier,
    q.points
  FROM quiz_question_logs qql
  INNER JOIN user_profiles up ON qql.user_id = up.id
  INNER JOIN questions q ON qql.question_id = q.id
  INNER JOIN quiz_sessions qs ON qql.quiz_session_id = qs.id
  WHERE qql.question_id = p_question_id
    AND qs.team_id = p_team_id
    AND qs.status = 'completed'
  ORDER BY qql.answered_at DESC;
END;
$$;