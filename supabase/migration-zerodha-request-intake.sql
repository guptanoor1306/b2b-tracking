-- Zerodha Online: external request intake fields + board stages

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS script_link TEXT,
  ADD COLUMN IF NOT EXISTS screen_captures_link TEXT,
  ADD COLUMN IF NOT EXISTS audio_link TEXT;

-- Insert intake stages into Zerodha SLA config (if channel_stage_sla table exists)
INSERT INTO channel_stage_sla (
  channel_slug, stage_name, role_owner, duration_hours,
  level_0_hours, level_1_hours, level_2_hours, level_3_hours, level_4_hours,
  parallel_group, sort_order
)
SELECT
  'zerodha-online', v.stage_name, v.role_owner, v.duration_hours,
  v.level_0_hours, v.level_1_hours, v.level_2_hours, v.level_3_hours, v.level_4_hours,
  v.parallel_group, v.sort_order
FROM (VALUES
  ('Request Received', 'External Team', 0::numeric, NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric, NULL::text, 1),
  ('Ready to Produce', 'Internal', 0::numeric, NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric, NULL::text, 2)
) AS v(stage_name, role_owner, duration_hours, level_0_hours, level_1_hours, level_2_hours, level_3_hours, level_4_hours, parallel_group, sort_order)
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'channel_stage_sla')
ON CONFLICT DO NOTHING;

-- Bump existing Zerodha SLA sort orders by 2 so intake stages fit first
UPDATE channel_stage_sla
SET sort_order = sort_order + 2
WHERE channel_slug = 'zerodha-online'
  AND stage_name NOT IN ('Request Received', 'Ready to Produce')
  AND sort_order >= 1;
