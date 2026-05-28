-- ═══════════════════════════════════════════════════════════════════════════════
-- PARCHI — Supabase Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── PROFILES ─────────────────────────────────────────────────────────────────
-- Extends Supabase auth.users. One row per registered user.
CREATE TABLE IF NOT EXISTS profiles (
  id                    UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name             TEXT NOT NULL,
  email                 TEXT NOT NULL UNIQUE,
  role                  TEXT NOT NULL CHECK (role IN ('student', 'alumni')),
  department            TEXT NOT NULL,
  batch_year            INTEGER NOT NULL CHECK (batch_year BETWEEN 2000 AND 2035),

  -- Alumni-specific fields
  current_company       TEXT,
  current_role          TEXT,
  linkedin_url          TEXT,
  is_open_to_referrals  BOOLEAN DEFAULT FALSE,

  -- Student-specific fields
  graduation_year       INTEGER,
  skills                TEXT[] DEFAULT '{}',

  -- Shared
  bio                   TEXT CHECK (char_length(bio) <= 500),
  profile_picture_url   TEXT,

  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ─── REFERRAL REQUESTS ────────────────────────────────────────────────────────
-- Student → Alumni referral request
CREATE TABLE IF NOT EXISTS referral_requests (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  alumni_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  company         TEXT NOT NULL,
  role            TEXT NOT NULL,
  job_url         TEXT,
  message         TEXT NOT NULL CHECK (char_length(message) BETWEEN 50 AND 1000),
  resume_url      TEXT,

  status          TEXT DEFAULT 'pending'
                    CHECK (status IN ('pending', 'accepted', 'declined', 'referred')),
  alumni_notes    TEXT CHECK (char_length(alumni_notes) <= 500),

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),

  -- One request per student-alumni-company-role combo
  UNIQUE (requester_id, alumni_id, company, role)
);

-- ─── MESSAGES ─────────────────────────────────────────────────────────────────
-- Async messaging between any two users
CREATE TABLE IF NOT EXISTS messages (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content       TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  is_read       BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),

  CHECK (sender_id <> receiver_id)
);

-- ─── INDEXES ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_role           ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_department     ON profiles(department);
CREATE INDEX IF NOT EXISTS idx_profiles_batch_year     ON profiles(batch_year);
CREATE INDEX IF NOT EXISTS idx_profiles_company        ON profiles(current_company);

CREATE INDEX IF NOT EXISTS idx_referrals_requester     ON referral_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_referrals_alumni        ON referral_requests(alumni_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status        ON referral_requests(status);

CREATE INDEX IF NOT EXISTS idx_messages_sender         ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver       ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_unread         ON messages(receiver_id, is_read) WHERE is_read = FALSE;

-- ─── UPDATED_AT TRIGGER ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_profiles_updated
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();

CREATE TRIGGER on_referrals_updated
  BEFORE UPDATE ON referral_requests
  FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();

-- ─── AUTO-CREATE PROFILE ON SIGNUP ────────────────────────────────────────────
-- Fires whenever a new user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role, department, batch_year)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    COALESCE(NEW.raw_user_meta_data->>'department', 'Undeclared'),
    COALESCE((NEW.raw_user_meta_data->>'batch_year')::INTEGER, EXTRACT(YEAR FROM NOW())::INTEGER)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- ─── CONVERSATIONS HELPER FUNCTION ────────────────────────────────────────────
-- Returns the latest message per conversation partner for a given user
CREATE OR REPLACE FUNCTION get_conversations(user_id UUID)
RETURNS TABLE (
  partner_id            UUID,
  partner_name          TEXT,
  partner_picture_url   TEXT,
  last_message          TEXT,
  last_message_at       TIMESTAMPTZ,
  unread_count          BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH ranked AS (
    SELECT
      CASE WHEN m.sender_id = user_id THEN m.receiver_id ELSE m.sender_id END AS partner,
      m.content,
      m.created_at,
      m.is_read,
      m.receiver_id,
      ROW_NUMBER() OVER (
        PARTITION BY CASE WHEN m.sender_id = user_id THEN m.receiver_id ELSE m.sender_id END
        ORDER BY m.created_at DESC
      ) AS rn
    FROM messages m
    WHERE m.sender_id = user_id OR m.receiver_id = user_id
  )
  SELECT
    r.partner,
    p.full_name,
    p.profile_picture_url,
    r.content,
    r.created_at,
    COUNT(*) FILTER (WHERE r.is_read = FALSE AND r.receiver_id = user_id) AS unread_count
  FROM ranked r
  JOIN profiles p ON p.id = r.partner
  WHERE r.rn = 1
  GROUP BY r.partner, p.full_name, p.profile_picture_url, r.content, r.created_at
  ORDER BY r.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- Controls who can read/write what — enforced at DB level
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_requests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages           ENABLE ROW LEVEL SECURITY;

-- ─── Profiles Policies ────────────────────────────────────────────────────────
-- Anyone logged in can read any profile (it's a networking platform)
CREATE POLICY "profiles_select_authenticated"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can only update their own profile
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Insert handled by trigger (handle_new_user), no direct insert
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- ─── Referral Request Policies ────────────────────────────────────────────────
-- Students see their own requests; alumni see requests sent to them
CREATE POLICY "referrals_select_involved"
  ON referral_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = alumni_id);

-- Only the requester (student) can create
CREATE POLICY "referrals_insert_requester"
  ON referral_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = requester_id);

-- Only the alumni can update (change status)
CREATE POLICY "referrals_update_alumni"
  ON referral_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = alumni_id);

-- ─── Messages Policies ────────────────────────────────────────────────────────
-- Only participants can read their messages
CREATE POLICY "messages_select_participant"
  ON messages FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Any logged-in user can send a message
CREATE POLICY "messages_insert_sender"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

-- Only receiver can mark as read
CREATE POLICY "messages_update_receiver"
  ON messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = receiver_id);
