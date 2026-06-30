import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Project, StageHistory } from '@/lib/types'

const STAGE_HISTORY_SELECT =
  '*, assignee:profiles!stage_history_assignee_id_fkey(id, name, email)'

export type StageHistoryInsert = {
  project_id: string
  old_stage: string | null
  new_stage: string
  changed_by: string | null
  assignee_id?: string | null
  note?: string | null
  is_hold_event?: boolean
  changed_at?: string
}

/** Server actions — bypass RLS after auth checks (Member + channel role cannot insert via RLS). */
export async function insertStageHistoryRecord(record: StageHistoryInsert) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const supabase = await createClient()
    const { error } = await supabase.from('stage_history').insert(record)
    return error ? { error: error.message } : { ok: true as const }
  }

  const admin = createAdminClient()
  const { error } = await admin.from('stage_history').insert(record)
  return error ? { error: error.message } : { ok: true as const }
}

export async function fetchProjectStageHistory(
  projectId: string,
  project?: Pick<
    Project,
    'current_stage' | 'last_status_update_at' | 'created_at' | 'updated_by' | 'stage_assignee_id'
  >,
): Promise<StageHistory[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('stage_history')
    .select(STAGE_HISTORY_SELECT)
    .eq('project_id', projectId)
    .order('changed_at', { ascending: true })

  if (error) throw error
  if (data && data.length > 0) return data as StageHistory[]

  if (!project?.current_stage || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return []
  }

  const insertResult = await insertStageHistoryRecord({
    project_id: projectId,
    old_stage: null,
    new_stage: project.current_stage,
    changed_by: project.updated_by ?? null,
    assignee_id: project.stage_assignee_id ?? null,
    note: 'Recovered missing stage history',
    is_hold_event: false,
    changed_at: project.last_status_update_at ?? project.created_at,
  })

  if (insertResult.error) return []

  const { data: repaired } = await supabase
    .from('stage_history')
    .select(STAGE_HISTORY_SELECT)
    .eq('project_id', projectId)
    .order('changed_at', { ascending: true })

  return (repaired ?? []) as StageHistory[]
}
