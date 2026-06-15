-- Varsity demo seed — 10 projects for UI/UX testing
-- Run in Supabase SQL Editor after schema.sql, fix-rls.sql, migration-varsity.sql
-- Requires profiles: Apoorv, Aalim, Anmol, Manish, Satyavrat, Amit

DELETE FROM comments WHERE project_id IN (SELECT id FROM projects WHERE content_id LIKE 'VS-30%');
DELETE FROM stage_history WHERE project_id IN (SELECT id FROM projects WHERE content_id LIKE 'VS-30%');
DELETE FROM activity_logs WHERE project_id IN (SELECT id FROM projects WHERE content_id LIKE 'VS-30%');
DELETE FROM projects WHERE content_id LIKE 'VS-30%';

INSERT INTO projects (
  content_id, channel, ip, content_type, title, current_stage, status_health,
  received_date, picked_up_date, delivered_date, target_delivery_date,
  level_of_video, editor, priority, department,
  graphic_designer_id, stage_assignee_id,
  thumbnail_copy, title_copy, drive_link, assets_link,
  is_external_visible, last_status_update_at
) VALUES
(
  'VS-3001', 'Varsity', 'Personal Finance', 'Long-Form',
  'Invest and forget dosen''t work',
  'Script Received', 'On track',
  '2026-06-01', '2026-06-02', NULL, '2026-06-20',
  'Level 2', 'Apoorv', 'High', 'Internal',
  (SELECT id FROM profiles WHERE name ILIKE 'Amit' LIMIT 1),
  (SELECT id FROM profiles WHERE name ILIKE 'Apoorv' LIMIT 1),
  NULL, NULL, NULL, NULL,
  TRUE, NOW() - INTERVAL '2 days'
),
(
  'VS-3002', 'Varsity', 'Wealth', 'Long-Form',
  'Financial Mistake',
  'Visual Direction', 'On track',
  '2026-06-03', '2026-06-04', NULL, '2026-06-22',
  'Level 3', 'Aalim', 'Medium', 'Internal',
  (SELECT id FROM profiles WHERE name ILIKE 'Amit' LIMIT 1),
  (SELECT id FROM profiles WHERE name ILIKE 'Aalim' LIMIT 1),
  '5 money mistakes to avoid', 'The costliest financial mistakes',
  'https://drive.google.com/drive/folders/demo-vs3002',
  NULL,
  TRUE, NOW() - INTERVAL '4 days'
),
(
  'VS-3003', 'Varsity', 'Markets', 'Mid-Form',
  'What is your Networth',
  'Video Data Received', 'At risk',
  '2026-06-05', '2026-06-06', NULL, '2026-06-12',
  'Level 2', 'Anmol', 'High', 'Internal',
  (SELECT id FROM profiles WHERE name ILIKE 'Amit' LIMIT 1),
  (SELECT id FROM profiles WHERE name ILIKE 'Anmol' LIMIT 1),
  'Know your net worth', NULL,
  'https://drive.google.com/drive/folders/demo-vs3003',
  'https://drive.google.com/drive/folders/demo-vs3003-assets',
  TRUE, NOW() - INTERVAL '6 days'
),
(
  'VS-3004', 'Varsity', 'Credit & Loans', 'Reel',
  'RP-Reel - Saving are not enough',
  'First Cut Review', 'On track',
  '2026-06-07', '2026-06-08', NULL, '2026-06-18',
  'Level 1', 'Manish', 'High', 'Internal',
  (SELECT id FROM profiles WHERE name ILIKE 'Amit' LIMIT 1),
  (SELECT id FROM profiles WHERE name ILIKE 'Satyavrat' LIMIT 1),
  'Savings alone won''t make you rich', 'Why savings are not enough',
  'https://drive.google.com/drive/folders/demo-vs3004',
  'https://drive.google.com/drive/folders/demo-vs3004-assets',
  TRUE, NOW() - INTERVAL '3 days'
),
(
  'VS-3005', 'Varsity', 'Insurance', 'Reel',
  'How to insure parents RP reels',
  'Video 1st Draft', 'On track',
  '2026-06-02', '2026-06-03', NULL, '2026-06-25',
  'Level 2', 'Satyavrat', 'Medium', 'Internal',
  (SELECT id FROM profiles WHERE name ILIKE 'Amit' LIMIT 1),
  (SELECT id FROM profiles WHERE name ILIKE 'Aalim' LIMIT 1),
  'Insure your parents the right way', 'How to insure your parents',
  'https://drive.google.com/drive/folders/demo-vs3005',
  NULL,
  TRUE, NOW() - INTERVAL '5 days'
),
(
  'VS-3006', 'Varsity', 'Retirement', 'Long-Form',
  'Finance Expert',
  'Sound', 'On track',
  '2026-05-28', '2026-05-29', NULL, '2026-06-30',
  'Level 4', 'Apoorv', 'High', 'Internal',
  (SELECT id FROM profiles WHERE name ILIKE 'Amit' LIMIT 1),
  (SELECT id FROM profiles WHERE name ILIKE 'Manish' LIMIT 1),
  'Finance expert breaks it down', 'What finance experts wish you knew',
  'https://drive.google.com/drive/folders/demo-vs3006',
  'https://drive.google.com/drive/folders/demo-vs3006-assets',
  TRUE, NOW() - INTERVAL '8 days'
),
(
  'VS-3007', 'Varsity', 'Education', 'Long-Form',
  'How to fund your child education abroad',
  'Feedback from Zerodha', 'Delayed',
  '2026-05-20', '2026-05-22', NULL, '2026-06-08',
  'Level 3', 'Aalim', 'High', 'Internal',
  (SELECT id FROM profiles WHERE name ILIKE 'Amit' LIMIT 1),
  (SELECT id FROM profiles WHERE name ILIKE 'Satyavrat' LIMIT 1),
  'Fund study abroad smartly', 'How to fund your child''s education abroad',
  'https://drive.google.com/drive/folders/demo-vs3007',
  'https://drive.google.com/drive/folders/demo-vs3007-assets',
  TRUE, NOW() - INTERVAL '10 days'
),
(
  'VS-3008', 'Varsity', 'Real Estate', 'Reel',
  'RP reel Child Education',
  'Thumbnails', 'On hold',
  '2026-06-09', '2026-06-10', NULL, '2026-06-28',
  'Level 1', 'Anmol', 'Low', 'Internal',
  (SELECT id FROM profiles WHERE name ILIKE 'Amit' LIMIT 1),
  (SELECT id FROM profiles WHERE name ILIKE 'Anmol' LIMIT 1),
  NULL, NULL, NULL, NULL,
  TRUE, NOW() - INTERVAL '7 days'
),
(
  'VS-3009', 'Varsity', 'Career & Income', 'Podcast',
  'Finance Expert Podcast',
  'Premiere', 'On track',
  '2026-06-04', '2026-06-05', NULL, '2026-07-05',
  'Level 2', 'Manish', 'Medium', 'Internal',
  (SELECT id FROM profiles WHERE name ILIKE 'Amit' LIMIT 1),
  (SELECT id FROM profiles WHERE name ILIKE 'Apoorv' LIMIT 1),
  'Expert podcast ep. 12', 'Finance Expert Podcast — Episode 12',
  'https://drive.google.com/drive/folders/demo-vs3009',
  'https://drive.google.com/drive/folders/demo-vs3009-assets',
  TRUE, NOW() - INTERVAL '4 days'
),
(
  'VS-3010', 'Varsity', 'Tax Planning', 'Long-Form',
  'AI & Finance Planning',
  'Final Delivery Done', 'Delivered',
  '2026-05-15', '2026-05-16', '2026-06-08', '2026-06-10',
  'Level 3', 'Satyavrat', 'Medium', 'Internal',
  (SELECT id FROM profiles WHERE name ILIKE 'Amit' LIMIT 1),
  (SELECT id FROM profiles WHERE name ILIKE 'Satyavrat' LIMIT 1),
  'AI for your finances', 'How AI is changing finance planning',
  'https://drive.google.com/drive/folders/demo-vs3010',
  'https://drive.google.com/drive/folders/demo-vs3010-assets',
  TRUE, NOW() - INTERVAL '1 day'
);

