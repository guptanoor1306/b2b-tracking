'use client'

import { useAuth } from '@/context/AuthContext'
import { SidebarProvider } from '@/context/SidebarContext'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

export function AppShell({ children }: { children: React.ReactNode }) {
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
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden bg-zinc-100">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto p-6 bg-zinc-100">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  )
}
