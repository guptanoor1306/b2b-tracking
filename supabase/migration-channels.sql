-- LearnApp Studios: multi-channel access
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS channels (
  slug        TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  db_name     TEXT NOT NULL UNIQUE,
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profile_channels (
  profile_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  channel_slug  TEXT NOT NULL REFERENCES channels(slug) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (profile_id, channel_slug)
);

CREATE INDEX IF NOT EXISTS idx_profile_channels_profile ON profile_channels(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_channels_channel ON profile_channels(channel_slug);

ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "channels_select" ON channels FOR SELECT USING (TRUE);
CREATE POLICY "profile_channels_select" ON profile_channels FOR SELECT USING (TRUE);
CREATE POLICY "profile_channels_write" ON profile_channels FOR ALL
  USING (get_my_role() IN ('Super Admin'));

-- Seed channels
INSERT INTO channels (slug, name, db_name, sort_order) VALUES
  ('varsity', 'Varsity', 'Varsity', 1),
  ('zerodha-online', 'Zerodha Online', 'Zerodha Online', 2),
  ('tharun', 'Tharun', 'Tharun', 3),
  ('rohit', 'Rohit', 'Rohit', 4),
  ('abid-bhuvan', 'Abid-Bhuvan', 'Abid-Bhuvan', 5),
  ('karthik-insta', 'Karthik Insta', 'Karthik Insta', 6),
  ('leap-finance', 'Leap Finance', 'Leap Finance', 7),
  ('capital-mind', 'Capital Mind', 'Capital Mind', 8),
  ('sensibull', 'Sensibull', 'Sensibull', 9)
ON CONFLICT (slug) DO NOTHING;

-- Channel access is assigned explicitly per user in Channel settings.
-- Do NOT bulk-grant Varsity to all internal users.

-- Prateek super admin: create auth user in Supabase Dashboard first, then run:
-- INSERT INTO profiles (id, name, email, role)
-- SELECT id, 'Prateek', 'prateek@learnapp.com', 'Super Admin'
-- FROM auth.users WHERE email = 'prateek@learnapp.com'
-- ON CONFLICT (id) DO UPDATE SET role = 'Super Admin', name = EXCLUDED.name;
