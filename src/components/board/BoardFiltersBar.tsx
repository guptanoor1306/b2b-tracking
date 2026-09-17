'use client'

import { Profile } from '@/lib/types'
import { useRouter, useSearchParams } from 'next/navigation'
import { BoardProjectFilters } from '@/components/board/BoardProjectFilters'
import { BoardAssigneeFilter } from '@/components/board/BoardAssigneeFilter'
import { listPathWithQuery, parseCsvFilter } from '@/lib/board-filters'
import { saveListQuery } from '@/lib/list-query-session'
import { useActiveChannel } from '@/context/ChannelContext'

type Props = {
  ips: string[]
  languages?: string[]
  types: string[]
  users: Profile[]
  currentUserId: string
  showAssigneeFilter: boolean
  matchCount: number
}

export function BoardFiltersBar({
  ips, languages = [], types, users, currentUserId, showAssigneeFilter, matchCount,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const channelSlug = useActiveChannel()?.slug ?? ''
  const activeIps = parseCsvFilter(searchParams.get('ip'))
  const activeLanguages = parseCsvFilter(searchParams.get('language'))
  const activeTypes = parseCsvFilter(searchParams.get('content_type'))
  const activeAssignee = searchParams.get('assignee') ?? ''
  const activeUser = users.find(u => u.id === activeAssignee)
  const hasProjectFilters = activeIps.length > 0 || activeLanguages.length > 0 || activeTypes.length > 0
  const hasAnyFilter = hasProjectFilters || Boolean(activeAssignee)

  const resetAllFilters = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('ip')
    params.delete('language')
    params.delete('content_type')
    params.delete('assignee')
    const qs = params.toString()
    if (channelSlug) saveListQuery('/board', channelSlug, qs)
    router.push(listPathWithQuery('/board', params))
  }

  return (
    <div className="mb-4 rounded-xl border border-zinc-200/80 bg-white px-4 py-3 shadow-sm space-y-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <BoardProjectFilters ips={ips} languages={languages} types={types} />
        {hasAnyFilter && (
          <button
            type="button"
            onClick={resetAllFilters}
            className="text-[11px] font-medium text-zinc-500 hover:text-violet-700 sm:ml-auto"
          >
            Reset all filters
          </button>
        )}
        {showAssigneeFilter && (
          <BoardAssigneeFilter
            users={users}
            currentUserId={currentUserId}
            matchCount={matchCount}
            embedded
            showDivider
          />
        )}
      </div>
      {(hasProjectFilters || activeAssignee) && (
        <p className="text-xs text-zinc-500 border-t border-zinc-100 pt-2">
          Showing {matchCount} project{matchCount !== 1 ? 's' : ''}
          {activeIps.length > 0 && (
            <> · IP: <span className="font-medium text-zinc-700">{activeIps.join(', ')}</span></>
          )}
          {activeLanguages.length > 0 && (
            <> · Language: <span className="font-medium text-zinc-700">{activeLanguages.join(', ')}</span></>
          )}
          {activeTypes.length > 0 && (
            <> · Type: <span className="font-medium text-zinc-700">{activeTypes.join(', ')}</span></>
          )}
          {activeAssignee && activeUser && (
            <> · Member: <span className="font-medium text-zinc-700">{activeUser.name}</span></>
          )}
        </p>
      )}
    </div>
  )
}
