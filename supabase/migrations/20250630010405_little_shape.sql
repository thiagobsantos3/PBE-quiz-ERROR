/*
  # Create team invitation function

  1. New Functions
    - `invite_team_member` - Securely handles team member invitations
    - Checks for existing users and team members
    - Creates invitations with proper validation
    - Runs with elevated permissions to bypass RLS restrictions

  2. Security
    - Function runs with SECURITY DEFINER to access user data
    - Validates that the caller is a team owner/admin
    - Prevents duplicate invitations and memberships
*/

-- Create function to handle team member invitations
CREATE OR REPLACE FUNCTION invite_team_member(
  p_team_id UUID,
  p_email TEXT,
  p_role TEXT DEFAULT 'member'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_id UUID;
  v_team_owner_id UUID;
  v_caller_team_role TEXT;
  v_existing_user_id UUID;
  v_existing_member_id UUID;
  v_existing_invitation_id UUID;
  v_invitation_id UUID;
  v_result JSON;
BEGIN
  -- Get the caller's user ID
  v_caller_id := auth.uid();
  
  IF v_caller_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check if the caller is the team owner
  SELECT owner_id INTO v_team_owner_id
  FROM teams
  WHERE id = p_team_id;

  IF v_team_owner_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Team not found');
  END IF;

  -- Check if caller is team owner or admin
  IF v_caller_id = v_team_owner_id THEN
    v_caller_team_role := 'owner';
  ELSE
    SELECT role INTO v_caller_team_role
    FROM team_members
    WHERE team_id = p_team_id AND user_id = v_caller_id AND status = 'active';
  END IF;

  IF v_caller_team_role NOT IN ('owner', 'admin') THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient permissions');
  END IF;

  -- Validate role
  IF p_role NOT IN ('admin', 'member') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid role specified');
  END IF;

  -- Check if user already exists (look in auth.users table)
  SELECT id INTO v_existing_user_id
  FROM auth.users
  WHERE email = LOWER(p_email)
  LIMIT 1;

  -- If user exists, check if they're already a team member
  IF v_existing_user_id IS NOT NULL THEN
    SELECT id INTO v_existing_member_id
    FROM team_members
    WHERE team_id = p_team_id AND user_id = v_existing_user_id
    LIMIT 1;

    IF v_existing_member_id IS NOT NULL THEN
      RETURN json_build_object('success', false, 'error', 'User is already a member of this team');
    END IF;
  END IF;

  -- Check for existing pending invitation
  SELECT id INTO v_existing_invitation_id
  FROM team_invitations
  WHERE team_id = p_team_id 
    AND LOWER(email) = LOWER(p_email)
    AND status = 'pending'
    AND expires_at > NOW()
  LIMIT 1;

  IF v_existing_invitation_id IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'An invitation has already been sent to this email address');
  END IF;

  -- Create the invitation
  INSERT INTO team_invitations (
    team_id,
    email,
    role,
    invited_by,
    status,
    expires_at
  ) VALUES (
    p_team_id,
    LOWER(p_email),
    p_role,
    v_caller_id,
    'pending',
    NOW() + INTERVAL '7 days'
  )
  RETURNING id INTO v_invitation_id;

  -- Return success
  RETURN json_build_object(
    'success', true, 
    'invitation_id', v_invitation_id,
    'message', 'Invitation sent successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION invite_team_member(UUID, TEXT, TEXT) TO authenticated;