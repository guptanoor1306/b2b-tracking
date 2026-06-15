-- Org holidays excluded from timeline calculations (Mon–Fri business days + these dates)
CREATE TABLE IF NOT EXISTS org_holidays (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  holiday_date  DATE NOT NULL UNIQUE,
  name          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE org_holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "holidays_select_auth" ON org_holidays
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "holidays_admin_write" ON org_holidays
  FOR ALL USING (get_my_role() IN ('Admin', 'Super Admin'));
