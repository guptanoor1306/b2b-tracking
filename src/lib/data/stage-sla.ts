import { createClient } from '@/lib/supabase/server'
import { DEFAULT_STAGE_SLA, StageSlaRow } from '@/lib/stage-sla'

export async function fetchStageSlaConfig(): Promise<StageSlaRow[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('settings_stage_sla')
    .select('*')
    .order('sort_order')

  if (!data?.length) {
    return DEFAULT_STAGE_SLA.map((r, i) => ({
      ...r,
      id: `default-${i}`,
    }))
  }

  return data.map(row => ({
    id: row.id,
    stage_name: row.stage_name,
    role_owner: row.role_owner,
    duration_hours: Number(row.duration_hours),
    level_1_hours: row.level_1_hours != null ? Number(row.level_1_hours) : null,
    level_2_hours: row.level_2_hours != null ? Number(row.level_2_hours) : null,
    level_3_hours: row.level_3_hours != null ? Number(row.level_3_hours) : null,
    parallel_group: row.parallel_group,
    sort_order: row.sort_order,
  }))
}

export async function fetchProjectHoldPeriods(projectId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('project_hold_periods')
    .select('*')
    .eq('project_id', projectId)
    .order('started_at')
  return data ?? []
}

export async function fetchSettingsActivityLogs(limit = 50) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('settings_activity_logs')
    .select('*, updater:profiles!settings_activity_logs_updated_by_fkey(id, name, email)')
    .order('updated_at', { ascending: false })
    .limit(limit)
  return data ?? []
}
