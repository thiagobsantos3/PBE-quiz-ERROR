/*
  # Create function to accept team invitations

  1. Function
    - `accept_team_invitation` - Handles the complete invitation acceptance process
    - Validates invitation exists and is valid
    - Creates team membership
    - Updates user profile with team info
    - Marks invitation as accepted

  2. Security
    - Function runs with SECURITY DEFINER to access all tables
    - Validates user permissions and invitation ownership
    - Prevents duplicate memberships
*/

CREATE OR REPLACE FUNCTION accept_team_invitation(p_invitation_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_invitation RECORD;
  v_existing_member_id UUID;
  v_team_member_count INTEGER;
  v_team_max_members INTEGER;
  v_result JSON;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get the invitation details
  SELECT 
    ti.*,
    t.max_members,
    t.member_count,
    t.name as team_name
  INTO v_invitation
  FROM team_invitations ti
  JOIN teams t ON ti.team_id = t.id
  WHERE ti.id = p_invitation_id
    AND ti.status = 'pending'
    AND ti.expires_at > NOW();

  IF v_invitation IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invitation not found or expired');
  END IF;

  -- Verify the invitation is for the current user's email
  IF v_invitation.email != (SELECT email FROM auth.users WHERE id = v_user_id) THEN
    RETURN json_build_object('success', false, 'error', 'This invitation is not for your email address');
  END IF;

  -- Check if user is already a member of this team
  SELECT id INTO v_existing_member_id
  FROM team_members
  WHERE team_id = v_invitation.team_id AND user_id = v_user_id;

  IF v_existing_member_id IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'You are already a member of this team');
  END IF;

  -- Check team capacity
  IF v_invitation.member_count >= v_invitation.max_members THEN
    RETURN json_build_object('success', false, 'error', 'Team has reached maximum capacity');
  END IF;

  -- Start transaction
  BEGIN
    -- Create team membership
    INSERT INTO team_members (
      user_id,
      team_id,
      role,
      status,
      invited_by,
      joined_at
    ) VALUES (
      v_user_id,
      v_invitation.team_id,
      v_invitation.role,
      'active',
      v_invitation.invited_by,
      NOW()
    );

    -- Update user profile with team information
    UPDATE user_profiles
    SET 
      team_id = v_invitation.team_id,
      team_role = v_invitation.role,
      updated_at = NOW()
    WHERE id = v_user_id;

    -- Mark invitation as accepted
    UPDATE team_invitations
    SET 
      status = 'accepted',
      updated_at = NOW()
    WHERE id = p_invitation_id;

    -- Update team member count
    UPDATE teams
    SET 
      member_count = member_count + 1,
      updated_at = NOW()
    WHERE id = v_invitation.team_id;

    -- Return success
    RETURN json_build_object(
      'success', true,
      'team_id', v_invitation.team_id,
      'team_name', v_invitation.team_name,
      'role', v_invitation.role,
      'message', 'Successfully joined the team'
    );

  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback will happen automatically
      RETURN json_build_object('success', false, 'error', 'Failed to join team: ' || SQLERRM);
  END;

END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION accept_team_invitation(UUID) TO authenticated;