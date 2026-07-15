-- Fix RLS for channel-scoped admins (profiles.role = Member, profile_channels.channel_role = Channel Admin)
-- Run in Supabase SQL Editor

DROP POLICY IF EXISTS "channel_stage_sla_write" ON channel_stage_sla;
CREATE POLICY "channel_stage_sla_write" ON channel_stage_sla FOR ALL
  USING (
    get_my_role() = 'Super Admin'
    OR get_my_channel_role(channel_slug) = 'Channel Admin'
  )
  WITH CHECK (
    get_my_role() = 'Super Admin'
    OR get_my_channel_role(channel_slug) = 'Channel Admin'
  );

DROP POLICY IF EXISTS "settings_activity_select" ON settings_activity_logs;
CREATE POLICY "settings_activity_select" ON settings_activity_logs FOR SELECT
  USING (
    get_my_role() = 'Super Admin'
    OR (channel_slug IS NOT NULL AND get_my_channel_role(channel_slug) = 'Channel Admin')
    OR (channel_slug IS NULL AND get_my_channel_role('varsity') = 'Channel Admin')
  );

DROP POLICY IF EXISTS "settings_activity_insert" ON settings_activity_logs;
CREATE POLICY "settings_activity_insert" ON settings_activity_logs FOR INSERT
  WITH CHECK (
    get_my_role() = 'Super Admin'
    OR (channel_slug IS NOT NULL AND get_my_channel_role(channel_slug) = 'Channel Admin')
    OR (channel_slug IS NULL AND get_my_channel_role('varsity') = 'Channel Admin')
  );

-- Seed Zerodha SLAs if table is empty (safe to re-run)
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
  ('Video received', 'Internal', 0::numeric, NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric, NULL::numeric, NULL::text, 1),
  ('First Cut', 'Editor', 1, NULL, NULL, NULL, NULL, NULL, NULL, 2),
  ('First Cut sent for Review', 'External Team', 24, NULL, NULL, NULL, NULL, NULL, NULL, 3),
  ('Storyboard', 'Writer', 0, 0, 0, 1.5, 2, 12, NULL, 4),
  ('Graphics & VD', 'Designer', 0, 0, 24, 48, 72, 96, 'vd_bundle', 5),
  ('Animation & VD', 'Editor', 12, 12, 24, 72, 144, 192, 'vd_bundle', 6),
  ('Video/Thumbnail Review', 'External Team', 24, NULL, NULL, NULL, NULL, NULL, NULL, 7),
  ('Final Changes', 'Editor', 24, NULL, NULL, NULL, NULL, NULL, NULL, 8),
  ('Sound', 'Sound Designer', 1.5, NULL, NULL, NULL, NULL, NULL, NULL, 9),
  ('Final Delivery', 'Internal', 0, NULL, NULL, NULL, NULL, NULL, NULL, 10)
) AS v(stage_name, role_owner, duration_hours, level_0_hours, level_1_hours, level_2_hours, level_3_hours, level_4_hours, parallel_group, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM channel_stage_sla WHERE channel_slug = 'zerodha-online'
);

DELETE FROM channel_stage_sla
WHERE channel_slug = 'zerodha-online'
  AND stage_name IN ('First Cut Changes', 'Thumbnail Copy + RP Cuts');
