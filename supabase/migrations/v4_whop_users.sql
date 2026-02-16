-- =====================================================
-- V4: WHOP USER IDENTITY MAPPING
-- Maps Whop user IDs to Supabase auth user IDs
-- =====================================================

-- Table to map Whop users to Supabase auth users
CREATE TABLE IF NOT EXISTS whop_users (
  whop_user_id TEXT PRIMARY KEY,
  supabase_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  whop_username TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for reverse lookup (Supabase user → Whop user)
CREATE INDEX idx_whop_users_supabase_id ON whop_users(supabase_user_id);

-- Updated_at trigger
CREATE TRIGGER update_whop_users_updated_at
  BEFORE UPDATE ON whop_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS: Only accessible via service role (server-side only)
ALTER TABLE whop_users ENABLE ROW LEVEL SECURITY;

-- No public RLS policies - this table is only accessed server-side
-- via the service role key in the Whop auth API route.
