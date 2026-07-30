-- Zerodha Online: external request approve / decline workflow

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS request_status TEXT;

ALTER TABLE comments
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'general';

-- Existing Request Received rows awaiting first review
UPDATE projects
SET request_status = 'pending'
WHERE channel = 'Zerodha Online'
  AND current_stage = 'Request Received'
  AND request_status IS NULL;
