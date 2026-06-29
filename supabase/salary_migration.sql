-- ─── Salary Insights ─────────────────────────────────────────────────────────
-- Run in Supabase → SQL Editor
-- Allows anonymous, aggregated salary data from MAJU alumni/students

CREATE TABLE IF NOT EXISTS salary_entries (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by       uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  role_title         text        NOT NULL,
  company            text        NOT NULL,
  location           text        NOT NULL DEFAULT 'Karachi'
    CHECK (location IN ('Karachi','Lahore','Islamabad','Remote','Abroad')),
  experience_range   text        NOT NULL
    CHECK (experience_range IN ('0-1','1-2','2-3','3-5','5-7','7-10','10+')),
  role_level         text        NOT NULL
    CHECK (role_level IN ('intern','junior','mid','senior','lead','manager','director')),
  employment_type    text        NOT NULL DEFAULT 'full-time'
    CHECK (employment_type IN ('full-time','part-time','contract','freelance')),
  monthly_salary_pkr int         NOT NULL
    CHECK (monthly_salary_pkr >= 10000 AND monthly_salary_pkr <= 5000000),
  department         text,
  year_of_data       int         NOT NULL DEFAULT EXTRACT(YEAR FROM now())::int,
  tags               text[],
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now(),

  UNIQUE (submitted_by, year_of_data)
);

ALTER TABLE salary_entries ENABLE ROW LEVEL SECURITY;

-- Users can only read their own row directly (protects submitted_by column from enumeration)
CREATE POLICY "se_select_own" ON salary_entries
  FOR SELECT TO authenticated USING (auth.uid() = submitted_by);

CREATE POLICY "se_insert" ON salary_entries
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "se_update" ON salary_entries
  FOR UPDATE TO authenticated USING (auth.uid() = submitted_by);

CREATE POLICY "se_delete" ON salary_entries
  FOR DELETE TO authenticated USING (auth.uid() = submitted_by);

-- SECURITY DEFINER function: runs as postgres (bypasses RLS) so it can see all rows.
-- Returns only anonymized columns — submitted_by is never exposed.
CREATE OR REPLACE FUNCTION get_salary_entries_public()
RETURNS TABLE (
  id                 uuid,
  role_title         text,
  company            text,
  location           text,
  experience_range   text,
  role_level         text,
  employment_type    text,
  monthly_salary_pkr int,
  department         text,
  year_of_data       int,
  tags               text[],
  created_at         timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    id, role_title, company, location, experience_range,
    role_level, employment_type, monthly_salary_pkr,
    department, year_of_data, tags, created_at
  FROM salary_entries;
$$;

GRANT EXECUTE ON FUNCTION get_salary_entries_public() TO authenticated;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_salary_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER salary_updated_at
  BEFORE UPDATE ON salary_entries
  FOR EACH ROW EXECUTE FUNCTION update_salary_updated_at();
