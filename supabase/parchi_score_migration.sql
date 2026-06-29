-- ─── Parchi Score view ────────────────────────────────────────────────────────
-- Computes a contribution score for every profile from existing activity tables.
-- Run in Supabase → SQL Editor.
--
-- Point values:
--   Profile completeness      0–100 pts  (mirrors frontend ProfileCompletion logic)
--   Referral given             +50 pts   per referral marked 'referred'
--   Job posted                 +30 pts   per active job listing
--   Mentorship session         +40 pts   per completed session
--   Salary contributed         +50 pts   one-time, for submitting salary data
--   Success story posted       +25 pts   per story
--
-- Tier thresholds:
--   Newcomer     0 – 49
--   Contributor  50 – 149
--   Connector   150 – 399
--   Champion    400 – 799
--   Legend      800+

CREATE OR REPLACE VIEW parchi_scores AS
WITH
  profile_pts AS (
    SELECT
      id,
      GREATEST(0, LEAST(100,
        CASE WHEN full_name IS NOT NULL AND LENGTH(TRIM(full_name)) > 2     THEN 10 ELSE 0 END +
        CASE WHEN bio IS NOT NULL AND LENGTH(TRIM(bio)) >= 50               THEN 15 ELSE 0 END +
        CASE WHEN profile_picture_url IS NOT NULL                           THEN 10 ELSE 0 END +
        CASE WHEN linkedin_url IS NOT NULL                                  THEN 10 ELSE 0 END +
        CASE WHEN github_url IS NOT NULL                                    THEN  5 ELSE 0 END +
        CASE WHEN portfolio_url IS NOT NULL                                 THEN  5 ELSE 0 END +
        CASE WHEN department IS NOT NULL                                    THEN  5 ELSE 0 END +
        CASE WHEN batch_year IS NOT NULL                                    THEN  5 ELSE 0 END +
        CASE WHEN student_id IS NOT NULL                                    THEN  5 ELSE 0 END +
        -- Alumni / teacher specifics
        CASE WHEN role IN ('alumni','teacher') AND current_company IS NOT NULL THEN 15 ELSE 0 END +
        CASE WHEN role IN ('alumni','teacher') AND job_title IS NOT NULL       THEN 10 ELSE 0 END +
        -- Student specifics
        CASE WHEN role = 'student' AND skills IS NOT NULL
                  AND array_length(skills, 1) >= 3                         THEN 15 ELSE 0 END +
        CASE WHEN role = 'student' AND graduation_year IS NOT NULL         THEN  5 ELSE 0 END
      )) AS pts
    FROM profiles
  ),
  referral_pts AS (
    SELECT alumni_id AS id, COUNT(*) * 50 AS pts
    FROM referral_requests WHERE status = 'referred'
    GROUP BY alumni_id
  ),
  job_pts AS (
    SELECT posted_by AS id, COUNT(*) * 30 AS pts
    FROM jobs WHERE is_active = true
    GROUP BY posted_by
  ),
  session_pts AS (
    SELECT mentor_id AS id, COUNT(*) * 40 AS pts
    FROM mentorship_sessions WHERE status = 'completed'
    GROUP BY mentor_id
  ),
  salary_pts AS (
    SELECT submitted_by AS id, 50 AS pts
    FROM salary_entries
    GROUP BY submitted_by
  ),
  story_pts AS (
    SELECT user_id AS id, COUNT(*) * 25 AS pts
    FROM success_stories
    GROUP BY user_id
  )
SELECT
  p.id,
  p.full_name,
  p.role,
  p.department,
  p.batch_year,
  p.profile_picture_url,
  p.current_company,
  p.job_title,
  (
    COALESCE(pp.pts,  0) +
    COALESCE(rp.pts,  0) +
    COALESCE(jp.pts,  0) +
    COALESCE(sp.pts,  0) +
    COALESCE(slp.pts, 0) +
    COALESCE(stp.pts, 0)
  )                                   AS parchi_score,
  COALESCE(pp.pts,  0)                AS profile_pts,
  COALESCE(rp.pts,  0)                AS referral_pts,
  COALESCE(jp.pts,  0)                AS job_pts,
  COALESCE(sp.pts,  0)                AS session_pts,
  COALESCE(slp.pts, 0)                AS salary_pts,
  COALESCE(stp.pts, 0)                AS story_pts
FROM profiles p
LEFT JOIN profile_pts pp  ON pp.id  = p.id
LEFT JOIN referral_pts rp ON rp.id  = p.id
LEFT JOIN job_pts      jp ON jp.id  = p.id
LEFT JOIN session_pts  sp ON sp.id  = p.id
LEFT JOIN salary_pts  slp ON slp.id = p.id
LEFT JOIN story_pts   stp ON stp.id = p.id;

GRANT SELECT ON parchi_scores TO authenticated;
