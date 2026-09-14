import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getSessionProfile } from '@/lib/auth'
import { getActiveChannelRole, getActiveChannelDbName } from '@/lib/channel-context'
import { DashboardPageContent } from '@/components/dashboard/DashboardPageContent'
import { DashboardLoadingSkeleton } from '@/components/dashboard/DashboardLoadingSkeleton'
import { resolveMonthFilter } from '@/lib/utils'
import {
  usesActionItemsDashboardForChannel,
  usesFullAdminDashboardForChannel,
} from '@/lib/views'

type SearchParams = Promise<Record<string, string | undefined>>

export const maxDuration = 60

export default async function DashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const profile = await getSessionProfile()
  if (!profile) redirect('/login')

  const params = await searchParams
  const month = resolveMonthFilter(params.month)
  const [channelName, channelRole] = await Promise.all([
    getActiveChannelDbName(),
    getActiveChannelRole(profile),
  ])

  if (
    !usesActionItemsDashboardForChannel(channelRole)
    && !usesFullAdminDashboardForChannel(channelRole, profile.role)
  ) {
    redirect('/board')
  }

  return (
    <Suspense fallback={<DashboardLoadingSkeleton />}>
      <DashboardPageContent
        month={month}
        profile={profile}
        channelName={channelName}
        channelRole={channelRole}
      />
    </Suspense>
  )
}
