-- Zerodha batch 4: Channel Super Admin role, client review submissions, request_received emails
-- Run in Supabase SQL Editor (safe to re-run)

ALTER TABLE profile_channels DROP CONSTRAINT IF EXISTS profile_channels_channel_role_check;
ALTER TABLE profile_channels ADD CONSTRAINT profile_channels_channel_role_check
  CHECK (channel_role IN (
    'Channel Admin',
    'Channel Team',
    'Agency',
    'Zerodha Viewer',
    'External Client Admin',
    'Channel Super Admin'
  ));

CREATE TABLE IF NOT EXISTS client_review_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  review_stage TEXT NOT NULL,
  submitted_by UUID REFERENCES profiles(id),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, review_stage)
);

CREATE TABLE IF NOT EXISTS client_review_feedback_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES client_review_submissions(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_review_submissions_project
  ON client_review_submissions(project_id);

ALTER TABLE email_notifications DROP CONSTRAINT IF EXISTS email_notifications_notification_type_check;
ALTER TABLE email_notifications ADD CONSTRAINT email_notifications_notification_type_check
  CHECK (notification_type IN (
    'project_assigned',
    'stage_actionable',
    'stage_reminder',
    'channel_access',
    'user_welcome',
    'request_approved',
    'request_declined',
    'request_received',
    'comment_digest'
  ));
