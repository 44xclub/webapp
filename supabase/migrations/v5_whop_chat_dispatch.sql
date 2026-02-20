-- v5: Whop Chat Dispatch for Workout Completion
-- Adds columns to track chat message dispatch status for idempotency
-- Adds whop_user_id to profiles for mapping Whop identity to internal users

-- 1. Add whop_user_id to profiles for Whop identity mapping
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS whop_user_id TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_profiles_whop_user_id
  ON profiles (whop_user_id)
  WHERE whop_user_id IS NOT NULL;

-- 2. Add chat dispatch tracking columns to blocks
ALTER TABLE blocks
  ADD COLUMN IF NOT EXISTS chat_message_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS chat_dispatch_status TEXT DEFAULT NULL
    CHECK (chat_dispatch_status IS NULL OR chat_dispatch_status IN ('pending', 'sent', 'failed')),
  ADD COLUMN IF NOT EXISTS chat_dispatch_error TEXT;

COMMENT ON COLUMN blocks.chat_message_sent_at IS 'Timestamp when the Whop chat message was successfully sent. Used for idempotency.';
COMMENT ON COLUMN blocks.chat_dispatch_status IS 'Status of the Whop chat dispatch: pending, sent, or failed. NULL if never attempted.';
COMMENT ON COLUMN blocks.chat_dispatch_error IS 'Error message from the last failed chat dispatch attempt.';
COMMENT ON COLUMN profiles.whop_user_id IS 'Whop platform user ID, mapped from x-whop-user-token JWT sub claim.';
