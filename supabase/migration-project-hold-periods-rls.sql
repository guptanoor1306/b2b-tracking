-- RLS for project_hold_periods + backfill open holds missing a period row.
-- Safe to re-run.

CREATE OR REPLACE FUNCTION can_manage_project_hold(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM projects pr
    WHERE pr.id = p_project_id
      AND (
        get_my_role() = 'Super Admin'
        OR (
          can_access_project_channel(pr.channel)
          AND EXISTS (
            SELECT 1
            FROM profile_channels pc
            JOIN channels c ON c.slug = pc.channel_slug
            WHERE pc.profile_id = auth.uid()
              AND c.db_name = pr.channel
              AND pc.channel_role IN ('Channel Admin', 'Channel Team', 'Channel Super Admin')
          )
        )
      )
  );
$$;

ALTER TABLE project_hold_periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hold_periods_select" ON project_hold_periods;
CREATE POLICY "hold_periods_select" ON project_hold_periods FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "hold_periods_insert" ON project_hold_periods;
CREATE POLICY "hold_periods_insert" ON project_hold_periods FOR INSERT
  WITH CHECK (can_manage_project_hold(project_id));

DROP POLICY IF EXISTS "hold_periods_update" ON project_hold_periods;
CREATE POLICY "hold_periods_update" ON project_hold_periods FOR UPDATE
  USING (can_manage_project_hold(project_id));

-- Backfill open hold windows for any on-hold project missing an active period
INSERT INTO project_hold_periods (project_id, started_at, note)
SELECT
  p.id,
  COALESCE(p.on_hold_since, (
    SELECT MAX(sh.changed_at)
    FROM stage_history sh
    WHERE sh.project_id = p.id
      AND sh.is_hold_event = true
      AND lower(coalesce(sh.note, '')) NOT LIKE '%resum%'
  ), NOW()),
  NULL
FROM projects p
WHERE (p.is_on_hold = true OR p.status_health = 'On hold')
  AND NOT EXISTS (
    SELECT 1
    FROM project_hold_periods php
    WHERE php.project_id = p.id
      AND php.ended_at IS NULL
  );

UPDATE projects p
SET on_hold_since = php.started_at
FROM project_hold_periods php
WHERE php.project_id = p.id
  AND php.ended_at IS NULL
  AND p.on_hold_since IS NULL;
