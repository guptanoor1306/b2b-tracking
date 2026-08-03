'use client'

import type { ReactNode } from 'react'
import { Profile } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useRouter, useSearchParams } from 'next/navigation'
import { AssigneeAvatar } from '@/components/ui/AssigneeAvatar'

function MemberFilterChip({
  tooltip,
  label,
  active,
  onClick,
  className,
  children,
}: {
  tooltip: string
  label?: string
  active: boolean
  onClick: () => void
  className?: string
  children?: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={tooltip}
      className={cn('relative group', className)}
    >
      {children ?? (
        <span
          className={cn(
            'inline-flex h-8 items-center rounded-full border px-2.5 text-[10px] font-semibold transition-all',
            active
              ? 'bg-violet-600 border-violet-600 text-white'
              : 'border-zinc-200 text-zinc-600 hover:border-violet-200 bg-white',
          )}
        >
          {label}
        </span>
      )}
      <span className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-md bg-zinc-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
        {tooltip}
      </span>
    </button>
  )
}

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

  const setAssignee = (id: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (!id) params.delete('assignee')
    else params.set('assignee', id)
    router.push(`/board?${params.toString()}`)
  }

  const content = (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mr-1 shrink-0">
          Filter by member
        </span>
        <button
          type="button"
          onClick={() => setAssignee('')}
          className={cn(
            'h-8 px-3 rounded-full text-xs font-medium border transition-colors',
            !active
              ? 'bg-violet-600 border-violet-600 text-white'
              : 'border-zinc-200 text-zinc-600 hover:border-violet-200 hover:text-violet-700 bg-white'
          )}
        >
          All
        </button>
        {showMeShortcut && (
          <MemberFilterChip
            label="Me"
            tooltip={users.find(u => u.id === currentUserId)?.name ?? 'My assignments'}
            active={active === currentUserId}
            onClick={() => setAssignee(currentUserId)}
            className="h-8 px-2.5 text-[10px] font-semibold"
          />
        )}
        {users.map(u => (
          <MemberFilterChip
            key={u.id}
            tooltip={u.name}
            active={active === u.id}
            onClick={() => setAssignee(u.id)}
            className="rounded-full transition-transform hover:scale-105"
          >
            <AssigneeAvatar
              name={u.name}
              id={u.id}
              size="md"
              theme="light"
              active={active === u.id}
            />
          </MemberFilterChip>
        ))}
      </div>
      {!embedded && active && (
        <p className="text-xs text-zinc-500">
          Showing {matchCount ?? 0} project{(matchCount ?? 0) !== 1 ? 's' : ''}
          {activeUser ? ` assigned to ${activeUser.name}` : ''}
        </p>
      )}
    </>
  )

  if (embedded) {
    return (
      <div className={cn(
        'min-w-0 flex-1 space-y-2',
        showDivider && 'lg:border-l lg:border-zinc-100 lg:pl-6'
      )}>
        {content}
      </div>
    )
  }

  return (
    <div className="mb-4 rounded-xl border border-zinc-200/80 bg-white px-4 py-3 shadow-sm space-y-2">
      {content}
    </div>
  )
}
