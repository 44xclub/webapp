-- =====================================================
-- 44CLUB - V4 Check-in Fixes Migration
-- =====================================================
--
-- Root cause: check-in INSERT fails because
--   1. valid_time_range constraint rejects end_time = start_time
--   2. Missing columns the app writes to (is_planned, performed_at, etc.)
--   3. block_type CHECK missing 'challenge'
--   4. block_media missing sort_order / slot / meta columns
--
-- All statements are idempotent (safe to re-run).

-- ============================================================================
-- 1. FIX: blocks.valid_time_range constraint
--    Old: end_time > start_time  (rejects end_time = start_time → breaks check-ins)
--    New: end_time >= start_time  (allows point-in-time blocks)
-- ============================================================================

ALTER TABLE blocks DROP CONSTRAINT IF EXISTS valid_time_range;
ALTER TABLE blocks ADD CONSTRAINT valid_time_range
  CHECK (end_time IS NULL OR end_time >= start_time);

-- ============================================================================
-- 2. FIX: blocks.block_type CHECK — add 'challenge'
-- ============================================================================

ALTER TABLE blocks DROP CONSTRAINT IF EXISTS blocks_block_type_check;
ALTER TABLE blocks ADD CONSTRAINT blocks_block_type_check
  CHECK (block_type IN ('workout', 'habit', 'nutrition', 'checkin', 'personal', 'challenge'));

-- ============================================================================
-- 3. ADD missing columns on blocks (idempotent)
-- ============================================================================

ALTER TABLE blocks ADD COLUMN IF NOT EXISTS locked_at             TIMESTAMPTZ NULL;
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS is_planned            BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS performed_at          TIMESTAMPTZ NULL;
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS is_backfilled         BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS backfilled_at         TIMESTAMPTZ NULL;
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS challenge_id          UUID NULL;
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS programme_template_id UUID NULL;
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS programme_session_id  UUID NULL;
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS shared_to_feed        BOOLEAN NOT NULL DEFAULT false;

-- Index for check-in history (ordered by performed_at)
CREATE INDEX IF NOT EXISTS idx_blocks_user_type_performed
  ON blocks (user_id, block_type, performed_at DESC NULLS LAST);

-- ============================================================================
-- 4. ADD missing columns on block_media (idempotent)
-- ============================================================================

ALTER TABLE block_media ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE block_media ADD COLUMN IF NOT EXISTS slot       TEXT NULL
  CHECK (slot IS NULL OR slot IN ('generic', 'front', 'side', 'back'));
ALTER TABLE block_media ADD COLUMN IF NOT EXISTS meta       JSONB NULL;

-- ============================================================================
-- 5. BACKFILL: set performed_at for existing completed blocks that lack it
-- ============================================================================

UPDATE blocks
SET    performed_at = completed_at
WHERE  completed_at IS NOT NULL
  AND  performed_at IS NULL;

-- ============================================================================
-- 6. VERIFICATION QUERIES (run manually to confirm)
-- ============================================================================
-- SELECT column_name, data_type, is_nullable
-- FROM   information_schema.columns
-- WHERE  table_name = 'blocks'
-- ORDER  BY ordinal_position;
--
-- SELECT column_name, data_type, is_nullable
-- FROM   information_schema.columns
-- WHERE  table_name = 'block_media'
-- ORDER  BY ordinal_position;
--
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM   pg_constraint
-- WHERE  conrelid = 'blocks'::regclass;
--
-- Quick smoke test (should return 0 errors):
-- INSERT INTO blocks (user_id, date, start_time, end_time, block_type, payload, is_planned, performed_at, completed_at)
-- VALUES (auth.uid(), CURRENT_DATE, '08:00', NULL, 'checkin', '{"weight":75.5}', false, NOW(), NOW())
-- RETURNING id;
