-- Zerodha Online: remove Thumbnail Copy + RP Cuts stage from SLA and active projects
-- Run in Supabase SQL Editor

DELETE FROM channel_stage_sla
WHERE channel_slug = 'zerodha-online'
  AND stage_name = 'Thumbnail Copy + RP Cuts';

UPDATE channel_stage_sla
SET sort_order = sort_order - 1
WHERE channel_slug = 'zerodha-online'
  AND sort_order > 4;

UPDATE projects
SET current_stage = 'Storyboard',
    updated_at = NOW()
WHERE channel = 'Zerodha Online'
  AND current_stage = 'Thumbnail Copy + RP Cuts';
