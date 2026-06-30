-- Email notification audit log (dedup + history)
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS email_notifications (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'project_assigned', 'stage_actionable', 'stage_reminder', 'channel_access'
  )),
  recipient_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  recipient_email  TEXT NOT NULL,
  project_id       UUID REFERENCES projects(id) ON DELETE CASCADE,
  channel_slug     TEXT,
  stage            TEXT,
  reminder_number  INT CHECK (reminder_number IS NULL OR (reminder_number >= 1 AND reminder_number <= 5)),
  metadata         JSONB,
  sent_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_notifications_dedup
  ON email_notifications (notification_type, recipient_id, project_id, stage, reminder_number);

CREATE INDEX IF NOT EXISTS idx_email_notifications_sent_at
  ON email_notifications (sent_at DESC);

ALTER TABLE email_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_notifications_super_read" ON email_notifications;
CREATE POLICY "email_notifications_super_read" ON email_notifications FOR SELECT
  USING (get_my_role() = 'Super Admin');

DROP POLICY IF EXISTS "email_notifications_service_insert" ON email_notifications;
CREATE POLICY "email_notifications_service_insert" ON email_notifications FOR INSERT
  WITH CHECK (true);
