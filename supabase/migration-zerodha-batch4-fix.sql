-- Batch 4 follow-up: QC reviewer on project + RLS for client review tables
-- Run in Supabase SQL Editor (safe to re-run)

ALTER TABLE projects ADD COLUMN IF NOT EXISTS qc_reviewer_id UUID REFERENCES profiles(id);

ALTER TABLE client_review_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_review_feedback_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_review_submissions_select" ON client_review_submissions;
CREATE POLICY "client_review_submissions_select" ON client_review_submissions
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "client_review_feedback_items_select" ON client_review_feedback_items;
CREATE POLICY "client_review_feedback_items_select" ON client_review_feedback_items
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS qc_review_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  submitted_by UUID REFERENCES profiles(id),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_good_to_go BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS qc_review_feedback_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES qc_review_submissions(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE qc_review_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE qc_review_feedback_items ENABLE ROW LEVEL SECURITY;

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
