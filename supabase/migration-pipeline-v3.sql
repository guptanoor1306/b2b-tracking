-- Pipeline v3: new stages, team roles, hold periods, editable SLAs
-- Run in Supabase SQL Editor after prior migrations

-- Remove Level 4 constraint; keep Levels 1–3 only
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_level_of_video_check;
ALTER TABLE projects ADD CONSTRAINT projects_level_of_video_check
  CHECK (level_of_video IS NULL OR level_of_video IN ('Level 1','Level 2','Level 3'));

-- Team assignees on project
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS editor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS editor_2_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS designer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS designer_2_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sound_designer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS writer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS external_team_member_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS uses_teleprompter BOOLEAN,
  ADD COLUMN IF NOT EXISTS is_on_hold BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS on_hold_since TIMESTAMPTZ;

ALTER TABLE projects ALTER COLUMN current_stage SET DEFAULT 'Video received';

-- Hold periods (pause timeline clock)
CREATE TABLE IF NOT EXISTS project_hold_periods (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at    TIMESTAMPTZ,
  started_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ended_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  note        TEXT
);

CREATE INDEX IF NOT EXISTS idx_hold_periods_project ON project_hold_periods(project_id);

-- Admin-editable stage SLA settings
CREATE TABLE IF NOT EXISTS settings_stage_sla (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stage_name        TEXT NOT NULL UNIQUE,
  role_owner        TEXT NOT NULL,
  duration_hours    NUMERIC(8,2) NOT NULL,
  level_1_hours     NUMERIC(8,2),
  level_2_hours     NUMERIC(8,2),
  level_3_hours     NUMERIC(8,2),
  parallel_group    TEXT,
  sort_order        INT NOT NULL DEFAULT 0,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Global settings activity log (SLA changes visible to admins)
CREATE TABLE IF NOT EXISTS settings_activity_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action_type   TEXT NOT NULL,
  field_changed TEXT,
  old_value     TEXT,
  new_value     TEXT,
  updated_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_settings_activity_at ON settings_activity_logs(updated_at DESC);

ALTER TABLE project_hold_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings_stage_sla ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hold_periods_select" ON project_hold_periods FOR SELECT USING (TRUE);
CREATE POLICY "hold_periods_write" ON project_hold_periods FOR ALL
  USING (get_my_role() IN ('Admin','Internal Team','Super Admin'));

CREATE POLICY "stage_sla_select" ON settings_stage_sla FOR SELECT USING (TRUE);
CREATE POLICY "stage_sla_write" ON settings_stage_sla FOR ALL
  USING (get_my_role() IN ('Admin','Super Admin'));

CREATE POLICY "settings_activity_select" ON settings_activity_logs FOR SELECT
  USING (get_my_role() IN ('Admin','Super Admin'));
CREATE POLICY "settings_activity_insert" ON settings_activity_logs FOR INSERT
  WITH CHECK (get_my_role() IN ('Admin','Super Admin'));

-- Default SLA seed (hours)
INSERT INTO settings_stage_sla (stage_name, role_owner, duration_hours, level_1_hours, level_2_hours, level_3_hours, parallel_group, sort_order) VALUES
  ('Video received', 'Internal', 0, NULL, NULL, NULL, NULL, 1),
  ('First Cut', 'Editor', 12, NULL, NULL, NULL, NULL, 2),
  ('First Cut sent for Review', 'External Team', 24, NULL, NULL, NULL, 'review_bundle', 3),
  ('Thumbnail Copy + RP Cuts', 'External Team', 24, NULL, NULL, NULL, 'review_bundle', 4),
  ('First Cut Changes', 'Editor', 2, NULL, NULL, NULL, NULL, 5),
  ('Storyboard', 'Writer', 24, NULL, NULL, NULL, NULL, 6),
  ('Graphics & VD', 'Designer', 24, 24, 24, 60, 'vd_bundle', 7),
  ('Animation & VD', 'Editor', 84, 84, 120, 168, 'vd_bundle', 8),
  ('Video/Thumbnail Review', 'External Team', 24, NULL, NULL, NULL, NULL, 9),
  ('Final Changes', 'Editor', 12, NULL, NULL, NULL, NULL, 10),
  ('Sound', 'Sound Designer', 24, NULL, NULL, NULL, NULL, 11),
  ('Final Delivery', 'Internal', 0, NULL, NULL, NULL, NULL, 12)
ON CONFLICT (stage_name) DO NOTHING;
