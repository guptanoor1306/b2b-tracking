import { loadDashboardSecondaryData } from '@/lib/data/dashboard-secondary'
import { RecentCommentsSection } from '@/components/dashboard/RecentCommentsSection'
import { SuperadminInsightsView } from '@/components/dashboard/SuperadminInsightsView'
import type { HoldPeriod, Project } from '@/lib/types'

type Props = {
  channelName: string
  showInsights: boolean
  showTimelineInsights: boolean
  projects: Project[]
  month: string
  holidays: string[]
  holdPeriodsByProjectId: Record<string, HoldPeriod[]>
}

export async function DashboardSecondaryAsync({
  channelName,
  showInsights,
  showTimelineInsights,
  projects,
  month,
  holidays,
  holdPeriodsByProjectId,
}: Props) {
  const { recentComments, members, historyByProject } = await loadDashboardSecondaryData(
    channelName,
    showInsights,
    showTimelineInsights,
    projects,
    month,
  )

  return (
    <div className="contents">
      <RecentCommentsSection items={recentComments} />
      {showInsights ? (
        <SuperadminInsightsView
          channelName={channelName}
          projects={projects}
          members={members}
          historyByProject={historyByProject}
          month={month}
          holidays={holidays}
          holdPeriodsByProjectId={holdPeriodsByProjectId}
          showTimelineInsights={showTimelineInsights}
        />
      ) : null}
    </div>
  )
}
