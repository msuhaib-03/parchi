-- ============================================================
-- Parchi — Mentorship Program: database migration
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- Safe to re-run (idempotent via IF NOT EXISTS + DROP/CREATE).
-- ============================================================

-- ─── 1. Mentor profiles (alumni / teachers only) ─────────────────────────────
CREATE TABLE IF NOT EXISTS mentors (
  id             UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  areas          TEXT[] NOT NULL DEFAULT '{}',
  tagline        TEXT,
  mentorship_bio TEXT,
  max_mentees    INTEGER NOT NULL DEFAULT 3 CHECK (max_mentees BETWEEN 1 AND 20),
  is_accepting   BOOLEAN NOT NULL DEFAULT TRUE,
  -- 'video' | 'in_person' | 'both' | 'async_chat'
  session_format TEXT NOT NULL DEFAULT 'video'
                 CHECK (session_format IN ('video','in_person','both','async_chat')),
  meeting_link   TEXT,
  active_mentee_count INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE mentors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mentors_select_all" ON mentors;
DROP POLICY IF EXISTS "mentors_insert_own" ON mentors;
DROP POLICY IF EXISTS "mentors_update_own" ON mentors;

CREATE POLICY "mentors_select_all" ON mentors FOR SELECT TO authenticated USING (true);
CREATE POLICY "mentors_insert_own" ON mentors FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = id AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('alumni','teacher'))
  );
CREATE POLICY "mentors_update_own" ON mentors FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ─── 2. Mentorship requests (student → mentor) ───────────────────────────────
CREATE TABLE IF NOT EXISTS mentorship_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mentor_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  area         TEXT NOT NULL,
  goal         TEXT NOT NULL,
  -- pending → accepted | declined | cancelled(by student)
  -- accepted → ended(by mentor)
  status       TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','accepted','declined','ended','cancelled')),
  mentor_note  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only one active (pending/accepted) request per student-mentor pair at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_mr_active_unique
  ON mentorship_requests(student_id, mentor_id)
  WHERE status IN ('pending', 'accepted');

ALTER TABLE mentorship_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mr_select_parties"  ON mentorship_requests;
DROP POLICY IF EXISTS "mr_insert_student"  ON mentorship_requests;
DROP POLICY IF EXISTS "mr_update_mentor"   ON mentorship_requests;
DROP POLICY IF EXISTS "mr_update_student"  ON mentorship_requests;

CREATE POLICY "mr_select_parties" ON mentorship_requests FOR SELECT TO authenticated
  USING (auth.uid() = student_id OR auth.uid() = mentor_id);

CREATE POLICY "mr_insert_student" ON mentorship_requests FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = student_id AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'student')
  );

-- Mentor: can accept, decline, end, or add a note
CREATE POLICY "mr_update_mentor" ON mentorship_requests FOR UPDATE TO authenticated
  USING (auth.uid() = mentor_id)
  WITH CHECK (auth.uid() = mentor_id);

-- Student: can only cancel their own pending request
CREATE POLICY "mr_update_student" ON mentorship_requests FOR UPDATE TO authenticated
  USING (auth.uid() = student_id AND status = 'pending')
  WITH CHECK (auth.uid() = student_id AND status = 'cancelled');

-- ─── 3. Mentorship sessions ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mentorship_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id    UUID NOT NULL REFERENCES mentorship_requests(id) ON DELETE CASCADE,
  mentor_id     UUID NOT NULL REFERENCES profiles(id),
  student_id    UUID NOT NULL REFERENCES profiles(id),
  scheduled_at  TIMESTAMPTZ NOT NULL,
  duration_mins INTEGER NOT NULL DEFAULT 30 CHECK (duration_mins IN (15,30,45,60,90)),
  agenda        TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'scheduled'
                CHECK (status IN ('scheduled','completed','cancelled')),
  session_notes TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE mentorship_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ms_select_parties" ON mentorship_sessions;
DROP POLICY IF EXISTS "ms_insert_student" ON mentorship_sessions;
DROP POLICY IF EXISTS "ms_update_mentor"  ON mentorship_sessions;
DROP POLICY IF EXISTS "ms_update_student" ON mentorship_sessions;

CREATE POLICY "ms_select_parties" ON mentorship_sessions FOR SELECT TO authenticated
  USING (auth.uid() = student_id OR auth.uid() = mentor_id);

