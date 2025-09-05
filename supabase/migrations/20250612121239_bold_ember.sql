/*
  # Create questions schema
  1. New Tables
    - `questions`
      - `id` (uuid, primary key)
      - `book_of_bible` (text)
      - `chapter` (integer)
      - `question` (text)
      - `answer` (text)
      - `points` (integer)
      - `time_to_answer` (integer, seconds)
      - `tier` (text, enum: free, pro, enterprise)
      - `created_by` (uuid, references auth.users)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  2. Security
    - Enable RLS on questions table
    - Add policies for users to read questions based on their subscription tier
    - Add policies for admins to manage questions
*/

-- Create questions table
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_of_bible text NOT NULL,
  chapter integer NOT NULL CHECK (chapter > 0),
  question text NOT NULL CHECK (length(question) >= 10 AND length(question) <= 1000),
  answer text NOT NULL CHECK (length(answer) >= 1 AND length(answer) <= 2000),
  points integer NOT NULL DEFAULT 10 CHECK (points > 0 AND points <= 1000),
  time_to_answer integer NOT NULL DEFAULT 30 CHECK (time_to_answer >= 5 AND time_to_answer <= 300),
  tier text NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_questions_book_chapter ON questions(book_of_bible, chapter);
CREATE INDEX IF NOT EXISTS idx_questions_tier ON questions(tier);
CREATE INDEX IF NOT EXISTS idx_questions_created_by ON questions(created_by);
CREATE INDEX IF NOT EXISTS idx_questions_points ON questions(points);

-- Optional: Create a books reference table for validation
CREATE TABLE IF NOT EXISTS bible_books (
  name text PRIMARY KEY,
  testament text NOT NULL CHECK (testament IN ('old', 'new')),
  book_order integer NOT NULL,
  max_chapters integer NOT NULL CHECK (max_chapters > 0)
);

-- Add foreign key constraint if using bible_books table
-- ALTER TABLE questions ADD CONSTRAINT fk_questions_book 
--   FOREIGN KEY (book_of_bible) REFERENCES bible_books(name);

-- Enable RLS
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Create a function to get user subscription tier for better performance
CREATE OR REPLACE FUNCTION get_user_subscription_tier(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_tier text := 'free';
BEGIN
  SELECT COALESCE(s.plan, 'free') INTO user_tier
  FROM subscriptions s
  WHERE s.user_id = get_user_subscription_tier.user_id 
    AND s.status = 'active'
  ORDER BY 
    CASE s.plan
      WHEN 'enterprise' THEN 3
      WHEN 'pro' THEN 2
      WHEN 'free' THEN 1
      ELSE 0
    END DESC
  LIMIT 1;
  
  RETURN user_tier;
END;
$$;

-- Questions policies
CREATE POLICY "Users can view questions based on their subscription tier"
  ON questions
  FOR SELECT
  TO authenticated
  USING (
    CASE tier
      WHEN 'free' THEN true
      WHEN 'pro' THEN get_user_subscription_tier(auth.uid()) IN ('pro', 'enterprise')
      WHEN 'enterprise' THEN get_user_subscription_tier(auth.uid()) = 'enterprise'
      ELSE false
    END
  );

-- Allow anonymous users to view free questions (optional)
CREATE POLICY "Anonymous users can view free questions"
  ON questions
  FOR SELECT
  TO anon
  USING (tier = 'free');

-- Admin policies (single comprehensive policy)
CREATE POLICY "System admins can manage all questions"
  ON questions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Optional: Team-based content creation policy
CREATE POLICY "Team admins can manage questions for their team"
  ON questions
  FOR ALL
  TO authenticated
  USING (
    created_by IN (
      SELECT tm.user_id 
      FROM team_members tm
      JOIN team_members current_user ON current_user.team_id = tm.team_id
      WHERE current_user.user_id = auth.uid()
        AND current_user.role IN ('owner', 'admin')
        AND current_user.status = 'active'
        AND tm.status = 'active'
    )
    OR created_by = auth.uid()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.role IN ('owner', 'admin') 
        AND tm.status = 'active'
    )
  );

-- Add updated_at trigger
CREATE TRIGGER update_questions_updated_at
  BEFORE UPDATE ON questions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Optional: Function to validate bible references
CREATE OR REPLACE FUNCTION validate_bible_reference()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Basic validation - you can expand this
  IF NEW.book_of_bible IS NULL OR trim(NEW.book_of_bible) = '' THEN
    RAISE EXCEPTION 'Book of bible cannot be empty';
  END IF;
  
  -- Normalize book name
  NEW.book_of_bible := trim(initcap(NEW.book_of_bible));
  
  -- If using bible_books table, validate against it
  -- IF NOT EXISTS (SELECT 1 FROM bible_books WHERE name = NEW.book_of_bible) THEN
  --   RAISE EXCEPTION 'Invalid book of bible: %', NEW.book_of_bible;
  -- END IF;
  
  RETURN NEW;
END;
$$;

-- Optional: Add validation trigger
CREATE TRIGGER validate_bible_reference_trigger
  BEFORE INSERT OR UPDATE ON questions
  FOR EACH ROW
  EXECUTE FUNCTION validate_bible_reference();

-- Optional: Create view for question statistics
CREATE OR REPLACE VIEW question_stats AS
SELECT 
  book_of_bible,
  chapter,
  tier,
  COUNT(*) as question_count,
  AVG(points) as avg_points,
  AVG(time_to_answer) as avg_time,
  MIN(created_at) as first_created,
  MAX(created_at) as last_created
FROM questions
GROUP BY book_of_bible, chapter, tier;

-- Grant access to the view
GRANT SELECT ON question_stats TO authenticated;