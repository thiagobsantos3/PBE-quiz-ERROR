/*
  # Create secure function to get user name by ID

  1. New Functions
    - `get_user_name_by_id(user_id uuid)` returns text
      - Securely retrieves only the name field from user_profiles
      - Uses SECURITY DEFINER to bypass RLS for this specific query
      - Returns only non-sensitive data (name only)

  2. Security
    - Function runs with elevated privileges but only returns name
    - No exposure of email addresses or other sensitive profile data
    - Maintains privacy while solving the "Unknown User" issue
*/

-- Create function to securely get user name by ID
CREATE OR REPLACE FUNCTION public.get_user_name_by_id(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_name text;
BEGIN
  -- Get the user's name from user_profiles
  SELECT name INTO user_name
  FROM public.user_profiles
  WHERE id = p_user_id;
  
  -- Return the name or 'Unknown User' if not found
  RETURN COALESCE(user_name, 'Unknown User');
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_name_by_id(uuid) TO authenticated;

-- Add comment explaining the function's purpose
COMMENT ON FUNCTION public.get_user_name_by_id(uuid) IS 
'Securely retrieves a user''s name by ID. Uses SECURITY DEFINER to bypass RLS while only exposing non-sensitive name data.';