-- Students book sessions against accepted requests only
CREATE POLICY "ms_insert_student" ON mentorship_sessions FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = student_id AND
    EXISTS (
      SELECT 1 FROM mentorship_requests r
      WHERE r.id = request_id
        AND r.student_id = auth.uid()
        AND r.status = 'accepted'
    )
  );

-- Mentor: full update (mark complete, add notes, cancel)
CREATE POLICY "ms_update_mentor" ON mentorship_sessions FOR UPDATE TO authenticated
  USING (auth.uid() = mentor_id)
  WITH CHECK (auth.uid() = mentor_id);

-- Student: can only cancel a still-scheduled session
CREATE POLICY "ms_update_student" ON mentorship_sessions FOR UPDATE TO authenticated
  USING (auth.uid() = student_id AND status = 'scheduled')
  WITH CHECK (auth.uid() = student_id AND status = 'cancelled');

-- ─── 4. Mentor reviews (student → after a completed session) ─────────────────
CREATE TABLE IF NOT EXISTS mentor_reviews (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   UUID NOT NULL UNIQUE REFERENCES mentorship_sessions(id) ON DELETE CASCADE,
  reviewer_id  UUID NOT NULL REFERENCES profiles(id),
  mentor_id    UUID NOT NULL REFERENCES profiles(id),
  rating       INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE mentor_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews_select_all"     ON mentor_reviews;
DROP POLICY IF EXISTS "reviews_insert_student" ON mentor_reviews;

CREATE POLICY "reviews_select_all" ON mentor_reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "reviews_insert_student" ON mentor_reviews FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = reviewer_id AND
    EXISTS (
      SELECT 1 FROM mentorship_sessions s
      WHERE s.id = session_id
        AND s.student_id = auth.uid()
        AND s.status = 'completed'
    )
  );

-- ─── 5. updated_at triggers ───────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_mentors_updated_at ON mentors;
CREATE TRIGGER trg_mentors_updated_at
  BEFORE UPDATE ON mentors
  FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();

DROP TRIGGER IF EXISTS trg_mentorship_requests_updated_at ON mentorship_requests;
CREATE TRIGGER trg_mentorship_requests_updated_at
  BEFORE UPDATE ON mentorship_requests
  FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();

DROP TRIGGER IF EXISTS trg_mentorship_sessions_updated_at ON mentorship_sessions;
CREATE TRIGGER trg_mentorship_sessions_updated_at
  BEFORE UPDATE ON mentorship_sessions
  FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();

-- ─── 6. Denormalized active_mentee_count on mentors ──────────────────────────
-- SECURITY DEFINER so the UPDATE on mentors bypasses RLS (the triggering user
-- is the student/mentor, not the row owner).
CREATE OR REPLACE FUNCTION update_active_mentee_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'accepted' THEN
    UPDATE mentors SET active_mentee_count = active_mentee_count + 1 WHERE id = NEW.mentor_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != 'accepted' AND NEW.status = 'accepted' THEN
      UPDATE mentors SET active_mentee_count = active_mentee_count + 1 WHERE id = NEW.mentor_id;
    ELSIF OLD.status = 'accepted' AND NEW.status != 'accepted' THEN
      UPDATE mentors SET active_mentee_count = GREATEST(active_mentee_count - 1, 0) WHERE id = NEW.mentor_id;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_update_active_mentee_count ON mentorship_requests;
CREATE TRIGGER trg_update_active_mentee_count
  AFTER INSERT OR UPDATE OF status ON mentorship_requests
  FOR EACH ROW EXECUTE FUNCTION update_active_mentee_count();

-- ─── 7. Notification triggers ─────────────────────────────────────────────────
-- Extend the type constraint if one exists
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  'referral_received','referral_accepted','referral_rejected','referral_updated',
  'message_received','job_posted','application_update','story_posted',
  'mentorship_request','mentorship_accepted','mentorship_declined','session_booked'
));

CREATE OR REPLACE FUNCTION notify_on_mentorship_request()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name TEXT;
BEGIN
  SELECT full_name INTO v_name FROM profiles WHERE id = NEW.student_id;
  INSERT INTO notifications (user_id, type, title, body, link) VALUES (
    NEW.mentor_id, 'mentorship_request',
    v_name || ' wants you as their mentor',
    'Area: ' || NEW.area || ' — ' || LEFT(NEW.goal, 100),
    '/mentorship?tab=requests'
  );
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_mentorship_request ON mentorship_requests;
CREATE TRIGGER trg_notify_mentorship_request
  AFTER INSERT ON mentorship_requests
  FOR EACH ROW EXECUTE FUNCTION notify_on_mentorship_request();

