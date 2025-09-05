/*
  # Add RLS policies for subscriptions table

  1. Security
    - Add policy for authenticated users to insert their own subscription
    - Add policy for authenticated users to read their own subscription
    - Add policy for authenticated users to update their own subscription
    - Add policy for authenticated users to delete their own subscription

  This fixes the signup error where users cannot create subscription records
  due to missing RLS policies on the subscriptions table.
*/

-- Allow authenticated users to insert their own subscription
CREATE POLICY "Users can insert their own subscription"
  ON subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to read their own subscription
CREATE POLICY "Users can read their own subscription"
  ON subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow authenticated users to update their own subscription
CREATE POLICY "Users can update their own subscription"
  ON subscriptions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to delete their own subscription
CREATE POLICY "Users can delete their own subscription"
  ON subscriptions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);