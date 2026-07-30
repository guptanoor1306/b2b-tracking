'use client'

import { ReactNode } from 'react'
import { useAuth } from '@/context/AuthContext'
import { ServerProfileSync } from '@/context/AuthContext'
import { ChannelProvider } from '@/context/ChannelContext'
import { SidebarProvider, useSidebar } from '@/context/SidebarContext'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { StudioChannel } from '@/lib/channels'
import { ChannelMemberRole, Profile } from '@/lib/types'
import { cn } from '@/lib/utils'

function MainColumn({ children }: { children: ReactNode }) {
  const { collapsed } = useSidebar()

  return (
    <div
      className={cn(
        'flex min-h-screen min-w-0 flex-1 flex-col overflow-hidden transition-[margin-left] duration-200',
        collapsed ? 'ml-[68px]' : 'ml-56',
      )}
    >
      <Topbar />
      <main className="relative z-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-zinc-100 p-4 sm:p-6">
        {children}
      </main>
    </div>
  )
}

export function AppShell({
  children, serverProfile, activeChannel, channelRole, showChannelSwitcher = false,
}: {
  children: React.ReactNode
  serverProfile: Profile
  activeChannel: StudioChannel
  channelRole: ChannelMemberRole | null
  showChannelSwitcher?: boolean
}) {
  const { loading } = useAuth()

  if (loading && !serverProfile) {
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
      <ServerProfileSync profile={serverProfile} />
      <SidebarProvider>
        <div className="min-h-screen min-w-0 bg-zinc-100">
          <Sidebar showChannelSwitcher={showChannelSwitcher} />
          <MainColumn>{children}</MainColumn>
        </div>
      </SidebarProvider>
    </ChannelProvider>
  )
}
