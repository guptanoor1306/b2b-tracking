import { loadDashboardSecondaryData } from '@/lib/data/dashboard-secondary'
import { RecentCommentsSection } from '@/components/dashboard/RecentCommentsSection'

export async function DashboardRecentCommentsAsync({ channelName }: { channelName: string }) {
  const { recentComments } = await loadDashboardSecondaryData(channelName, false, false, [], '')
  return <RecentCommentsSection items={recentComments} />
}
