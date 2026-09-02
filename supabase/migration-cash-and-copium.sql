-- Cash & Copium: rename Tharun channel + external intake fields
-- Run in Supabase SQL Editor (safe to re-run)

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS drive_link TEXT,
  ADD COLUMN IF NOT EXISTS reel_timestamps JSONB;

ALTER TABLE client_review_submissions
  ADD COLUMN IF NOT EXISTS intro_timeline TEXT;

-- Rename legacy Tharun rows
UPDATE projects SET channel = 'Cash & Copium' WHERE channel = 'Tharun';
UPDATE profile_channels SET channel_slug = 'cash-and-copium' WHERE channel_slug = 'tharun';

-- Seed Cash & Copium SLA (same pipeline as Zerodha Online)
INSERT INTO channel_stage_sla (
  channel_slug, stage_name, role_owner, duration_hours,
  level_0_hours, level_1_hours, level_2_hours, level_3_hours, level_4_hours,
  parallel_group, sort_order
)
SELECT
  'cash-and-copium', stage_name, role_owner, duration_hours,
  level_0_hours, level_1_hours, level_2_hours, level_3_hours, level_4_hours,
  parallel_group, sort_order
FROM channel_stage_sla
WHERE channel_slug = 'zerodha-online'
  AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'channel_stage_sla')
ON CONFLICT DO NOTHING;
