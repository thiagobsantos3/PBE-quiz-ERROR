/*
  # Create demo data structure (without auth user dependencies)
  
  This migration creates the basic data structure for demo purposes.
  
  IMPORTANT: To complete the demo setup, you need to:
  1. Create auth users through the Supabase dashboard or signup page:
     - admin@example.com (password: password)
     - user@example.com (password: password)
  2. After creating auth users, run the following SQL in the Supabase SQL editor
     to link them to the demo data:
     
     -- Get the actual auth user IDs
     -- UPDATE user_profiles SET id = (SELECT id FROM auth.users WHERE email = 'admin@example.com') WHERE name = 'Demo Admin';
     -- UPDATE user_profiles SET id = (SELECT id FROM auth.users WHERE email = 'user@example.com') WHERE name = 'Demo User';
     -- UPDATE teams SET owner_id = (SELECT id FROM auth.users WHERE email = 'admin@example.com') WHERE name = 'Admin Team';
     -- UPDATE teams SET owner_id = (SELECT id FROM auth.users WHERE email = 'user@example.com') WHERE name = 'User Team';
     -- UPDATE subscriptions SET user_id = (SELECT id FROM auth.users WHERE email = 'admin@example.com') WHERE plan = 'enterprise';
     -- UPDATE subscriptions SET user_id = (SELECT id FROM auth.users WHERE email = 'user@example.com') WHERE plan = 'free';
     -- UPDATE team_members SET user_id = (SELECT id FROM auth.users WHERE email = 'admin@example.com'), invited_by = (SELECT id FROM auth.users WHERE email = 'admin@example.com') WHERE role = 'owner' AND team_id IN (SELECT id FROM teams WHERE name = 'Admin Team');
     -- UPDATE team_members SET user_id = (SELECT id FROM auth.users WHERE email = 'user@example.com'), invited_by = (SELECT id FROM auth.users WHERE email = 'user@example.com') WHERE role = 'owner' AND team_id IN (SELECT id FROM teams WHERE name = 'User Team');
*/

-- Generate consistent UUIDs for demo data
DO $$
DECLARE
  admin_user_id uuid := '550e8400-e29b-41d4-a716-446655440001'::uuid;
  user_user_id uuid := '550e8400-e29b-41d4-a716-446655440002'::uuid;
  admin_team_id uuid := '550e8400-e29b-41d4-a716-446655440003'::uuid;
  user_team_id uuid := '550e8400-e29b-41d4-a716-446655440004'::uuid;
BEGIN
  -- Create user profiles first (without foreign key constraints to auth.users)
  INSERT INTO user_profiles (id, name, role, team_id, team_role)
  VALUES 
    (
      admin_user_id,
      'Demo Admin',
      'admin',
      admin_team_id,
      'owner'
    ),
    (
      user_user_id,
      'Demo User',
      'user',
      user_team_id,
      'owner'
    )
  ON CONFLICT (id) DO NOTHING;

  -- Create teams (these will initially have invalid owner_ids, to be fixed later)
  INSERT INTO teams (id, name, description, owner_id, plan, member_count, max_members)
  VALUES (
    admin_team_id,
    'Admin Team',
    'Demo admin team',
    admin_user_id,
    'enterprise',
    1,
    50
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO teams (id, name, description, owner_id, plan, member_count, max_members)
  VALUES (
    user_team_id,
    'User Team',
    'Demo user team',
    user_user_id,
    'free',
    1,
    5
  ) ON CONFLICT (id) DO NOTHING;

  -- Create subscriptions (these will initially have invalid user_ids, to be fixed later)
  INSERT INTO subscriptions (user_id, plan, status, current_period_end, cancel_at_period_end)
  VALUES 
    (
      admin_user_id,
      'enterprise',
      'active',
      (now() + interval '1 year'),
      false
    ),
    (
      user_user_id,
      'free',
      'active',
      (now() + interval '1 month'),
      false
    )
  ON CONFLICT (user_id) DO NOTHING;

  -- Create team memberships (these will initially have invalid user_ids, to be fixed later)
  INSERT INTO team_members (user_id, team_id, role, status, invited_by)
  VALUES 
    (
      admin_user_id,
      admin_team_id,
      'owner',
      'active',
      admin_user_id
    ),
    (
      user_user_id,
      user_team_id,
      'owner',
      'active',
      user_user_id
    )
  ON CONFLICT (user_id, team_id) DO NOTHING;

EXCEPTION
  WHEN foreign_key_violation THEN
    -- If foreign key constraints prevent insertion, create a note for manual setup
    RAISE NOTICE 'Demo data creation requires auth users to be created first. Please create auth users and then update the records manually.';
END $$;