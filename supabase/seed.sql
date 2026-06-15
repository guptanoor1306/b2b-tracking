-- ============================================================
-- Seed: 10 sample projects for Zerodha Online
-- Run AFTER creating auth users and inserting profiles.
-- Replace UUIDs with your actual profile IDs.
-- ============================================================

-- Placeholder profile UUIDs (replace with real ones after signup)
-- admin_user    = '00000000-0000-0000-0000-000000000001'
-- internal_user = '00000000-0000-0000-0000-000000000002'

INSERT INTO projects (
  content_id, channel, ip, content_type, title,
  current_stage, status_health, received_date, picked_up_date,
  target_delivery_date, editor, assigned_agency_id,
  priority, notes, is_external_visible
) VALUES
(
  'ZO-1001','Zerodha Online','Product','Long-form above 10 min',
  'Zerodha Kite Web - Full Feature Walkthrough',
  'Edit sent for review','At risk',
  '2026-05-20','2026-05-22','2026-06-12',
  'Rahul M','a1000000-0000-0000-0000-000000000001',
  'High','First cut shared, awaiting internal feedback.',TRUE
),
(
  'ZO-1002','Zerodha Online','SEO','Short-form above 5 min',
  'How to Open a Demat Account in 5 Minutes',
  'Storyboarding','On track',
  '2026-05-25','2026-05-28','2026-06-20',
  'Priya S','a1000000-0000-0000-0000-000000000002',
  'Medium','SEO-optimised script in progress.',TRUE
),
(
  'ZO-1003','Zerodha Online','IPO','Reel',
  'IPO Explained in 60 Seconds',
  'Delivered','Delivered',
  '2026-05-10','2026-05-11','2026-05-18',
  'Ankit V','a1000000-0000-0000-0000-000000000003',
  'Low','Delivered ahead of schedule.',TRUE
),
(
  'ZO-1004','Zerodha Online','Product','Podcast',
  'Behind the Trade - Episode 12',
  'Hold','On hold',
  '2026-05-18',NULL,'2026-06-15',
  'Sneha K',NULL,
  'High','Waiting for guest confirmation from Zerodha team.',FALSE
),
(
  'ZO-1005','Zerodha Online','SEO','Long-form above 10 min',
  'Mutual Funds vs Stocks - Complete Guide 2026',
  'Feedback received','On track',
  '2026-05-28','2026-05-30','2026-06-25',
  'Rahul M','a1000000-0000-0000-0000-000000000001',
  'Medium','Zerodha feedback received, revisions ongoing.',TRUE
),
(
  'ZO-1006','Zerodha Online','IPO','Mid-form 2-3 min',
  'How to Apply for IPO via Zerodha',
  'Final Edit sent for review','At risk',
  '2026-05-15','2026-05-17','2026-06-11',
  'Dev T',NULL,
  'High','Final edit under review.',TRUE
),
(
  'ZO-1007','Zerodha Online','Product','Short-form above 5 min',
  'Setting Up Zerodha SIP - Step by Step',
  '1st Cut','On track',
  '2026-06-01','2026-06-02','2026-06-30',
  'Priya S','a1000000-0000-0000-0000-000000000002',
  'Low','Smooth progress expected.',TRUE
),
(
  'ZO-1008','Zerodha Online','SEO','Reel',
  'What is NIFTY 50? - 60 sec',
  'Sent for Approval on 1st Cut','On track',
  '2026-05-30','2026-06-01','2026-06-18',
  'Ankit V','a1000000-0000-0000-0000-000000000003',
  'Medium','Awaiting Zerodha sign-off on 1st cut.',TRUE
),
(
  'ZO-1009','Zerodha Online','IPO','Long-form above 10 min',
  'IPO Process End-to-End Masterclass',
  'File received','On track',
  '2026-06-05',NULL,'2026-07-10',
  NULL,NULL,
  'Low','Just received. Will pick up next week.',FALSE
),
(
  'ZO-1010','Zerodha Online','Product','Mid-form 2-3 min',
  'Zerodha Options Trading - Quick Overview',
  'Edit sent for review','Delayed',
  '2026-05-05','2026-05-07','2026-05-31',
  'Dev T',NULL,
  'High','Target missed. Pending bandwidth from editor.',FALSE
);

-- Stage history for delivered project ZO-1003
INSERT INTO stage_history (project_id, old_stage, new_stage, changed_at, note, is_hold_event)
SELECT id, NULL, 'File received', '2026-05-10 10:00:00+05:30', 'Project created', FALSE
FROM projects WHERE content_id = 'ZO-1003';

INSERT INTO stage_history (project_id, old_stage, new_stage, changed_at, note, is_hold_event)
SELECT id, 'File received', 'Storyboarding', '2026-05-11 11:00:00+05:30', NULL, FALSE
FROM projects WHERE content_id = 'ZO-1003';

INSERT INTO stage_history (project_id, old_stage, new_stage, changed_at, note, is_hold_event)
SELECT id, 'Storyboarding', '1st Cut', '2026-05-13 09:30:00+05:30', NULL, FALSE
FROM projects WHERE content_id = 'ZO-1003';

INSERT INTO stage_history (project_id, old_stage, new_stage, changed_at, note, is_hold_event)
SELECT id, '1st Cut', 'Delivered', '2026-05-17 17:00:00+05:30', 'Approved and delivered', FALSE
FROM projects WHERE content_id = 'ZO-1003';

-- Stage history with hold for ZO-1004
INSERT INTO stage_history (project_id, old_stage, new_stage, changed_at, note, is_hold_event)
SELECT id, NULL, 'File received', '2026-05-18 10:00:00+05:30', 'Project created', FALSE
FROM projects WHERE content_id = 'ZO-1004';

INSERT INTO stage_history (project_id, old_stage, new_stage, changed_at, note, is_hold_event)
SELECT id, 'File received', 'Storyboarding', '2026-05-20 10:00:00+05:30', NULL, FALSE
FROM projects WHERE content_id = 'ZO-1004';

INSERT INTO stage_history (project_id, old_stage, new_stage, changed_at, note, is_hold_event)
SELECT id, 'Storyboarding', 'Hold', '2026-05-23 14:00:00+05:30', 'Waiting for guest confirmation', TRUE
FROM projects WHERE content_id = 'ZO-1004';
