-- ─── Events System ────────────────────────────────────────────────────────────
-- Run in Supabase → SQL Editor
-- Tables: events, event_rsvps
-- Triggers: event_created (bulk notify), event_reminder (pg_cron hourly)

-- ── Events ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS events (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title         text        NOT NULL,
  description   text        NOT NULL,
  event_type    text        NOT NULL DEFAULT 'other'
    CHECK (event_type IN ('career_fair','workshop','networking','competition','seminar','webinar','meetup','other')),
  is_online     boolean     NOT NULL DEFAULT false,
  location      text,                          -- venue or Meet/Zoom URL
  starts_at     timestamptz NOT NULL,
  ends_at       timestamptz,
  max_attendees int         CHECK (max_attendees > 0),
  cover_url     text,
  organizer     text,                          -- club / society name
  tags          text[],
  is_active     boolean     NOT NULL DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events_select" ON events FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "events_insert" ON events FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "events_update" ON events FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "events_delete" ON events FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- ── RSVPs ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS event_rsvps (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   uuid        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status     text        NOT NULL DEFAULT 'going'
    CHECK (status IN ('going', 'maybe', 'not_going')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (event_id, user_id)
);

ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rsvp_select" ON event_rsvps FOR SELECT  TO authenticated USING (true);
CREATE POLICY "rsvp_insert" ON event_rsvps FOR INSERT  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rsvp_update" ON event_rsvps FOR UPDATE  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "rsvp_delete" ON event_rsvps FOR DELETE  TO authenticated USING (auth.uid() = user_id);

-- ── Auto-update updated_at ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_events_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_events_updated_at();

-- ── Bulk notification on event creation ──────────────────────────────────────
-- Inserts one notification row per profile (excluding creator).
-- For large user bases, replace with a queue; for MAJU scale this is fine.

CREATE OR REPLACE FUNCTION notify_event_created()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  creator_name text;
  display_org  text;
BEGIN
  SELECT full_name INTO creator_name FROM profiles WHERE id = NEW.created_by;
  display_org := COALESCE(NULLIF(TRIM(NEW.organizer), ''), creator_name, 'Someone');

  INSERT INTO notifications (user_id, type, title, body, link)
  SELECT
    id,
    'event_created',
    'New event: ' || NEW.title,
    display_org || ' is hosting · ' || to_char(NEW.starts_at AT TIME ZONE 'Asia/Karachi', 'Dy DD Mon, HH12:MI AM'),
    '/events/' || NEW.id
  FROM profiles
  WHERE id != NEW.created_by;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_event_created ON events;
CREATE TRIGGER trg_notify_event_created
  AFTER INSERT ON events
  FOR EACH ROW EXECUTE FUNCTION notify_event_created();

-- ── 24-hour reminders (pg_cron — runs every hour) ────────────────────────────
-- Creates one reminder notification per RSVPed user in the 23-25h window.
-- Idempotent: skips if a reminder for that event already exists.

CREATE OR REPLACE FUNCTION send_event_reminders()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, body, link)
  SELECT
    er.user_id,
    'event_reminder',
    'Reminder: ' || e.title || ' is tomorrow',
    to_char(e.starts_at AT TIME ZONE 'Asia/Karachi', 'HH12:MI AM') ||
      CASE WHEN e.location IS NOT NULL THEN ' · ' || e.location ELSE '' END,
    '/events/' || e.id
  FROM events e
  JOIN event_rsvps er ON er.event_id = e.id AND er.status = 'going'
  WHERE
    e.starts_at >  now() + INTERVAL '23 hours' AND
    e.starts_at <= now() + INTERVAL '25 hours' AND
    e.is_active = true AND
    NOT EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.user_id = er.user_id
        AND n.type    = 'event_reminder'
        AND n.link    = '/events/' || e.id
    );
END;
$$;

SELECT cron.schedule(
  'parchi-event-reminders',
  '0 * * * *',
  $$ SELECT send_event_reminders(); $$
);