CREATE OR REPLACE FUNCTION notify_on_mentorship_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name TEXT;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  SELECT full_name INTO v_name FROM profiles WHERE id = NEW.mentor_id;
  IF NEW.status = 'accepted' THEN
    INSERT INTO notifications (user_id, type, title, body, link) VALUES (
      NEW.student_id, 'mentorship_accepted',
      v_name || ' accepted your mentorship request!',
      'Your mentorship is now active — schedule your first session.',
      '/mentorship?tab=requests'
    );
  ELSIF NEW.status = 'declined' THEN
    INSERT INTO notifications (user_id, type, title, body, link) VALUES (
      NEW.student_id, 'mentorship_declined',
      v_name || ' couldn''t take you on right now',
      COALESCE(NEW.mentor_note, 'You can request other mentors.'),
      '/mentorship'
    );
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_mentorship_status ON mentorship_requests;
CREATE TRIGGER trg_notify_mentorship_status
  AFTER UPDATE ON mentorship_requests
  FOR EACH ROW EXECUTE FUNCTION notify_on_mentorship_status();

CREATE OR REPLACE FUNCTION notify_on_session_booked()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name TEXT;
BEGIN
  SELECT full_name INTO v_name FROM profiles WHERE id = NEW.student_id;
  INSERT INTO notifications (user_id, type, title, body, link) VALUES (
    NEW.mentor_id, 'session_booked',
    v_name || ' booked a mentorship session',
    'Agenda: ' || LEFT(NEW.agenda, 100),
    '/mentorship/sessions/' || NEW.id
  );
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_notify_session_booked ON mentorship_sessions;
CREATE TRIGGER trg_notify_session_booked
  AFTER INSERT ON mentorship_sessions
  FOR EACH ROW EXECUTE FUNCTION notify_on_session_booked();

-- ─── 8. Mentors with stats view ───────────────────────────────────────────────
-- avg_rating / review_count are live aggregates (mentor_reviews has open SELECT).
-- active_mentee_count comes from the denormalized column (maintained by trigger above)
-- so it remains accurate regardless of the viewer's RLS context.
CREATE OR REPLACE VIEW mentors_with_stats AS
SELECT
  m.*,
  p.full_name,
  p.department,
  p.batch_year,
  p.current_company,
  p.job_title,
  p.profile_picture_url,
  p.linkedin_url,
  COALESCE(rv.avg_rating,   0)::numeric(3,1) AS avg_rating,
  COALESCE(rv.review_count, 0)::integer       AS review_count
FROM mentors m
JOIN profiles p ON p.id = m.id
LEFT JOIN (
  SELECT
    mentor_id,
    ROUND(AVG(rating)::numeric, 1) AS avg_rating,
    COUNT(*)::integer               AS review_count
  FROM mentor_reviews
  GROUP BY mentor_id
) rv ON rv.mentor_id = m.id;

GRANT SELECT ON mentors_with_stats TO authenticated;

-- ─── 9. Indexes ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_mentors_accepting ON mentors(is_accepting);
CREATE INDEX IF NOT EXISTS idx_mentors_areas     ON mentors USING gin(areas);
CREATE INDEX IF NOT EXISTS idx_mr_student        ON mentorship_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_mr_mentor_status  ON mentorship_requests(mentor_id, status);
CREATE INDEX IF NOT EXISTS idx_ms_request        ON mentorship_sessions(request_id);
CREATE INDEX IF NOT EXISTS idx_ms_mentor         ON mentorship_sessions(mentor_id);
CREATE INDEX IF NOT EXISTS idx_ms_student        ON mentorship_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_ms_scheduled      ON mentorship_sessions(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_reviews_mentor    ON mentor_reviews(mentor_id);

-- ─── Handy queries ────────────────────────────────────────────────────────────
-- Browse mentors:       SELECT * FROM mentors_with_stats WHERE is_accepting = true ORDER BY avg_rating DESC;
-- Pending requests:     SELECT * FROM mentorship_requests WHERE status = 'pending';
-- Upcoming sessions:    SELECT * FROM mentorship_sessions WHERE status = 'scheduled' AND scheduled_at > NOW() ORDER BY scheduled_at;
