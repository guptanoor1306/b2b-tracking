-- Rename LearnApp Admin → Channel Admin, LearnApp Team → Channel Team
-- Safe to re-run. Skips tables/policies that don't exist in your project.

-- ── 1. Roles (required) ──────────────────────────────────────────────────────
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

UPDATE profiles SET role = 'Channel Admin' WHERE role = 'Admin';
UPDATE profiles SET role = 'Channel Team' WHERE role = 'Internal Team';

ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('Channel Admin', 'Channel Team', 'Agency', 'Zerodha Viewer', 'Super Admin'));

-- ── 2. Core RLS (schema.sql tables) ───────────────────────────────────────────
DROP POLICY IF EXISTS "projects_admin_internal_all" ON projects;
CREATE POLICY "projects_admin_internal_all" ON projects FOR ALL
  USING (get_my_role() IN ('Channel Admin', 'Channel Team', 'Super Admin'));

DROP POLICY IF EXISTS "stage_history_insert_auth" ON stage_history;
CREATE POLICY "stage_history_insert_auth" ON stage_history FOR INSERT
  WITH CHECK (get_my_role() IN ('Channel Admin', 'Channel Team', 'Agency', 'Super Admin'));

DROP POLICY IF EXISTS "comments_delete_own" ON comments;
CREATE POLICY "comments_delete_own" ON comments FOR DELETE
  USING (created_by = auth.uid() OR get_my_role() IN ('Channel Admin', 'Super Admin'));

DROP POLICY IF EXISTS "profiles_insert_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_admin" ON profiles;

CREATE POLICY "profiles_insert_admin" ON profiles FOR INSERT
  WITH CHECK (get_my_role() IN ('Channel Admin', 'Super Admin'));

CREATE POLICY "profiles_update_admin" ON profiles FOR UPDATE
  USING (get_my_role() IN ('Channel Admin', 'Super Admin') OR id = auth.uid());

CREATE POLICY "profiles_delete_admin" ON profiles FOR DELETE
  USING (get_my_role() IN ('Channel Admin', 'Super Admin'));

DROP POLICY IF EXISTS "agencies_admin_write" ON agencies;
CREATE POLICY "agencies_admin_write" ON agencies FOR ALL
  USING (get_my_role() IN ('Channel Admin', 'Super Admin'));

DROP POLICY IF EXISTS "settings_ips_admin" ON settings_ips;
CREATE POLICY "settings_ips_admin" ON settings_ips FOR ALL
  USING (get_my_role() IN ('Channel Admin', 'Super Admin'));

DROP POLICY IF EXISTS "settings_ct_admin" ON settings_content_types;
CREATE POLICY "settings_ct_admin" ON settings_content_types FOR ALL
  USING (get_my_role() IN ('Channel Admin', 'Super Admin'));

DROP POLICY IF EXISTS "settings_st_admin" ON settings_stages;
CREATE POLICY "settings_st_admin" ON settings_stages FOR ALL
  USING (get_my_role() IN ('Channel Admin', 'Super Admin'));

-- ── 3. Optional tables (only if present) ──────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'editors') THEN
    EXECUTE 'DROP POLICY IF EXISTS "editors_admin_write" ON editors';
    EXECUTE $p$CREATE POLICY "editors_admin_write" ON editors FOR ALL
      USING (get_my_role() IN ('Channel Admin', 'Channel Team', 'Super Admin'))$p$;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stage_history') THEN
    EXECUTE 'DROP POLICY IF EXISTS "stage_history_update_internal" ON stage_history';
    EXECUTE $p$CREATE POLICY "stage_history_update_internal" ON stage_history FOR UPDATE
      USING (get_my_role() IN ('Channel Admin', 'Channel Team', 'Super Admin'))$p$;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stage_sla_config') THEN
    EXECUTE 'DROP POLICY IF EXISTS "stage_sla_select" ON stage_sla_config';
    EXECUTE 'DROP POLICY IF EXISTS "stage_sla_write" ON stage_sla_config';
    EXECUTE $p$CREATE POLICY "stage_sla_select" ON stage_sla_config FOR SELECT
      USING (get_my_role() IN ('Channel Admin', 'Channel Team', 'Super Admin'))$p$;
    EXECUTE $p$CREATE POLICY "stage_sla_write" ON stage_sla_config FOR ALL
      USING (get_my_role() IN ('Channel Admin', 'Super Admin'))$p$;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'settings_activity_logs') THEN
    EXECUTE 'DROP POLICY IF EXISTS "settings_activity_select" ON settings_activity_logs';
    EXECUTE 'DROP POLICY IF EXISTS "settings_activity_insert" ON settings_activity_logs';
    EXECUTE $p$CREATE POLICY "settings_activity_select" ON settings_activity_logs FOR SELECT
      USING (get_my_role() IN ('Channel Admin', 'Super Admin'))$p$;
    EXECUTE $p$CREATE POLICY "settings_activity_insert" ON settings_activity_logs FOR INSERT
      WITH CHECK (get_my_role() IN ('Channel Admin', 'Super Admin'))$p$;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'org_holidays') THEN
    EXECUTE 'DROP POLICY IF EXISTS "org_holidays_admin" ON org_holidays';
    EXECUTE $p$CREATE POLICY "org_holidays_admin" ON org_holidays FOR ALL
      USING (get_my_role() IN ('Channel Admin', 'Super Admin'))$p$;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stage_reminders') THEN
    EXECUTE 'DROP POLICY IF EXISTS "reminders_insert" ON stage_reminders';
    EXECUTE $p$CREATE POLICY "reminders_insert" ON stage_reminders FOR INSERT
      WITH CHECK (get_my_role() IN ('Channel Admin', 'Channel Team', 'Super Admin'))$p$;
  END IF;
END $$;

-- Prateek super admin
