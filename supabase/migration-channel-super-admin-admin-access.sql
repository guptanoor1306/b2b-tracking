-- Grant Channel Super Admin the same channel-admin RLS access as Channel Admin

DROP POLICY IF EXISTS "channel_stage_sla_write" ON channel_stage_sla;
CREATE POLICY "channel_stage_sla_write" ON channel_stage_sla FOR ALL
  USING (
    get_my_role() = 'Super Admin'
    OR get_my_channel_role(channel_slug) IN ('Channel Admin', 'Channel Super Admin')
  )
  WITH CHECK (
    get_my_role() = 'Super Admin'
    OR get_my_channel_role(channel_slug) IN ('Channel Admin', 'Channel Super Admin')
  );

DROP POLICY IF EXISTS "settings_activity_select" ON settings_activity_logs;
CREATE POLICY "settings_activity_select" ON settings_activity_logs FOR SELECT
  USING (
    get_my_role() = 'Super Admin'
    OR (channel_slug IS NOT NULL AND get_my_channel_role(channel_slug) IN ('Channel Admin', 'Channel Super Admin'))
    OR (channel_slug IS NULL AND get_my_channel_role('varsity') IN ('Channel Admin', 'Channel Super Admin'))
  );

DROP POLICY IF EXISTS "settings_activity_insert" ON settings_activity_logs;
CREATE POLICY "settings_activity_insert" ON settings_activity_logs FOR INSERT
  WITH CHECK (
    get_my_role() = 'Super Admin'
    OR (channel_slug IS NOT NULL AND get_my_channel_role(channel_slug) IN ('Channel Admin', 'Channel Super Admin'))
    OR (channel_slug IS NULL AND get_my_channel_role('varsity') IN ('Channel Admin', 'Channel Super Admin'))
  );

DROP POLICY IF EXISTS "profile_channels_write" ON profile_channels;
CREATE POLICY "profile_channels_write" ON profile_channels FOR ALL
  USING (
    get_my_role() = 'Super Admin'
    OR get_my_channel_role(channel_slug) IN ('Channel Admin', 'Channel Super Admin')
  );
