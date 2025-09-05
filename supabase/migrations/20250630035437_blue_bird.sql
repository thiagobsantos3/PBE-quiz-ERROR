/*
  # Create quiz question logs table

  1. New Tables
    - `quiz_question_logs`
      - `id` (uuid, primary key)
      - `quiz_session_id` (uuid, foreign key to quiz_sessions)
      - `user_id` (uuid, foreign key to auth.users)
      - `question_id` (uuid, foreign key to questions)
      - `points_earned` (integer, points earned for this question)
      - `total_points_possible` (integer, maximum points possible)
      - `time_spent` (integer, time spent in seconds)
      - `answered_at` (timestamp, when the question was answered)
      - `is_correct` (boolean, whether the answer was correct)
      - `created_at` (timestamp, when the log was created)

  2. Security
    - Enable RLS on `quiz_question_logs` table
    - Add policy for users to view their own logs
    - Add policy for users to insert their own logs

  3. Indexes
    - Index on quiz_session_id for efficient querying
    - Index on user_id for user-specific queries
    - Index on question_id for question analysis
*/

CREATE TABLE IF NOT EXISTS public.quiz_question_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_session_id uuid NOT NULL REFERENCES public.quiz_sessions(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    points_earned integer NOT NULL,
    total_points_possible integer NOT NULL,
    time_spent integer NOT NULL,
    answered_at timestamp with time zone DEFAULT now(),
    is_correct boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quiz_question_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own quiz question logs"
ON public.quiz_question_logs FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own quiz question logs"
ON public.quiz_question_logs FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_quiz_question_logs_session_id 
ON public.quiz_question_logs(quiz_session_id);

CREATE INDEX IF NOT EXISTS idx_quiz_question_logs_user_id 
ON public.quiz_question_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_quiz_question_logs_question_id 
ON public.quiz_question_logs(question_id);

CREATE INDEX IF NOT EXISTS idx_quiz_question_logs_answered_at 
ON public.quiz_question_logs(answered_at);