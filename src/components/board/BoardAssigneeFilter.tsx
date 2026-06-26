'use client'

import { Profile } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useRouter, useSearchParams } from 'next/navigation'
import { AssigneeAvatar } from '@/components/ui/AssigneeAvatar'

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
          <button
            type="button"
            onClick={() => setAssignee(currentUserId)}
            title="My assignments"
            className={cn(
              'h-8 px-2.5 rounded-full text-[10px] font-semibold border transition-all inline-flex items-center gap-1.5',
              active === currentUserId
                ? 'bg-violet-600 border-violet-600 text-white'
                : 'border-zinc-200 text-zinc-600 hover:border-violet-200 bg-white'
            )}
          >
            Me
          </button>
        )}
        {users.map(u => (
          <button
            key={u.id}
            type="button"
            title={u.name}
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
          </button>
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
