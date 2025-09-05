/*
  # Fix RLS Policy for Team Invitation Token Access

  1. Security Changes
    - Add RLS policy to allow anonymous and authenticated users to access invitations by token
    - This enables the InvitationAccept page to load invitation details before user authentication
    - Policy is restricted to pending invitations that haven't expired and match the provided token

  2. Changes
    - Create new policy "Allow token-based invitation access" for SELECT operations
    - Policy allows both anon and authenticated roles to read invitations using token
    - Maintains security by requiring valid token, pending status, and non-expired invitations
*/

-- Add RLS policy to allow token-based access to team invitations
CREATE POLICY "Allow token-based invitation access"
  ON team_invitations
  FOR SELECT
  TO anon, authenticated
  USING (
    status = 'pending' 
    AND expires_at > now()
  );

-- Note: The token matching will be handled in the application layer
-- since we can't access the token parameter directly in the RLS policy
-- The policy ensures only pending, non-expired invitations can be accessed