-- =====================================================
-- 44CLUB BLOCKS - V3.1 Media Fixes Migration
-- =====================================================
-- Run this migration after v3_schema.sql
-- Fixes block_media constraints and storage bucket settings

-- =====================================================
-- BLOCK_MEDIA TABLE FIXES
-- =====================================================

-- Add position column to block_media for ordering (0, 1, 2 = max 3 media)
ALTER TABLE block_media
ADD COLUMN IF NOT EXISTS position INT NOT NULL DEFAULT 0;

-- Add check constraint for position (0-2 only, enforcing max 3 media)
ALTER TABLE block_media
DROP CONSTRAINT IF EXISTS block_media_position_check;

ALTER TABLE block_media
ADD CONSTRAINT block_media_position_check CHECK (position BETWEEN 0 AND 2);

-- Create unique constraint to prevent duplicate positions per block
ALTER TABLE block_media
DROP CONSTRAINT IF EXISTS block_media_unique_position;

ALTER TABLE block_media
ADD CONSTRAINT block_media_unique_position UNIQUE (block_id, position);

-- Create index for ordering
CREATE INDEX IF NOT EXISTS idx_block_media_block_position ON block_media(block_id, position);

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

-- Keep existing authenticated upload/update/delete policies for avatars
-- (Already defined in storage-policies.sql)

-- =====================================================
-- REFLECTION_ENTRIES TABLE (if not exists)
-- =====================================================

CREATE TABLE IF NOT EXISTS reflection_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_id TEXT NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  submitted_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_user_cycle UNIQUE (user_id, cycle_id)
);

CREATE INDEX IF NOT EXISTS idx_reflection_entries_user ON reflection_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_reflection_entries_cycle ON reflection_entries(cycle_id);

-- Apply updated_at trigger
DROP TRIGGER IF EXISTS update_reflection_entries_updated_at ON reflection_entries;
CREATE TRIGGER update_reflection_entries_updated_at
  BEFORE UPDATE ON reflection_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

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
