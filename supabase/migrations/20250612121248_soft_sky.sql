/*
  # Create study assignments schema - RECURSION FIXES ONLY
  Critical fixes to prevent infinite recursion and constraint violations
*/

-- Create study_assignments table
CREATE TABLE IF NOT EXISTS study_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  study_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  description text,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  -- FIX 1: Make created_by nullable to avoid constraint violation
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
  -- FIX 2: REMOVED recursive constraint that causes infinite loops
  -- DO NOT ADD: CONSTRAINT valid_team_member CHECK (EXISTS (...))
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_study_assignments_user_date ON study_assignments(user_id, date);
CREATE INDEX IF NOT EXISTS idx_study_assignments_team_date ON study_assignments(team_id, date);
CREATE INDEX IF NOT EXISTS idx_study_assignments_completed ON study_assignments(completed);

-- Enable RLS
ALTER TABLE study_assignments ENABLE ROW LEVEL SECURITY;

-- FIX 3: Update all policies to reference team_members instead of user_profiles
CREATE POLICY "Users can view their own assignments"
  ON study_assignments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Team members can view assignments in their team"
  ON study_assignments
  FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Team owners and admins can manage team assignments"
  ON study_assignments
  FOR ALL
  TO authenticated
  USING (
    team_id IN (
      SELECT tm.team_id 
      FROM team_members tm 
      WHERE tm.user_id = auth.uid() 
        AND tm.role IN ('owner', 'admin')
        AND tm.status = 'active'
    )
  );

-- FIX 4: Remove redundant INSERT policy (already covered by FOR ALL above)
-- CREATE POLICY "Team owners and admins can create assignments" - REMOVED

CREATE POLICY "Users can update their own assignment completion"
  ON study_assignments
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Add updated_at trigger
CREATE TRIGGER update_study_assignments_updated_at
  BEFORE UPDATE ON study_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add trigger to automatically set completed_at when completed is set to true
CREATE OR REPLACE FUNCTION set_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.completed = true AND OLD.completed = false THEN
    NEW.completed_at = now();
  ELSIF NEW.completed = false THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_study_assignment_completed_at
  BEFORE UPDATE ON study_assignments
  FOR EACH ROW
  EXECUTE FUNCTION set_completed_at();