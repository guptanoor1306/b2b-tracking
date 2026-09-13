-- LA Social channel (run once in Supabase SQL Editor)

INSERT INTO channels (slug, name, db_name, sort_order, is_active)
VALUES ('la-social', 'LA Social', 'LA Social', 10, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  db_name = EXCLUDED.db_name,
  is_active = EXCLUDED.is_active;

-- Optional: grant yourself access (replace profile UUID)
-- INSERT INTO profile_channels (profile_id, channel_slug, channel_role)
-- VALUES ('YOUR-PROFILE-UUID', 'la-social', 'Channel Admin')
-- ON CONFLICT (profile_id, channel_slug) DO UPDATE SET channel_role = EXCLUDED.channel_role;
