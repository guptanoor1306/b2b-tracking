'use client'

import { usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/ip-overview': 'IP Overview',
  '/board':     'Board',
  '/settings':  'Settings',
}

export function Topbar() {
  const pathname = usePathname()
  const { profile } = useAuth()

  const title = Object.entries(PAGE_TITLES).find(([key]) =>
    pathname === key || pathname.startsWith(key + '/')
  )?.[1] ?? (pathname.startsWith('/projects/') ? 'Project Details' : 'Tracker')

  return (
    <header className="h-12 bg-[#111111]/90 backdrop-blur-md border-b border-white/[0.06] flex items-center justify-between px-5 shrink-0">
      <h1 className="text-sm font-semibold text-zinc-200 tracking-tight">{title}</h1>
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[10px] font-bold text-white">
          {profile?.name?.slice(0, 2).toUpperCase() ?? '?'}
        </div>
        <span className="text-xs text-zinc-500 hidden sm:inline">{profile?.name}</span>
      </div>
    </header>
  )
}
