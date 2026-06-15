'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { useSidebar } from '@/context/SidebarContext'
import {
  LayoutDashboard, Columns2, LogOut,
  PanelLeftClose, PanelLeft, BarChart3, Settings,
} from 'lucide-react'
import { Role } from '@/lib/types'

const NAV: {
  href: string
  label: string
  icon: typeof LayoutDashboard
  roles: Role[]
}[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['Admin', 'Internal Team', 'Agency', 'Zerodha Viewer'] },
  { href: '/ip-overview', label: 'IP Overview', icon: BarChart3, roles: ['Super Admin'] },
  { href: '/board', label: 'Board', icon: Columns2, roles: ['Admin', 'Internal Team', 'Super Admin', 'Agency', 'Zerodha Viewer'] },
  { href: '/settings', label: 'Settings', icon: Settings, roles: ['Admin', 'Super Admin'] },
]

export function Sidebar() {
  const pathname = usePathname()
  const { profile, signOut } = useAuth()
  const { collapsed, toggle } = useSidebar()

  const visible = NAV.filter(n => !profile?.role || n.roles.includes(profile.role as Role))

  return (
    <aside
      className={cn(
        'flex flex-col min-h-screen bg-white border-r border-zinc-200 shrink-0 transition-all duration-300',
        collapsed ? 'w-[68px]' : 'w-56'
      )}
    >
      <div className={cn('flex items-center gap-3 px-4 py-5 border-b border-zinc-100', collapsed && 'justify-center px-2')}>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-600 shrink-0">
          <span className="text-sm font-bold text-white">V</span>
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-900 truncate">Varsity</p>
            <p className="text-[11px] text-zinc-500">Production</p>
          </div>
        )}
      </div>

      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {visible.map(item => {
          const Icon = item.icon
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                collapsed && 'justify-center px-2',
                active
                  ? 'bg-zinc-100 text-zinc-900 font-medium'
                  : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50'
              )}
            >
              <Icon size={18} className={cn(active ? 'text-violet-600' : 'text-zinc-400')} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      <div className={cn('border-t border-zinc-100 px-3 py-3 space-y-1', collapsed && 'px-2')}>
        {!collapsed && profile && (
          <div className="px-2 py-2 rounded-lg bg-zinc-50 border border-zinc-100 mb-1">
            <p className="text-xs font-medium text-zinc-700 truncate">{profile.name}</p>
            <p className="text-[10px] text-zinc-400 truncate">{profile.role}</p>
          </div>
        )}
        <button
          onClick={toggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50 transition-colors',
            collapsed && 'justify-center px-2'
          )}
        >
          {collapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
          {!collapsed && <span>Collapse</span>}
        </button>
        <button
          onClick={signOut}
          title="Sign out"
          className={cn(
            'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs text-zinc-500 hover:text-red-600 hover:bg-red-50 transition-colors',
            collapsed && 'justify-center px-2'
          )}
        >
          <LogOut size={14} />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  )
}
