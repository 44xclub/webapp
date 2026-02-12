-- =====================================================
-- 44CLUB - V4 Whop Identity Migration
-- =====================================================
--
-- Adds Whop identity fields to the profiles table so
-- each user can be mapped to their Whop account.
--
-- whop_user_id  — Whop's unique user ID (primary linkage key)
-- whop_email    — email from Whop claims (informational)
-- whop_meta     — any additional Whop metadata (username, avatar, etc.)
--
-- All statements are idempotent (safe to re-run).

-- ============================================================================
-- 1. Add Whop identity columns to profiles
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS whop_user_id TEXT UNIQUE;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS whop_email TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS whop_meta JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ============================================================================
-- 2. Index for fast lookup by Whop user ID
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_whop_user_id
  ON public.profiles (whop_user_id);

-- ============================================================================
-- 3. VERIFICATION QUERIES (run manually)
-- ============================================================================
-- SELECT column_name, data_type, is_nullable
-- FROM   information_schema.columns
-- WHERE  table_name = 'profiles'
--   AND  column_name LIKE 'whop_%'
-- ORDER  BY ordinal_position;
--
-- SELECT indexname, indexdef
-- FROM   pg_indexes
-- WHERE  tablename = 'profiles'
--   AND  indexname LIKE '%whop%';
