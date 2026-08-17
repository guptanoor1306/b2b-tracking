'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import {
  LayoutDashboard, Settings, UserCircle, LogOut,
  PanelLeftClose, PanelLeft, Loader2, Receipt,
} from 'lucide-react'

type NavItem = {
  href: string
  label: string
  icon: typeof LayoutDashboard
  exact?: boolean
  superAdminOnly?: boolean
}

const NAV: NavItem[] = [
  { href: '/studios', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/studios/finance', label: 'Finance', icon: Receipt, superAdminOnly: true },
  { href: '/studios/settings', label: 'Channel settings', icon: Settings, superAdminOnly: true },
  { href: '/studios/account', label: 'Account', icon: UserCircle },
]

type Props = {
  isSuperAdmin: boolean
  collapsed: boolean
  onToggle: () => void
}

export function StudiosSidebar({ isSuperAdmin, collapsed, onToggle }: Props) {
  const pathname = usePathname()
  const [pendingHref, setPendingHref] = useState<string | null>(null)
  const { profile, signOut, loading } = useAuth()

  useEffect(() => {
    setPendingHref(null)
  }, [pathname])

  const visible = NAV.filter(item => !item.superAdminOnly || isSuperAdmin)

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-zinc-200 shrink-0 pointer-events-auto transition-all duration-300',
        collapsed ? 'w-[68px]' : 'w-56',
      )}
    >
      <div className={cn('flex items-center gap-3 px-4 py-5 border-b border-zinc-100', collapsed && 'justify-center px-2')}>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0 bg-gradient-to-br from-violet-600 to-indigo-600 text-xs font-bold text-white">
          LS
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-900 truncate">LearnApp Studios</p>
            <p className="text-[11px] text-zinc-500">Studios hub</p>
          </div>
        )}
      </div>

      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {visible.map(item => {
          const Icon = item.icon
          const exact = 'exact' in item && item.exact
          const active = exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`)
          const pending = pendingHref === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              onClick={() => setPendingHref(item.href)}
              title={collapsed ? item.label : undefined}
              className={cn(
                'relative z-10 flex min-h-11 items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors active:bg-zinc-100',
                collapsed && 'justify-center px-2',
                active
                  ? 'bg-zinc-100 text-zinc-900 font-medium'
                  : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50',
                pending && 'opacity-70',
              )}
            >
              {pending ? (
                <Loader2 size={18} className="shrink-0 animate-spin text-violet-600" />
              ) : (
                <Icon size={18} className={cn(active ? 'text-violet-600' : 'text-zinc-400')} />
              )}
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      <div className={cn('border-t border-zinc-100 px-3 py-3 space-y-1', collapsed && 'px-2')}>
        {!collapsed && profile && !loading && (
          <Link
            href="/studios/account"
            prefetch
            onClick={() => setPendingHref('/studios/account')}
            className="block px-2 py-2 rounded-lg bg-zinc-50 border border-zinc-100 mb-1 hover:bg-zinc-100 transition-colors"
          >
            <p className="text-xs font-medium text-zinc-700 truncate">{profile.name}</p>
            <p className="text-[10px] text-zinc-400 truncate">{profile.email}</p>
          </Link>
        )}
        <button
          type="button"
          onClick={onToggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50 transition-colors',
            collapsed && 'justify-center px-2',
          )}
        >
          {collapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
          {!collapsed && <span>Collapse</span>}
        </button>
        <button
          type="button"
          onClick={signOut}
          title="Sign out"
          className={cn(
            'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs text-zinc-500 hover:text-red-600 hover:bg-red-50 transition-colors',
            collapsed && 'justify-center px-2',
          )}
        >
          <LogOut size={14} />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  )
}
