import { redirect } from 'next/navigation'
import { getSessionProfile } from '@/lib/auth'
import { getActiveChannelRole } from '@/lib/channel-context'
import { fetchProjects } from '@/lib/data/projects'
import { fetchHolidayDates } from '@/lib/data/holidays'
import { fetchStageSlaConfig } from '@/lib/data/stage-sla'
import { setStageSlaCache } from '@/lib/timelines'
import { AdminDashboard } from '@/components/dashboard/AdminDashboard'
import { ExternalDashboard } from '@/components/dashboard/ExternalDashboard'
import { currentMonth, isDateInMonth } from '@/lib/utils'
import { FINAL_STAGE } from '@/lib/constants'
import {
  usesActionItemsDashboardForChannel,
  usesFullAdminDashboardForChannel,
} from '@/lib/views'

type SearchParams = Promise<Record<string, string | undefined>>

export default async function DashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const profile = await getSessionProfile()
  if (!profile) redirect('/login')

  const [projects, holidays, stageSla] = await Promise.all([
    fetchProjects(),
    fetchHolidayDates(),
    fetchStageSlaConfig(),
  ])
  setStageSlaCache(stageSla)

  const channelRole = await getActiveChannelRole(profile)

  if (usesActionItemsDashboardForChannel(channelRole)) {
    return (
      <ExternalDashboard
        projects={projects}
        userId={profile.id}
        userName={profile.name}
        holidays={holidays}
      />
    )
  }

  if (!usesFullAdminDashboardForChannel(channelRole, profile.role)) {
    redirect('/board')
  }

  const params = await searchParams
  const month = params.month ?? currentMonth()

  const inPipeline = projects.filter(p =>
    p.current_stage !== FINAL_STAGE && p.status_health !== 'On hold'
  )
  const delivered = projects.filter(p => p.current_stage === FINAL_STAGE)
  const onHold = projects.filter(p => p.status_health === 'On hold')

  const deliveredOnTime = projects.filter(p =>
    isDateInMonth(p.delivered_date, month) &&
    (!p.target_delivery_date || p.delivered_date! <= p.target_delivery_date)
  )
  const deliveredLate = projects.filter(p =>
    isDateInMonth(p.delivered_date, month) &&
    p.target_delivery_date &&
    p.delivered_date! > p.target_delivery_date
  )
  const inPipelineMonth = projects.filter(p =>
    p.current_stage !== FINAL_STAGE &&
    (isDateInMonth(p.picked_up_date, month) || isDateInMonth(p.received_date, month))
  )

  return (
    <AdminDashboard
      profileName={profile.name}
      month={month}
      counts={[deliveredOnTime.length, deliveredLate.length, inPipelineMonth.length]}
      inPipeline={inPipeline}
      delivered={delivered}
      onHold={onHold}
      holidays={holidays}
    />
  )
}
