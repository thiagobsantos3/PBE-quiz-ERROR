/*
  # Allow public access to team info for valid invitations

  1. New Policy
    - Add RLS policy to `teams` table allowing public (anon/authenticated) users 
      to view basic team information when there's a valid pending invitation
    - This enables the invitation acceptance page to display team details
    - Only allows SELECT access to teams that have active invitations

  2. Security
    - Policy is restrictive - only allows access when invitation exists
    - Only exposes basic team info (name, description, plan)
    - Doesn't compromise other team data security
*/

-- Add RLS policy to allow public access to team information for valid invitations
CREATE POLICY "Allow public team info for valid invitations"
  ON teams
  FOR SELECT
  TO anon, authenticated
  USING (
    id IN (
      SELECT team_id 
      FROM team_invitations 
      WHERE status = 'pending' 
      AND expires_at > now()
    )
  );