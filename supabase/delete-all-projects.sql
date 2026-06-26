-- Delete ALL projects and related data (comments, stage history, activity logs, hold periods, reminders).
-- Run in Supabase → SQL Editor. This cannot be undone.
--
-- Related rows are removed automatically via ON DELETE CASCADE.

BEGIN;

-- Preview (optional — comment out DELETE below and run only this block to inspect first)
-- SELECT COUNT(*) AS project_count FROM projects;

DELETE FROM projects;

-- Reset content ID counter so the next project starts fresh (e.g. VS-1001)
ALTER SEQUENCE IF EXISTS project_id_seq RESTART WITH 1001;

COMMIT;

-- Verify
SELECT COUNT(*) AS remaining_projects FROM projects;
