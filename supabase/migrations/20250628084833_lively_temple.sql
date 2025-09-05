/*
  # Add RLS policies for teams table

  1. Security
    - Add policy for authenticated users to insert teams where they are the owner
    - Add policy for team owners to read their own teams
    - Add policy for team owners to update their own teams
    - Add policy for team owners to delete their own teams
*/

-- Policy for inserting teams (allows authenticated users to create teams where they are the owner)
CREATE POLICY "Users can create teams where they are owner"
  ON teams
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- Policy for reading teams (allows team owners and members to read team data)
CREATE POLICY "Users can read teams they own or are members of"
  ON teams
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = owner_id OR
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = teams.id
      AND team_members.user_id = auth.uid()
      AND team_members.status = 'active'
    )
  );

-- Policy for updating teams (allows team owners to update their teams)
CREATE POLICY "Team owners can update their teams"
  ON teams
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Policy for deleting teams (allows team owners to delete their teams)
CREATE POLICY "Team owners can delete their teams"
  ON teams
  FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);