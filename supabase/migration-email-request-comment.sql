-- Extend email notification types for request review + comment digest
-- Run in Supabase SQL Editor (safe to re-run)

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
    'comment_digest'
  ));
