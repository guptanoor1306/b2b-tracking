import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getSessionProfile } from '@/lib/auth'
import { fetchProjects } from '@/lib/data/projects'
import { computeIpStats } from '@/lib/data/ip-stats'
import { IpOverviewClient } from '@/components/ip-overview/IpOverviewClient'
import { usesIpOverviewDashboard } from '@/lib/views'

type SearchParams = Promise<Record<string, string | undefined>>

export default async function IpOverviewPage({ searchParams }: { searchParams: SearchParams }) {
  const profile = await getSessionProfile()
  if (!profile) redirect('/login')
  if (!usesIpOverviewDashboard(profile.role)) redirect('/dashboard')

  const params = await searchParams
  const period = params.period === 'week' ? 'week' : 'month'
  const projects = await fetchProjects()
  const stats = computeIpStats(projects, period)

  return (
    <Suspense fallback={null}>
      <IpOverviewClient stats={stats} period={period} />
    </Suspense>
  )
}
