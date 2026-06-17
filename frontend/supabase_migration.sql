-- ============================================================
-- Parchi Platform — Feature Expansion Migration
-- Run this in your Supabase SQL Editor (Dashboard → SQL)
-- ============================================================

-- ─── 1. Extend profiles table ────────────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS student_id    TEXT,
  ADD COLUMN IF NOT EXISTS github_url    TEXT,
  ADD COLUMN IF NOT EXISTS portfolio_url TEXT;

-- ─── 2. Jobs board ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jobs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  posted_by    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  company      TEXT NOT NULL,
  description  TEXT NOT NULL,
  requirements TEXT,
  job_type     TEXT NOT NULL DEFAULT 'full-time',
  location     TEXT,
  is_remote    BOOLEAN NOT NULL DEFAULT false,
  apply_url    TEXT,
  apply_email  TEXT,
  tags         TEXT[],
  deadline     TIMESTAMPTZ,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 3. Job applications ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS job_applications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  applicant_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cover_letter  TEXT,
  status        TEXT NOT NULL DEFAULT 'applied',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, applicant_id)
);

-- ─── 4. Notifications ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT,
  link       TEXT,
  is_read    BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 5. Blog / Knowledge posts ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS posts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  slug             TEXT UNIQUE NOT NULL,
  body             TEXT NOT NULL,
  excerpt          TEXT,
  tags             TEXT[],
  post_type        TEXT NOT NULL DEFAULT 'blog',
  cover_image_url  TEXT,
  is_published     BOOLEAN NOT NULL DEFAULT false,
  published_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 6. Enable Row Level Security ────────────────────────────────────────────
ALTER TABLE jobs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts             ENABLE ROW LEVEL SECURITY;

-- ─── 7. RLS Policies: jobs ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "jobs_select"  ON jobs;
DROP POLICY IF EXISTS "jobs_insert"  ON jobs;
DROP POLICY IF EXISTS "jobs_update"  ON jobs;
DROP POLICY IF EXISTS "jobs_delete"  ON jobs;

CREATE POLICY "jobs_select" ON jobs FOR SELECT
  USING (is_active = true OR auth.uid() = posted_by);

CREATE POLICY "jobs_insert" ON jobs FOR INSERT WITH CHECK (
  auth.uid() = posted_by
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('alumni', 'teacher')
  )
);

CREATE POLICY "jobs_update" ON jobs FOR UPDATE
  USING (auth.uid() = posted_by);

CREATE POLICY "jobs_delete" ON jobs FOR DELETE
  USING (auth.uid() = posted_by);

-- ─── 8. RLS Policies: job_applications ───────────────────────────────────────
DROP POLICY IF EXISTS "apps_insert"       ON job_applications;
DROP POLICY IF EXISTS "apps_select_mine"  ON job_applications;
DROP POLICY IF EXISTS "apps_select_jobs"  ON job_applications;
DROP POLICY IF EXISTS "apps_update"       ON job_applications;

CREATE POLICY "apps_insert" ON job_applications FOR INSERT
  WITH CHECK (auth.uid() = applicant_id);

CREATE POLICY "apps_select_mine" ON job_applications FOR SELECT
  USING (auth.uid() = applicant_id);

CREATE POLICY "apps_select_jobs" ON job_applications FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM jobs WHERE id = job_id AND posted_by = auth.uid()
  ));

CREATE POLICY "apps_update" ON job_applications FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM jobs WHERE id = job_id AND posted_by = auth.uid()
  ));

-- ─── 9. RLS Policies: notifications ──────────────────────────────────────────
DROP POLICY IF EXISTS "notifs_select" ON notifications;
DROP POLICY IF EXISTS "notifs_insert" ON notifications;
DROP POLICY IF EXISTS "notifs_update" ON notifications;

CREATE POLICY "notifs_select" ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "notifs_insert" ON notifications FOR INSERT
  WITH CHECK (true);   -- triggered by DB functions

CREATE POLICY "notifs_update" ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- ─── 10. RLS Policies: posts ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "posts_select"  ON posts;
DROP POLICY IF EXISTS "posts_insert"  ON posts;
DROP POLICY IF EXISTS "posts_update"  ON posts;
DROP POLICY IF EXISTS "posts_delete"  ON posts;

CREATE POLICY "posts_select" ON posts FOR SELECT
  USING (is_published = true OR auth.uid() = author_id);

CREATE POLICY "posts_insert" ON posts FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "posts_update" ON posts FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "posts_delete" ON posts FOR DELETE
  USING (auth.uid() = author_id);

-- ─── 11. Trigger: notify alumni on new referral request ──────────────────────
CREATE OR REPLACE FUNCTION notify_on_referral_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  req_name TEXT;
BEGIN
  SELECT full_name INTO req_name FROM profiles WHERE id = NEW.requester_id;
  INSERT INTO notifications(user_id, type, title, body, link)
  VALUES (
    NEW.alumni_id,
    'referral_received',
    'New referral request',
    req_name || ' wants a referral at ' || NEW.company,
    '/referrals'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_referral_request ON referral_requests;
CREATE TRIGGER trg_notify_referral_request
  AFTER INSERT ON referral_requests
  FOR EACH ROW EXECUTE FUNCTION notify_on_referral_request();

-- ─── 12. Trigger: notify requester on status update ──────────────────────────
CREATE OR REPLACE FUNCTION notify_on_referral_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.status <> OLD.status THEN
    INSERT INTO notifications(user_id, type, title, body, link)
    VALUES (
      NEW.requester_id,
      'referral_updated',
      CASE NEW.status
        WHEN 'accepted' THEN 'Referral request accepted'
        WHEN 'referred' THEN 'You have been referred!'
        WHEN 'declined' THEN 'Referral request declined'
        ELSE 'Referral status updated'
      END,
      'Your request for ' || NEW.company || ' is now: ' || NEW.status,
      '/referrals'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_referral_status ON referral_requests;
CREATE TRIGGER trg_notify_referral_status
  AFTER UPDATE ON referral_requests
  FOR EACH ROW EXECUTE FUNCTION notify_on_referral_status();

-- ─── 13. Trigger: notify applicant on application status change ───────────────
CREATE OR REPLACE FUNCTION notify_on_app_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  job_title TEXT;
BEGIN
  IF NEW.status <> OLD.status THEN
    SELECT j.title INTO job_title FROM jobs j WHERE j.id = NEW.job_id;
    INSERT INTO notifications(user_id, type, title, body, link)
    VALUES (
      NEW.applicant_id,
      'application_update',
      'Application update',
      'Your application for "' || job_title || '" is now: ' || NEW.status,
      '/jobs'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_app_status ON job_applications;
CREATE TRIGGER trg_notify_app_status
  AFTER UPDATE ON job_applications
  FOR EACH ROW EXECUTE FUNCTION notify_on_app_status();

-- ─── 14. Indexes ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_jobs_posted_by   ON jobs(posted_by);
CREATE INDEX IF NOT EXISTS idx_jobs_is_active   ON jobs(is_active);
CREATE INDEX IF NOT EXISTS idx_apps_job_id      ON job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_apps_applicant   ON job_applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_notifs_user_id   ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_posts_author     ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_published  ON posts(is_published, published_at DESC);