-- Full stage history (each stage from start → current, 2 days per stage)
DO $$
DECLARE
  stages TEXT[] := ARRAY[
    'Script Received', 'Visual Direction', 'Video Data Received',
    'Thumbnail Title Copy Received', 'First Cut Received', 'First Cut Review', 'First Cut Changes',
    'Storyboard', 'Thumbnails', 'Graphics Creation', 'Animation Completion', 'Sound', 'Premiere',
    'Video 1st Draft', 'Feedback from Zerodha', 'Final Changes', 'Final Delivery Done'
  ];
  mapping RECORD;
  i INT;
  proj_id UUID;
  base_ts TIMESTAMPTZ;
BEGIN
  FOR mapping IN
    SELECT * FROM (VALUES
      ('VS-3001', 1),
      ('VS-3002', 2),
      ('VS-3003', 3),
      ('VS-3004', 6),
      ('VS-3005', 14),
      ('VS-3006', 12),
      ('VS-3007', 15),
      ('VS-3008', 9),
      ('VS-3009', 13),
      ('VS-3010', 17)
    ) AS t(cid, stage_idx)
  LOOP
    SELECT id INTO proj_id FROM projects WHERE content_id = mapping.cid;
    IF proj_id IS NULL THEN CONTINUE; END IF;
    base_ts := '2026-06-01 10:00:00+05:30'::timestamptz;
    FOR i IN 1..mapping.stage_idx LOOP
      INSERT INTO stage_history (project_id, old_stage, new_stage, changed_at, note, is_hold_event)
      VALUES (
        proj_id,
        CASE WHEN i = 1 THEN NULL ELSE stages[i - 1] END,
        stages[i],
        base_ts + ((i - 1) * INTERVAL '2 days'),
        'Moved to ' || stages[i],
        FALSE
      );
    END LOOP;
  END LOOP;
