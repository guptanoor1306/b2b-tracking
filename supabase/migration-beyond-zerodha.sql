-- Beyond Zerodha channel (Cash & Copium–identical pipeline + SLAs)
-- Run once in Supabase SQL Editor

INSERT INTO channels (slug, name, db_name, sort_order, is_active)
VALUES ('beyond-zerodha', 'Beyond Zerodha', 'Beyond Zerodha', 11, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  db_name = EXCLUDED.db_name,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

DELETE FROM channel_stage_sla WHERE channel_slug = 'beyond-zerodha';

INSERT INTO channel_stage_sla (
  channel_slug, stage_name, role_owner, duration_hours,
  level_0_hours, level_1_hours, level_2_hours, level_3_hours, level_4_hours,
  parallel_group, sort_order
) VALUES
  ('beyond-zerodha', 'Request Received', 'External Team', 0, NULL, NULL, NULL, NULL, NULL, NULL, 1),
  ('beyond-zerodha', 'Ready to Produce', 'Internal', 0, NULL, NULL, NULL, NULL, NULL, NULL, 2),
  ('beyond-zerodha', '1st Cut', 'Editor', 3.5, NULL, 3.5, NULL, NULL, NULL, NULL, 3),
  ('beyond-zerodha', '1st Cut Review', 'External Team', 24, NULL, NULL, NULL, NULL, NULL, NULL, 4),
  ('beyond-zerodha', '1st Cut Review Done', 'Internal', 3.5, NULL, 3.5, NULL, NULL, NULL, NULL, 5),
  ('beyond-zerodha', 'Animation & VD', 'Editor', 48, 2.5, 48, NULL, NULL, NULL, NULL, 6),
  ('beyond-zerodha', '1st Draft QC (Internal)', 'Channel Super Admin', 3.5, NULL, 3.5, NULL, NULL, NULL, NULL, 7),
  ('beyond-zerodha', '1st Draft Review', 'External Team', 24, NULL, NULL, NULL, NULL, NULL, NULL, 8),
  ('beyond-zerodha', '1st Draft Review Done', 'Internal', 3.5, NULL, 3.5, NULL, NULL, NULL, NULL, 9),
  ('beyond-zerodha', '1st Review Changes', 'Editor', 3.5, NULL, 3.5, NULL, NULL, NULL, NULL, 10),
  ('beyond-zerodha', 'Sound', 'Sound Designer', 24, NULL, NULL, NULL, NULL, NULL, NULL, 11),
  ('beyond-zerodha', 'Final Changes', 'Editor', 1, NULL, 1, NULL, NULL, NULL, NULL, 12),
  ('beyond-zerodha', 'Final Delivery', 'Internal', 0, NULL, NULL, NULL, NULL, NULL, NULL, 13);

-- Optional: grant access (replace profile UUID)
-- INSERT INTO profile_channels (profile_id, channel_slug, channel_role)
-- VALUES ('YOUR-PROFILE-UUID', 'beyond-zerodha', 'Channel Admin')
-- ON CONFLICT (profile_id, channel_slug) DO UPDATE SET channel_role = EXCLUDED.channel_role;
