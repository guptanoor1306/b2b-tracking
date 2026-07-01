-- Per-user auth hints (admin-set initial password visible only to the account owner)
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS profile_auth_hints (
  profile_id          UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  initial_password    TEXT,
  password_changed_at TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profile_auth_hints_profile ON profile_auth_hints(profile_id);

ALTER TABLE profile_auth_hints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profile_auth_hints_select_own" ON profile_auth_hints;
CREATE POLICY "profile_auth_hints_select_own" ON profile_auth_hints FOR SELECT
  USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "profile_auth_hints_insert_own" ON profile_auth_hints;
CREATE POLICY "profile_auth_hints_insert_own" ON profile_auth_hints FOR INSERT
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "profile_auth_hints_update_own" ON profile_auth_hints;
CREATE POLICY "profile_auth_hints_update_own" ON profile_auth_hints FOR UPDATE
  USING (profile_id = auth.uid());
