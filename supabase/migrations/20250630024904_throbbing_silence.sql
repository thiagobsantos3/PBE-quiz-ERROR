/*
  # Fix infinite recursion in teams RLS policies

  1. Problem
    - The current teams RLS policies create infinite recursion when querying user_profiles with teams
    - Policy "Team owners only can access teams" uses uid() = owner_id which works fine
    - But when user_profiles joins with teams, it creates a circular reference

  2. Solution
    - Simplify the teams policies to avoid circular references
    - Remove complex subqueries that might cause recursion
    - Use direct column comparisons where possible

  3. Changes
    - Drop existing problematic policies
    - Create new simplified policies that avoid recursion
    - Ensure team owners can still access their teams
    - Allow public access for valid invitations without complex subqueries
*/

-- Drop existing policies that might cause recursion
DROP POLICY IF EXISTS "Team owners only can access teams" ON teams;
DROP POLICY IF EXISTS "Allow public team info for valid invitations" ON teams;

-- Create simplified policies that avoid recursion

-- Policy 1: Team owners can access their teams (direct column comparison)
CREATE POLICY "Team owners can access their teams"
  ON teams
  FOR ALL
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Policy 2: Allow public access to team info for valid invitations (simplified)
-- This policy allows access to teams when there's a valid pending invitation
-- We use a simpler approach that doesn't create circular references
CREATE POLICY "Public access for valid invitations"
  ON teams
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM team_invitations ti 
      WHERE ti.team_id = teams.id 
        AND ti.status = 'pending' 
        AND ti.expires_at > now()
    )
  );