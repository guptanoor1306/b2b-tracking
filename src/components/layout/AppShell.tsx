'use client'

import { useAuth } from '@/context/AuthContext'
import { ChannelProvider } from '@/context/ChannelContext'
import { SidebarProvider } from '@/context/SidebarContext'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { StudioChannel } from '@/lib/channels'
import { ChannelMemberRole } from '@/lib/types'

export function AppShell({
  children, activeChannel, channelRole, showChannelSwitcher = false,
}: {
  children: React.ReactNode
  activeChannel: StudioChannel
  channelRole: ChannelMemberRole | null
  showChannelSwitcher?: boolean
}) {
  const { loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
          <p className="text-sm text-zinc-500">Loading…</p>
        </div>
      </div>
    )
  }

  return (
    <ChannelProvider channel={activeChannel} channelRole={channelRole}>
      <SidebarProvider>
        <div className="flex h-screen min-w-0 overflow-hidden bg-zinc-100">
          <Sidebar showChannelSwitcher={showChannelSwitcher} />
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <Topbar />
            <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 bg-zinc-100">{children}</main>
          </div>
        </div>
      </SidebarProvider>
    </ChannelProvider>
  )
}
