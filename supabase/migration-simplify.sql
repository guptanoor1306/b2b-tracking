-- Run in Supabase SQL Editor (one-time)
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS department TEXT CHECK (department IN ('Internal', 'External')),
  ADD COLUMN IF NOT EXISTS graphic_designer_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Fries Media as external partner
INSERT INTO agencies (name) VALUES ('Fries Media')
ON CONFLICT (name) DO NOTHING;

-- Team editors
DELETE FROM editors;
INSERT INTO editors (name, is_active) VALUES
  ('Anjali Rawat', true),
  ('Deepak', true),
  ('Swati Juyal', true),
  ('Deepak Kumar', true),
  ('Dheeraj Rajvania', true);
