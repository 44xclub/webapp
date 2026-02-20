-- ============================================================================
-- V4: Streak System + Daily Reconciliation + Team Daily Overview
-- ============================================================================
-- This migration adds:
--   1. daily_user_activity  — single source of truth for "was user active on date X?"
--   2. daily_user_metrics   — audit row per user/day powering scoring + eligibility
--   3. Profile columns      — badge_tier, badge_locked, badge_locked_reasons, badge_last_evaluated_at
--   4. Unique index on daily_scores(user_id, date) to prevent duplicate scoring
--   5. DB trigger to auto-populate daily_user_activity on block mutations
--   6. Unique index on team_daily_overviews(team_id, date)
-- ============================================================================

-- -------------------------------------------------------
-- 1. daily_user_activity
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.daily_user_activity (
  user_id       uuid        NOT NULL REFERENCES auth.users(id),
  date          date        NOT NULL,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  activity_types text[]     NOT NULL DEFAULT '{}',
  block_count   int         NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, date)
);

-- Index for streak lookups (descending date per user)
CREATE INDEX IF NOT EXISTS idx_daily_user_activity_user_date
  ON public.daily_user_activity (user_id, date DESC);

-- RLS
ALTER TABLE public.daily_user_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity"
  ON public.daily_user_activity FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to daily_user_activity"
  ON public.daily_user_activity FOR ALL
  USING (auth.role() = 'service_role');

-- -------------------------------------------------------
-- 2. daily_user_metrics
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.daily_user_metrics (
  user_id          uuid        NOT NULL REFERENCES auth.users(id),
  date             date        NOT NULL,
  timezone         text        NOT NULL,
  planned_blocks   int         NOT NULL DEFAULT 0,
  completed_blocks int         NOT NULL DEFAULT 0,
  execution_rate   numeric     NOT NULL DEFAULT 0,
  framework_checked int        NOT NULL DEFAULT 0,
  base_points      int         NOT NULL DEFAULT 0,
  penalties        int         NOT NULL DEFAULT 0,
  multiplier       numeric     NOT NULL DEFAULT 0,
  gated            boolean     NOT NULL DEFAULT false,
  delta            int         NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_user_metrics_user_date
  ON public.daily_user_metrics (user_id, date DESC);

-- RLS
ALTER TABLE public.daily_user_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own metrics"
  ON public.daily_user_metrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to daily_user_metrics"
  ON public.daily_user_metrics FOR ALL
  USING (auth.role() = 'service_role');

-- -------------------------------------------------------
-- 3. Profile columns for badge state
-- -------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS badge_tier text NOT NULL DEFAULT 'Initiated',
  ADD COLUMN IF NOT EXISTS badge_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS badge_locked_reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS badge_last_evaluated_at timestamptz;

-- -------------------------------------------------------
-- 4. Unique index on daily_scores to prevent duplicate scoring
-- -------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_scores_user_date
  ON public.daily_scores (user_id, date);

-- -------------------------------------------------------
-- 5. Unique index on team_daily_overviews to prevent duplicate entries
-- -------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_daily_overviews_team_date
  ON public.team_daily_overviews (team_id, date);

-- -------------------------------------------------------
-- 6. DB trigger to auto-populate daily_user_activity on block mutations
--    This fires on INSERT, UPDATE of blocks table.
--    It upserts into daily_user_activity for the block's date.
-- -------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_track_block_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_activity_type text;
  v_block_date    date;
  v_user_id       uuid;
BEGIN
  -- Determine which row to work with (NEW for INSERT/UPDATE, OLD for DELETE)
  IF TG_OP = 'DELETE' THEN
    -- On delete, we don't remove activity (activity happened, block was later removed)
    RETURN OLD;
  END IF;

  -- Skip if block is soft-deleted
  IF NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_user_id   := NEW.user_id;
  v_block_date := NEW.date;

  -- Determine activity type
  IF TG_OP = 'INSERT' THEN
    v_activity_type := 'schedule';
  ELSIF TG_OP = 'UPDATE' THEN
    -- Check what changed
    IF OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL THEN
      v_activity_type := 'complete';
    ELSIF OLD.performed_at IS DISTINCT FROM NEW.performed_at THEN
      v_activity_type := 'complete';
    ELSE
      v_activity_type := 'log';
    END IF;
  END IF;

  -- Upsert into daily_user_activity for the BLOCK's date
  -- Only credit activity to the block's date (not today's date)
  INSERT INTO public.daily_user_activity (user_id, date, last_activity_at, activity_types, block_count)
  VALUES (
    v_user_id,
    v_block_date,
    now(),
    ARRAY[v_activity_type],
    1
  )
  ON CONFLICT (user_id, date) DO UPDATE SET
    last_activity_at = now(),
    activity_types = (
      SELECT array_agg(DISTINCT val)
      FROM unnest(
        daily_user_activity.activity_types || ARRAY[v_activity_type]
      ) AS val
    ),
    block_count = (
      SELECT count(*)
      FROM public.blocks
      WHERE user_id = v_user_id
        AND date = v_block_date
        AND deleted_at IS NULL
    );

  RETURN NEW;
END;
$$;

-- Drop existing trigger if any, then create
DROP TRIGGER IF EXISTS trg_track_block_activity ON public.blocks;
CREATE TRIGGER trg_track_block_activity
  AFTER INSERT OR UPDATE ON public.blocks
  FOR EACH ROW
  EXECUTE FUNCTION fn_track_block_activity();
