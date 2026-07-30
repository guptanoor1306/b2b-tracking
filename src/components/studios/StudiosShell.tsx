'use client'

import { ReactNode, useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { ServerProfileSync } from '@/context/AuthContext'
import { StudiosSidebar } from '@/components/studios/StudiosSidebar'
import { Profile } from '@/lib/types'
import { cn } from '@/lib/utils'

type Props = {
  children: ReactNode
  isSuperAdmin: boolean
  serverProfile?: Profile | null
}

export function StudiosShell({ children, isSuperAdmin, serverProfile }: Props) {
  const { loading } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('studios-sidebar-collapsed')
    if (saved === 'true') setCollapsed(true)
  }, [])

  const toggle = () => {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem('studios-sidebar-collapsed', String(next))
      return next
    })
  }

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
    <div className="min-h-screen min-w-0 bg-zinc-100">
      <ServerProfileSync profile={serverProfile ?? null} />
      <StudiosSidebar isSuperAdmin={isSuperAdmin} collapsed={collapsed} onToggle={toggle} />
      <main
        className={cn(
          'min-h-screen min-w-0 overflow-y-auto overflow-x-hidden bg-gradient-to-br from-zinc-50 via-white to-violet-50/30 transition-[margin-left] duration-200',
          collapsed ? 'ml-[68px]' : 'ml-56',
        )}
      >
        {children}
      </main>
    </div>
  )
}
