/*
  # Add RLS policies for user_profiles table

  1. Security
    - Add policy for users to read their own profile
    - Add policy for users to insert their own profile  
    - Add policy for users to update their own profile
    - Add policy for users to delete their own profile (optional)

  2. Changes
    - CREATE POLICY for SELECT operations on user_profiles
    - CREATE POLICY for INSERT operations on user_profiles
    - CREATE POLICY for UPDATE operations on user_profiles
    - CREATE POLICY for DELETE operations on user_profiles
*/

-- Allow users to read their own profile
CREATE POLICY "Users can read their own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow users to insert their own profile
CREATE POLICY "Users can insert their own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow users to delete their own profile (optional)
CREATE POLICY "Users can delete their own profile"
  ON user_profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = id);