-- =====================================================
-- 44CLUB BLOCKS - V3.1 RLS Policy Fixes Migration
-- =====================================================
-- Adds missing RLS policies for user_frameworks, reflection_cycles,
-- and reflection_entries tables

-- =====================================================
-- STORAGE BUCKET UPDATES
-- =====================================================

-- Update avatars bucket: make public for easier display, update size limit
UPDATE storage.buckets
SET
  public = true,
  file_size_limit = 1048576 -- 1MB hard limit
WHERE id = 'avatars';

-- Update block-media bucket: update size limit
UPDATE storage.buckets
SET
  file_size_limit = 3145728 -- 3MB hard limit
WHERE id = 'block-media';

-- =====================================================
-- STORAGE RLS POLICIES - AVATARS (Public Read)
-- =====================================================

-- Since avatars bucket is now public, allow anyone to read
DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
CREATE POLICY "Public can view avatars"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

-- =====================================================
-- USER_FRAMEWORKS RLS POLICIES
-- =====================================================

ALTER TABLE user_frameworks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own framework" ON user_frameworks;
CREATE POLICY "Users can read own framework"
  ON user_frameworks FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own framework" ON user_frameworks;
CREATE POLICY "Users can insert own framework"
  ON user_frameworks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own framework" ON user_frameworks;
CREATE POLICY "Users can update own framework"
  ON user_frameworks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own framework" ON user_frameworks;
CREATE POLICY "Users can delete own framework"
  ON user_frameworks FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- REFLECTION_CYCLES RLS POLICIES
-- =====================================================

ALTER TABLE reflection_cycles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own reflection cycles" ON reflection_cycles;
CREATE POLICY "Users can read own reflection cycles"
  ON reflection_cycles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own reflection cycles" ON reflection_cycles;
CREATE POLICY "Users can insert own reflection cycles"
  ON reflection_cycles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own reflection cycles" ON reflection_cycles;
CREATE POLICY "Users can update own reflection cycles"
  ON reflection_cycles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own reflection cycles" ON reflection_cycles;
CREATE POLICY "Users can delete own reflection cycles"
  ON reflection_cycles FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- REFLECTION_ENTRIES RLS POLICIES
-- =====================================================

ALTER TABLE reflection_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own reflection entries" ON reflection_entries;
CREATE POLICY "Users can read own reflection entries"
  ON reflection_entries FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own reflection entries" ON reflection_entries;
CREATE POLICY "Users can insert own reflection entries"
  ON reflection_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own reflection entries" ON reflection_entries;
CREATE POLICY "Users can update own reflection entries"
  ON reflection_entries FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own reflection entries" ON reflection_entries;
CREATE POLICY "Users can delete own reflection entries"
  ON reflection_entries FOR DELETE
  USING (auth.uid() = user_id);
