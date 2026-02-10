-- 44CLUB - V3.3 Personal Programmes & Frameworks Migration
--
-- Implements Phase 1 of Personal Programme + Personal Discipline Framework:
-- - Personal fitness programmes with days and exercises
-- - Personal discipline frameworks (max 5 non-negotiables)
-- - Admin review queue for silent surfacing
-- - Block linkage for scheduling programme days

-- ============================================================================
-- PERSONAL PROGRAMMES TABLES
-- ============================================================================

-- Main programmes table
CREATE TABLE IF NOT EXISTS personal_programmes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  days_per_week INT NOT NULL CHECK (days_per_week >= 2 AND days_per_week <= 6),
  focus TEXT NOT NULL CHECK (focus IN ('strength', 'hypertrophy', 'conditioning', 'hybrid')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_personal_programmes_user ON personal_programmes(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_programmes_status ON personal_programmes(user_id, status);

-- Programme days (e.g., "Day 1 - Upper Push")
CREATE TABLE IF NOT EXISTS personal_programme_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id UUID NOT NULL REFERENCES personal_programmes(id) ON DELETE CASCADE,
  day_index INT NOT NULL CHECK (day_index >= 1 AND day_index <= 6),
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_programme_day_index UNIQUE (programme_id, day_index)
);

CREATE INDEX IF NOT EXISTS idx_personal_programme_days_programme ON personal_programme_days(programme_id);

-- Exercises within a programme day
CREATE TABLE IF NOT EXISTS personal_programme_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id UUID NOT NULL REFERENCES personal_programme_days(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  name TEXT NOT NULL,
  sets INT,
  reps TEXT,  -- Free text like "8-10" or "30 sec"
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_personal_programme_exercises_day ON personal_programme_exercises(day_id);

-- ============================================================================
-- ADMIN REVIEW QUEUE (Silent Surfacing)
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('programme', 'framework')),
  entity_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'approved', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_admin_review_queue_status ON admin_review_queue(status);
CREATE INDEX IF NOT EXISTS idx_admin_review_queue_user ON admin_review_queue(user_id);

-- ============================================================================
-- BLOCKS TABLE MODIFICATIONS
-- ============================================================================

-- Add personal programme linkage columns to blocks
ALTER TABLE blocks
  ADD COLUMN IF NOT EXISTS personal_programme_id UUID REFERENCES personal_programmes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS personal_programme_day_id UUID REFERENCES personal_programme_days(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_blocks_personal_programme ON blocks(personal_programme_id) WHERE personal_programme_id IS NOT NULL;

-- ============================================================================
-- FRAMEWORK TEMPLATES MODIFICATIONS (Personal Visibility)
-- ============================================================================

-- Add visibility and owner columns for personal frameworks
ALTER TABLE framework_templates
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'global' CHECK (visibility IN ('global', 'personal')),
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_framework_templates_owner ON framework_templates(owner_user_id) WHERE owner_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_framework_templates_visibility ON framework_templates(visibility);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE personal_programmes ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_programme_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_programme_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_review_queue ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PERSONAL PROGRAMMES RLS POLICIES
-- ============================================================================

-- Users can CRUD their own programmes
DROP POLICY IF EXISTS "Users can read own programmes" ON personal_programmes;
CREATE POLICY "Users can read own programmes"
  ON personal_programmes FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own programmes" ON personal_programmes;
CREATE POLICY "Users can insert own programmes"
  ON personal_programmes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own programmes" ON personal_programmes;
CREATE POLICY "Users can update own programmes"
  ON personal_programmes FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own programmes" ON personal_programmes;
CREATE POLICY "Users can delete own programmes"
  ON personal_programmes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- PERSONAL PROGRAMME DAYS RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can read own programme days" ON personal_programme_days;
CREATE POLICY "Users can read own programme days"
  ON personal_programme_days FOR SELECT
  TO authenticated
  USING (
    programme_id IN (
      SELECT id FROM personal_programmes WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own programme days" ON personal_programme_days;
CREATE POLICY "Users can insert own programme days"
  ON personal_programme_days FOR INSERT
  TO authenticated
  WITH CHECK (
    programme_id IN (
      SELECT id FROM personal_programmes WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own programme days" ON personal_programme_days;
CREATE POLICY "Users can update own programme days"
  ON personal_programme_days FOR UPDATE
  TO authenticated
  USING (
    programme_id IN (
      SELECT id FROM personal_programmes WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    programme_id IN (
      SELECT id FROM personal_programmes WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete own programme days" ON personal_programme_days;
CREATE POLICY "Users can delete own programme days"
  ON personal_programme_days FOR DELETE
  TO authenticated
  USING (
    programme_id IN (
      SELECT id FROM personal_programmes WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- PERSONAL PROGRAMME EXERCISES RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can read own programme exercises" ON personal_programme_exercises;
CREATE POLICY "Users can read own programme exercises"
  ON personal_programme_exercises FOR SELECT
  TO authenticated
  USING (
    day_id IN (
      SELECT pd.id FROM personal_programme_days pd
      JOIN personal_programmes p ON pd.programme_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own programme exercises" ON personal_programme_exercises;
CREATE POLICY "Users can insert own programme exercises"
  ON personal_programme_exercises FOR INSERT
  TO authenticated
  WITH CHECK (
    day_id IN (
      SELECT pd.id FROM personal_programme_days pd
      JOIN personal_programmes p ON pd.programme_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own programme exercises" ON personal_programme_exercises;
CREATE POLICY "Users can update own programme exercises"
  ON personal_programme_exercises FOR UPDATE
  TO authenticated
  USING (
    day_id IN (
      SELECT pd.id FROM personal_programme_days pd
      JOIN personal_programmes p ON pd.programme_id = p.id
      WHERE p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    day_id IN (
      SELECT pd.id FROM personal_programme_days pd
      JOIN personal_programmes p ON pd.programme_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete own programme exercises" ON personal_programme_exercises;
CREATE POLICY "Users can delete own programme exercises"
  ON personal_programme_exercises FOR DELETE
  TO authenticated
  USING (
    day_id IN (
      SELECT pd.id FROM personal_programme_days pd
      JOIN personal_programmes p ON pd.programme_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- ============================================================================
-- ADMIN REVIEW QUEUE RLS POLICIES
-- ============================================================================

-- Users can only insert their own review entries (silent notification)
DROP POLICY IF EXISTS "Users can insert own review entries" ON admin_review_queue;
CREATE POLICY "Users can insert own review entries"
  ON admin_review_queue FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can read their own submissions (optional, for transparency)
DROP POLICY IF EXISTS "Users can read own review entries" ON admin_review_queue;
CREATE POLICY "Users can read own review entries"
  ON admin_review_queue FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- FRAMEWORK TEMPLATES RLS UPDATES (Personal Visibility)
-- ============================================================================

-- Update existing policy to include personal frameworks
DROP POLICY IF EXISTS "Users can read framework templates" ON framework_templates;
CREATE POLICY "Users can read framework templates"
  ON framework_templates FOR SELECT
  TO authenticated
  USING (
    visibility = 'global'
    OR owner_user_id = auth.uid()
  );

-- Users can CRUD their own personal frameworks
DROP POLICY IF EXISTS "Users can insert personal frameworks" ON framework_templates;
CREATE POLICY "Users can insert personal frameworks"
  ON framework_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    visibility = 'personal'
    AND owner_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Users can update own personal frameworks" ON framework_templates;
CREATE POLICY "Users can update own personal frameworks"
  ON framework_templates FOR UPDATE
  TO authenticated
  USING (
    visibility = 'personal'
    AND owner_user_id = auth.uid()
  )
  WITH CHECK (
    visibility = 'personal'
    AND owner_user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Users can delete own personal frameworks" ON framework_templates;
CREATE POLICY "Users can delete own personal frameworks"
  ON framework_templates FOR DELETE
  TO authenticated
  USING (
    visibility = 'personal'
    AND owner_user_id = auth.uid()
  );

-- ============================================================================
-- ROLE GRANTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.personal_programmes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.personal_programme_days TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.personal_programme_exercises TO authenticated;
GRANT SELECT, INSERT ON public.admin_review_queue TO authenticated;
