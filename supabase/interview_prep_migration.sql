-- ============================================================
-- Parchi — Interview Prep Corner: database migration
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- Safe to re-run (idempotent).
--
-- Two content types under one hub:
--   1. interview_experiences — structured interview reports (anyone can post)
--   2. prep_resources        — guides / question banks (alumni & faculty post)
-- Plus a "helpful" voting system for each, with denormalised counters.
-- ============================================================

-- ─── 1. Interview experiences ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS interview_experiences (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company         TEXT NOT NULL,
  role            TEXT NOT NULL,
  department      TEXT,                          -- snapshot of author's dept (for filtering)
  interview_date  TEXT,                          -- free text, e.g. "Jan 2025"
  difficulty      TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy','medium','hard')),
  outcome         TEXT NOT NULL DEFAULT 'in_progress' CHECK (outcome IN ('offer','rejected','in_progress','withdrew')),
  num_rounds      INTEGER CHECK (num_rounds IS NULL OR num_rounds BETWEEN 1 AND 20),
  process         TEXT NOT NULL,                 -- the rounds / overall process
  questions       TEXT NOT NULL,                 -- the actual questions asked
  tips            TEXT,
  tags            TEXT[],
  is_anonymous    BOOLEAN NOT NULL DEFAULT FALSE,
  helpful_count   INTEGER NOT NULL DEFAULT 0,    -- maintained by trigger below
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 2. Prep resources / guides ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prep_resources (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  resource_type   TEXT NOT NULL DEFAULT 'guide'
                    CHECK (resource_type IN ('guide','question_bank','cheatsheet','video','article','course','other')),
  url             TEXT,                          -- optional external link
  description     TEXT NOT NULL,                 -- summary or full inline guide
  tags            TEXT[],
  helpful_count   INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 3. "Helpful" vote tables (one row per user per item) ─────────────────────
CREATE TABLE IF NOT EXISTS interview_experience_helpful (
  experience_id UUID NOT NULL REFERENCES interview_experiences(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (experience_id, user_id)
);

CREATE TABLE IF NOT EXISTS prep_resource_helpful (
  resource_id UUID NOT NULL REFERENCES prep_resources(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (resource_id, user_id)
);

-- ─── 4. updated_at triggers (reuse handle_updated_at from schema.sql) ─────────
DROP TRIGGER IF EXISTS on_interview_experiences_updated ON interview_experiences;
CREATE TRIGGER on_interview_experiences_updated
  BEFORE UPDATE ON interview_experiences
  FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();

DROP TRIGGER IF EXISTS on_prep_resources_updated ON prep_resources;
CREATE TRIGGER on_prep_resources_updated
  BEFORE UPDATE ON prep_resources
  FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();

-- ─── 5. Helpful-count maintenance triggers ───────────────────────────────────
-- SECURITY DEFINER so the counter UPDATE bypasses RLS — a voter is usually NOT
-- the author, and the author-only UPDATE policy would otherwise block the bump.
CREATE OR REPLACE FUNCTION bump_experience_helpful()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE interview_experiences SET helpful_count = helpful_count + 1 WHERE id = NEW.experience_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE interview_experiences SET helpful_count = GREATEST(helpful_count - 1, 0) WHERE id = OLD.experience_id;
  END IF;
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS trg_experience_helpful ON interview_experience_helpful;
CREATE TRIGGER trg_experience_helpful
  AFTER INSERT OR DELETE ON interview_experience_helpful
  FOR EACH ROW EXECUTE FUNCTION bump_experience_helpful();

CREATE OR REPLACE FUNCTION bump_resource_helpful()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE prep_resources SET helpful_count = helpful_count + 1 WHERE id = NEW.resource_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE prep_resources SET helpful_count = GREATEST(helpful_count - 1, 0) WHERE id = OLD.resource_id;
  END IF;
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS trg_resource_helpful ON prep_resource_helpful;
CREATE TRIGGER trg_resource_helpful
  AFTER INSERT OR DELETE ON prep_resource_helpful
  FOR EACH ROW EXECUTE FUNCTION bump_resource_helpful();

-- ─── 6. Indexes ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_interview_exp_company   ON interview_experiences(company);
CREATE INDEX IF NOT EXISTS idx_interview_exp_created   ON interview_experiences(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_interview_exp_helpful   ON interview_experiences(helpful_count DESC);
CREATE INDEX IF NOT EXISTS idx_interview_exp_author    ON interview_experiences(author_id);
CREATE INDEX IF NOT EXISTS idx_prep_res_created        ON prep_resources(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prep_res_helpful        ON prep_resources(helpful_count DESC);
CREATE INDEX IF NOT EXISTS idx_prep_res_author         ON prep_resources(author_id);
CREATE INDEX IF NOT EXISTS idx_prep_res_type           ON prep_resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_exp_helpful_user        ON interview_experience_helpful(user_id);
CREATE INDEX IF NOT EXISTS idx_res_helpful_user        ON prep_resource_helpful(user_id);

-- ─── 7. True-anonymity read view ─────────────────────────────────────────────
-- Anonymous experiences must not leak their author — not even in the raw API
-- response. The frontend reads experiences through THIS view (writes still go to
-- the base table). For anonymous rows, the author's id/name/batch are nulled for
-- everyone EXCEPT the author themselves (so they can still find & edit their own).
-- security_invoker keeps the base-table RLS in force for the caller (PG15+, the
-- Supabase default).
CREATE OR REPLACE VIEW interview_experiences_feed
  WITH (security_invoker = true) AS
SELECT
  e.id, e.company, e.role, e.department, e.interview_date,
  e.difficulty, e.outcome, e.num_rounds, e.process, e.questions, e.tips,
  e.tags, e.is_anonymous, e.helpful_count, e.created_at, e.updated_at,
  CASE WHEN e.is_anonymous AND e.author_id <> COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
       THEN NULL ELSE e.author_id END   AS author_id,
  CASE WHEN e.is_anonymous AND e.author_id <> COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
       THEN NULL ELSE p.full_name END   AS author_name,
  CASE WHEN e.is_anonymous AND e.author_id <> COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
       THEN NULL ELSE p.batch_year END  AS author_batch_year
FROM interview_experiences e
JOIN profiles p ON p.id = e.author_id;

GRANT SELECT ON interview_experiences_feed TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════════
ALTER TABLE interview_experiences        ENABLE ROW LEVEL SECURITY;
ALTER TABLE prep_resources               ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_experience_helpful ENABLE ROW LEVEL SECURITY;
ALTER TABLE prep_resource_helpful        ENABLE ROW LEVEL SECURITY;

-- ─── Interview experiences: anyone logged in reads; you manage your own ───────
DROP POLICY IF EXISTS "interview_exp_select" ON interview_experiences;
DROP POLICY IF EXISTS "interview_exp_insert" ON interview_experiences;
DROP POLICY IF EXISTS "interview_exp_update" ON interview_experiences;
DROP POLICY IF EXISTS "interview_exp_delete" ON interview_experiences;

CREATE POLICY "interview_exp_select" ON interview_experiences FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "interview_exp_insert" ON interview_experiences FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "interview_exp_update" ON interview_experiences FOR UPDATE
  TO authenticated USING (auth.uid() = author_id);
CREATE POLICY "interview_exp_delete" ON interview_experiences FOR DELETE
  TO authenticated USING (auth.uid() = author_id);

-- ─── Prep resources: anyone reads; only alumni/teachers post (like jobs) ──────
DROP POLICY IF EXISTS "prep_res_select" ON prep_resources;
DROP POLICY IF EXISTS "prep_res_insert" ON prep_resources;
DROP POLICY IF EXISTS "prep_res_update" ON prep_resources;
DROP POLICY IF EXISTS "prep_res_delete" ON prep_resources;

CREATE POLICY "prep_res_select" ON prep_resources FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "prep_res_insert" ON prep_resources FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('alumni','teacher'))
  );
CREATE POLICY "prep_res_update" ON prep_resources FOR UPDATE
  TO authenticated USING (auth.uid() = author_id);
CREATE POLICY "prep_res_delete" ON prep_resources FOR DELETE
  TO authenticated USING (auth.uid() = author_id);

-- ─── Helpful votes: read all (for counts/own state); manage only your own ─────
DROP POLICY IF EXISTS "exp_helpful_select" ON interview_experience_helpful;
DROP POLICY IF EXISTS "exp_helpful_insert" ON interview_experience_helpful;
DROP POLICY IF EXISTS "exp_helpful_delete" ON interview_experience_helpful;

CREATE POLICY "exp_helpful_select" ON interview_experience_helpful FOR SELECT
  TO authenticated USING (auth.uid() = user_id);   -- only your own votes; counts come from helpful_count
CREATE POLICY "exp_helpful_insert" ON interview_experience_helpful FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "exp_helpful_delete" ON interview_experience_helpful FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "res_helpful_select" ON prep_resource_helpful;
DROP POLICY IF EXISTS "res_helpful_insert" ON prep_resource_helpful;
DROP POLICY IF EXISTS "res_helpful_delete" ON prep_resource_helpful;

CREATE POLICY "res_helpful_select" ON prep_resource_helpful FOR SELECT
  TO authenticated USING (auth.uid() = user_id);   -- only your own votes; counts come from helpful_count
CREATE POLICY "res_helpful_insert" ON prep_resource_helpful FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "res_helpful_delete" ON prep_resource_helpful FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
