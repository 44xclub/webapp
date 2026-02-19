-- 44CLUB - V3.6 Fix Team Members RLS (Self-Referential Policy)
--
-- The team_members SELECT policies query team_members within their own
-- USING clause, causing infinite recursion in PostgreSQL RLS evaluation
-- and returning HTTP 500 on every query.
--
-- Fix: Create a SECURITY DEFINER function that bypasses RLS to look up
-- the current user's team IDs, then rewrite the policies to call it.

-- ============================================================================
-- STEP 1: Helper function (bypasses RLS to avoid recursion)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_my_team_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT team_id
  FROM team_members
  WHERE user_id = auth.uid()
    AND left_at IS NULL;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_my_team_ids() TO authenticated;

-- ============================================================================
-- STEP 2: Drop ALL existing team_members SELECT policies (including duplicates)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view team members" ON team_members;
DROP POLICY IF EXISTS "team_members_select_own_team" ON team_members;

-- ============================================================================
-- STEP 3: Recreate team_members SELECT policy using the helper function
-- ============================================================================

CREATE POLICY "Users can view team members"
  ON team_members FOR SELECT
  TO authenticated
  USING (
    team_id IN (SELECT public.get_my_team_ids())
  );

-- ============================================================================
-- STEP 4: Also update teams and team_daily_overviews to use the helper
-- (not strictly needed - they work because they reference a different table,
-- but using the helper is cleaner and avoids future confusion)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own team" ON teams;
DROP POLICY IF EXISTS "teams_select_own_team" ON teams;

CREATE POLICY "Users can view own team"
  ON teams FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT public.get_my_team_ids())
  );

DROP POLICY IF EXISTS "Users can view team overviews" ON team_daily_overviews;
DROP POLICY IF EXISTS "team_daily_overviews_select_own_team" ON team_daily_overviews;

CREATE POLICY "Users can view team overviews"
  ON team_daily_overviews FOR SELECT
  TO authenticated
  USING (
    team_id IN (SELECT public.get_my_team_ids())
  );

-- ============================================================================
-- STEP 5: Clean up duplicate UPDATE policies on team_members
-- ============================================================================

DROP POLICY IF EXISTS "team_members_update_self_leave_only" ON team_members;
-- Keep "Users can update own membership" (the original, non-duplicate)

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- After running this migration, verify with:
--
-- SELECT policyname, cmd, qual
-- FROM pg_policies
-- WHERE tablename IN ('teams', 'team_members', 'team_daily_overviews');
--
-- Expected: no more self-referential subqueries on team_members
