'use client'

import { usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { AssigneeAvatar } from '@/components/ui/AssigneeAvatar'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Home',
  '/ip-overview': 'IP Overview',
  '/board': 'Dashboard',
  '/settings': 'Settings',
  '/account': 'Profile',
}

export function Topbar() {
  const pathname = usePathname()
  const { profile } = useAuth()

  const title = Object.entries(PAGE_TITLES).find(([key]) =>
    pathname === key || pathname.startsWith(key + '/')
  )?.[1] ?? (pathname.startsWith('/projects/') ? 'Project' : 'Tracker')

  return (
    <header className="h-12 bg-white border-b border-zinc-200 flex items-center justify-between px-5 shrink-0">
      <h1 className="text-sm font-semibold text-zinc-800 tracking-tight">{title}</h1>
      {profile && (
        <div className="flex items-center gap-2">
          <AssigneeAvatar name={profile.name} id={profile.id} size="sm" theme="light" />
          <span className="text-xs text-zinc-600 hidden sm:inline font-medium">{profile.name}</span>
        </div>
      )}
    </header>
  )
}
