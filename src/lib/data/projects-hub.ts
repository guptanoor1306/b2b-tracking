import { createClient } from '@/lib/supabase/server'
import { Project } from '@/lib/types'

/** Lightweight cross-channel snapshot for Studios hub stats (no profile joins). */
export type ProjectHubRow = Pick<
  Project,
  | 'channel'
  | 'current_stage'
  | 'status_health'
  | 'received_date'
  | 'picked_up_date'
  | 'delivered_date'
  | 'created_at'
  | 'last_status_update_at'
>

export async function fetchProjectsHubSnapshot(): Promise<ProjectHubRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('projects')
    .select('channel, current_stage, status_health, received_date, picked_up_date, delivered_date, created_at, last_status_update_at')

  if (error) throw error
  return (data ?? []) as ProjectHubRow[]
}
