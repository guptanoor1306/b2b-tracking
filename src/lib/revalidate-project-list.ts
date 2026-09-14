import { revalidateTag } from 'next/cache'
import { projectsListCacheTag } from '@/lib/cache-tags'

/** Bust cached channel project lists (dashboard/board month views). */
export function revalidateProjectsListCache(channelDbName: string | null | undefined) {
  if (!channelDbName) return
  revalidateTag(projectsListCacheTag(channelDbName), 'max')
}
