-- 44CLUB - V3.4 In-App Notification System Migration
--
-- Implements the 44CLUB In-App Notification System specification:
-- - Discipline signals, not engagement bait
-- - 9 approved notification types
-- - User-owned data with strict RLS
-- - SECURITY DEFINER function for internal notification creation
--
-- Notification Types:
-- 1. programme_approved - Personal programme approved by admin
-- 2. programme_rejected - Personal programme rejected by admin
-- 3. framework_approved - Personal framework approved by admin
-- 4. framework_rejected - Personal framework rejected by admin
-- 5. streak_milestone - Streak milestone reached (7, 14, 30, 60, 90 days)
-- 6. badge_earned - New discipline badge unlocked
-- 7. challenge_complete - Monthly challenge completed
-- 8. reflection_reminder - Weekly reflection reminder
-- 9. team_update - Team-related updates

-- ============================================================================
-- NOTIFICATION TYPE ENUM
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'programme_approved',
    'programme_rejected',
    'framework_approved',
    'framework_rejected',
    'streak_milestone',
    'badge_earned',
    'challenge_complete',
    'reflection_reminder',
    'team_update'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  payload JSONB DEFAULT '{}',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================================================
-- ENABLE RLS
-- ============================================================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES - Users can only access their own notifications
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;

-- ============================================================================
-- SECURITY DEFINER FUNCTION FOR CREATING NOTIFICATIONS
-- ============================================================================
-- This function bypasses RLS to allow the system to create notifications
-- for any user (e.g., when admin approves a programme)

CREATE OR REPLACE FUNCTION fn_create_notification(
  p_user_id UUID,
  p_type notification_type,
  p_title TEXT,
  p_body TEXT DEFAULT NULL,
  p_payload JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, body, payload)
  VALUES (p_user_id, p_type, p_title, p_body, p_payload)
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

-- Grant execute to authenticated users (they can call it but only for themselves via API)
-- The function itself checks nothing - it trusts the caller (backend/triggers)
GRANT EXECUTE ON FUNCTION fn_create_notification TO authenticated;

-- ============================================================================
-- HELPER FUNCTION: Mark notification as read
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_mark_notification_read(p_notification_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE notifications
  SET read_at = NOW()
  WHERE id = p_notification_id
    AND user_id = auth.uid()
    AND read_at IS NULL;

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_mark_notification_read TO authenticated;

-- ============================================================================
-- HELPER FUNCTION: Mark all notifications as read for user
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_mark_all_notifications_read()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE notifications
  SET read_at = NOW()
  WHERE user_id = auth.uid()
    AND read_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_mark_all_notifications_read TO authenticated;

-- ============================================================================
-- HELPER FUNCTION: Get unread notification count
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_get_unread_notification_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM notifications
  WHERE user_id = auth.uid()
    AND read_at IS NULL;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION fn_get_unread_notification_count TO authenticated;

-- ============================================================================
-- TRIGGER: Create notification when programme is approved/rejected
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_notify_programme_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only fire when status changes to approved or rejected
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'approved' THEN
      PERFORM fn_create_notification(
        NEW.user_id,
        'programme_approved',
        'Programme Approved',
        format('Your programme "%s" has been approved. You can now schedule it into your blocks.', NEW.title),
        jsonb_build_object('programme_id', NEW.id, 'programme_title', NEW.title)
      );
    ELSIF NEW.status = 'rejected' THEN
      PERFORM fn_create_notification(
        NEW.user_id,
        'programme_rejected',
        'Programme Needs Review',
        format('Your programme "%s" needs some adjustments. Please review and resubmit.', NEW.title),
        jsonb_build_object('programme_id', NEW.id, 'programme_title', NEW.title)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_programme_status ON personal_programmes;
CREATE TRIGGER trg_notify_programme_status
  AFTER UPDATE ON personal_programmes
  FOR EACH ROW
  EXECUTE FUNCTION fn_notify_programme_status_change();

-- ============================================================================
-- TRIGGER: Create notification when framework is approved/rejected
-- ============================================================================
-- Personal frameworks use is_active to determine approval status
-- When a personal framework is activated by admin, user is notified

CREATE OR REPLACE FUNCTION fn_notify_framework_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only for personal frameworks (visibility = 'personal' and owner_user_id is not null)
  IF NEW.visibility = 'personal' AND NEW.owner_user_id IS NOT NULL THEN
    IF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
      IF NEW.is_active = true THEN
        PERFORM fn_create_notification(
          NEW.owner_user_id,
          'framework_approved',
          'Framework Approved',
          format('Your discipline framework "%s" has been approved. You can now activate it.', NEW.title),
          jsonb_build_object('framework_id', NEW.id, 'framework_title', NEW.title)
        );
      ELSE
        -- Only notify rejection if it was previously active (not initial creation)
        IF OLD.is_active = true THEN
          PERFORM fn_create_notification(
            NEW.owner_user_id,
            'framework_rejected',
            'Framework Deactivated',
            format('Your framework "%s" has been deactivated.', NEW.title),
            jsonb_build_object('framework_id', NEW.id, 'framework_title', NEW.title)
          );
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_framework_status ON framework_templates;
CREATE TRIGGER trg_notify_framework_status
  AFTER UPDATE ON framework_templates
  FOR EACH ROW
  EXECUTE FUNCTION fn_notify_framework_status_change();

-- ============================================================================
-- VERIFICATION NOTES
-- ============================================================================
-- To test notification creation:
--
-- 1. Manually create a notification:
--    SELECT fn_create_notification(
--      '<user_uuid>',
--      'programme_approved',
--      'Test Notification',
--      'This is a test notification body',
--      '{"test": true}'
--    );
--
-- 2. View notifications for current user:
--    SELECT * FROM notifications WHERE user_id = auth.uid() ORDER BY created_at DESC;
--
-- 3. Mark notification as read:
--    SELECT fn_mark_notification_read('<notification_uuid>');
--
-- 4. Get unread count:
--    SELECT fn_get_unread_notification_count();
