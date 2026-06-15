-- Allow Admin / Internal Team to adjust stage timeline dates
CREATE POLICY "stage_history_update_internal" ON stage_history
  FOR UPDATE USING (get_my_role() IN ('Admin', 'Internal Team'));
