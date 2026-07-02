import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getSessionProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { fetchAllProjects } from '@/lib/data/projects'
import { fetchUserChannelSlugs, fetchChannelMemberCounts } from '@/lib/data/channel-access'
import { computeChannelStats } from '@/lib/data/channel-stats'
import { isSuperAdmin } from '@/lib/views'
import { ChannelOverviewClient } from '@/components/studios/ChannelOverviewClient'
import { ChannelCardsHub } from '@/components/studios/ChannelCardsHub'
import { MissingProfileNotice } from '@/components/studios/MissingProfileNotice'

type SearchParams = Promise<Record<string, string | undefined>>

export default async function StudiosPage({ searchParams }: { searchParams: SearchParams }) {
  const profile = await getSessionProfile()
  if (!profile) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')
    return <MissingProfileNotice email={user.email ?? ''} />
  }

  const params = await searchParams
  const period = params.period === 'week' ? 'week' : 'month'

  const [accessibleSlugs, memberCounts, projects] = await Promise.all([
    fetchUserChannelSlugs(profile),
    fetchChannelMemberCounts(),
    fetchAllProjects(),
  ])

  if (accessibleSlugs.length === 1) {
    redirect(`/studios/enter/${accessibleSlugs[0]}`)
  }

  const superAdmin = isSuperAdmin(profile.role)
  const stats = computeChannelStats(projects, memberCounts, period)
  const accessibleStats = stats.filter(s => accessibleSlugs.includes(s.slug))

  return (
    <Suspense fallback={null}>
      {superAdmin ? (
        <ChannelOverviewClient
          stats={stats}
          period={period}
          accessibleSlugs={accessibleSlugs}
          isSuperAdmin
          profileName={profile.name}
        />
      ) : (
        <ChannelCardsHub
          stats={accessibleStats}
          accessibleSlugs={accessibleSlugs}
          profileName={profile.name}
        />
      )}
    </Suspense>
  )
}
