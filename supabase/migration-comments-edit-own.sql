-- Allow comment authors to edit their own feedback comments
-- Run in Supabase SQL Editor

DROP POLICY IF EXISTS "comments_update_own" ON comments;
CREATE POLICY "comments_update_own" ON comments FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());
