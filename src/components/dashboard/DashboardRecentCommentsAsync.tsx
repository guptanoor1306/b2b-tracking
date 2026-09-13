import { fetchRecentCommentsForChannel } from '@/lib/data/comments'
import { RecentCommentsSection } from '@/components/dashboard/RecentCommentsSection'

export async function DashboardRecentCommentsAsync({ channelName }: { channelName: string }) {
  const recentComments = await fetchRecentCommentsForChannel(channelName)
  return <RecentCommentsSection items={recentComments} />
}
