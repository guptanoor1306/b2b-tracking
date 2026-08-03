import { redirect } from 'next/navigation'
import { getSessionProfile } from '@/lib/auth'
import { getActiveChannelRole, getActiveChannelDbName } from '@/lib/channel-context'
import { fetchProjects } from '@/lib/data/projects'
import { fetchHolidayDates } from '@/lib/data/holidays'
import { fetchStageSlaConfig, fetchOpenHoldStarters } from '@/lib/data/stage-sla'
import { setStageSlaCache } from '@/lib/timelines'
import { AdminDashboard } from '@/components/dashboard/AdminDashboard'
import { ExternalDashboard } from '@/components/dashboard/ExternalDashboard'
import { MonthFilterSlot } from '@/components/dashboard/MonthFilterSlot'
import {
  ALL_MONTHS,
  isAllMonths,
  isProjectRelevantInMonth,
  isDeliveredInMonth,
} from '@/lib/utils'
import { FINAL_STAGE } from '@/lib/constants'
import {
  usesActionItemsDashboardForChannel,
  usesFullAdminDashboardForChannel,
  usesExternalAdminDashboard,
  canCreateExternalRequest,
  effectiveRoleForChannel,
} from '@/lib/views'

type SearchParams = Promise<Record<string, string | undefined>>

export default async function DashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const profile = await getSessionProfile()
  if (!profile) redirect('/login')

  const channelName = await getActiveChannelDbName()
  const [projects, holidays, stageSla, holdStarters] = await Promise.all([
    fetchProjects(),
    fetchHolidayDates(),
    fetchStageSlaConfig(channelName),
    fetchOpenHoldStarters(),
  ])
  setStageSlaCache(stageSla, channelName)

  const channelRole = await getActiveChannelRole(profile)
  const effectiveRole = effectiveRoleForChannel(channelRole, profile.role)
  const showCreateRequest = canCreateExternalRequest(effectiveRole, channelName)
  const params = await searchParams
  const month = params.month ?? ALL_MONTHS
  const monthFilter = <MonthFilterSlot month={month} />

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
      />
    )
  }

  if (!usesFullAdminDashboardForChannel(channelRole, profile.role)) {
    redirect('/board')
  }

  const inPipeline = projects.filter(p =>
    p.current_stage !== FINAL_STAGE && p.status_health !== 'On hold'
  )
  const delivered = projects.filter(p => p.current_stage === FINAL_STAGE)
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

  const deliveredOnTime = projects.filter(p =>
    (filterByMonth ? isDeliveredInMonth(p, month) : true)
    && p.current_stage === FINAL_STAGE
    && (!p.target_delivery_date || p.delivered_date! <= p.target_delivery_date)
  )
  const deliveredLate = projects.filter(p =>
    (filterByMonth ? isDeliveredInMonth(p, month) : true)
    && p.current_stage === FINAL_STAGE
    && p.target_delivery_date
    && p.delivered_date! > p.target_delivery_date
  )
  const inPipelineMonth = filterByMonth ? inPipelineView.length : inPipeline.length

  return (
    <AdminDashboard
      profileName={profile.name}
      month={month}
      monthFilter={monthFilter}
      counts={[deliveredOnTime.length, deliveredLate.length, inPipelineMonth]}
      inPipeline={inPipelineView}
      delivered={deliveredView}
      onHold={onHoldView}
      allInPipeline={inPipeline}
      holidays={holidays}
      holdStarters={holdStarters}
      externalView={usesExternalAdminDashboard(effectiveRole)}
      channelDbName={channelName}
      workspaceLabel={usesExternalAdminDashboard(effectiveRole) ? 'Client production overview' : undefined}
    />
  )
}
