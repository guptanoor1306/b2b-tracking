-- Fix stage_history RLS for per-channel roles (global Member + channel Channel Admin/Team)
-- Safe to re-run. Also backfills projects that have no stage_history rows.

CREATE OR REPLACE FUNCTION can_write_stage_history(p_project_id UUID)
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
              AND pc.channel_role IN ('Channel Admin', 'Channel Team', 'Agency')
          )
        )
      )
  );
$$;

DROP POLICY IF EXISTS "stage_history_insert_auth" ON stage_history;
CREATE POLICY "stage_history_insert_auth" ON stage_history FOR INSERT
  WITH CHECK (can_write_stage_history(project_id));

DROP POLICY IF EXISTS "stage_history_update_internal" ON stage_history;
CREATE POLICY "stage_history_update_internal" ON stage_history FOR UPDATE
  USING (can_write_stage_history(project_id));

-- One row per project missing history (current stage snapshot)
INSERT INTO stage_history (
  project_id,
  old_stage,
  new_stage,
  changed_by,
  assignee_id,
  note,
  is_hold_event,
  changed_at
)
SELECT
  p.id,
  NULL,
  p.current_stage,
  p.updated_by,
  p.stage_assignee_id,
  'Backfilled — missing stage history',
  FALSE,
  COALESCE(p.last_status_update_at, p.created_at)
FROM projects p
WHERE p.current_stage IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM stage_history sh WHERE sh.project_id = p.id
  );
