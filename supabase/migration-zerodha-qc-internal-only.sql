-- QC review data is internal-only (not visible to external client roles)
-- Run in Supabase SQL Editor (safe to re-run)

CREATE OR REPLACE FUNCTION can_view_qc_review()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT get_my_role() = 'Super Admin'
    OR EXISTS (
      SELECT 1 FROM profile_channels
      WHERE profile_id = auth.uid()
        AND channel_role IN ('Channel Admin', 'Channel Team', 'Channel Super Admin')
    );
$$;

DROP POLICY IF EXISTS "qc_review_submissions_select" ON qc_review_submissions;
CREATE POLICY "qc_review_submissions_select" ON qc_review_submissions
  FOR SELECT USING (can_view_qc_review());

DROP POLICY IF EXISTS "qc_review_feedback_items_select" ON qc_review_feedback_items;
CREATE POLICY "qc_review_feedback_items_select" ON qc_review_feedback_items
  FOR SELECT USING (can_view_qc_review());
