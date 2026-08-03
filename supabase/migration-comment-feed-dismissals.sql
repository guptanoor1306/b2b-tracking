-- Per-user dismissals for dashboard recent-comments feed (does not delete the comment)
-- Run in Supabase SQL Editor (safe to re-run)

CREATE TABLE IF NOT EXISTS comment_feed_dismissals (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  comment_id  UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, comment_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_feed_dismissals_profile
  ON comment_feed_dismissals (profile_id, dismissed_at DESC);

ALTER TABLE comment_feed_dismissals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comment_feed_dismissals_select_own" ON comment_feed_dismissals;
CREATE POLICY "comment_feed_dismissals_select_own" ON comment_feed_dismissals
  FOR SELECT USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "comment_feed_dismissals_insert_own" ON comment_feed_dismissals;
CREATE POLICY "comment_feed_dismissals_insert_own" ON comment_feed_dismissals
  FOR INSERT WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "comment_feed_dismissals_delete_own" ON comment_feed_dismissals;
CREATE POLICY "comment_feed_dismissals_delete_own" ON comment_feed_dismissals
  FOR DELETE USING (profile_id = auth.uid());
