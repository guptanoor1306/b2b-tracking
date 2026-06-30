-- Per-channel roles on profile_channels
-- Run in Supabase SQL Editor

ALTER TABLE profile_channels
  ADD COLUMN IF NOT EXISTS channel_role TEXT;

UPDATE profile_channels pc
SET channel_role = p.role
FROM profiles p
WHERE p.id = pc.profile_id
  AND pc.channel_role IS NULL
  AND p.role IN ('Channel Admin', 'Channel Team', 'Agency', 'Zerodha Viewer');

UPDATE profile_channels
SET channel_role = 'Channel Team'
WHERE channel_role IS NULL;

ALTER TABLE profile_channels
  ALTER COLUMN channel_role SET NOT NULL;

ALTER TABLE profile_channels DROP CONSTRAINT IF EXISTS profile_channels_channel_role_check;
ALTER TABLE profile_channels ADD CONSTRAINT profile_channels_channel_role_check
  CHECK (channel_role IN ('Channel Admin', 'Channel Team', 'Agency', 'Zerodha Viewer'));

-- Global profile role: Super Admin or Member
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

UPDATE profiles SET role = 'Member'
WHERE role IN ('Channel Admin', 'Channel Team', 'Agency', 'Zerodha Viewer');

ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('Super Admin', 'Member'));

-- Helpers for RLS
CREATE OR REPLACE FUNCTION can_access_project_channel(p_db_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT get_my_role() = 'Super Admin'
    OR EXISTS (
      SELECT 1
      FROM profile_channels pc
      JOIN channels c ON c.slug = pc.channel_slug
      WHERE pc.profile_id = auth.uid()
        AND c.db_name = p_db_name
    );
$$;

CREATE OR REPLACE FUNCTION get_my_channel_role(p_channel_slug TEXT)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN get_my_role() = 'Super Admin' THEN 'Channel Admin'
    ELSE (
      SELECT channel_role FROM profile_channels
      WHERE profile_id = auth.uid() AND channel_slug = p_channel_slug
      LIMIT 1
    )
  END;
$$;

DROP POLICY IF EXISTS "projects_admin_internal_all" ON projects;
CREATE POLICY "projects_channel_access" ON projects FOR ALL
  USING (can_access_project_channel(channel));

DROP POLICY IF EXISTS "profiles_insert_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_admin" ON profiles;

CREATE POLICY "profiles_insert_super" ON profiles FOR INSERT
  WITH CHECK (get_my_role() = 'Super Admin');

CREATE POLICY "profiles_update_super" ON profiles FOR UPDATE
  USING (get_my_role() = 'Super Admin' OR id = auth.uid());

CREATE POLICY "profiles_delete_super" ON profiles FOR DELETE
  USING (get_my_role() = 'Super Admin');

DROP POLICY IF EXISTS "profile_channels_write" ON profile_channels;
CREATE POLICY "profile_channels_write" ON profile_channels FOR ALL
  USING (
    get_my_role() = 'Super Admin'
    OR get_my_channel_role(channel_slug) = 'Channel Admin'
  );
