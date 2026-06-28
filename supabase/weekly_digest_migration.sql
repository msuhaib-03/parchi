-- ============================================================
-- Parchi — Weekly Digest Email: database migration
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- Safe to re-run (idempotent).
-- ============================================================

-- ─── 1. Opt-out preference on profiles ───────────────────────────────────────
-- Defaults TRUE so existing users are subscribed; they can opt out anytime
-- (one-click in the email footer, or the in-app toggle on their profile).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email_weekly_digest BOOLEAN NOT NULL DEFAULT TRUE;

-- ─── 2. Send log (idempotency + auditing) ────────────────────────────────────
-- One row per user per run. Lets the function avoid double-sends within a week
-- and gives you a paper trail of what went out / what failed.
CREATE TABLE IF NOT EXISTS email_digest_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  period_start  TIMESTAMPTZ NOT NULL,            -- start of the 7-day window covered
  status        TEXT NOT NULL DEFAULT 'sent',    -- 'sent' | 'skipped_empty' | 'failed'
  items_count   INTEGER NOT NULL DEFAULT 0,
  error         TEXT,
  sent_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_digest_log_user   ON email_digest_log(user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_digest_log_period ON email_digest_log(period_start);

ALTER TABLE email_digest_log ENABLE ROW LEVEL SECURITY;

-- Users may read their own send history; only the service role (the edge
-- function) ever writes — and service role bypasses RLS, so no write policy
-- is needed for authenticated users.
DROP POLICY IF EXISTS "digest_log_select_own" ON email_digest_log;
CREATE POLICY "digest_log_select_own" ON email_digest_log FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- ─── 3. Schedule the weekly run (pg_cron + pg_net) ───────────────────────────
-- Both extensions ship with Supabase. Enabling is idempotent.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove any previous schedule so this whole file stays re-runnable.
SELECT cron.unschedule('parchi-weekly-digest')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'parchi-weekly-digest');

-- ⚠️  BEFORE RUNNING: replace <PROJECT_REF> with your Supabase project ref
--     (Dashboard → Settings → General → Reference ID) and <DIGEST_CRON_SECRET>
--     with the same value you set as the DIGEST_CRON_SECRET function secret.
--
-- Schedule: every Monday 08:00 Pakistan time. PKT = UTC+5, so 08:00 PKT = 03:00 UTC.
-- Cron is in UTC → '0 3 * * 1'. (Change the time by editing this expression.)
SELECT cron.schedule(
  'parchi-weekly-digest',
  '0 3 * * 1',
  $$
  SELECT net.http_post(
    url     := 'https://sukrbjppfwldtsxhlwto.supabase.co/functions/v1/weekly-digest',
    headers := jsonb_build_object(
      'Content-Type',    'application/json',
      'x-digest-secret', 'cd28c009a798300f2693c53f0d0ecd4666c06838b9109c6cfc6973a7ca29150a'
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 300000
  );
  $$
);

-- ─── Handy management queries (run as needed) ────────────────────────────────
-- See the schedule:            SELECT jobname, schedule, active FROM cron.job;
-- See recent cron runs:        SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
-- See recent pg_net responses: SELECT id, status_code, content FROM net._http_response ORDER BY created DESC LIMIT 10;
-- See what the digest sent:    SELECT status, COUNT(*) FROM email_digest_log
--                              WHERE sent_at > NOW() - INTERVAL '7 days' GROUP BY status;
-- Stop the schedule:           SELECT cron.unschedule('parchi-weekly-digest');
