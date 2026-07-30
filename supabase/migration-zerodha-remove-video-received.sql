-- Zerodha Online: remove "Video received" stage; move active projects to "Ready to Produce"
-- Run in Supabase SQL Editor before/at release (after migration-zerodha-request-intake.sql)

UPDATE projects
SET current_stage = 'Ready to Produce',
    updated_at = NOW()
WHERE channel = 'Zerodha Online'
  AND current_stage = 'Video received';

DELETE FROM channel_stage_sla
WHERE channel_slug = 'zerodha-online'
  AND stage_name = 'Video received';

-- Close gap left after removing sort_order 3 (intake stages stay 1–2)
UPDATE channel_stage_sla
SET sort_order = sort_order - 1
WHERE channel_slug = 'zerodha-online'
  AND sort_order > 3;
