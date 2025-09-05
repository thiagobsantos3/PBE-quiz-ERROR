/*
  # Add email column to user_profiles table

  1. Schema Changes
    - Add `email` column to `user_profiles` table
    - Add unique constraint on email
    - Add email format validation
    - Set email as NOT NULL after backfilling

  2. Data Migration
    - Backfill existing user emails from auth.users
    - Ensure data consistency

  3. Security
    - Maintain existing RLS policies
    - Email column inherits table-level security
*/

-- Add email column to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN email text;

-- Backfill existing user emails from auth.users
UPDATE public.user_profiles
SET email = auth.users.email
FROM auth.users
WHERE public.user_profiles.id = auth.users.id;

-- Add constraints after backfilling
ALTER TABLE public.user_profiles
ADD CONSTRAINT user_profiles_email_key UNIQUE (email);

-- Add email format validation
ALTER TABLE public.user_profiles
ADD CONSTRAINT user_profiles_email_format_check 
CHECK (email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}$');

-- Make email NOT NULL after backfilling
ALTER TABLE public.user_profiles
ALTER COLUMN email SET NOT NULL;