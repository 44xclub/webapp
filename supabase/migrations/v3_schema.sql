-- =====================================================
-- 44CLUB BLOCKS - V3 Schema Migration
-- =====================================================

-- =====================================================
-- PROFILES TABLE - Add V3 columns
-- =====================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_path TEXT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birth_date DATE NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS weight_kg DECIMAL(5,2) NULL;

-- =====================================================
-- FRAMEWORK_TEMPLATES TABLE - Add V3 columns
-- =====================================================
ALTER TABLE framework_templates ADD COLUMN IF NOT EXISTS image_path TEXT NULL;

-- =====================================================
-- PROGRAMME_TEMPLATES TABLE - Add V3 columns
-- =====================================================
ALTER TABLE programme_templates ADD COLUMN IF NOT EXISTS hero_image_path TEXT NULL;

-- =====================================================
-- DAILY_FRAMEWORK_ITEMS TABLE (Live ticking)
-- =====================================================
CREATE TABLE IF NOT EXISTS daily_framework_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  criterion_id TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_user_date_criterion UNIQUE (user_id, date, criterion_id)
);

CREATE INDEX IF NOT EXISTS idx_daily_framework_items_user_date ON daily_framework_items(user_id, date);

-- Apply trigger to daily_framework_items
DROP TRIGGER IF EXISTS update_daily_framework_items_updated_at ON daily_framework_items;
CREATE TRIGGER update_daily_framework_items_updated_at
  BEFORE UPDATE ON daily_framework_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TEAMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_number INT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- TEAM_MEMBERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('captain', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at TIMESTAMPTZ NULL,

  CONSTRAINT unique_active_team_member UNIQUE (team_id, user_id, left_at)
);

CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);

-- =====================================================
-- TEAM_DAILY_OVERVIEWS TABLE (Snapshots)
-- =====================================================
CREATE TABLE IF NOT EXISTS team_daily_overviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_team_daily_overview UNIQUE (team_id, date)
);

CREATE INDEX IF NOT EXISTS idx_team_daily_overviews_team_date ON team_daily_overviews(team_id, date);

-- =====================================================
-- FEED_POSTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS feed_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  block_id UUID NULL REFERENCES blocks(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT NULL,
  media_path TEXT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_feed_posts_user ON feed_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_posts_created ON feed_posts(created_at DESC);

-- =====================================================
-- FEED_RESPECTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS feed_respects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_post_respect UNIQUE (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_feed_respects_post ON feed_respects(post_id);
CREATE INDEX IF NOT EXISTS idx_feed_respects_user ON feed_respects(user_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) - New Tables
-- =====================================================

-- Enable RLS on all new tables
ALTER TABLE daily_framework_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_daily_overviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_respects ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- DAILY_FRAMEWORK_ITEMS RLS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can read own framework items" ON daily_framework_items;
CREATE POLICY "Users can read own framework items"
  ON daily_framework_items FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own framework items" ON daily_framework_items;
CREATE POLICY "Users can insert own framework items"
  ON daily_framework_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own framework items" ON daily_framework_items;
CREATE POLICY "Users can update own framework items"
  ON daily_framework_items FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own framework items" ON daily_framework_items;
CREATE POLICY "Users can delete own framework items"
  ON daily_framework_items FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- TEAMS RLS POLICIES
-- =====================================================

-- All authenticated users can view teams (for lookup)
DROP POLICY IF EXISTS "Authenticated users can view teams" ON teams;
CREATE POLICY "Authenticated users can view teams"
  ON teams FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- TEAM_MEMBERS RLS POLICIES
-- =====================================================

-- Users can view members of their own team
DROP POLICY IF EXISTS "Users can view team members" ON team_members;
CREATE POLICY "Users can view team members"
  ON team_members FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid() AND left_at IS NULL
    )
  );

-- =====================================================
-- TEAM_DAILY_OVERVIEWS RLS POLICIES
-- =====================================================

-- Users can view overviews of their own team
DROP POLICY IF EXISTS "Users can view team overviews" ON team_daily_overviews;
CREATE POLICY "Users can view team overviews"
  ON team_daily_overviews FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid() AND left_at IS NULL
    )
  );

-- =====================================================
-- FEED_POSTS RLS POLICIES
-- =====================================================

-- All authenticated users can view non-deleted posts
DROP POLICY IF EXISTS "Users can view feed posts" ON feed_posts;
CREATE POLICY "Users can view feed posts"
  ON feed_posts FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

-- Users can insert their own posts
DROP POLICY IF EXISTS "Users can insert own posts" ON feed_posts;
CREATE POLICY "Users can insert own posts"
  ON feed_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can soft delete their own posts
DROP POLICY IF EXISTS "Users can delete own posts" ON feed_posts;
CREATE POLICY "Users can delete own posts"
  ON feed_posts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- FEED_RESPECTS RLS POLICIES
-- =====================================================

-- All authenticated users can view respects
DROP POLICY IF EXISTS "Users can view respects" ON feed_respects;
CREATE POLICY "Users can view respects"
  ON feed_respects FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert their own respects
DROP POLICY IF EXISTS "Users can insert own respects" ON feed_respects;
CREATE POLICY "Users can insert own respects"
  ON feed_respects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own respects
DROP POLICY IF EXISTS "Users can delete own respects" ON feed_respects;
CREATE POLICY "Users can delete own respects"
  ON feed_respects FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- PROFILES RLS - Allow reading for feed/team display
-- =====================================================

-- Allow authenticated users to read basic profile info for community features
DROP POLICY IF EXISTS "Users can read profiles for community" ON profiles;
CREATE POLICY "Users can read profiles for community"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);
