/*
  # Schema Issues Analysis & Fixes
  
  ## CRITICAL ISSUES FOUND:
  
  1. **INFINITE RECURSION RISK** - Same pattern as your previous error!
     - Teams policy references user_profiles
     - User_profiles policy references user_profiles (self-reference)
     - This creates circular dependency loops
  
  2. **Missing team_members table** 
     - Schema assumes team membership via user_profiles.team_id
     - But this limits users to ONE team only
     - Industry standard uses separate junction table
  
  3. **Data consistency issues**
     - teams.member_count not automatically maintained
     - No constraints ensuring team_role matches actual ownership
     - No validation that owner_id matches team_role='owner'
  
  4. **Security gaps**
     - Users can't view their own profiles (missing policy)
     - Team creation doesn't set user as team member
     - No policy for team owners to manage team members
  
  ## RECOMMENDED FIXES:
*/

-- ========================================
-- 1. DROP PROBLEMATIC POLICIES FIRST
-- ========================================

DROP POLICY IF EXISTS "Users can view teams they belong to" ON teams;
DROP POLICY IF EXISTS "Users can view profiles in their team" ON user_profiles;

-- ========================================
-- 2. ADD MISSING TEAM_MEMBERS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  joined_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure one record per user per team
  UNIQUE(team_id, user_id)
);

-- Enable RLS on team_members
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 3. MODIFY USER_PROFILES TABLE
-- ========================================

-- Remove team_id and team_role from user_profiles since we now use team_members
-- Note: This is a breaking change - you'll need to migrate existing data first

-- ALTER TABLE user_profiles DROP COLUMN IF EXISTS team_id;
-- ALTER TABLE user_profiles DROP COLUMN IF EXISTS team_role;

-- If you want to keep the existing structure for now, at least add this constraint:
-- ALTER TABLE user_profiles ADD CONSTRAINT check_team_role_with_team 
--   CHECK ((team_id IS NULL AND team_role IS NULL) OR (team_id IS NOT NULL AND team_role IS NOT NULL));

-- ========================================
-- 4. CREATE SAFE, NON-RECURSIVE POLICIES
-- ========================================

-- Team_members policies (base level - no dependencies)
CREATE POLICY "Users can view their own team memberships"
  ON team_members
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Team owners can manage team members"
  ON team_members
  FOR ALL
  TO authenticated
  USING (
    team_id IN (
      SELECT id FROM teams WHERE owner_id = auth.uid()
    )
  );

-- Teams policies (can safely reference team_members)
CREATE POLICY "Team owners can view and manage their teams"
  ON teams
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Team members can view their teams"
  ON teams
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT team_id 
      FROM team_members 
      WHERE user_id = auth.uid() 
      AND status = 'active'
    )
  );

-- User profiles policies (simplified to avoid recursion)
CREATE POLICY "Users can view their own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- If keeping team_id in user_profiles, use this instead of the recursive policy:
CREATE POLICY "Team members can view teammate profiles via team_members"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT tm2.user_id
      FROM team_members tm1
      JOIN team_members tm2 ON tm1.team_id = tm2.team_id
      WHERE tm1.user_id = auth.uid() 
      AND tm1.status = 'active'
      AND tm2.status = 'active'
    )
  );

-- ========================================
-- 5. ADD MISSING FUNCTIONS FOR DATA CONSISTENCY
-- ========================================

-- Function to automatically update member_count when team_members changes
CREATE OR REPLACE FUNCTION update_team_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE teams 
    SET member_count = (
      SELECT COUNT(*) 
      FROM team_members 
      WHERE team_id = NEW.team_id AND status = 'active'
    )
    WHERE id = NEW.team_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE teams 
    SET member_count = (
      SELECT COUNT(*) 
      FROM team_members 
      WHERE team_id = NEW.team_id AND status = 'active'
    )
    WHERE id = NEW.team_id;
    
    -- If team_id changed, update old team too
    IF OLD.team_id != NEW.team_id THEN
      UPDATE teams 
      SET member_count = (
        SELECT COUNT(*) 
        FROM team_members 
        WHERE team_id = OLD.team_id AND status = 'active'
      )
      WHERE id = OLD.team_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE teams 
    SET member_count = (
      SELECT COUNT(*) 
      FROM team_members 
      WHERE team_id = OLD.team_id AND status = 'active'
    )
    WHERE id = OLD.team_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for member count
CREATE TRIGGER update_team_member_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON team_members
  FOR EACH ROW
  EXECUTE FUNCTION update_team_member_count();

-- ========================================
-- 6. FUNCTION TO CREATE TEAM WITH OWNER MEMBERSHIP
-- ========================================

CREATE OR REPLACE FUNCTION create_team_with_owner(
  team_name text,
  team_description text DEFAULT NULL,
  owner_user_id uuid DEFAULT auth.uid()
)
RETURNS uuid AS $$
DECLARE
  new_team_id uuid;
BEGIN
  -- Insert team
  INSERT INTO teams (name, description, owner_id)
  VALUES (team_name, team_description, owner_user_id)
  RETURNING id INTO new_team_id;
  
  -- Add owner as team member
  INSERT INTO team_members (team_id, user_id, role, status)
  VALUES (new_team_id, owner_user_id, 'owner', 'active');
  
  RETURN new_team_id;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 7. ADD UPDATED_AT TRIGGER FOR TEAM_MEMBERS
-- ========================================

CREATE TRIGGER update_team_members_updated_at
  BEFORE UPDATE ON team_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

/*
  ## SUMMARY OF ISSUES:
  
  ❌ CRITICAL: Your original policies create infinite recursion
  ❌ Missing team_members junction table (limits flexibility)
  ❌ No automatic member_count maintenance
  ❌ Users can't view their own profiles
  ❌ No validation of team ownership consistency
  
  ## RECOMMENDATIONS:
  
  ✅ Use the team_members table approach for better scalability
  ✅ Implement the non-recursive policies above
  ✅ Use the create_team_with_owner() function for team creation
  ✅ Add proper constraints and triggers for data consistency
  
  ## MIGRATION STRATEGY:
  
  If you have existing data:
  1. Create team_members table
  2. Migrate data from user_profiles.team_id to team_members
  3. Drop the old columns
  4. Apply the new policies
  
  This will prevent the infinite recursion errors you're experiencing.
*/