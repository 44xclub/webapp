-- =====================================================
-- v6: Voice Commands Log table for voice scheduling
-- =====================================================

-- Table to audit every voice scheduling attempt
CREATE TABLE IF NOT EXISTS voice_commands_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  raw_transcript TEXT,
  proposed_action JSONB,
  approved_action JSONB,
  confidence REAL CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  needs_clarification TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'proposed'
    CHECK (status IN ('proposed', 'executed', 'failed', 'cancelled')),
  block_id UUID REFERENCES blocks(id) ON DELETE SET NULL,
  error_message TEXT,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_voice_commands_log_user ON voice_commands_log(user_id);
CREATE INDEX idx_voice_commands_log_status ON voice_commands_log(user_id, status);
CREATE INDEX idx_voice_commands_log_block ON voice_commands_log(block_id);

-- Updated_at trigger
CREATE TRIGGER update_voice_commands_log_updated_at
  BEFORE UPDATE ON voice_commands_log
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

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
