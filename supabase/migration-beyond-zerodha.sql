-- Zerodha Backoffice channel (Cash & Copium–identical pipeline + SLAs)
-- Run once in Supabase SQL Editor (new environments)

INSERT INTO channels (slug, name, db_name, sort_order, is_active)
VALUES ('zerodha-backoffice', 'Zerodha Backoffice', 'Zerodha Backoffice', 11, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  db_name = EXCLUDED.db_name,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

DELETE FROM channel_stage_sla WHERE channel_slug = 'zerodha-backoffice';

INSERT INTO channel_stage_sla (
  channel_slug, stage_name, role_owner, duration_hours,
  level_0_hours, level_1_hours, level_2_hours, level_3_hours, level_4_hours,
  parallel_group, sort_order
) VALUES
  ('zerodha-backoffice', 'Request Received', 'External Team', 0, NULL, NULL, NULL, NULL, NULL, NULL, 1),
  ('zerodha-backoffice', 'Ready to Produce', 'Internal', 0, NULL, NULL, NULL, NULL, NULL, NULL, 2),
  ('zerodha-backoffice', '1st Cut', 'Editor', 3.5, NULL, 3.5, NULL, NULL, NULL, NULL, 3),
  ('zerodha-backoffice', '1st Cut Review', 'External Team', 24, NULL, NULL, NULL, NULL, NULL, NULL, 4),
  ('zerodha-backoffice', '1st Cut Review Done', 'Internal', 3.5, NULL, 3.5, NULL, NULL, NULL, NULL, 5),
  ('zerodha-backoffice', 'Animation & VD', 'Editor', 48, 2.5, 48, NULL, NULL, NULL, NULL, 6),
  ('zerodha-backoffice', '1st Draft QC (Internal)', 'Channel Super Admin', 3.5, NULL, 3.5, NULL, NULL, NULL, NULL, 7),
  ('zerodha-backoffice', '1st Draft Review', 'External Team', 24, NULL, NULL, NULL, NULL, NULL, NULL, 8),
  ('zerodha-backoffice', '1st Draft Review Done', 'Internal', 3.5, NULL, 3.5, NULL, NULL, NULL, NULL, 9),
  ('zerodha-backoffice', '1st Review Changes', 'Editor', 3.5, NULL, 3.5, NULL, NULL, NULL, NULL, 10),
  ('zerodha-backoffice', 'Sound', 'Sound Designer', 24, NULL, NULL, NULL, NULL, NULL, NULL, 11),
  ('zerodha-backoffice', 'Final Changes', 'Editor', 1, NULL, 1, NULL, NULL, NULL, NULL, 12),
  ('zerodha-backoffice', 'Final Delivery', 'Internal', 0, NULL, NULL, NULL, NULL, NULL, NULL, 13);
