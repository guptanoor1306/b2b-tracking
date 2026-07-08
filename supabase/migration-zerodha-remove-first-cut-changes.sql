-- Zerodha Online: remove First Cut Changes stage from SLA and active projects
-- Run in Supabase SQL Editor

DELETE FROM channel_stage_sla
WHERE channel_slug = 'zerodha-online'
  AND stage_name = 'First Cut Changes';

UPDATE channel_stage_sla
SET sort_order = sort_order - 1
WHERE channel_slug = 'zerodha-online'
  AND sort_order > 5;

UPDATE projects
SET current_stage = 'Storyboard',
    updated_at = NOW()
WHERE channel = 'Zerodha Online'
  AND current_stage = 'First Cut Changes';
