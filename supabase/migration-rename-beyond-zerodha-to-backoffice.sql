-- Rename Beyond Zerodha → Zerodha Backoffice (run once if you already applied migration-beyond-zerodha.sql)
-- Safe to re-run: skips steps when beyond-zerodha is already gone.

BEGIN;

-- 1. Create the new channel row first (FK targets must exist before repointing children)
INSERT INTO channels (slug, name, db_name, sort_order, is_active)
SELECT
  'zerodha-backoffice',
  'Zerodha Backoffice',
  'Zerodha Backoffice',
  sort_order,
  is_active
FROM channels
WHERE slug = 'beyond-zerodha'
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  db_name = EXCLUDED.db_name,
  is_active = EXCLUDED.is_active;

-- 2. Repoint membership + SLA rows (do not UPDATE channels.slug in place — breaks FKs)
UPDATE profile_channels
SET channel_slug = 'zerodha-backoffice'
WHERE channel_slug = 'beyond-zerodha';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM channel_stage_sla WHERE channel_slug = 'zerodha-backoffice') THEN
    DELETE FROM channel_stage_sla WHERE channel_slug = 'beyond-zerodha';
  ELSE
    UPDATE channel_stage_sla
    SET channel_slug = 'zerodha-backoffice'
    WHERE channel_slug = 'beyond-zerodha';
  END IF;
END $$;

UPDATE projects
SET channel = 'Zerodha Backoffice'
WHERE channel = 'Beyond Zerodha';

UPDATE settings_activity_logs
SET channel_slug = 'zerodha-backoffice'
WHERE channel_slug = 'beyond-zerodha';

-- 3. Remove legacy channel row (no remaining FKs)
DELETE FROM channels WHERE slug = 'beyond-zerodha';

COMMIT;
