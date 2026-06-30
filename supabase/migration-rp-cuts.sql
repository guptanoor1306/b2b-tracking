-- RP Cuts per project (client adds, internal + agency view)
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS project_rp_cuts (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sort_order   INT NOT NULL DEFAULT 0,
  timestamps   TEXT,
  thumbnail    TEXT,
  created_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_rp_cuts_project ON project_rp_cuts(project_id, sort_order);

ALTER TABLE project_rp_cuts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rp_cuts_select" ON project_rp_cuts;
CREATE POLICY "rp_cuts_select" ON project_rp_cuts FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "rp_cuts_insert" ON project_rp_cuts;
CREATE POLICY "rp_cuts_insert" ON project_rp_cuts FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "rp_cuts_update" ON project_rp_cuts;
CREATE POLICY "rp_cuts_update" ON project_rp_cuts FOR UPDATE
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "rp_cuts_delete" ON project_rp_cuts;
CREATE POLICY "rp_cuts_delete" ON project_rp_cuts FOR DELETE
  USING (auth.uid() IS NOT NULL);