END $$;

-- Sample comments for UX testing
INSERT INTO comments (project_id, comment, created_by)
SELECT p.id, 'Script looks good — please proceed with visual direction.', pr.id
FROM projects p, profiles pr
WHERE p.content_id = 'VS-3002' AND pr.name ILIKE 'Aalim' LIMIT 1;

INSERT INTO comments (project_id, comment, created_by)
SELECT p.id, 'Can we add a stronger hook in the first 10 seconds?', pr.id
FROM projects p, profiles pr
WHERE p.content_id = 'VS-3004' AND pr.name ILIKE 'Satyavrat' LIMIT 1;

INSERT INTO comments (project_id, comment, created_by)
SELECT p.id, 'Thumbnail options shared in the drive folder.', pr.id
FROM projects p, profiles pr
WHERE p.content_id = 'VS-3005' AND pr.name ILIKE 'Amit' LIMIT 1;

INSERT INTO comments (project_id, comment, created_by)
SELECT p.id, 'Waiting on client feedback for final cut.', pr.id
FROM projects p, profiles pr
WHERE p.content_id = 'VS-3007' AND pr.name ILIKE 'Aalim' LIMIT 1;

-- Reply to first comment on VS-3004 (requires migration-comment-replies.sql)
INSERT INTO comments (project_id, comment, parent_id, created_by)
SELECT p.id, 'Noted — will revise and share updated cut by EOD.', c.id, pr.id
FROM projects p
JOIN comments c ON c.project_id = p.id
JOIN profiles pr ON pr.name ILIKE 'Manish'
WHERE p.content_id = 'VS-3004'
ORDER BY c.created_at ASC
LIMIT 1;
