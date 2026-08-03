import { createClient } from '@/lib/supabase/server'
import { getSessionProfile } from '@/lib/auth'

export type RecentCommentFeedItem = {
  id: string
  comment: string
  created_at: string
  project_id: string
  project_title: string
  author_name: string
  author_id: string | null
  is_reply: boolean
}

export async function fetchRecentComments(
  projectIds: string[],
  opts: { hours?: number; limit?: number } = {},
): Promise<RecentCommentFeedItem[]> {
  if (!projectIds.length) return []

  const hours = opts.hours ?? 24
  const limit = opts.limit ?? 25
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('comments')
    .select(`
      id, comment, created_at, parent_id, kind,
      author:profiles!comments_created_by_fkey(id, name),
      project:projects!inner(id, title)
    `)
    .in('project_id', projectIds)
    .gte('created_at', since)
    .neq('kind', 'decline')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !data?.length) return []

  const profile = await getSessionProfile()
  let dismissedIds = new Set<string>()
  if (profile) {
    const { data: dismissals, error: dismissError } = await supabase
      .from('comment_feed_dismissals')
      .select('comment_id')
      .eq('profile_id', profile.id)
    if (!dismissError && dismissals) {
      dismissedIds = new Set(dismissals.map(d => d.comment_id))
    }
  }

  return data.map(row => {
    const rawAuthor = row.author as { id: string; name: string } | { id: string; name: string }[] | null
    const author = Array.isArray(rawAuthor) ? rawAuthor[0] : rawAuthor
    const rawProject = row.project as { id: string; title: string } | { id: string; title: string }[] | null
    const project = Array.isArray(rawProject) ? rawProject[0] : rawProject
    return {
      id: row.id,
      comment: row.comment,
      created_at: row.created_at,
      project_id: project?.id ?? '',
      project_title: project?.title ?? 'Unknown project',
      author_name: author?.name ?? 'Unknown',
      author_id: author?.id ?? null,
      is_reply: Boolean(row.parent_id),
    }
  }).filter(item => item.project_id && !dismissedIds.has(item.id))
}
