import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { StageHistory } from '@/lib/types'

const PROJECT_ID_CHUNK = 40
const ROW_PAGE_SIZE = 1000

export async function fetchStageHistoryForProjects(
  projectIds: string[],
): Promise<Map<string, StageHistory[]>> {
  const map = new Map<string, StageHistory[]>()
  if (!projectIds.length) return map

  const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createAdminClient()
    : await createClient()

  for (let i = 0; i < projectIds.length; i += PROJECT_ID_CHUNK) {
    const idChunk = projectIds.slice(i, i + PROJECT_ID_CHUNK)
    let offset = 0

    while (true) {
      const { data, error } = await supabase
        .from('stage_history')
        .select('id, project_id, old_stage, new_stage, changed_at, is_hold_event')
        .in('project_id', idChunk)
        .order('changed_at', { ascending: true })
        .range(offset, offset + ROW_PAGE_SIZE - 1)

      if (error) throw error
      if (!data?.length) break

      for (const row of data) {
        const list = map.get(row.project_id) ?? []
        list.push(row as StageHistory)
        map.set(row.project_id, list)
      }

      if (data.length < ROW_PAGE_SIZE) break
      offset += ROW_PAGE_SIZE
    }
  }

  return map
}
