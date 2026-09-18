import { createClient } from '@/lib/supabase/server'
import type { StageWorkSession } from '@/lib/types'

export async function fetchProjectStageWorkSessions(projectId: string): Promise<StageWorkSession[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('project_stage_work_sessions')
    .select('*')
    .eq('project_id', projectId)
    .order('started_at')

  if (error) return []
  return (data ?? []) as StageWorkSession[]
}

export async function fetchOpenStageWorkForProjects(
  projectIds: string[],
): Promise<Record<string, StageWorkSession>> {
  if (!projectIds.length) return {}

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('project_stage_work_sessions')
    .select('*')
    .in('project_id', projectIds)
    .is('ended_at', null)

  if (error || !data?.length) return {}

  const map: Record<string, StageWorkSession> = {}
  for (const row of data as StageWorkSession[]) {
    map[row.project_id] = row
  }
  return map
}
