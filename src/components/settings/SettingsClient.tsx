'use client'

import { useState } from 'react'
import { Profile } from '@/lib/types'
import { OrgHoliday } from '@/lib/data/holidays'
import { UsersClient } from '@/components/users/UsersClient'
import { HolidaysSettings } from '@/components/settings/HolidaysSettings'
import { StageSlaSettings } from '@/components/settings/StageSlaSettings'
import { cn } from '@/lib/utils'
import { Users, CalendarDays, Timer } from 'lucide-react'
import { StageSlaRow } from '@/lib/stage-sla'
import { SettingsActivityLog } from '@/lib/types'

type Tab = 'users' | 'holidays' | 'timelines'

type Props = {
  users: Profile[]
  holidays: OrgHoliday[]
  currentUserId: string
  stageSla: StageSlaRow[]
  slaActivity: SettingsActivityLog[]
}

const TABS: {
  id: Tab
  label: string
  description: string
  icon: typeof Users
}[] = [
  {
    id: 'users',
    label: 'Users',
    description: 'Team members, roles, and access',
    icon: Users,
  },
  {
    id: 'holidays',
    label: 'Holidays',
    description: 'Non-working days for SLA timelines',
    icon: CalendarDays,
  },
  {
    id: 'timelines',
    label: 'Timelines',
    description: 'Stage SLA hours and change history',
    icon: Timer,
  },
]

export function SettingsClient({ users, holidays, currentUserId, stageSla, slaActivity }: Props) {
  const [tab, setTab] = useState<Tab>('users')
  const activeTab = TABS.find(t => t.id === tab)!

  return (
    <div className="theme-v2 -mx-6 -mt-2 min-h-[calc(100vh-4rem)] px-6 pb-10 pt-2">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Settings</h1>
          <p className="mt-1 text-sm font-medium text-zinc-500">
            Manage workspace configuration and production timelines
          </p>
        </header>

        <div className="mb-6 border-b border-zinc-200">
          <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Settings tabs">
            {TABS.map(t => {
              const Icon = t.icon
              const active = tab === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={cn(
                    'flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                    active
                      ? 'border-violet-600 text-violet-700'
                      : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-800'
                  )}
                >
                  <Icon size={16} className={active ? 'text-violet-600' : 'text-zinc-400'} />
                  {t.label}
                </button>
              )
            })}
          </nav>
        </div>

        <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm sm:p-8">
          <p className="mb-6 text-xs font-medium uppercase tracking-wider text-zinc-400">
            {activeTab.description}
          </p>

          {tab === 'users' && (
            <UsersClient users={users} currentUserId={currentUserId} embedded />
          )}
          {tab === 'holidays' && <HolidaysSettings holidays={holidays} />}
          {tab === 'timelines' && (
            <StageSlaSettings rows={stageSla} activity={slaActivity} />
          )}
        </div>
      </div>
    </div>
  )
}
