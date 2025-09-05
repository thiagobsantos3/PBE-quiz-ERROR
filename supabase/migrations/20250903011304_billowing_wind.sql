CREATE OR REPLACE FUNCTION public.get_team_leaderboard_data(
    p_team_id uuid,
    p_start_date timestamptz DEFAULT NULL,
    p_end_date timestamptz DEFAULT NULL
)
RETURNS TABLE(
    user_id uuid,
    user_name text,
    role text,
    total_quizzes_completed bigint,
    total_questions_answered bigint,
    average_score numeric,
    total_time_spent_minutes numeric,
    study_streak integer,
    total_points_earned bigint,
    total_possible_points bigint,
    longest_streak integer
)
LANGUAGE plpgsql
AS $$
DECLARE
    r record;
    _total_points_earned bigint := 0;
    _total_possible_points bigint := 0;
    _total_actual_time_spent_seconds bigint := 0;
    _total_quizzes_completed bigint := 0;
    _total_questions_answered bigint := 0;
    _longest_streak integer := 0;
BEGIN
    -- Ensure RLS is enabled for quiz_sessions and user_profiles
    -- This function is SECURITY DEFINER, so it bypasses RLS.
    -- We must manually ensure the p_team_id is valid and the user has access to it.
    IF NOT EXISTS (SELECT 1 FROM public.teams WHERE id = p_team_id) THEN
        RAISE EXCEPTION 'Team with ID % does not exist.', p_team_id;
    END IF;

    -- Fetch data for each team member
    FOR r IN
        SELECT
            up.id AS user_id,
            up.name AS user_name,
            tm.role AS role,
            us.longest_streak AS longest_streak_from_stats -- Fetch longest_streak from user_stats
        FROM
            public.user_profiles up
        JOIN
            public.team_members tm ON up.id = tm.user_id
        LEFT JOIN
            public.user_stats us ON up.id = us.user_id
        WHERE
            tm.team_id = p_team_id
            AND tm.status = 'active'
    LOOP
        _total_points_earned := 0;
        _total_possible_points := 0;
        _total_actual_time_spent_seconds := 0;
        _total_quizzes_completed := 0;
        _total_questions_answered := 0;

        -- Aggregate quiz session data for the current user within the date range
        SELECT
            COALESCE(SUM(qs.total_points), 0),
            COALESCE(SUM(qs.max_points), 0),
            COALESCE(SUM(qs.total_actual_time_spent_seconds), 0),
            COUNT(qs.id),
            COALESCE(SUM(jsonb_array_length(qs.questions)), 0)
        INTO
            _total_points_earned,
            _total_possible_points,
            _total_actual_time_spent_seconds,
            _total_quizzes_completed,
            _total_questions_answered
        FROM
            public.quiz_sessions qs
        WHERE
            qs.user_id = r.user_id
            AND qs.status = 'completed'
            AND qs.approval_status = 'approved' 
            AND (p_start_date IS NULL OR qs.completed_at >= p_start_date)
            AND (p_end_date IS NULL OR qs.completed_at <= p_end_date);

        -- Assign the longest_streak from user_stats, defaulting to 0 if null
        _longest_streak := COALESCE(r.longest_streak_from_stats, 0);

        user_id := r.user_id;
        user_name := r.user_name;
        role := r.role;
        total_quizzes_completed := _total_quizzes_completed;
        total_questions_answered := _total_questions_answered;
        average_score := CASE WHEN _total_possible_points > 0 THEN (_total_points_earned::numeric / _total_possible_points) * 100 ELSE 0 END;
        total_time_spent_minutes := _total_actual_time_spent_seconds::numeric / 60; -- Convert seconds to minutes
        study_streak := 0; -- This needs to be calculated client-side or in a separate function if based on daily activity
        total_points_earned := _total_points_earned;
        total_possible_points := _total_possible_points;
        longest_streak := _longest_streak;

        RETURN NEXT;
    END LOOP;
END;
$$;

-- Grant execution permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_team_leaderboard_data(uuid, timestamptz, timestamptz) TO authenticated;

-- Revoke public access if it was granted by default
REVOKE EXECUTE ON FUNCTION public.get_team_leaderboard_data(uuid, timestamptz, timestamptz) FROM public;