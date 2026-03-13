-- v9: Framework & Team Hardening
-- Personal framework ownership, team daily overviews, performance indexes

-- ══════════════════════════════════════════════════════════════════════
-- Part 1: Personal Framework Ownership
-- ══════════════════════════════════════════════════════════════════════

-- Unique index: one personal framework per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_framework_templates_personal_owner
  ON framework_templates (owner_user_id)
  WHERE visibility = 'personal';

-- RPC: ensure a personal framework exists for the calling user
-- Returns the framework_template row (creates if missing)
CREATE OR REPLACE FUNCTION ensure_personal_framework()
RETURNS framework_templates
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _display_name text;
  _tmpl framework_templates%ROWTYPE;
BEGIN
  -- Try to fetch existing
  SELECT * INTO _tmpl
    FROM framework_templates
   WHERE owner_user_id = _user_id
     AND visibility = 'personal'
   LIMIT 1;

  IF FOUND THEN
    RETURN _tmpl;
  END IF;

  -- Get user display name for default title
  SELECT display_name INTO _display_name
    FROM profiles
   WHERE id = _user_id;

  INSERT INTO framework_templates (
    title, description, visibility, owner_user_id, is_active, criteria
  ) VALUES (
    COALESCE(_display_name, 'My') || '''s Framework',
    'Personal non-negotiables',
    'personal',
    _user_id,
    true,
    '{"items":[]}'::jsonb
  )
  ON CONFLICT (owner_user_id) WHERE visibility = 'personal'
  DO NOTHING
  RETURNING * INTO _tmpl;

  -- If DO NOTHING fired (race condition), fetch the winner
  IF NOT FOUND THEN
    SELECT * INTO _tmpl
      FROM framework_templates
     WHERE owner_user_id = _user_id
       AND visibility = 'personal'
     LIMIT 1;
  END IF;

  RETURN _tmpl;
END;
$$;

-- Trigger: sync framework title when profile display_name changes
CREATE OR REPLACE FUNCTION sync_personal_framework_title_from_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.display_name IS DISTINCT FROM OLD.display_name THEN
    UPDATE framework_templates
       SET title = COALESCE(NEW.display_name, 'My') || '''s Framework',
           updated_at = now()
     WHERE owner_user_id = NEW.id
       AND visibility = 'personal';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_framework_title ON profiles;
CREATE TRIGGER trg_sync_framework_title
  AFTER UPDATE OF display_name ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_personal_framework_title_from_profile();

-- ══════════════════════════════════════════════════════════════════════
-- Part 2: Team Daily Overviews
-- ══════════════════════════════════════════════════════════════════════

-- Unique index: one overview per team per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_daily_overview_unique
  ON team_daily_overviews (team_id, overview_date);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_blocks_user_date
  ON blocks (user_id, date)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_daily_framework_items_user_date
  ON daily_framework_items (user_id, item_date);

-- Function: generate team daily overviews for a given date
CREATE OR REPLACE FUNCTION generate_team_daily_overviews(target_date date DEFAULT CURRENT_DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _team RECORD;
BEGIN
  FOR _team IN
    SELECT DISTINCT t.id AS team_id
      FROM teams t
      JOIN team_members tm ON tm.team_id = t.id
     WHERE tm.status = 'active'
  LOOP
    INSERT INTO team_daily_overviews (team_id, overview_date, generated_at, data)
    SELECT
      _team.team_id,
      target_date,
      now(),
      jsonb_build_object(
        'member_summaries', COALESCE(jsonb_agg(member_data), '[]'::jsonb)
      )
    FROM (
      SELECT jsonb_build_object(
        'user_id', tm.user_id,
        'display_name', p.display_name,
        'blocks_completed', (
          SELECT count(*)
            FROM blocks b
           WHERE b.user_id = tm.user_id
             AND b.date = target_date
             AND b.completed_at IS NOT NULL
             AND b.deleted_at IS NULL
        ),
        'blocks_total', (
          SELECT count(*)
            FROM blocks b
           WHERE b.user_id = tm.user_id
             AND b.date = target_date
             AND b.deleted_at IS NULL
        ),
        'framework_completed', (
          SELECT count(*)
            FROM daily_framework_items dfi
           WHERE dfi.user_id = tm.user_id
             AND dfi.item_date = target_date
             AND dfi.checked = true
        ),
        'framework_total', (
          SELECT count(*)
            FROM daily_framework_items dfi
           WHERE dfi.user_id = tm.user_id
             AND dfi.item_date = target_date
        )
      ) AS member_data
      FROM team_members tm
      JOIN profiles p ON p.id = tm.user_id
      WHERE tm.team_id = _team.team_id
        AND tm.status = 'active'
    ) sub
    ON CONFLICT (team_id, overview_date)
    DO UPDATE SET
      generated_at = now(),
      data = EXCLUDED.data;
  END LOOP;
END;
$$;
