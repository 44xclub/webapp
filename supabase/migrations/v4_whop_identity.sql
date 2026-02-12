-- =====================================================
-- 44CLUB - V4 Whop Identity + Access Hardening
-- =====================================================
--
-- 1. Adds Whop identity columns to profiles
-- 2. Creates is_whop_linked() helper function
-- 3. Adds RESTRICTIVE RLS policies on all data tables
--    so only Whop-linked users can access data
--
-- All statements are idempotent (safe to re-run).
--
-- WHY RESTRICTIVE POLICIES:
-- Existing permissive policies (e.g. "auth.uid() = user_id") use OR logic.
-- Restrictive policies are AND-gated on top of them.
-- This means even if someone creates a Supabase account directly
-- (bypassing Whop), they can authenticate but can't read/write any data
-- because they won't have a whop_user_id in their profile.

-- ============================================================================
-- 1. Add Whop identity columns to profiles
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS whop_user_id TEXT UNIQUE;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS whop_email TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS whop_meta JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_profiles_whop_user_id
  ON public.profiles (whop_user_id);

-- ============================================================================
-- 2. Helper function: is the current user linked to a Whop account?
-- ============================================================================
-- Used by restrictive RLS policies. Returns true only if the current
-- authenticated user has a whop_user_id set in their profile.
-- SECURITY DEFINER so it can read profiles regardless of the caller's RLS.

CREATE OR REPLACE FUNCTION public.is_whop_linked()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND whop_user_id IS NOT NULL
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_whop_linked TO authenticated;

-- ============================================================================
-- 3. RESTRICTIVE RLS policies — require Whop linkage on all data tables
-- ============================================================================
-- These run ON TOP of existing permissive policies (AND-gated).
-- A user must pass BOTH the existing ownership check (auth.uid() = user_id)
-- AND the Whop linkage check (is_whop_linked()).

-- ── profiles ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Require Whop identity for profiles" ON profiles;
CREATE POLICY "Require Whop identity for profiles"
  ON profiles AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (is_whop_linked())
  WITH CHECK (is_whop_linked());

-- ── blocks ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Require Whop identity for blocks" ON blocks;
CREATE POLICY "Require Whop identity for blocks"
  ON blocks AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (is_whop_linked())
  WITH CHECK (is_whop_linked());

-- ── block_media ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "Require Whop identity for block_media" ON block_media;
CREATE POLICY "Require Whop identity for block_media"
  ON block_media AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (is_whop_linked())
  WITH CHECK (is_whop_linked());

-- ── daily_framework_items ───────────────────────────────────────
DROP POLICY IF EXISTS "Require Whop identity for daily_framework_items" ON daily_framework_items;
CREATE POLICY "Require Whop identity for daily_framework_items"
  ON daily_framework_items AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (is_whop_linked())
  WITH CHECK (is_whop_linked());

-- ── feed_posts ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "Require Whop identity for feed_posts" ON feed_posts;
CREATE POLICY "Require Whop identity for feed_posts"
  ON feed_posts AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (is_whop_linked())
  WITH CHECK (is_whop_linked());

-- ── feed_respects ───────────────────────────────────────────────
DROP POLICY IF EXISTS "Require Whop identity for feed_respects" ON feed_respects;
CREATE POLICY "Require Whop identity for feed_respects"
  ON feed_respects AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (is_whop_linked())
  WITH CHECK (is_whop_linked());

-- ── notifications ───────────────────────────────────────────────
DROP POLICY IF EXISTS "Require Whop identity for notifications" ON notifications;
CREATE POLICY "Require Whop identity for notifications"
  ON notifications AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (is_whop_linked())
  WITH CHECK (is_whop_linked());

-- ── user_frameworks ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Require Whop identity for user_frameworks" ON user_frameworks;
CREATE POLICY "Require Whop identity for user_frameworks"
  ON user_frameworks AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (is_whop_linked())
  WITH CHECK (is_whop_linked());

-- ── reflection_cycles ───────────────────────────────────────────
DROP POLICY IF EXISTS "Require Whop identity for reflection_cycles" ON reflection_cycles;
CREATE POLICY "Require Whop identity for reflection_cycles"
  ON reflection_cycles AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (is_whop_linked())
  WITH CHECK (is_whop_linked());

-- ── reflection_entries ──────────────────────────────────────────
DROP POLICY IF EXISTS "Require Whop identity for reflection_entries" ON reflection_entries;
CREATE POLICY "Require Whop identity for reflection_entries"
  ON reflection_entries AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (is_whop_linked())
  WITH CHECK (is_whop_linked());

-- ── team_members ────────────────────────────────────────────────
DROP POLICY IF EXISTS "Require Whop identity for team_members" ON team_members;
CREATE POLICY "Require Whop identity for team_members"
  ON team_members AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (is_whop_linked())
  WITH CHECK (is_whop_linked());

-- ── team_daily_overviews ────────────────────────────────────────
DROP POLICY IF EXISTS "Require Whop identity for team_daily_overviews" ON team_daily_overviews;
CREATE POLICY "Require Whop identity for team_daily_overviews"
  ON team_daily_overviews AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (is_whop_linked())
  WITH CHECK (is_whop_linked());

-- ============================================================================
-- 4. ALSO RECOMMENDED: Disable email signup in Supabase Dashboard
-- ============================================================================
-- Go to: Supabase Dashboard > Authentication > Providers > Email
-- Set "Enable Email Signup" to OFF.
--
-- This migration's restrictive policies are the defense-in-depth layer.
-- Even with email signup enabled, non-Whop users cannot access any data.
-- But disabling signup prevents orphan auth accounts.

-- ============================================================================
-- 5. VERIFICATION QUERIES (run manually)
-- ============================================================================
-- Check Whop columns exist:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'profiles' AND column_name LIKE 'whop_%';
--
-- Check restrictive policies exist:
-- SELECT tablename, policyname, cmd, qual
-- FROM pg_policies
-- WHERE policyname LIKE 'Require Whop%'
-- ORDER BY tablename;
--
-- Test: non-Whop user should get 0 rows:
-- SELECT * FROM blocks;  -- as a user without whop_user_id
