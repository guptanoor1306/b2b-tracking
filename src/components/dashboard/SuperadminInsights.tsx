import { getActiveChannelSlug } from '@/lib/channel-context'
import { fetchChannelMembers } from '@/lib/data/channel-access'
import { computeTeamPerformance } from '@/lib/data/team-stats'
import { computeTimelineMetrics, projectsInMetricsScope } from '@/lib/data/dashboard-metrics'
import { fetchStageHistoryForProjects } from '@/lib/data/stage-history-batch'
import { TeamPerformanceVitals } from '@/components/dashboard/TeamPerformanceVitals'
import { TimelineMetricsWidget } from '@/components/dashboard/TimelineMetricsWidget'
import type { HoldPeriod, Project } from '@/lib/types'

type Props = {
  projects: Project[]
  month: string
  holidays: string[]
  holdPeriodsByProjectId: Record<string, HoldPeriod[]>
}

export async function SuperadminInsights({
  projects,
  month,
  holidays,
  holdPeriodsByProjectId,
}: Props) {
  const channelSlug = await getActiveChannelSlug()
  const metricsProjectIds = projectsInMetricsScope(projects, month).map(p => p.id)

  const [members, historyByProject] = await Promise.all([
    fetchChannelMembers(channelSlug ?? ''),
    fetchStageHistoryForProjects(metricsProjectIds),
  ])

  const teamPerformance = computeTeamPerformance(projects, members, month)
  const timelineMetrics = computeTimelineMetrics(
    projects,
    historyByProject,
    holidays,
    holdPeriodsByProjectId,
    month,
  )

  const showTeam = teamPerformance.members.length > 0
  const showTimeline = timelineMetrics.metrics.length > 0
  if (!showTeam && !showTimeline) return null

  return (
    <div className="space-y-4">
      {showTeam && <TeamPerformanceVitals stats={teamPerformance} month={month} />}
      {showTimeline && <TimelineMetricsWidget metrics={timelineMetrics} month={month} />}
    </div>
  )
}
