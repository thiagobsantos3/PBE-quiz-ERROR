/*
  # Create quiz sessions schema

  1. New Tables
    - `quiz_sessions`
      - `id` (uuid, primary key)
      - `type` (text, enum: quick-start, custom, study-assignment)
      - `title` (text)
      - `description` (text)
      - `user_id` (uuid, references auth.users)
      - `team_id` (uuid, references teams, optional)
      - `assignment_id` (uuid, references study_assignments, optional)
      - `questions` (jsonb, array of question objects)
      - `current_question_index` (integer)
      - `results` (jsonb, array of quiz result objects)
      - `status` (text, enum: active, completed, paused)
      - `show_answer` (boolean)
      - `time_left` (integer)
      - `timer_active` (boolean)
      - `timer_started` (boolean)
      - `has_time_expired` (boolean)
      - `total_points` (integer)
      - `max_points` (integer)
      - `estimated_minutes` (integer)
      - `completed_at` (timestamp, optional)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on quiz_sessions table
    - Add policies for users to manage their own quiz sessions
*/

-- Create quiz_sessions table
CREATE TABLE IF NOT EXISTS quiz_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('quick-start', 'custom', 'study-assignment')),
  title text NOT NULL,
  description text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  assignment_id uuid REFERENCES study_assignments(id) ON DELETE CASCADE,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  current_question_index integer NOT NULL DEFAULT 0,
  results jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  show_answer boolean NOT NULL DEFAULT false,
  time_left integer NOT NULL DEFAULT 30,
  timer_active boolean NOT NULL DEFAULT false,
  timer_started boolean NOT NULL DEFAULT false,
  has_time_expired boolean NOT NULL DEFAULT false,
  total_points integer NOT NULL DEFAULT 0,
  max_points integer NOT NULL DEFAULT 0,
  estimated_minutes integer NOT NULL DEFAULT 0,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_user_id ON quiz_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_assignment_id ON quiz_sessions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_status ON quiz_sessions(status);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_type ON quiz_sessions(type);

-- Enable RLS
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;

-- Quiz sessions policies
CREATE POLICY "Users can manage their own quiz sessions"
  ON quiz_sessions
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Add updated_at trigger
CREATE TRIGGER update_quiz_sessions_updated_at
  BEFORE UPDATE ON quiz_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add trigger to automatically set completed_at when status is set to completed
CREATE OR REPLACE FUNCTION set_quiz_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = now();
  ELSIF NEW.status != 'completed' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_quiz_session_completed_at
  BEFORE UPDATE ON quiz_sessions
  FOR EACH ROW
  EXECUTE FUNCTION set_quiz_completed_at();