-- ============================================================================
-- V8: Add notification types for "respect_received" and "framework_completed"
-- ============================================================================

-- Step 1: Add new enum values to notification_type
-- Note: ALTER TYPE ... ADD VALUE is not transactional in PostgreSQL,
-- so each must be a separate statement outside a transaction block.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'respect_received' AND enumtypid = 'notification_type'::regtype) THEN
    ALTER TYPE notification_type ADD VALUE 'respect_received';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'framework_completed' AND enumtypid = 'notification_type'::regtype) THEN
    ALTER TYPE notification_type ADD VALUE 'framework_completed';
  END IF;
END $$;

-- ============================================================================
-- Step 2: Trigger — notify user when someone gives them a "respect" on a feed post
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_notify_respect_received()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post_owner_id UUID;
  v_post_title TEXT;
  v_respecter_name TEXT;
BEGIN
  -- Get the feed post owner
  SELECT user_id, title INTO v_post_owner_id, v_post_title
    FROM feed_posts
    WHERE id = NEW.post_id;

  -- Don't notify yourself
  IF v_post_owner_id IS NULL OR v_post_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Get the respecter's display name
  SELECT COALESCE(display_name, 'Someone') INTO v_respecter_name
    FROM profiles
    WHERE id = NEW.user_id;

  -- Create notification
  PERFORM fn_create_notification(
    v_post_owner_id,
    'respect_received',
    v_respecter_name || ' gave you respect',
    COALESCE(v_post_title, 'Your post'),
    jsonb_build_object(
      'post_id', NEW.post_id,
      'respecter_user_id', NEW.user_id
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_respect_received ON feed_respects;
CREATE TRIGGER trg_notify_respect_received
  AFTER INSERT ON feed_respects
  FOR EACH ROW
  EXECUTE FUNCTION fn_notify_respect_received();

-- ============================================================================
-- Step 3: Trigger — notify user when they complete all framework items for the day
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_notify_framework_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_framework_title TEXT;
  v_total_items INT;
  v_checked_items INT;
BEGIN
  -- Only fire when an item is checked (checked = true)
  IF NEW.checked IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- Get framework title
  SELECT ft.title INTO v_framework_title
    FROM user_frameworks uf
    JOIN framework_templates ft ON ft.id = uf.framework_template_id
    WHERE uf.id = NEW.user_framework_id;

  IF v_framework_title IS NULL THEN
    RETURN NEW;
  END IF;

  -- Count total items for this framework today
  SELECT COUNT(*) INTO v_total_items
    FROM daily_framework_items
    WHERE user_framework_id = NEW.user_framework_id
      AND date = NEW.date;

  -- Count checked items
  SELECT COUNT(*) INTO v_checked_items
    FROM daily_framework_items
    WHERE user_framework_id = NEW.user_framework_id
      AND date = NEW.date
      AND checked = true;

  -- Only notify when ALL items are now checked
  IF v_checked_items >= v_total_items AND v_total_items > 0 THEN
    PERFORM fn_create_notification(
      NEW.user_id,
      'framework_completed',
      'Framework completed!',
      v_framework_title || ' — all items checked for today',
      jsonb_build_object(
        'user_framework_id', NEW.user_framework_id,
        'date', NEW.date,
        'items_completed', v_checked_items
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_framework_completed ON daily_framework_items;
CREATE TRIGGER trg_notify_framework_completed
  AFTER UPDATE ON daily_framework_items
  FOR EACH ROW
  WHEN (NEW.checked = true AND (OLD.checked IS DISTINCT FROM NEW.checked))
  EXECUTE FUNCTION fn_notify_framework_completed();
