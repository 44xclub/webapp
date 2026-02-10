-- 44CLUB - V3.5 Bug Fixes Migration
--
-- Fixes for:
-- BUG 1: Framework activate/deactivate notifications
-- BUG 3: Media RLS policies
-- BUG 4: Team RLS policies and grants
-- BUG 5: Blocks RLS policies

-- ============================================================================
-- BUG 1 FIX: Triggers for framework activation notifications
-- ============================================================================

-- Trigger function for framework activation
CREATE OR REPLACE FUNCTION fn_notify_framework_activation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_framework_title TEXT;
BEGIN
  -- Get framework title
  SELECT title INTO v_framework_title
  FROM framework_templates
  WHERE id = NEW.framework_template_id;

  -- Create notification using existing function signature
  PERFORM fn_create_notification(
    NEW.user_id,
    'framework_activated',
    format('You activated the "%s" discipline framework. Your daily non-negotiables are now active.', v_framework_title),
    'info',
    'Framework Activated',
    jsonb_build_object('framework_id', NEW.framework_template_id, 'framework_title', v_framework_title)
  );

  RETURN NEW;
END;
$$;

-- Trigger function for framework deactivation
CREATE OR REPLACE FUNCTION fn_notify_framework_deactivation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_framework_title TEXT;
BEGIN
  -- Get framework title
  SELECT title INTO v_framework_title
  FROM framework_templates
  WHERE id = OLD.framework_template_id;

  -- Create notification
  PERFORM fn_create_notification(
    OLD.user_id,
    'framework_deactivated',
    format('You deactivated the "%s" discipline framework.', v_framework_title),
    'info',
    'Framework Deactivated',
    jsonb_build_object('framework_id', OLD.framework_template_id, 'framework_title', v_framework_title)
  );

  RETURN OLD;
END;
$$;

-- Trigger function for framework switch (update)
CREATE OR REPLACE FUNCTION fn_notify_framework_switch()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_title TEXT;
  v_new_title TEXT;
BEGIN
  -- Only fire if framework actually changed
  IF OLD.framework_template_id IS DISTINCT FROM NEW.framework_template_id THEN
    SELECT title INTO v_old_title FROM framework_templates WHERE id = OLD.framework_template_id;
    SELECT title INTO v_new_title FROM framework_templates WHERE id = NEW.framework_template_id;

    PERFORM fn_create_notification(
      NEW.user_id,
      'framework_switched',
      format('You switched from "%s" to "%s" discipline framework.', v_old_title, v_new_title),
      'info',
      'Framework Switched',
      jsonb_build_object(
        'old_framework_id', OLD.framework_template_id,
        'new_framework_id', NEW.framework_template_id,
        'new_framework_title', v_new_title
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create triggers on user_frameworks
DROP TRIGGER IF EXISTS trg_notify_framework_activated ON user_frameworks;
CREATE TRIGGER trg_notify_framework_activated
  AFTER INSERT ON user_frameworks
  FOR EACH ROW
  EXECUTE FUNCTION fn_notify_framework_activation();

DROP TRIGGER IF EXISTS trg_notify_framework_deactivated ON user_frameworks;
CREATE TRIGGER trg_notify_framework_deactivated
  AFTER DELETE ON user_frameworks
  FOR EACH ROW
  EXECUTE FUNCTION fn_notify_framework_deactivation();

DROP TRIGGER IF EXISTS trg_notify_framework_switched ON user_frameworks;
CREATE TRIGGER trg_notify_framework_switched
  AFTER UPDATE ON user_frameworks
  FOR EACH ROW
  EXECUTE FUNCTION fn_notify_framework_switch();

-- ============================================================================
-- BUG 3 FIX: block_media RLS policies
-- ============================================================================

ALTER TABLE block_media ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, DELETE ON public.block_media TO authenticated;

DROP POLICY IF EXISTS "Users can view own media" ON block_media;
CREATE POLICY "Users can view own media"
  ON block_media FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own media" ON block_media;
CREATE POLICY "Users can insert own media"
  ON block_media FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own media" ON block_media;
CREATE POLICY "Users can delete own media"
  ON block_media FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- BUG 4 FIX: Team RLS policies and grants
-- ============================================================================

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_daily_overviews ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.teams TO authenticated;
GRANT SELECT ON public.team_members TO authenticated;
GRANT SELECT ON public.team_daily_overviews TO authenticated;
GRANT UPDATE ON public.team_members TO authenticated;

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

DROP POLICY IF EXISTS "Users can update own membership" ON team_members;
CREATE POLICY "Users can update own membership"
  ON team_members FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- BUG 5 FIX: Blocks RLS policies (ensure checkin type allowed)
-- ============================================================================

ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.blocks TO authenticated;

DROP POLICY IF EXISTS "Users can insert own blocks" ON blocks;
CREATE POLICY "Users can insert own blocks"
  ON blocks FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own blocks" ON blocks;
CREATE POLICY "Users can view own blocks"
  ON blocks FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own blocks" ON blocks;
CREATE POLICY "Users can update own blocks"
  ON blocks FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own blocks" ON blocks;
CREATE POLICY "Users can delete own blocks"
  ON blocks FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify the fixes:

-- Check triggers on user_frameworks:
-- SELECT tgname FROM pg_trigger WHERE tgrelid = 'user_frameworks'::regclass;

-- Check policies on teams:
-- SELECT policyname FROM pg_policies WHERE tablename IN ('teams', 'team_members', 'team_daily_overviews');

-- Check grants:
-- SELECT grantee, table_name, privilege_type
-- FROM information_schema.table_privileges
-- WHERE table_name IN ('teams', 'team_members', 'blocks', 'block_media')
--   AND grantee = 'authenticated';
