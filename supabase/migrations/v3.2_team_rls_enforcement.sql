-- 44CLUB - V3.2 Team RLS Enforcement Migration
--
-- Implements the Team Access & RLS Enforcement specification:
-- - Users can only view teams they belong to
-- - Users can only view members of their own team
-- - Users can only view daily overviews of their own team
-- - Adds required SELECT grants for authenticated role

-- ============================================================================
-- ROLE GRANTS (Critical - RLS policies do nothing without these)
-- ============================================================================

GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT ON public.teams TO authenticated;
GRANT SELECT ON public.team_members TO authenticated;
GRANT SELECT ON public.team_daily_overviews TO authenticated;

-- Optional: allow users to update their own membership (e.g., leave team)
GRANT UPDATE ON public.team_members TO authenticated;

-- ============================================================================
-- TEAMS RLS POLICY (Restrictive - only own team)
-- ============================================================================
-- Replace the overly permissive "any authenticated user can view" policy
-- with a proper "only view teams you belong to" policy

DROP POLICY IF EXISTS "Authenticated users can view teams" ON teams;
DROP POLICY IF EXISTS "Users can view own team" ON teams;

CREATE POLICY "Users can view own team"
  ON teams FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT team_id
      FROM team_members
      WHERE user_id = auth.uid()
      AND left_at IS NULL
    )
  );

-- ============================================================================
-- TEAM_MEMBERS RLS POLICIES (Already correct, but ensure they exist)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view team members" ON team_members;
CREATE POLICY "Users can view team members"
  ON team_members FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id
      FROM team_members
      WHERE user_id = auth.uid()
      AND left_at IS NULL
    )
  );

-- Allow users to update their own membership row only (e.g., to leave team)
DROP POLICY IF EXISTS "Users can update own membership" ON team_members;
CREATE POLICY "Users can update own membership"
  ON team_members FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- TEAM_DAILY_OVERVIEWS RLS POLICIES (Already correct, but ensure they exist)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view team overviews" ON team_daily_overviews;
CREATE POLICY "Users can view team overviews"
  ON team_daily_overviews FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id
      FROM team_members
      WHERE user_id = auth.uid()
      AND left_at IS NULL
    )
  );

-- ============================================================================
-- VERIFICATION QUERIES (for manual testing)
-- ============================================================================
-- Run these in the SQL editor to verify RLS is working:
--
-- 1. Set impersonation context:
--    SELECT set_config('request.jwt.claim.sub', '<USER_UUID>', true);
--    SELECT set_config('request.jwt.claim.role', 'authenticated', true);
--
-- 2. Verify auth.uid() returns the user:
--    SELECT auth.uid();
--
-- 3. Test access (should only return user's team data):
--    SELECT * FROM public.teams;
--    SELECT * FROM public.team_members;
--    SELECT * FROM public.team_daily_overviews;
