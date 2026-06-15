-- June 2026 projects from Zerodha Online Production sheet
-- Run in Supabase SQL Editor (after schema + migration-simplify.sql)

INSERT INTO settings_ips (name, sort_order) VALUES ('GEO', 4)
ON CONFLICT (name) DO NOTHING;

-- Optional: clear old demo seed if you only want June data
-- DELETE FROM stage_history;
-- DELETE FROM projects WHERE content_id LIKE 'ZO-%';

INSERT INTO projects (
  content_id, channel, ip, content_type, title,
  current_stage, status_health, received_date, picked_up_date,
  delivered_date, priority, department, is_external_visible
) VALUES
('ZO-2001','Zerodha Online','Product','Long-form above 10 min',
 'Transfer shares from other brokers to Zerodha',
 'File received','On track','2026-06-08','2026-06-08',NULL,'High','Internal',TRUE),

('ZO-2002','Zerodha Online','Product','Long-form above 10 min',
 '10 Common questions about minor account opening',
 'File received','On track','2026-06-08','2026-06-08',NULL,'Medium','Internal',TRUE),

('ZO-2003','Zerodha Online','Product','Long-form above 10 min',
 '10 common questions about HUFs',
 'File received','On track','2026-06-08','2026-06-08',NULL,'Medium','Internal',TRUE),

('ZO-2004','Zerodha Online','SEO','Long-form above 10 min',
 'Scams',
 'File received','On track','2026-06-08','2026-06-08',NULL,'Medium','Internal',TRUE),

('ZO-2005','Zerodha Online','IPO','Long-form above 10 min',
 'CMR Green',
 'Delivered','Delivered','2026-06-01','2026-06-01','2026-06-02','High','Internal',TRUE),
-- Note: target_delivery_date for ZO-2005 set via UPDATE below (release = 2 Jun)

('ZO-2006','Zerodha Online','GEO','Long-form above 10 min',
 'Investor workspace',
 'File received','On track','2026-06-10','2026-06-10',NULL,'Medium','Internal',TRUE),

('ZO-2007','Zerodha Online','GEO','Long-form above 10 min',
 'Stock market',
 'File received','On track','2026-06-10','2026-06-10',NULL,'Medium','Internal',TRUE),

('ZO-2008','Zerodha Online','GEO','Long-form above 10 min',
 'Should you use MTF? 5 questions to ask yourself first',
 'File received','On track','2026-06-10','2026-06-10',NULL,'Medium','Internal',TRUE),

('ZO-2009','Zerodha Online','GEO','Long-form above 10 min',
 'NSE vs BSE: Does it matter where you buy a stock?',
 'File received','On track','2026-06-10','2026-06-10',NULL,'Medium','Internal',TRUE),

('ZO-2010','Zerodha Online','GEO','Long-form above 10 min',
 'How to manage multiple F&O positions without losing track',
 'File received','On track','2026-06-10','2026-06-10',NULL,'Medium','Internal',TRUE),

('ZO-2011','Zerodha Online','GEO','Long-form above 10 min',
 'Where are your shares actually held?',
 'File received','On track','2026-06-10','2026-06-10',NULL,'Medium','Internal',TRUE),

('ZO-2012','Zerodha Online','GEO','Long-form above 10 min',
 '10 common questions about pledging',
 'File received','On track','2026-06-10','2026-06-10',NULL,'Medium','Internal',TRUE),

('ZO-2013','Zerodha Online','GEO','Long-form above 10 min',
 '5 mistakes traders make while setting up their screens',
 'File received','On track','2026-06-10','2026-06-10',NULL,'Medium','Internal',TRUE),

('ZO-2014','Zerodha Online','GEO','Long-form above 10 min',
 'Why IPO applications get rejected',
 'File received','On track','2026-06-10','2026-06-10',NULL,'Medium','Internal',TRUE);

-- Stage history for CMR Green (delivered)
INSERT INTO stage_history (project_id, old_stage, new_stage, changed_at, note, is_hold_event)
SELECT id, NULL, 'File received', '2026-06-01 10:00:00+05:30', 'Project created', FALSE
FROM projects WHERE content_id = 'ZO-2005';

INSERT INTO stage_history (project_id, old_stage, new_stage, changed_at, note, is_hold_event)
SELECT id, 'File received', 'Delivered', '2026-06-02 17:00:00+05:30', 'Released', FALSE
FROM projects WHERE content_id = 'ZO-2005';

-- Stage history for other June picks (created = file received)
INSERT INTO stage_history (project_id, old_stage, new_stage, changed_at, note, is_hold_event)
SELECT id, NULL, 'File received', (received_date || ' 10:00:00+05:30')::timestamptz, 'Project created', FALSE
FROM projects WHERE content_id IN (
  'ZO-2001','ZO-2002','ZO-2003','ZO-2004','ZO-2006','ZO-2007','ZO-2008',
  'ZO-2009','ZO-2010','ZO-2011','ZO-2012','ZO-2013','ZO-2014'
);
