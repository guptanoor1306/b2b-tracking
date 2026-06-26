-- Backfill editor_id from legacy editor text field (match profiles by name, case-insensitive)
UPDATE projects p
SET editor_id = pr.id
FROM profiles pr
WHERE p.editor_id IS NULL
  AND p.editor IS NOT NULL
  AND trim(p.editor) <> ''
  AND lower(trim(pr.name)) = lower(trim(p.editor));

-- Also try email match when name didn't match
UPDATE projects p
SET editor_id = pr.id
FROM profiles pr
WHERE p.editor_id IS NULL
  AND p.editor IS NOT NULL
  AND trim(p.editor) <> ''
  AND (
    lower(trim(pr.email)) = lower(trim(p.editor))
    OR lower(split_part(pr.email, '@', 1)) = lower(replace(trim(p.editor), ' ', '.'))
  );

-- Sync stage_assignee to editor where still empty
UPDATE projects
SET stage_assignee_id = editor_id
WHERE stage_assignee_id IS NULL
  AND editor_id IS NOT NULL;
