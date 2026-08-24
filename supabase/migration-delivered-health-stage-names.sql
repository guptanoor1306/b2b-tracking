-- Fix stale health on delivered projects + normalize legacy Zerodha stage names.
-- Safe to re-run.

UPDATE projects
SET status_health = 'Delivered'
WHERE current_stage = 'Final Delivery'
  AND status_health <> 'Delivered';

UPDATE stage_history sh
SET new_stage = '1st Draft Review'
FROM projects p
WHERE p.id = sh.project_id
  AND p.channel = 'Zerodha Online'
  AND sh.new_stage IN ('Video/Thumbnail Review', 'First Review');

UPDATE stage_history sh
SET new_stage = '1st Draft Review Done'
FROM projects p
WHERE p.id = sh.project_id
  AND p.channel = 'Zerodha Online'
  AND sh.new_stage IN ('First Review Done');

UPDATE stage_history sh
SET old_stage = '1st Draft Review'
FROM projects p
WHERE p.id = sh.project_id
  AND p.channel = 'Zerodha Online'
  AND sh.old_stage IN ('Video/Thumbnail Review', 'First Review');

UPDATE stage_history sh
SET old_stage = '1st Draft Review Done'
FROM projects p
WHERE p.id = sh.project_id
  AND p.channel = 'Zerodha Online'
  AND sh.old_stage IN ('First Review Done');
