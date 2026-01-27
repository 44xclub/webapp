-- =====================================================
-- 44CLUB BLOCKS - Storage Bucket and Policies
-- =====================================================
-- Run these commands in Supabase SQL Editor AFTER creating
-- the storage bucket via Dashboard

-- Step 1: Create the bucket (run in SQL Editor or use Dashboard > Storage)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'block-media',
  'block-media',
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime']
);

-- Step 2: Create storage policies

-- Policy: Users can upload to their own folder (folder name = user_id)
CREATE POLICY "Users can upload own media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'block-media' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Users can view their own media
CREATE POLICY "Users can view own media"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'block-media' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Users can update their own media
CREATE POLICY "Users can update own media"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'block-media' AND
    (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'block-media' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Users can delete their own media
CREATE POLICY "Users can delete own media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'block-media' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
