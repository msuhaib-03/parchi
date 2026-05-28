-- ═══════════════════════════════════════════════════════════════════════════════
-- PARCHI — Seed Data (for local development / testing only)
-- Run AFTER schema.sql
-- NOTE: These insert directly into profiles, bypassing auth.users
--       Only use for testing UI — real users come through Supabase Auth
-- ═══════════════════════════════════════════════════════════════════════════════

-- Sample alumni
INSERT INTO profiles (id, email, full_name, role, department, batch_year, current_company, current_role, bio, is_open_to_referrals, linkedin_url) VALUES
  ('00000000-0000-0000-0000-000000000001', 'ali.hassan@maju.edu.pk', 'Ali Hassan', 'alumni', 'Computer Science', 2020, 'Systems Limited', 'Software Engineer', 'MAJU CS grad working at Systems. Happy to help juniors with referrals!', true, 'https://linkedin.com/in/alihassan'),
  ('00000000-0000-0000-0000-000000000002', 'sara.khan@maju.edu.pk', 'Sara Khan', 'alumni', 'Business Administration', 2019, 'Unilever Pakistan', 'Brand Manager', 'MBA track, now in FMCG. Reach out for BBA/MBA career questions.', true, 'https://linkedin.com/in/sarakhan'),
  ('00000000-0000-0000-0000-000000000003', 'usman.malik@maju.edu.pk', 'Usman Malik', 'alumni', 'Computer Science', 2021, 'Arbisoft', 'Full Stack Developer', 'Django + React dev. Open to referrals for Arbisoft openings.', true, 'https://linkedin.com/in/usmanmalik')
ON CONFLICT (id) DO NOTHING;

-- Sample students
INSERT INTO profiles (id, email, full_name, role, department, batch_year, skills) VALUES
  ('00000000-0000-0000-0000-000000000010', 'fa22bscs0001@maju.edu.pk', 'Zara Ahmed', 'student', 'Computer Science', 2022, ARRAY['React', 'Node.js', 'Python']),
  ('00000000-0000-0000-0000-000000000011', 'fa22bba0001@maju.edu.pk', 'Hamza Siddiqui', 'student', 'Business Administration', 2022, ARRAY['Marketing', 'Excel', 'Canva'])
ON CONFLICT (id) DO NOTHING;
