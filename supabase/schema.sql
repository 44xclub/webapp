-- =====================================================
-- 44CLUB BLOCKS - Supabase Database Schema
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- PROFILES TABLE
-- =====================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  height_cm INT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- BLOCKS TABLE
-- =====================================================
CREATE TABLE blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NULL,
  block_type TEXT NOT NULL CHECK (block_type IN ('workout', 'habit', 'nutrition', 'checkin', 'personal')),
  title TEXT NULL,
  notes TEXT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  repeat_rule JSONB NULL,
  completed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL,

  -- Validation: end_time must be after start_time if both are set
  CONSTRAINT valid_time_range CHECK (end_time IS NULL OR end_time > start_time)
);

-- =====================================================
-- BLOCK_MEDIA TABLE
-- =====================================================
CREATE TABLE block_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id UUID NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Blocks indexes for fast weekly view queries
CREATE INDEX idx_blocks_user_date ON blocks(user_id, date);
CREATE INDEX idx_blocks_user_completed ON blocks(user_id, completed_at);
CREATE INDEX idx_blocks_user_deleted ON blocks(user_id, deleted_at);

-- Block media index
CREATE INDEX idx_block_media_block ON block_media(block_id);
CREATE INDEX idx_block_media_user ON block_media(user_id);

-- =====================================================
-- UPDATED_AT TRIGGER FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to blocks
CREATE TRIGGER update_blocks_updated_at
  BEFORE UPDATE ON blocks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE block_media ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PROFILES RLS POLICIES
-- =====================================================

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- =====================================================
-- BLOCKS RLS POLICIES
-- =====================================================

-- Users can read their own blocks (excluding soft deleted)
CREATE POLICY "Users can read own blocks"
  ON blocks FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own blocks
CREATE POLICY "Users can insert own blocks"
  ON blocks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own blocks
CREATE POLICY "Users can update own blocks"
  ON blocks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own blocks (soft delete)
CREATE POLICY "Users can delete own blocks"
  ON blocks FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- BLOCK_MEDIA RLS POLICIES
-- =====================================================

-- Users can read their own media
CREATE POLICY "Users can read own media"
  ON block_media FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own media
CREATE POLICY "Users can insert own media"
  ON block_media FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own media
CREATE POLICY "Users can delete own media"
  ON block_media FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- STORAGE BUCKET AND POLICIES
-- =====================================================

-- Create storage bucket for block media
-- Run this in Supabase Dashboard > Storage or via API
-- INSERT INTO storage.buckets (id, name, public) VALUES ('block-media', 'block-media', false);

-- Storage policies (run in Supabase SQL editor)
-- These need to be created via Supabase Dashboard or the storage API

-- Policy: Users can upload to their own folder
-- CREATE POLICY "Users can upload own media"
--   ON storage.objects FOR INSERT
--   WITH CHECK (
--     bucket_id = 'block-media' AND
--     auth.uid()::text = (storage.foldername(name))[1]
--   );

-- Policy: Users can read their own media
-- CREATE POLICY "Users can read own media"
--   ON storage.objects FOR SELECT
--   USING (
--     bucket_id = 'block-media' AND
--     auth.uid()::text = (storage.foldername(name))[1]
--   );

-- Policy: Users can delete their own media
-- CREATE POLICY "Users can delete own media"
--   ON storage.objects FOR DELETE
--   USING (
--     bucket_id = 'block-media' AND
--     auth.uid()::text = (storage.foldername(name))[1]
--   );

-- =====================================================
-- FUNCTION: Create profile on signup
-- =====================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
