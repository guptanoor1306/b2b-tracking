-- Finance billing: per-project "billed this month" marks (Super Admin only)

CREATE TABLE IF NOT EXISTS finance_billing_marks (
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  month_key  TEXT NOT NULL CHECK (month_key ~ '^\d{4}-\d{2}$'),
  billed     BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  PRIMARY KEY (project_id, month_key)
);

CREATE INDEX IF NOT EXISTS finance_billing_marks_month_key_idx
  ON finance_billing_marks (month_key);

ALTER TABLE finance_billing_marks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "finance_billing_marks_super_admin_all" ON finance_billing_marks;
CREATE POLICY "finance_billing_marks_super_admin_all" ON finance_billing_marks
  FOR ALL
  USING (get_my_role() = 'Super Admin')
  WITH CHECK (get_my_role() = 'Super Admin');
