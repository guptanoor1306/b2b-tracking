-- ============================================================
-- Zerodha Online Production Tracker — Supabase Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES (maps to auth.users)
-- ============================================================
CREATE TABLE profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  email        TEXT NOT NULL UNIQUE,
  role         TEXT NOT NULL CHECK (role IN ('Admin','Internal Team','Agency','Zerodha Viewer')),
  organization TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AGENCIES
-- ============================================================
CREATE TABLE agencies (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL UNIQUE,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- EDITORS
-- ============================================================
CREATE TABLE editors (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  email      TEXT,
  agency_id  UUID REFERENCES agencies(id) ON DELETE SET NULL,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SETTINGS — IPs, Content Types, Stages
-- ============================================================
CREATE TABLE settings_ips (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE settings_content_types (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE settings_stages (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE
);

-- ============================================================
-- PROJECTS
-- ============================================================
CREATE SEQUENCE project_id_seq START 1001;

CREATE TABLE projects (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id             TEXT NOT NULL UNIQUE DEFAULT 'ZO-' || nextval('project_id_seq')::TEXT,
  channel                TEXT NOT NULL DEFAULT 'Zerodha Online',
  ip                     TEXT NOT NULL,
  content_type           TEXT NOT NULL,
  title                  TEXT NOT NULL,
  current_stage          TEXT NOT NULL DEFAULT 'File received',
  status_health          TEXT NOT NULL DEFAULT 'On track'
                           CHECK (status_health IN ('On track','At risk','Delayed','On hold','Delivered')),
  received_date          DATE,
  picked_up_date         DATE,
  delivered_date         DATE,
  target_delivery_date   DATE,
  editor                 TEXT,
  assigned_agency_id     UUID REFERENCES agencies(id) ON DELETE SET NULL,
  internal_owner_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assets_link            TEXT,
  final_file_link        TEXT,
  thumbnail_copy         TEXT,
  thumbnail_file_link    TEXT,
  priority               TEXT NOT NULL DEFAULT 'Medium'
                           CHECK (priority IN ('Low','Medium','High')),
  blocker                TEXT,
  next_action            TEXT,
  next_action_due_date   DATE,
  notes                  TEXT,
  is_external_visible    BOOLEAN NOT NULL DEFAULT FALSE,
  created_by             UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_by             UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_status_update_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- STAGE HISTORY / TIMELINE
-- ============================================================
CREATE TABLE stage_history (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  old_stage    TEXT,
  new_stage    TEXT NOT NULL,
  changed_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  changed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note         TEXT,
  is_hold_event BOOLEAN NOT NULL DEFAULT FALSE
);

-- ============================================================
-- ACTIVITY LOGS
-- ============================================================
CREATE TABLE activity_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  action_type   TEXT NOT NULL,
  field_changed TEXT,
  old_value     TEXT,
  new_value     TEXT,
  updated_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- COMMENTS
-- ============================================================
CREATE TABLE comments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  comment     TEXT NOT NULL,
  created_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_projects_channel       ON projects(channel);
CREATE INDEX idx_projects_ip            ON projects(ip);
CREATE INDEX idx_projects_current_stage ON projects(current_stage);
CREATE INDEX idx_projects_status_health ON projects(status_health);
CREATE INDEX idx_projects_agency        ON projects(assigned_agency_id);
CREATE INDEX idx_projects_owner         ON projects(internal_owner_id);
CREATE INDEX idx_stage_history_project  ON stage_history(project_id);
CREATE INDEX idx_activity_project       ON activity_logs(project_id);
CREATE INDEX idx_comments_project       ON comments(project_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- HEALTH AUTO-CALCULATION TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION recalculate_health()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.current_stage = 'Delivered' THEN
    NEW.status_health := 'Delivered';
    IF OLD.delivered_date IS NULL THEN
      NEW.delivered_date := CURRENT_DATE;
    END IF;
  ELSIF NEW.current_stage = 'Hold' THEN
    NEW.status_health := 'On hold';
  ELSIF NEW.target_delivery_date IS NOT NULL THEN
    IF NEW.target_delivery_date < CURRENT_DATE THEN
      NEW.status_health := 'Delayed';
    ELSIF NEW.target_delivery_date <= CURRENT_DATE + INTERVAL '3 days' THEN
      NEW.status_health := 'At risk';
    ELSE
      NEW.status_health := 'On track';
    END IF;
  ELSE
    NEW.status_health := 'On track';
  END IF;
  NEW.last_status_update_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_projects_health
  BEFORE UPDATE OF current_stage ON projects
  FOR EACH ROW EXECUTE FUNCTION recalculate_health();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects       ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_history  ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE agencies       ENABLE ROW LEVEL SECURITY;
ALTER TABLE editors        ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings_ips   ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings_content_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings_stages        ENABLE ROW LEVEL SECURITY;

-- Helper function: get caller's role (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Agency IDs for current user via profile.organization
CREATE OR REPLACE FUNCTION get_my_agency_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT a.id
  FROM public.agencies a
  INNER JOIN public.profiles p ON p.organization = a.name
  WHERE p.id = auth.uid();
$$;

-- PROFILES policies
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (TRUE);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_insert_admin" ON profiles FOR INSERT WITH CHECK (get_my_role() = 'Admin');
CREATE POLICY "profiles_update_admin" ON profiles FOR UPDATE USING (get_my_role() = 'Admin' OR id = auth.uid());
CREATE POLICY "profiles_delete_admin" ON profiles FOR DELETE USING (get_my_role() = 'Admin');

-- PROJECTS policies
CREATE POLICY "projects_admin_internal_all" ON projects FOR ALL
  USING (get_my_role() IN ('Admin','Internal Team'));

CREATE POLICY "projects_agency_select" ON projects FOR SELECT
  USING (
    get_my_role() = 'Agency'
    AND assigned_agency_id IN (SELECT get_my_agency_ids())
  );

CREATE POLICY "projects_agency_update" ON projects FOR UPDATE
  USING (
    get_my_role() = 'Agency'
    AND assigned_agency_id IN (SELECT get_my_agency_ids())
  );

CREATE POLICY "projects_zerodha_select" ON projects FOR SELECT
  USING (get_my_role() = 'Zerodha Viewer');

-- STAGE HISTORY policies
CREATE POLICY "stage_history_select" ON stage_history FOR SELECT USING (TRUE);
CREATE POLICY "stage_history_insert_auth" ON stage_history FOR INSERT WITH CHECK (get_my_role() IN ('Admin','Internal Team','Agency'));

-- ACTIVITY LOGS policies
CREATE POLICY "activity_logs_select" ON activity_logs FOR SELECT USING (TRUE);
CREATE POLICY "activity_logs_insert_auth" ON activity_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- COMMENTS policies
CREATE POLICY "comments_select" ON comments FOR SELECT USING (TRUE);
CREATE POLICY "comments_insert_auth" ON comments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "comments_delete_own" ON comments FOR DELETE USING (created_by = auth.uid() OR get_my_role() = 'Admin');

-- AGENCIES policies
CREATE POLICY "agencies_select_all"   ON agencies FOR SELECT USING (TRUE);
CREATE POLICY "agencies_admin_write"  ON agencies FOR ALL USING (get_my_role() = 'Admin');

-- EDITORS policies
CREATE POLICY "editors_select_all"  ON editors FOR SELECT USING (TRUE);
CREATE POLICY "editors_admin_write" ON editors FOR ALL USING (get_my_role() IN ('Admin','Internal Team'));

-- SETTINGS policies (read all, write admin only)
CREATE POLICY "settings_ips_select"  ON settings_ips FOR SELECT USING (TRUE);
CREATE POLICY "settings_ips_admin"   ON settings_ips FOR ALL USING (get_my_role() = 'Admin');
CREATE POLICY "settings_ct_select"   ON settings_content_types FOR SELECT USING (TRUE);
CREATE POLICY "settings_ct_admin"    ON settings_content_types FOR ALL USING (get_my_role() = 'Admin');
CREATE POLICY "settings_st_select"   ON settings_stages FOR SELECT USING (TRUE);
CREATE POLICY "settings_st_admin"    ON settings_stages FOR ALL USING (get_my_role() = 'Admin');

-- ============================================================
-- SEED DATA
-- ============================================================

-- IPs
INSERT INTO settings_ips (name, sort_order) VALUES
  ('Product', 1), ('SEO', 2), ('IPO', 3), ('GEO', 4);

-- Content Types
INSERT INTO settings_content_types (name, sort_order) VALUES
  ('Long-form above 10 min', 1),
  ('Short-form above 5 min', 2),
  ('Reel',                   3),
  ('Podcast',                4),
  ('Mid-form 2-3 min',       5);

-- Stages
INSERT INTO settings_stages (name, sort_order) VALUES
  ('File received',                    1),
  ('Storyboarding',                    2),
  ('1st Cut',                          3),
  ('Sent for Approval on 1st Cut',     4),
  ('Edit sent for review',             5),
  ('Feedback received',                6),
  ('Final Edit sent for review',       7),
  ('Delivered',                        8),
  ('Hold',                             9);

-- Agencies
INSERT INTO agencies (id, name) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Studio Alpha'),
  ('a1000000-0000-0000-0000-000000000002', 'Pixel Works'),
  ('a1000000-0000-0000-0000-000000000003', 'CreativeHive');

-- Editors
INSERT INTO editors (name, email, agency_id) VALUES
  ('Rahul M',  'rahul@studioa.com',  'a1000000-0000-0000-0000-000000000001'),
  ('Priya S',  'priya@pixelworks.com','a1000000-0000-0000-0000-000000000002'),
  ('Ankit V',  'ankit@creativehive.com','a1000000-0000-0000-0000-000000000003'),
  ('Sneha K',  'sneha@internal.com', NULL),
  ('Dev T',    'dev@internal.com',   NULL);
