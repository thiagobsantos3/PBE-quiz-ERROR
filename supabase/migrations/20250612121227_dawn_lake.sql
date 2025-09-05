/*
  # Create team members and invitations schema

  1. New Tables
    - `team_members`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `team_id` (uuid, references teams)
      - `role` (text, enum: owner, admin, member)
      - `status` (text, enum: active, pending, suspended)
      - `invited_by` (uuid, references auth.users, nullable)
      - `joined_at` (timestamp)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `team_invitations`
      - `id` (uuid, primary key)
      - `team_id` (uuid, references teams)
      - `email` (text)
      - `role` (text, enum: owner, admin, member)
      - `invited_by` (uuid, references auth.users)
      - `token` (text, unique)
      - `status` (text, enum: pending, accepted, declined, expired)
      - `expires_at` (timestamp)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for team members to view team data
    - Add policies for team owners/admins to manage invitations
*/

-- Create team_members table
CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'suspended')),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  joined_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, team_id)
);

-- Create team_invitations table
CREATE TABLE IF NOT EXISTS team_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  invited_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_team ON team_members(user_id, team_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_team_id ON team_invitations(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_status ON team_invitations(status);

-- Enable RLS
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- Team members policies
CREATE POLICY "Users can view team members in their teams"
  ON team_members
  FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team owners and admins can manage team members"
  ON team_members
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
  )
  WITH CHECK (
    team_id IN (
      SELECT tm.team_id 
      FROM team_members tm 
      WHERE tm.user_id = auth.uid() 
      AND tm.role IN ('owner', 'admin')
      AND tm.status = 'active'
    )
  );

CREATE POLICY "Users can insert themselves as team members when accepting invitations"
  ON team_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() 
    AND status = 'active'
    AND EXISTS (
      SELECT 1 FROM team_invitations ti
      WHERE ti.team_id = team_members.team_id
      AND ti.status = 'pending'
      AND ti.expires_at > now()
      AND ti.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Team invitations policies
CREATE POLICY "Team members can view invitations for their teams"
  ON team_invitations
  FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Team owners and admins can manage invitations"
  ON team_invitations
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
  )
  WITH CHECK (
    team_id IN (
      SELECT tm.team_id 
      FROM team_members tm 
      WHERE tm.user_id = auth.uid() 
      AND tm.role IN ('owner', 'admin')
      AND tm.status = 'active'
    )
  );

CREATE POLICY "Invited users can view their own invitations"
  ON team_invitations
  FOR SELECT
  TO authenticated
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND status = 'pending'
    AND expires_at > now()
  );

CREATE POLICY "Invited users can update their invitation status"
  ON team_invitations
  FOR UPDATE
  TO authenticated
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND status = 'pending'
    AND expires_at > now()
  )
  WITH CHECK (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND status IN ('accepted', 'declined')
  );

-- Add updated_at triggers
CREATE TRIGGER update_team_members_updated_at
  BEFORE UPDATE ON team_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_invitations_updated_at
  BEFORE UPDATE ON team_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically expire old invitations
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE team_invitations
  SET status = 'expired', updated_at = now()
  WHERE status = 'pending' AND expires_at < now();
END;
$$;

-- Optional: Create a scheduled job to run this function periodically
-- This would depend on your PostgreSQL setup (pg_cron extension, etc.)
-- COMMENT: Consider running expire_old_invitations() periodically via cron or your application