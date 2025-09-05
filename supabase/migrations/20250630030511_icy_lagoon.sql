/*
  # Study Schedules Implementation

  1. New Tables
    - `study_assignments` table already exists with proper structure
    - Add indexes for better performance
    - Add RLS policies for team-based access

  2. Security
    - Enable RLS on study_assignments table
    - Add policies for team owners/admins to manage assignments
    - Add policies for users to view and update their own assignments

  3. Functions
    - Function to create study assignments
    - Function to update assignment completion status
    - Function to get assignments for a team/user
*/

-- Ensure study_assignments table has proper indexes
CREATE INDEX IF NOT EXISTS idx_study_assignments_team_date ON study_assignments(team_id, date);
CREATE INDEX IF NOT EXISTS idx_study_assignments_user_date ON study_assignments(user_id, date);
CREATE INDEX IF NOT EXISTS idx_study_assignments_completed ON study_assignments(completed);
CREATE INDEX IF NOT EXISTS idx_study_assignments_created_by ON study_assignments(created_by);

-- Add RLS policies for study_assignments
CREATE POLICY "Team owners and admins can manage assignments"
  ON study_assignments
  FOR ALL
  TO authenticated
  USING (
    team_id IN (
      SELECT id FROM teams WHERE owner_id = auth.uid()
    )
    OR team_id IN (
      SELECT tm.team_id 
      FROM team_members tm 
      WHERE tm.user_id = auth.uid() 
      AND tm.role = 'admin'
      AND tm.status = 'active'
    )
  )
  WITH CHECK (
    team_id IN (
      SELECT id FROM teams WHERE owner_id = auth.uid()
    )
    OR team_id IN (
      SELECT tm.team_id 
      FROM team_members tm 
      WHERE tm.user_id = auth.uid() 
      AND tm.role = 'admin'
      AND tm.status = 'active'
    )
  );

CREATE POLICY "Users can view their own assignments"
  ON study_assignments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own assignment completion"
  ON study_assignments
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Function to create or update study assignments
CREATE OR REPLACE FUNCTION create_study_assignment(
  p_user_id UUID,
  p_team_id UUID,
  p_date DATE,
  p_study_items JSONB,
  p_description TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_id UUID;
  v_assignment_id UUID;
  v_existing_assignment_id UUID;
  v_is_authorized BOOLEAN := FALSE;
BEGIN
  -- Get the caller's user ID
  v_caller_id := auth.uid();
  
  IF v_caller_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check if caller is team owner
  SELECT EXISTS(
    SELECT 1 FROM teams 
    WHERE id = p_team_id AND owner_id = v_caller_id
  ) INTO v_is_authorized;

  -- If not owner, check if caller is team admin
  IF NOT v_is_authorized THEN
    SELECT EXISTS(
      SELECT 1 FROM team_members 
      WHERE team_id = p_team_id 
      AND user_id = v_caller_id 
      AND role = 'admin' 
      AND status = 'active'
    ) INTO v_is_authorized;
  END IF;

  IF NOT v_is_authorized THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient permissions');
  END IF;

  -- Validate study_items
  IF p_study_items IS NULL OR jsonb_array_length(p_study_items) = 0 THEN
    RETURN json_build_object('success', false, 'error', 'Study items are required');
  END IF;

  -- Check if assignment already exists for this user and date
  SELECT id INTO v_existing_assignment_id
  FROM study_assignments
  WHERE user_id = p_user_id 
    AND team_id = p_team_id 
    AND date = p_date;

  IF v_existing_assignment_id IS NOT NULL THEN
    -- Update existing assignment
    UPDATE study_assignments
    SET 
      study_items = p_study_items,
      description = p_description,
      updated_at = NOW()
    WHERE id = v_existing_assignment_id;
    
    v_assignment_id := v_existing_assignment_id;
  ELSE
    -- Create new assignment
    INSERT INTO study_assignments (
      user_id,
      team_id,
      date,
      study_items,
      description,
      created_by
    ) VALUES (
      p_user_id,
      p_team_id,
      p_date,
      p_study_items,
      p_description,
      v_caller_id
    )
    RETURNING id INTO v_assignment_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'assignment_id', v_assignment_id,
    'message', 'Assignment saved successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Function to update assignment completion status
CREATE OR REPLACE FUNCTION update_assignment_completion(
  p_assignment_id UUID,
  p_completed BOOLEAN
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_id UUID;
  v_assignment_user_id UUID;
BEGIN
  -- Get the caller's user ID
  v_caller_id := auth.uid();
  
  IF v_caller_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get the assignment's user_id
  SELECT user_id INTO v_assignment_user_id
  FROM study_assignments
  WHERE id = p_assignment_id;

  IF v_assignment_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Assignment not found');
  END IF;

  -- Check if caller is the assignment owner
  IF v_assignment_user_id != v_caller_id THEN
    RETURN json_build_object('success', false, 'error', 'You can only update your own assignments');
  END IF;

  -- Update the assignment
  UPDATE study_assignments
  SET 
    completed = p_completed,
    completed_at = CASE WHEN p_completed THEN NOW() ELSE NULL END,
    updated_at = NOW()
  WHERE id = p_assignment_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Assignment completion status updated'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Function to get team members for assignment management
CREATE OR REPLACE FUNCTION get_team_members_for_assignments(p_team_id UUID)
RETURNS TABLE (
  user_id UUID,
  name TEXT,
  role TEXT,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_id UUID;
  v_is_authorized BOOLEAN := FALSE;
BEGIN
  -- Get the caller's user ID
  v_caller_id := auth.uid();
  
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if caller is team owner
  SELECT EXISTS(
    SELECT 1 FROM teams 
    WHERE id = p_team_id AND owner_id = v_caller_id
  ) INTO v_is_authorized;

  -- If not owner, check if caller is team admin
  IF NOT v_is_authorized THEN
    SELECT EXISTS(
      SELECT 1 FROM team_members 
      WHERE team_id = p_team_id 
      AND user_id = v_caller_id 
      AND role IN ('admin', 'owner') 
      AND status = 'active'
    ) INTO v_is_authorized;
  END IF;

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  -- Return team members
  RETURN QUERY
  SELECT 
    tm.user_id,
    up.name,
    tm.role,
    tm.status
  FROM team_members tm
  JOIN user_profiles up ON up.id = tm.user_id
  WHERE tm.team_id = p_team_id
    AND tm.status = 'active'
  ORDER BY 
    CASE tm.role 
      WHEN 'owner' THEN 1 
      WHEN 'admin' THEN 2 
      ELSE 3 
    END,
    up.name;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_study_assignment(UUID, UUID, DATE, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_assignment_completion(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_team_members_for_assignments(UUID) TO authenticated;