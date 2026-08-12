'use client'

import { Profile } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronDown } from 'lucide-react'

type Props = {
  users: Profile[]
  currentUserId: string
  showMeShortcut?: boolean
  matchCount?: number
  embedded?: boolean
  showDivider?: boolean
}

export function BoardAssigneeFilter({
  users, currentUserId, showMeShortcut = true, matchCount, embedded = false, showDivider = false,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const active = searchParams.get('assignee') ?? ''
  const activeUser = users.find(u => u.id === active)
  const meUser = users.find(u => u.id === currentUserId)
  const listUsers = (showMeShortcut
    ? users.filter(u => u.id !== currentUserId)
    : users
  ).slice().sort((a, b) => a.name.localeCompare(b.name))

  const setAssignee = (id: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (!id) params.delete('assignee')
    else params.set('assignee', id)
    router.push(`/board?${params.toString()}`)
  }

  const content = (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider shrink-0">
        Member
      </span>
      <div className="relative min-w-[160px] max-w-[240px]">
        <select
          value={active}
          onChange={e => setAssignee(e.target.value)}
          className={cn(
            'h-8 w-full appearance-none rounded-lg border border-zinc-200 bg-white pl-3 pr-8',
            'text-xs font-medium text-zinc-700',
            'hover:border-violet-200 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100',
            active && 'border-violet-200 text-violet-800',
          )}
        >
          <option value="">All members</option>
          {showMeShortcut && meUser && (
            <option value={currentUserId}>Me ({meUser.name})</option>
          )}
          {listUsers.map(u => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
        <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
      </div>
      {active && (
        <button
          type="button"
          onClick={() => setAssignee('')}
          className="text-[11px] font-medium text-zinc-500 hover:text-violet-700"
        >
          Clear
        </button>
      )}
    </div>
  )

  if (embedded) {
    return (
      <div className={cn(
        'shrink-0 space-y-2',
        showDivider && 'lg:border-l lg:border-zinc-100 lg:pl-6',
      )}>
        {content}
        {active && (
          <p className="text-xs text-zinc-500 lg:hidden">
            {matchCount ?? 0} project{(matchCount ?? 0) !== 1 ? 's' : ''}
            {activeUser ? ` · ${activeUser.name}` : ''}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="mb-4 rounded-xl border border-zinc-200/80 bg-white px-4 py-3 shadow-sm space-y-2">
      {content}
      {active && (
        <p className="text-xs text-zinc-500">
          Showing {matchCount ?? 0} project{(matchCount ?? 0) !== 1 ? 's' : ''}
          {activeUser ? ` assigned to ${activeUser.name}` : ''}
        </p>
      )}
    </div>
  )
}
