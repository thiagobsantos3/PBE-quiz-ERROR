/*
  # Seed initial data

  1. Insert sample questions from mock data
  2. Create initial admin user profile (will be created when first admin signs up)
  
  Note: User accounts, teams, and other user-specific data will be created
  through the application when users sign up and use the system.
*/

-- Insert sample questions (from your mock data)
INSERT INTO questions (book_of_bible, chapter, question, answer, points, time_to_answer, tier, created_by) VALUES
  ('Ruth', 1, 'What was the name of Naomi''s husband?', 'Elimelech', 10, 30, 'free', NULL),
  ('Ruth', 1, 'What were the names of Naomi''s two sons?', 'Mahlon and Chilion', 15, 45, 'pro', NULL),
  ('Ruth', 2, 'In whose field did Ruth glean?', 'Boaz', 10, 30, 'free', NULL),
  ('Ruth', 3, 'What did Boaz give Ruth before she left the threshing floor?', 'Six measures of barley', 20, 60, 'enterprise', NULL),
  ('Ruth', 4, 'What was the name of the son born to Ruth and Boaz?', 'Obed', 15, 45, 'pro', NULL),
  ('Esther', 1, 'What was the name of King Ahasuerus''s first queen?', 'Vashti', 10, 30, 'free', NULL),
  ('Esther', 2, 'What was Esther''s Hebrew name?', 'Hadassah', 15, 45, 'pro', NULL),
  ('Esther', 3, 'What was the name of the man who plotted to destroy the Jews?', 'Haman', 10, 30, 'free', NULL),
  ('Esther', 4, 'Who told Esther about Haman''s plot?', 'Mordecai', 10, 30, 'free', NULL),
  ('Esther', 5, 'What did Esther request when the king asked what she wanted?', 'For the king and Haman to come to a banquet', 15, 45, 'pro', NULL),
  ('Daniel', 1, 'What were the names of Daniel''s three friends?', 'Hananiah, Mishael, and Azariah', 20, 60, 'enterprise', NULL),
  ('Daniel', 2, 'What did Nebuchadnezzar dream about?', 'A great statue made of different materials', 15, 45, 'pro', NULL),
  ('Daniel', 3, 'What were the Babylonian names given to Daniel''s three friends?', 'Shadrach, Meshach, and Abednego', 15, 45, 'pro', NULL),
  ('Daniel', 6, 'How many times a day did Daniel pray?', 'Three times', 10, 30, 'free', NULL)
ON CONFLICT DO NOTHING;

-- Note: Additional sample questions can be added here
-- The application will handle creating user profiles, teams, and assignments
-- when users sign up and start using the system