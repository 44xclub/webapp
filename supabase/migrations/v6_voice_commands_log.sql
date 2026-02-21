-- =====================================================
-- v6: Voice Commands Log table for voice scheduling
-- =====================================================

-- Table to audit every voice scheduling attempt
CREATE TABLE IF NOT EXISTS voice_commands_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  input_type TEXT NOT NULL CHECK (input_type IN ('audio', 'text')),
  raw_transcript TEXT,
  raw_audio_path TEXT,
  intent TEXT NOT NULL CHECK (intent IN ('create_block', 'reschedule_block', 'cancel_block')),
  proposed_action JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence NUMERIC NOT NULL DEFAULT 0,
  needs_clarification JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'proposed'
    CHECK (status IN ('proposed', 'confirmed', 'executed', 'failed')),
  executed_at TIMESTAMPTZ,
  block_id UUID REFERENCES blocks(id),
  error_message TEXT
);

-- Indexes
CREATE INDEX idx_voice_commands_log_user ON voice_commands_log(user_id);
CREATE INDEX idx_voice_commands_log_status ON voice_commands_log(user_id, status);
CREATE INDEX idx_voice_commands_log_block ON voice_commands_log(block_id);

-- =====================================================
-- RLS for voice_commands_log
-- =====================================================
ALTER TABLE voice_commands_log ENABLE ROW LEVEL SECURITY;

-- Users can read their own voice command logs
CREATE POLICY "Users can read own voice logs"
  ON voice_commands_log FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own voice command logs
CREATE POLICY "Users can insert own voice logs"
  ON voice_commands_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own voice command logs
CREATE POLICY "Users can update own voice logs"
  ON voice_commands_log FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
