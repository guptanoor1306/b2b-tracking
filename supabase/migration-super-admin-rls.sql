-- Grant Super Admin same project access as Admin
DROP POLICY IF EXISTS "projects_admin_internal_all" ON projects;
CREATE POLICY "projects_admin_internal_all" ON projects FOR ALL
  USING (get_my_role() IN ('Admin', 'Internal Team', 'Super Admin'));

-- Backfill legacy Varsity projects (pre multi-channel)
UPDATE projects SET channel = 'Varsity'
WHERE channel IS NULL OR channel = '' OR channel = 'Zerodha Online';
