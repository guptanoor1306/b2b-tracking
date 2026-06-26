-- Remap legacy stage names to pipeline v3 (run after migration-pipeline-v3.sql)

UPDATE projects SET current_stage = 'Video received' WHERE current_stage IN ('Script Received', 'Visual Direction', 'Video Data Received');
UPDATE projects SET current_stage = 'First Cut' WHERE current_stage = 'First Cut Received';
UPDATE projects SET current_stage = 'First Cut sent for Review' WHERE current_stage = 'First Cut Review';
UPDATE projects SET current_stage = 'Thumbnail Copy + RP Cuts' WHERE current_stage IN ('Thumbnail Title Copy Received', 'Thumbnails');
UPDATE projects SET current_stage = 'Graphics & VD' WHERE current_stage = 'Graphics Creation';
UPDATE projects SET current_stage = 'Animation & VD' WHERE current_stage IN ('Animation Completion', 'Premiere');
UPDATE projects SET current_stage = 'Video/Thumbnail Review' WHERE current_stage IN ('Video 1st Draft', 'Feedback from Zerodha');
UPDATE projects SET current_stage = 'Final Delivery' WHERE current_stage = 'Final Delivery Done';

UPDATE stage_history SET new_stage = 'Video received' WHERE new_stage IN ('Script Received', 'Visual Direction', 'Video Data Received');
UPDATE stage_history SET new_stage = 'First Cut' WHERE new_stage = 'First Cut Received';
UPDATE stage_history SET new_stage = 'First Cut sent for Review' WHERE new_stage = 'First Cut Review';
UPDATE stage_history SET new_stage = 'Thumbnail Copy + RP Cuts' WHERE new_stage IN ('Thumbnail Title Copy Received', 'Thumbnails');
UPDATE stage_history SET new_stage = 'Graphics & VD' WHERE new_stage = 'Graphics Creation';
UPDATE stage_history SET new_stage = 'Animation & VD' WHERE new_stage IN ('Animation Completion', 'Premiere');
UPDATE stage_history SET new_stage = 'Video/Thumbnail Review' WHERE new_stage IN ('Video 1st Draft', 'Feedback from Zerodha');
UPDATE stage_history SET new_stage = 'Final Delivery' WHERE new_stage = 'Final Delivery Done';

UPDATE stage_history SET old_stage = 'Video received' WHERE old_stage IN ('Script Received', 'Visual Direction', 'Video Data Received');
UPDATE stage_history SET old_stage = 'First Cut' WHERE old_stage = 'First Cut Received';
UPDATE stage_history SET old_stage = 'First Cut sent for Review' WHERE old_stage = 'First Cut Review';
UPDATE stage_history SET old_stage = 'Thumbnail Copy + RP Cuts' WHERE old_stage IN ('Thumbnail Title Copy Received', 'Thumbnails');
UPDATE stage_history SET old_stage = 'Graphics & VD' WHERE old_stage = 'Graphics Creation';
UPDATE stage_history SET old_stage = 'Animation & VD' WHERE old_stage IN ('Animation Completion', 'Premiere');
UPDATE stage_history SET old_stage = 'Video/Thumbnail Review' WHERE old_stage IN ('Video 1st Draft', 'Feedback from Zerodha');
UPDATE stage_history SET old_stage = 'Final Delivery' WHERE old_stage = 'Final Delivery Done';
