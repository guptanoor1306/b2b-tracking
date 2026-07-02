'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { useActiveChannel, useActiveChannelRole } from '@/context/ChannelContext'
import { useSidebar } from '@/context/SidebarContext'
import { isSuperAdmin } from '@/lib/views'
import {
  Home, LayoutDashboard, LogOut, Grid3X3,
  PanelLeftClose, PanelLeft, Settings, UserCircle,
} from 'lucide-react'

const NAV = [
  { href: '/dashboard', label: 'Home', icon: Home, show: () => true },
  { href: '/board', label: 'Dashboard', icon: LayoutDashboard, show: () => true },
  {
    href: '/settings',
    label: 'Settings',
    icon: Settings,
    show: (channelRole: string | null, globalRole?: string) =>
      isSuperAdmin(globalRole ?? '') || channelRole === 'Channel Admin',
  },
] as const

export function Sidebar({ showChannelSwitcher = false }: { showChannelSwitcher?: boolean }) {
  const pathname = usePathname()
  const { profile, signOut } = useAuth()
  const channel = useActiveChannel()
  const channelRole = useActiveChannelRole()
  const { collapsed, toggle } = useSidebar()

  const visible = NAV.filter(n => n.show(channelRole, profile?.role))

  return (
    <aside
      className={cn(
        'flex flex-col min-h-screen bg-white border-r border-zinc-200 shrink-0 transition-all duration-300',
        collapsed ? 'w-[68px]' : 'w-56'
      )}
    >
      <div className={cn('flex items-center gap-3 px-4 py-5 border-b border-zinc-100', collapsed && 'justify-center px-2')}>
        <div className={cn(
          'flex h-9 w-9 items-center justify-center rounded-lg shrink-0 bg-gradient-to-br text-xs font-bold text-white',
          channel?.gradientFrom ?? 'from-violet-600',
          channel?.gradientTo ?? 'to-purple-600'
        )}>
          <span>{channel?.initial ?? '?'}</span>
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-900 truncate">{channel?.name ?? 'Channel'}</p>
            <p className="text-[11px] text-zinc-500">Production</p>
          </div>
        )}
      </div>

      {!collapsed && showChannelSwitcher && (
        <Link
          href="/studios"
          className="mx-2 mt-3 flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-800"
        >
          <Grid3X3 size={14} />
          All channels
        </Link>
      )}

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
        {profile && (
          <Link
            href="/account"
            title={collapsed ? 'Profile' : undefined}
            className={cn(
              'flex items-center gap-2 rounded-lg bg-zinc-50 border border-zinc-100 mb-1 hover:bg-zinc-100 transition-colors',
              collapsed ? 'justify-center p-2' : 'px-2 py-2',
            )}
          >
            <UserCircle size={collapsed ? 18 : 16} className="shrink-0 text-zinc-500" />
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-xs font-medium text-zinc-700 truncate">{profile.name}</p>
                <p className="text-[10px] text-zinc-400 truncate">{profile.email}</p>
              </div>
            )}
          </Link>
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
