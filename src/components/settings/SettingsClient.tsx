'use client'

import { useState } from 'react'
import { Profile } from '@/lib/types'
import { OrgHoliday } from '@/lib/data/holidays'
import { UsersClient } from '@/components/users/UsersClient'
import { HolidaysSettings } from '@/components/settings/HolidaysSettings'
import { cn } from '@/lib/utils'
import { Users, CalendarDays } from 'lucide-react'

type Tab = 'users' | 'holidays'

type Props = {
  users: Profile[]
  holidays: OrgHoliday[]
}

const TABS: { id: Tab; label: string; icon: typeof Users }[] = [
  { id: 'users', label: 'Users', icon: Users },
  { id: 'holidays', label: 'Holidays', icon: CalendarDays },
]

export function SettingsClient({ users, holidays }: Props) {
  const [tab, setTab] = useState<Tab>('users')

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-zinc-100">Settings</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Manage users and timeline calendar</p>
      </div>

      <div className="flex gap-6 items-start">
        <nav className="flex flex-col gap-1 w-36 shrink-0">
          {TABS.map(t => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors',
                  active
                    ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/25'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03] border border-transparent'
                )}
              >
                <Icon size={15} className={active ? 'text-indigo-400' : undefined} />
                {t.label}
              </button>
            )
          })}
        </nav>

        <div className="flex-1 min-w-0">
          {tab === 'users' && <UsersClient users={users} />}
          {tab === 'holidays' && <HolidaysSettings holidays={holidays} />}
        </div>
      </div>
    </div>
  )
}
