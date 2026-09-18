-- LA Social: add Founder Review stage after Final changes (1 work day = 8h SLA default)
-- Run once in Supabase SQL Editor after la-social channel SLA rows exist.

UPDATE channel_stage_sla
SET sort_order = sort_order + 1
WHERE channel_slug = 'la-social'
  AND sort_order >= 13
  AND NOT EXISTS (
    SELECT 1 FROM channel_stage_sla
    WHERE channel_slug = 'la-social' AND stage_name = 'Founder Review'
  );

INSERT INTO channel_stage_sla (
  channel_slug, stage_name, role_owner, duration_hours,
  level_0_hours, level_1_hours, level_2_hours, level_3_hours, level_4_hours,
  parallel_group, sort_order
)
SELECT
  'la-social', 'Founder Review', 'Primary POC', 8,
  8, 8, 8, 8, NULL,
  NULL, 13
WHERE NOT EXISTS (
  SELECT 1 FROM channel_stage_sla
  WHERE channel_slug = 'la-social' AND stage_name = 'Founder Review'
);
