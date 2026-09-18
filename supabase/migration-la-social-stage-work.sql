-- LA Social: optional per-stage "work started" clock (SLA runs from Start, not column entry)
-- Run once in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS project_stage_work_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stage_name   TEXT NOT NULL,
  started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at     TIMESTAMPTZ,
  started_by   UUID REFERENCES profiles(id),
  ended_by     UUID REFERENCES profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_stage_work_project ON project_stage_work_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_stage_work_open ON project_stage_work_sessions(project_id) WHERE ended_at IS NULL;

ALTER TABLE project_stage_work_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stage_work_select" ON project_stage_work_sessions;
CREATE POLICY "stage_work_select" ON project_stage_work_sessions FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "stage_work_insert" ON project_stage_work_sessions;
CREATE POLICY "stage_work_insert" ON project_stage_work_sessions FOR INSERT
  WITH CHECK (can_manage_project_hold(project_id));

DROP POLICY IF EXISTS "stage_work_update" ON project_stage_work_sessions;
CREATE POLICY "stage_work_update" ON project_stage_work_sessions FOR UPDATE
  USING (can_manage_project_hold(project_id));
