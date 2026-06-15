-- Varsity pipeline v2 — rename stages to new internal/external journey
-- Run in Supabase SQL Editor after existing migrations

UPDATE projects SET current_stage = 'Video Data Received' WHERE current_stage = 'Video Assets';
UPDATE projects SET current_stage = 'Sound' WHERE current_stage IN ('Editing with Sound', 'Editing');
UPDATE projects SET current_stage = 'Video 1st Draft' WHERE current_stage = '1st Draft Review';
UPDATE projects SET current_stage = 'Final Changes' WHERE current_stage IN ('1st Draft Changes', 'Final Cut Changes');
UPDATE projects SET current_stage = 'Feedback from Zerodha' WHERE current_stage = 'Final Cut Review';
UPDATE projects SET current_stage = 'Final Delivery Done' WHERE current_stage IN ('Final Delivery', 'Delivered');
UPDATE projects SET current_stage = 'Premiere' WHERE current_stage = 'Premier';

UPDATE stage_history SET new_stage = 'Video Data Received' WHERE new_stage = 'Video Assets';
UPDATE stage_history SET old_stage = 'Video Data Received' WHERE old_stage = 'Video Assets';
UPDATE stage_history SET new_stage = 'Sound' WHERE new_stage IN ('Editing with Sound', 'Editing');
UPDATE stage_history SET old_stage = 'Sound' WHERE old_stage IN ('Editing with Sound', 'Editing');
UPDATE stage_history SET new_stage = 'Video 1st Draft' WHERE new_stage = '1st Draft Review';
UPDATE stage_history SET old_stage = 'Video 1st Draft' WHERE old_stage = '1st Draft Review';
UPDATE stage_history SET new_stage = 'Final Changes' WHERE new_stage IN ('1st Draft Changes', 'Final Cut Changes');
UPDATE stage_history SET old_stage = 'Final Changes' WHERE old_stage IN ('1st Draft Changes', 'Final Cut Changes');
UPDATE stage_history SET new_stage = 'Feedback from Zerodha' WHERE new_stage = 'Final Cut Review';
UPDATE stage_history SET old_stage = 'Feedback from Zerodha' WHERE old_stage = 'Final Cut Review';
UPDATE stage_history SET new_stage = 'Final Delivery Done' WHERE new_stage IN ('Final Delivery', 'Delivered');
UPDATE stage_history SET old_stage = 'Final Delivery Done' WHERE old_stage IN ('Final Delivery', 'Delivered');
UPDATE stage_history SET new_stage = 'Premiere' WHERE new_stage = 'Premier';
UPDATE stage_history SET old_stage = 'Premiere' WHERE old_stage = 'Premier';

-- Backfill target release from start date (~10.6 days pipeline SLA)
UPDATE projects
SET target_delivery_date = (received_date::date + INTERVAL '255 hours 30 minutes')::date
WHERE received_date IS NOT NULL
  AND (target_delivery_date IS NULL OR target_delivery_date = received_date);
