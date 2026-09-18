import { Suspense } from 'react'
import { fetchProjects } from '@/lib/data/projects'
import { computeOnTimeDeliveryStats } from '@/lib/data/dashboard-metrics'
import { DashboardRecentCommentsAsync } from '@/components/dashboard/DashboardRecentCommentsAsync'
import { fetchHolidayDates } from '@/lib/data/holidays'
import {
  fetchStageSlaConfig,
  fetchOpenHoldStarters,
  fetchHoldPeriodsForProjects,
} from '@/lib/data/stage-sla'
import { setStageSlaCache } from '@/lib/timelines'
import { AdminDashboard } from '@/components/dashboard/AdminDashboard'
import { ExternalDashboard } from '@/components/dashboard/ExternalDashboard'
import { MonthFilterSlot } from '@/components/dashboard/MonthFilterSlot'
import { SuperadminInsights } from '@/components/dashboard/SuperadminInsights'
import { SuperadminInsightsFallback } from '@/components/dashboard/SuperadminInsightsFallback'
import type { ReleaseScheduleItem } from '@/components/dashboard/ReleaseScheduleModal'
import {
  isAllMonths,
  isProjectRelevantInMonth,
  isDeliveredInMonth,
  projectDeliveryDate,
} from '@/lib/utils'
import { isProjectDelivered } from '@/lib/timelines'
import {
  usesActionItemsDashboardForChannel,
  usesExternalAdminDashboard,
  canCreateExternalRequest,
  effectiveRoleForChannel,
  isChannelSuperAdmin,
} from '@/lib/views'
import { usesExternalIntakeFlow } from '@/lib/zerodha-sla'
import type { Profile, ChannelMemberRole } from '@/lib/types'

type Props = {
  month: string
  profile: Profile
  channelName: string
  channelRole: ChannelMemberRole | null
}

export async function DashboardPageContent({
  month,
  profile,
  channelName,
  channelRole,
}: Props) {
  const projectsPromise = fetchProjects({ month }, channelName)
  const [
    projects,
    holidays,
    stageSla,
    holdStarters,
    holdPeriodsByProjectId,
  ] = await Promise.all([
    projectsPromise,
    fetchHolidayDates(),
    fetchStageSlaConfig(channelName),
    projectsPromise.then(ps => fetchOpenHoldStarters(ps.map(p => p.id))),
    projectsPromise.then(ps => fetchHoldPeriodsForProjects(ps.map(p => p.id))),
  ])

  setStageSlaCache(stageSla, channelName)
  const effectiveRole = effectiveRoleForChannel(channelRole, profile.role)
  const showCreateRequest = canCreateExternalRequest(effectiveRole, channelName)
  const showCreateReport = isChannelSuperAdmin(channelRole ?? '')
  const monthFilter = <MonthFilterSlot month={month} />
  const releaseScheduleItems: ReleaseScheduleItem[] = projects
    .filter(p => p.target_delivery_date)
    .map(p => ({
      id: p.id,
      title: p.title,
      target_delivery_date: p.target_delivery_date!,
      video_language: p.video_language,
      request_status: p.request_status,
    }))

  if (usesActionItemsDashboardForChannel(channelRole)) {
    return (
      <ExternalDashboard
        projects={projects}
        userId={profile.id}
        userName={profile.name}
        month={month}
        monthFilter={monthFilter}
        holidays={holidays}
        showAssignedSections={channelRole === 'Channel Team'}
        showCreateRequest={showCreateRequest}
        holdStarters={holdStarters}
        releaseScheduleItems={releaseScheduleItems}
        recentCommentsSlot={(
          <Suspense fallback={null}>
            <DashboardRecentCommentsAsync channelName={channelName} />
          </Suspense>
        )}
      />
    )
  }

  const inPipeline = projects.filter(p =>
    !isProjectDelivered(p) && p.status_health !== 'On hold'
  )
  const delivered = projects.filter(p => isProjectDelivered(p))
  const onHold = projects.filter(p => p.status_health === 'On hold')

  const filterByMonth = !isAllMonths(month)
  const inPipelineView = filterByMonth
    ? inPipeline.filter(p => isProjectRelevantInMonth(p, month))
    : inPipeline
  const deliveredView = filterByMonth
    ? delivered.filter(p => isDeliveredInMonth(p, month))
    : delivered
  const onHoldView = filterByMonth
    ? onHold.filter(p => isProjectRelevantInMonth(p, month))
    : onHold

  const deliveredOnTime = projects.filter(p => {
    if (!isProjectDelivered(p)) return false
    if (filterByMonth && !isDeliveredInMonth(p, month)) return false
    const deliveredOn = projectDeliveryDate(p)
    if (!deliveredOn) return false
    return !p.target_delivery_date || deliveredOn <= p.target_delivery_date
  })
  const deliveredLate = projects.filter(p => {
    if (!isProjectDelivered(p)) return false
    if (filterByMonth && !isDeliveredInMonth(p, month)) return false
    const deliveredOn = projectDeliveryDate(p)
    if (!deliveredOn || !p.target_delivery_date) return false
    return deliveredOn > p.target_delivery_date
  })
  const inPipelineMonth = filterByMonth ? inPipelineView.length : inPipeline.length

  const showSuperadminInsights = showCreateReport && usesExternalIntakeFlow(channelName) && !usesExternalAdminDashboard(effectiveRole)
  const onTimeDelivery = usesExternalAdminDashboard(effectiveRole)
    ? null
    : computeOnTimeDeliveryStats(deliveredOnTime.length, deliveredLate.length)

  const insights = showSuperadminInsights ? (
    <Suspense fallback={<SuperadminInsightsFallback />}>
      <SuperadminInsights
        projects={projects}
        month={month}
        holidays={holidays}
        holdPeriodsByProjectId={holdPeriodsByProjectId}
      />
    </Suspense>
  ) : null

  return (
    <AdminDashboard
      profileName={profile.name}
      month={month}
      monthFilter={monthFilter}
      counts={[deliveredOnTime.length, deliveredLate.length, inPipelineMonth]}
      onTimeDelivery={onTimeDelivery}
      inPipeline={inPipelineView}
      delivered={deliveredView}
      onHold={onHoldView}
      allInPipeline={inPipeline}
      holidays={holidays}
      holdStarters={holdStarters}
      holdPeriodsByProjectId={holdPeriodsByProjectId}
      externalView={usesExternalAdminDashboard(effectiveRole)}
      channelDbName={channelName}
      workspaceLabel={usesExternalAdminDashboard(effectiveRole) ? 'Client production overview' : undefined}
      showCreateRequest={showCreateRequest}
      showCreateReport={showCreateReport}
      insights={insights}
      releaseScheduleItems={releaseScheduleItems}
      recentCommentsSlot={(
        <Suspense fallback={null}>
          <DashboardRecentCommentsAsync channelName={channelName} />
        </Suspense>
      )}
    />
  )
}
