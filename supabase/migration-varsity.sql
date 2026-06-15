-- Varsity migration: new fields, stages, assignees
-- Run after schema.sql + fix-rls.sql

ALTER TABLE projects
  ALTER COLUMN channel SET DEFAULT 'Varsity',
  ALTER COLUMN current_stage SET DEFAULT 'Script Received';

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS level_of_video TEXT
    CHECK (level_of_video IS NULL OR level_of_video IN ('Level 1','Level 2','Level 3','Level 4')),
  ADD COLUMN IF NOT EXISTS title_copy TEXT,
  ADD COLUMN IF NOT EXISTS drive_link TEXT,
  ADD COLUMN IF NOT EXISTS stage_assignee_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE stage_history
  ADD COLUMN IF NOT EXISTS assignee_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Optional: update content_id prefix for new projects
-- ALTER SEQUENCE project_id_seq RESTART WITH 1001;
-- ALTER TABLE projects ALTER COLUMN content_id SET DEFAULT 'VS-' || nextval('project_id_seq')::TEXT;
