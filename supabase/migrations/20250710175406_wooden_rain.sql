/*
  # Fix infinite recursion in user_profiles RLS policies

  1. Problem
    - Current policies check for admin role by querying user_profiles table
    - This creates infinite recursion when the policy tries to evaluate itself
    
  2. Solution
    - Simplify policies to avoid self-referential queries
    - Use direct user ID checks instead of role-based checks where possible
    - Create separate, simpler policies for basic operations
    
  3. Changes
    - Drop existing problematic policies
    - Create new simplified policies that avoid recursion
    - Ensure users can read/update their own data
    - Allow authenticated users basic access without complex role checks
*/

-- Drop existing policies that cause infinite recursion
DROP POLICY IF EXISTS "user_profiles_delete_policy" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_policy" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_select_policy" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_policy" ON user_profiles;

-- Create new simplified policies without recursion

-- Allow users to read their own profile
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow users to insert their own profile (for signup)
CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow users to delete their own profile
CREATE POLICY "Users can delete own profile"
  ON user_profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- Note: Admin functionality will need to be handled differently
-- Consider using service role key for admin operations or
-- implementing admin checks in application logic rather than RLS policies