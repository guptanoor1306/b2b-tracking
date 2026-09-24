import { cache } from 'react'
import { getActiveChannelSlug } from '@/lib/channel-context'
import { fetchRecentCommentsForChannel } from '@/lib/data/comments'
import { fetchChannelMembers } from '@/lib/data/channel-access'
import { fetchStageHistoryForProjects } from '@/lib/data/stage-history-batch'
import { projectsInMetricsScope } from '@/lib/data/dashboard-metrics'
import type { Project } from '@/lib/types'
import type { RecentCommentFeedItem } from '@/lib/data/comments'
import type { ChannelMember, StageHistory } from '@/lib/types'

export type DashboardSecondaryData = {
  recentComments: RecentCommentFeedItem[]
  members: ChannelMember[]
  historyByProject: Map<string, StageHistory[]>
}

export const loadDashboardSecondaryData = cache(
  async (
    channelName: string,
    showInsights: boolean,
    showTimelineInsights: boolean,
    projects: Project[],
    month: string,
  ): Promise<DashboardSecondaryData> => {
    const channelSlug = await getActiveChannelSlug()
    const metricsProjectIds = showTimelineInsights
      ? projectsInMetricsScope(projects, month).map(p => p.id)
      : []

    const [recentComments, members, historyByProject] = await Promise.all([
      fetchRecentCommentsForChannel(channelName),
      showInsights ? fetchChannelMembers(channelSlug ?? '') : Promise.resolve([]),
      showTimelineInsights ? fetchStageHistoryForProjects(metricsProjectIds) : Promise.resolve(new Map()),
    ])

    return { recentComments, members, historyByProject }
  },
)
