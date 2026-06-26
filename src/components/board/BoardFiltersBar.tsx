'use client'

import { Profile } from '@/lib/types'
import { useSearchParams } from 'next/navigation'
import { BoardIpFilter } from '@/components/board/BoardIpFilter'
import { BoardAssigneeFilter } from '@/components/board/BoardAssigneeFilter'

type Props = {
  ips: string[]
  users: Profile[]
  currentUserId: string
  showAssigneeFilter: boolean
  matchCount: number
}

export function BoardFiltersBar({
  ips, users, currentUserId, showAssigneeFilter, matchCount,
}: Props) {
  const searchParams = useSearchParams()
  const activeIp = searchParams.get('ip') ?? ''
  const activeAssignee = searchParams.get('assignee') ?? ''
  const activeUser = users.find(u => u.id === activeAssignee)

  return (
    <div className="mb-4 rounded-xl border border-zinc-200/80 bg-white px-4 py-3 shadow-sm space-y-2">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-0">
        {ips.length > 0 && (
          <BoardIpFilter ips={ips} matchCount={matchCount} embedded />
        )}
        {showAssigneeFilter && (
          <BoardAssigneeFilter
            users={users}
            currentUserId={currentUserId}
            matchCount={matchCount}
            embedded
            showDivider={ips.length > 0}
          />
        )}
      </div>
      {(activeIp || activeAssignee) && (
        <p className="text-xs text-zinc-500 border-t border-zinc-100 pt-2">
          Showing {matchCount} project{matchCount !== 1 ? 's' : ''}
          {activeIp && (
            <> in <span className="font-medium text-zinc-700">{activeIp}</span></>
          )}
          {activeAssignee && activeUser && (
            <> assigned to <span className="font-medium text-zinc-700">{activeUser.name}</span></>
          )}
        </p>
      )}
    </div>
  )
}
