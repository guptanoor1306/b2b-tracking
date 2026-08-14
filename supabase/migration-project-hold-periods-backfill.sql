-- Hold pause support: schema + backfill for Zerodha Online on-hold projects.
-- Run in Supabase SQL editor.

ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_on_hold BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS on_hold_since TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS project_hold_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  started_by UUID REFERENCES profiles(id),
  ended_by UUID REFERENCES profiles(id),
  note TEXT
);

CREATE INDEX IF NOT EXISTS idx_project_hold_periods_project ON project_hold_periods(project_id);
CREATE INDEX IF NOT EXISTS idx_project_hold_periods_open ON project_hold_periods(project_id) WHERE ended_at IS NULL;

ALTER TABLE stage_history ADD COLUMN IF NOT EXISTS is_hold_event BOOLEAN NOT NULL DEFAULT false;

-- Sync hold flag from legacy health status
UPDATE projects
SET is_on_hold = true
WHERE status_health = 'On hold'
  AND is_on_hold = false;

-- Backfill closed hold windows from stage_history hold events (Zerodha Online)
WITH hold_events AS (
  SELECT
    sh.project_id,
    sh.changed_at,
    sh.changed_by,
    sh.note,
    ROW_NUMBER() OVER (PARTITION BY sh.project_id ORDER BY sh.changed_at) AS rn
  FROM stage_history sh
  JOIN projects p ON p.id = sh.project_id
  WHERE p.channel = 'Zerodha Online'
    AND sh.is_hold_event = true
),
starts AS (
  SELECT * FROM hold_events
  WHERE lower(coalesce(note, '')) NOT LIKE '%resum%'
),
ends AS (
  SELECT * FROM hold_events
  WHERE lower(coalesce(note, '')) LIKE '%resum%'
),
paired AS (
  SELECT
    s.project_id,
    s.changed_at AS started_at,
    s.changed_by AS started_by,
    e.changed_at AS ended_at,
    e.changed_by AS ended_by
  FROM starts s
  LEFT JOIN ends e
    ON e.project_id = s.project_id
   AND e.rn = (
     SELECT MIN(e2.rn)
     FROM ends e2
     WHERE e2.project_id = s.project_id
       AND e2.rn > s.rn
   )
)
INSERT INTO project_hold_periods (project_id, started_at, ended_at, started_by, ended_by, note)
SELECT
  project_id,
  started_at,
  ended_at,
  started_by,
  ended_by,
  'Backfilled from stage history'
FROM paired
WHERE NOT EXISTS (
  SELECT 1
  FROM project_hold_periods php
  WHERE php.project_id = paired.project_id
    AND php.started_at = paired.started_at
);

-- Open hold window for projects currently on hold without an active period
INSERT INTO project_hold_periods (project_id, started_at, started_by, note)
SELECT
  p.id,
  COALESCE(p.on_hold_since, (
    SELECT MAX(sh.changed_at)
    FROM stage_history sh
    WHERE sh.project_id = p.id
      AND sh.is_hold_event = true
      AND lower(coalesce(sh.note, '')) NOT LIKE '%resum%'
  ), NOW()),
  NULL,
  'Backfilled open hold'
FROM projects p
WHERE p.channel = 'Zerodha Online'
  AND (p.is_on_hold = true OR p.status_health = 'On hold')
  AND NOT EXISTS (
    SELECT 1
    FROM project_hold_periods php
    WHERE php.project_id = p.id
      AND php.ended_at IS NULL
  );

-- Align on_hold_since with the open hold period when missing
UPDATE projects p
SET on_hold_since = php.started_at
FROM project_hold_periods php
WHERE php.project_id = p.id
  AND php.ended_at IS NULL
  AND p.on_hold_since IS NULL;
