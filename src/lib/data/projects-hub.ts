import { unstable_cache } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { canUseDataCache, createCachedReadClient } from '@/lib/supabase/cache-read'
import { STUDIOS_HUB_PROJECTS_CACHE_TAG } from '@/lib/cache-tags'
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

async function fetchProjectsHubSnapshotLive(): Promise<ProjectHubRow[]> {
  const supabase = canUseDataCache() ? createCachedReadClient() : await createClient()
  const { data, error } = await supabase
    .from('projects')
    .select('channel, current_stage, status_health, received_date, picked_up_date, delivered_date, created_at, last_status_update_at')

  if (error) throw error
  return (data ?? []) as ProjectHubRow[]
}

export async function fetchProjectsHubSnapshot(): Promise<ProjectHubRow[]> {
  if (!canUseDataCache()) return fetchProjectsHubSnapshotLive()

  return unstable_cache(
    fetchProjectsHubSnapshotLive,
    ['studios-hub-projects-v1'],
    { revalidate: 120, tags: [STUDIOS_HUB_PROJECTS_CACHE_TAG] },
  )()
}
