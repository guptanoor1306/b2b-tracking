import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { StageHistory } from '@/lib/types'

export async function fetchStageHistoryForProjects(
  projectIds: string[],
): Promise<Map<string, StageHistory[]>> {
  const map = new Map<string, StageHistory[]>()
  if (!projectIds.length) return map

  const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createAdminClient()
    : await createClient()

  const { data, error } = await supabase
    .from('stage_history')
    .select('id, project_id, old_stage, new_stage, changed_at, is_hold_event')
    .in('project_id', projectIds)
    .order('changed_at', { ascending: true })

  if (error) throw error

  for (const row of data ?? []) {
    const list = map.get(row.project_id) ?? []
    list.push(row as StageHistory)
    map.set(row.project_id, list)
  }

  return map
}
