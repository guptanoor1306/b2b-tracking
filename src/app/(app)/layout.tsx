import { AppShell } from '@/components/layout/AppShell'
import { requireActiveChannel, getActiveChannelRole } from '@/lib/channel-context'
import { getSessionProfile } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const channel = await requireActiveChannel()
  const profile = await getSessionProfile()
  const channelRole = profile ? await getActiveChannelRole(profile) : null
  return (
    <AppShell activeChannel={channel} channelRole={channelRole}>
      {children}
    </AppShell>
  )
}
