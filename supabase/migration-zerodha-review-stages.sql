-- Zerodha Online: full review pipeline stage names
-- Run in Supabase SQL Editor

UPDATE projects SET current_stage = '1st Cut', updated_at = NOW()
WHERE channel = 'Zerodha Online' AND current_stage IN ('First Cut', 'First Cut Received');

UPDATE projects SET current_stage = '1st Cut Review', updated_at = NOW()
WHERE channel = 'Zerodha Online' AND current_stage IN ('First Cut sent for Review', 'First Cut Review');

UPDATE projects SET current_stage = '1st Cut Review Done', updated_at = NOW()
WHERE channel = 'Zerodha Online' AND current_stage = 'First Cut Review Done';

UPDATE projects SET current_stage = '1st Draft Review', updated_at = NOW()
WHERE channel = 'Zerodha Online' AND current_stage IN ('Video/Thumbnail Review', 'First Review');

UPDATE projects SET current_stage = '1st Draft Review Done', updated_at = NOW()
WHERE channel = 'Zerodha Online' AND current_stage = 'First Review Done';

UPDATE projects SET current_stage = '1st Review Changes', updated_at = NOW()
WHERE channel = 'Zerodha Online' AND current_stage IN ('First Cut Changes');

UPDATE projects SET current_stage = '2nd Draft Review', updated_at = NOW()
WHERE channel = 'Zerodha Online' AND current_stage IN ('2nd Review');

UPDATE projects SET current_stage = '2nd Draft Review Done', updated_at = NOW()
WHERE channel = 'Zerodha Online' AND current_stage IN ('2nd Review Done');

DELETE FROM channel_stage_sla WHERE channel_slug = 'zerodha-online';

INSERT INTO channel_stage_sla (
  channel_slug, stage_name, role_owner, duration_hours,
  level_0_hours, level_1_hours, level_2_hours, level_3_hours, level_4_hours,
  parallel_group, sort_order
) VALUES
  ('zerodha-online', 'Request Received', 'External Team', 0, NULL, NULL, NULL, NULL, NULL, NULL, 1),
  ('zerodha-online', 'Ready to Produce', 'Internal', 0, NULL, NULL, NULL, NULL, NULL, NULL, 2),
  ('zerodha-online', '1st Cut', 'Editor', 1, NULL, NULL, NULL, NULL, NULL, NULL, 3),
  ('zerodha-online', '1st Cut Review', 'External Team', 24, NULL, NULL, NULL, NULL, NULL, NULL, 4),
  ('zerodha-online', '1st Cut Review Done', 'Internal', 12, NULL, NULL, NULL, NULL, NULL, NULL, 5),
  ('zerodha-online', 'Storyboard', 'Writer', 0, 0, 0, 1.5, 2, 12, NULL, 6),
  ('zerodha-online', 'Graphics & VD', 'Designer', 0, 0, 24, 48, 72, 96, 'vd_bundle', 7),
  ('zerodha-online', 'Animation & VD', 'Editor', 12, 12, 24, 72, 144, 192, 'vd_bundle', 8),
  ('zerodha-online', '1st Draft Review', 'External Team', 24, NULL, NULL, NULL, NULL, NULL, NULL, 9),
  ('zerodha-online', '1st Draft Review Done', 'Internal', 12, NULL, NULL, NULL, NULL, NULL, NULL, 10),
  ('zerodha-online', '1st Review Changes', 'Editor', 24, NULL, NULL, NULL, NULL, NULL, NULL, 11),
  ('zerodha-online', '2nd Draft Review', 'External Team', 24, NULL, NULL, NULL, NULL, NULL, NULL, 12),
  ('zerodha-online', '2nd Draft Review Done', 'Internal', 12, NULL, NULL, NULL, NULL, NULL, NULL, 13),
  ('zerodha-online', 'Final Changes', 'Editor', 24, NULL, NULL, NULL, NULL, NULL, NULL, 14),
  ('zerodha-online', 'Sound', 'Sound Designer', 1.5, NULL, NULL, NULL, NULL, NULL, NULL, 15),
  ('zerodha-online', 'Final Delivery', 'Internal', 0, NULL, NULL, NULL, NULL, NULL, NULL, 16);
