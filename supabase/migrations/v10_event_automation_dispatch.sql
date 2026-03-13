-- ============================================================================
-- V10: Event Automation, Notification Dispatch Queue, Event Broadcasts,
--      Daily Summary Runs, and new notification types
-- ============================================================================

-- ============================================================================
-- 1. notification_dispatch_queue — queued email/push delivery
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notification_dispatch_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'push')),
  event_key TEXT NOT NULL,
  subject TEXT,
  body TEXT,
  payload JSONB NOT NULL DEFAULT '{}',
  dedupe_key TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dispatch_queue_status ON notification_dispatch_queue(status) WHERE status IN ('pending', 'processing');
CREATE INDEX IF NOT EXISTS idx_dispatch_queue_user ON notification_dispatch_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_queue_dedupe ON notification_dispatch_queue(dedupe_key);

ALTER TABLE notification_dispatch_queue ENABLE ROW LEVEL SECURITY;

-- Only service role can read/write dispatch queue
DROP POLICY IF EXISTS "Service role full access to dispatch queue" ON notification_dispatch_queue;

-- ============================================================================
-- 2. event_broadcasts — track which events have been broadcast to users
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.event_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  broadcast_type TEXT NOT NULL DEFAULT 'new_event_added',
  user_count INTEGER NOT NULL DEFAULT 0,
  broadcasted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, broadcast_type)
);

CREATE INDEX IF NOT EXISTS idx_event_broadcasts_event ON event_broadcasts(event_id);

ALTER TABLE event_broadcasts ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. daily_summary_runs — idempotent summary generation tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.daily_summary_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  summary_date DATE NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  user_count INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_summary_runs_date ON daily_summary_runs(summary_date);

ALTER TABLE daily_summary_runs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. Add unique constraint on event_rsvps (event_id, user_id) if not exists
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'event_rsvps_event_user_unique'
  ) THEN
    ALTER TABLE event_rsvps ADD CONSTRAINT event_rsvps_event_user_unique UNIQUE (event_id, user_id);
  END IF;
END $$;

-- ============================================================================
-- 5. Grants for service role operations
-- ============================================================================

GRANT ALL ON public.notification_dispatch_queue TO service_role;
GRANT ALL ON public.event_broadcasts TO service_role;
GRANT ALL ON public.daily_summary_runs TO service_role;
