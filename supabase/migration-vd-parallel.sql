-- Mark Graphics & VD and Animation & VD as parallel (same clock window after Storyboard)
UPDATE settings_stage_sla
SET parallel_group = 'vd_bundle'
WHERE stage_name IN ('Graphics & VD', 'Animation & VD');
