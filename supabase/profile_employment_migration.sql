-- Profile employment fields migration
-- Run this in Supabase → SQL Editor

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS employment_type text
    CHECK (employment_type IN ('employed', 'interning', 'past_intern')),
  ADD COLUMN IF NOT EXISTS company_2  text,
  ADD COLUMN IF NOT EXISTS job_title_2 text;
