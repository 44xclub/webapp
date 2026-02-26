-- Voice Capture Sessions
-- Used by Strategy B (breakout recording) when mic is blocked inside
-- the Whop mobile iframe. The embedded app creates a session, opens an
-- external page in the system browser for recording, and polls for the
-- transcript result.

CREATE TABLE IF NOT EXISTS voice_capture_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'expired', 'failed')),
  transcript TEXT,
  error_message TEXT,
  return_url TEXT
);

-- Index for polling by user + session
CREATE INDEX IF NOT EXISTS idx_voice_capture_sessions_user
  ON voice_capture_sessions(user_id, id);

-- RLS: users can only access their own sessions
ALTER TABLE voice_capture_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own capture sessions"
  ON voice_capture_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own capture sessions"
  ON voice_capture_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own capture sessions"
  ON voice_capture_sessions FOR UPDATE
  USING (auth.uid() = user_id);
