import { computeTeamPerformance } from '@/lib/data/team-stats'
import { computeTimelineMetrics } from '@/lib/data/dashboard-metrics'
import { TeamPerformanceVitals } from '@/components/dashboard/TeamPerformanceVitals'
import { TimelineMetricsWidget } from '@/components/dashboard/TimelineMetricsWidget'
import { isLaSocialChannelDbName } from '@/lib/la-social-sla'
import type { ChannelMember, HoldPeriod, Project, StageHistory } from '@/lib/types'

type Props = {
  channelName: string
  projects: Project[]
  members: ChannelMember[]
  historyByProject: Map<string, StageHistory[]>
  month: string
  holidays: string[]
  holdPeriodsByProjectId: Record<string, HoldPeriod[]>
  showTimelineInsights?: boolean
}

export function SuperadminInsightsView({
  channelName,
  projects,
  members,
  historyByProject,
  month,
  holidays,
  holdPeriodsByProjectId,
  showTimelineInsights = true,
}: Props) {
  const laSocial = isLaSocialChannelDbName(channelName)
  const teamPerformance = computeTeamPerformance(projects, members, month, {
    includeChannelSuperAdmin: laSocial,
  })
  const timelineMetrics = showTimelineInsights
    ? computeTimelineMetrics(
      projects,
      historyByProject,
      holidays,
      holdPeriodsByProjectId,
      month,
      channelName,
    )
    : { metrics: [] }

  const showTeam = teamPerformance.members.length > 0
  const showTimeline = showTimelineInsights && timelineMetrics.metrics.length > 0
  if (!showTeam && !showTimeline) return null

  return (
    <div className="col-span-full space-y-4">
      {showTeam && <TeamPerformanceVitals stats={teamPerformance} month={month} />}
      {showTimeline && <TimelineMetricsWidget metrics={timelineMetrics} month={month} />}
    </div>
  )
}
