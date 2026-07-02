import { AppShell } from '@/components/layout/AppShell'
import { requireActiveChannel, getActiveChannelRole } from '@/lib/channel-context'
import { getSessionProfile } from '@/lib/auth'
import { fetchUserChannelSlugs } from '@/lib/data/channel-access'

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const channel = await requireActiveChannel()
  const profile = await getSessionProfile()
  const channelRole = profile ? await getActiveChannelRole(profile) : null
  const accessibleSlugs = profile ? await fetchUserChannelSlugs(profile) : []
  return (
    <AppShell
      activeChannel={channel}
      channelRole={channelRole}
      showChannelSwitcher={accessibleSlugs.length > 1}
    >
      {children}
    </AppShell>
  )
}
