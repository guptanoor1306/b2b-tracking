-- Extend roles to include Super Admin + reminder audit table
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('Admin','Internal Team','Agency','Zerodha Viewer','Super Admin'));

CREATE TABLE IF NOT EXISTS stage_reminders (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  assignee_id  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  stage        TEXT NOT NULL,
  sent_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  sent_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE stage_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reminders_select_auth" ON stage_reminders FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "reminders_insert_internal" ON stage_reminders FOR INSERT
  WITH CHECK (get_my_role() IN ('Admin','Internal Team','Super Admin'));
