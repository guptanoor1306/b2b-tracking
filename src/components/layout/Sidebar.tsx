'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { useSidebar } from '@/context/SidebarContext'
import {
  LayoutDashboard, Columns2, LogOut, Zap,
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
        'flex flex-col min-h-screen bg-[#111111] border-r border-white/[0.06] shrink-0 transition-all duration-300',
        collapsed ? 'w-[68px]' : 'w-56'
      )}
    >
      <div className={cn('flex items-center gap-3 px-4 py-5 border-b border-white/[0.06]', collapsed && 'justify-center px-2')}>
        <div className="p-2 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl shadow-lg shadow-indigo-500/20 shrink-0">
          <Zap size={16} className="text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-100 truncate">Varsity</p>
            <p className="text-[10px] text-zinc-500">Production Tracker</p>
          </div>
        )}
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1">
        {visible.map(item => {
          const Icon = item.icon
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all',
                collapsed && 'justify-center px-2',
                active
                  ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 shadow-sm shadow-indigo-500/10'
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5 border border-transparent'
              )}
            >
              <Icon size={18} className={cn(active && 'text-indigo-400')} />
              {!collapsed && <span className="font-medium">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      <div className={cn('border-t border-white/[0.06] px-3 py-3 space-y-2', collapsed && 'px-2')}>
        {!collapsed && profile && (
          <div className="px-2 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <p className="text-xs font-medium text-zinc-300 truncate">{profile.name}</p>
          </div>
        )}
        <button
          onClick={toggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors',
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
            'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs text-zinc-500 hover:text-rose-400 hover:bg-rose-500/5 transition-colors',
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
