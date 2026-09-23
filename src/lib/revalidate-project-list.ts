import { revalidateTag } from 'next/cache'
import { projectsListCacheTag, STUDIOS_HUB_PROJECTS_CACHE_TAG } from '@/lib/cache-tags'

/** Bust cached channel project lists (dashboard/board month views). */
export function revalidateProjectsListCache(channelDbName: string | null | undefined) {
  revalidateTag(STUDIOS_HUB_PROJECTS_CACHE_TAG, 'max')
  if (!channelDbName) return
  revalidateTag(projectsListCacheTag(channelDbName), 'max')
}
