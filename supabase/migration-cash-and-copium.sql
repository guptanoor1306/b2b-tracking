-- Cash & Copium: rename Tharun channel + external intake fields
-- Run in Supabase SQL Editor (safe to re-run)

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS drive_link TEXT,
  ADD COLUMN IF NOT EXISTS reel_timestamps JSONB;

ALTER TABLE client_review_submissions
  ADD COLUMN IF NOT EXISTS intro_timeline TEXT;

-- Must exist in channels before profile_channels / channel_stage_sla FK updates
INSERT INTO channels (slug, name, db_name, sort_order)
VALUES ('cash-and-copium', 'Cash & Copium', 'Cash & Copium', 3)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  db_name = EXCLUDED.db_name;

-- Rename legacy Tharun rows
UPDATE projects SET channel = 'Cash & Copium' WHERE channel = 'Tharun';
UPDATE profile_channels SET channel_slug = 'cash-and-copium' WHERE channel_slug = 'tharun';

-- Drop legacy channel row after access is moved
DELETE FROM channels WHERE slug = 'tharun';

-- Replace Cash & Copium SLA (combined 1st Cut pipeline, Long-Form / Reel types)
DELETE FROM channel_stage_sla WHERE channel_slug = 'cash-and-copium';

INSERT INTO channel_stage_sla (
  channel_slug, stage_name, role_owner, duration_hours,
  level_0_hours, level_1_hours, level_2_hours, level_3_hours, level_4_hours,
  parallel_group, sort_order
) VALUES
  ('cash-and-copium', 'Request Received', 'External Team', 0, NULL, NULL, NULL, NULL, NULL, NULL, 1),
  ('cash-and-copium', 'Ready to Produce', 'Internal', 0, NULL, NULL, NULL, NULL, NULL, NULL, 2),
  ('cash-and-copium', '1st Cut', 'Editor', 3.5, NULL, 3.5, NULL, NULL, NULL, NULL, 3),
  ('cash-and-copium', '1st Cut Review', 'External Team', 24, NULL, NULL, NULL, NULL, NULL, NULL, 4),
  ('cash-and-copium', '1st Cut Review Done', 'Internal', 3.5, NULL, 3.5, NULL, NULL, NULL, NULL, 5),
  ('cash-and-copium', 'Animation & VD', 'Editor', 48, 2.5, 48, NULL, NULL, NULL, NULL, 6),
  ('cash-and-copium', '1st Draft QC (Internal)', 'Channel Super Admin', 3.5, NULL, 3.5, NULL, NULL, NULL, NULL, 7),
  ('cash-and-copium', '1st Draft Review', 'External Team', 24, NULL, NULL, NULL, NULL, NULL, NULL, 8),
  ('cash-and-copium', '1st Draft Review Done', 'Internal', 3.5, NULL, 3.5, NULL, NULL, NULL, NULL, 9),
  ('cash-and-copium', '1st Review Changes', 'Editor', 3.5, NULL, 3.5, NULL, NULL, NULL, NULL, 10),
  ('cash-and-copium', 'Sound', 'Sound Designer', 24, NULL, NULL, NULL, NULL, NULL, NULL, 11),
  ('cash-and-copium', 'Final Changes', 'Editor', 1, NULL, 1, NULL, NULL, NULL, NULL, 12),
  ('cash-and-copium', 'Final Delivery', 'Internal', 0, NULL, NULL, NULL, NULL, NULL, NULL, 13);

-- Normalize legacy stages into the Cash & Copium pipeline
UPDATE projects SET current_stage = '1st Cut'
  WHERE channel = 'Cash & Copium'
    AND current_stage IN ('Storyboard', '1st Cut & Storyboard', 'First Cut', 'First Cut Received');

UPDATE projects SET current_stage = 'Animation & VD'
  WHERE channel = 'Cash & Copium' AND current_stage = 'Graphics & VD';

UPDATE projects SET current_stage = 'Sound'
  WHERE channel = 'Cash & Copium'
    AND current_stage IN ('2nd Draft Review', '2nd Draft Review Done', '2nd Review', '2nd Review Done');
