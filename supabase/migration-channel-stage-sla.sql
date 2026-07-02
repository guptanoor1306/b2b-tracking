-- Per-channel stage SLA (Zerodha Online and future channels)
CREATE TABLE IF NOT EXISTS channel_stage_sla (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_slug    TEXT NOT NULL REFERENCES channels(slug) ON DELETE CASCADE,
  stage_name      TEXT NOT NULL,
  role_owner      TEXT NOT NULL,
  duration_hours  NUMERIC NOT NULL DEFAULT 0,
  level_0_hours   NUMERIC,
  level_1_hours   NUMERIC,
  level_2_hours   NUMERIC,
  level_3_hours   NUMERIC,
  level_4_hours   NUMERIC,
  parallel_group  TEXT,
  sort_order      INT NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by      UUID REFERENCES profiles(id),
  UNIQUE (channel_slug, stage_name)
);

CREATE INDEX IF NOT EXISTS idx_channel_stage_sla_slug ON channel_stage_sla(channel_slug);

ALTER TABLE channel_stage_sla ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "channel_stage_sla_select" ON channel_stage_sla;
CREATE POLICY "channel_stage_sla_select" ON channel_stage_sla FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "channel_stage_sla_write" ON channel_stage_sla;
CREATE POLICY "channel_stage_sla_write" ON channel_stage_sla FOR ALL
  USING (get_my_role() IN ('Super Admin', 'Channel Admin'));

ALTER TABLE settings_activity_logs ADD COLUMN IF NOT EXISTS channel_slug TEXT;
