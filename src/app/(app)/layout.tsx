import { AppShell } from '@/components/layout/AppShell'
import { loadAppShell } from '@/lib/data/app-shell'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const shell = await loadAppShell()

  return (
    <AppShell
      serverProfile={shell.profile}
      activeChannel={shell.channel}
      channelRole={shell.channelRole}
      showChannelSwitcher={shell.showChannelSwitcher}
    >
      {children}
    </AppShell>
  )
}
