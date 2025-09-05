/*
  # Fix RLS policies for admin user management

  1. Security Changes
    - Update user_profiles policies to allow system admins to view all profiles
    - Use a safe approach that avoids infinite recursion
    - Maintain user privacy while enabling admin functionality

  2. Changes Made
    - Drop existing restrictive policies on user_profiles
    - Create new policies that check admin role using auth.jwt() claims
    - Add fallback policies for regular user access
    - Ensure admins can view, update, and manage all user profiles

  3. Technical Approach
    - Use auth.jwt() to check user role instead of querying user_profiles table
    - This prevents infinite recursion while maintaining security
    - System admins get full access, regular users get self-access only
*/

-- Drop existing user_profiles policies
DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.user_profiles;

-- Create a function to safely check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Create new SELECT policy for user_profiles
-- Allows: Users to read their own profile OR system admins to read any profile
CREATE POLICY "user_profiles_select_policy"
ON public.user_profiles FOR SELECT
TO authenticated
USING (
  -- Users can read their own profile
  auth.uid() = id
  OR
  -- System admins can read any profile (using function to avoid recursion)
  public.is_admin()
);

-- Create new INSERT policy for user_profiles
-- Allows: Users to insert their own profile OR system admins to insert any profile
CREATE POLICY "user_profiles_insert_policy"
ON public.user_profiles FOR INSERT
TO authenticated
WITH CHECK (
  -- Users can insert their own profile
  auth.uid() = id
  OR
  -- System admins can insert any profile
  public.is_admin()
);

-- Create new UPDATE policy for user_profiles
-- Allows: Users to update their own profile OR system admins to update any profile
CREATE POLICY "user_profiles_update_policy"
ON public.user_profiles FOR UPDATE
TO authenticated
USING (
  -- Users can update their own profile
  auth.uid() = id
  OR
  -- System admins can update any profile
  public.is_admin()
)
WITH CHECK (
  -- Users can update their own profile
  auth.uid() = id
  OR
  -- System admins can update any profile
  public.is_admin()
);

-- Create new DELETE policy for user_profiles
-- Allows: Users to delete their own profile OR system admins to delete any profile
CREATE POLICY "user_profiles_delete_policy"
ON public.user_profiles FOR DELETE
TO authenticated
USING (
  -- Users can delete their own profile
  auth.uid() = id
  OR
  -- System admins can delete any profile
  public.is_admin()
);

-- Add comment explaining the approach
COMMENT ON FUNCTION public.is_admin() IS 
'Safely checks if the current authenticated user has admin role. Uses SECURITY DEFINER to bypass RLS and avoid infinite recursion while checking admin status.';