-- Clear stale Delayed/At risk tags on Zerodha intake projects (not yet in production).
-- Safe to re-run.

UPDATE projects
SET status_health = 'On track'
WHERE channel = 'Zerodha Online'
  AND current_stage IN ('Request Received', 'Ready to Produce')
  AND status_health IN ('Delayed', 'At risk');
