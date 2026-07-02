-- Zerodha Online: video language + expanded level values
ALTER TABLE projects ADD COLUMN IF NOT EXISTS video_language TEXT;

ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_video_language_check;
ALTER TABLE projects ADD CONSTRAINT projects_video_language_check
  CHECK (video_language IS NULL OR video_language IN ('English', 'Hindi'));

-- level_of_video: drop legacy Varsity-only check (Level 1–3); app validates per channel
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_level_of_video_check;
