'use client'

import { ReactNode } from 'react'
import { useAuth } from '@/context/AuthContext'
import { StudiosSidebar } from '@/components/studios/StudiosSidebar'

type Props = {
  children: ReactNode
  isSuperAdmin: boolean
}

export function StudiosShell({ children, isSuperAdmin }: Props) {
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
    <div className="flex h-screen min-w-0 overflow-hidden bg-zinc-100">
      <StudiosSidebar isSuperAdmin={isSuperAdmin} />
      <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-gradient-to-br from-zinc-50 via-white to-violet-50/30">
        {children}
      </main>
    </div>
  )
}
