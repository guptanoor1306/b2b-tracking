import { Suspense } from 'react'
import { KanbanBoard } from '@/components/board/KanbanBoard'
import { BoardAssigneeFilter } from '@/components/board/BoardAssigneeFilter'
import { fetchProjects } from '@/lib/data/projects'
import { fetchHolidayDates } from '@/lib/data/holidays'
import { createClient } from '@/lib/supabase/server'
import { getSessionProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { STAGES_INTERNAL, STAGES_EXTERNAL } from '@/lib/constants'
import {
  isInternalRole,
  canSeeBoardAssigneeFilter,
  shouldFilterBoardToSelf,
  filterProjectsByAssignee,
  canChangeStages,
} from '@/lib/views'

type SearchParams = Promise<Record<string, string | undefined>>

export default async function BoardPage({ searchParams }: { searchParams: SearchParams }) {
  const profile = await getSessionProfile()
  if (!profile) redirect('/login')

  const params = await searchParams
  const supabase = await createClient()
  const [projects, usersRes, holidays] = await Promise.all([
    fetchProjects(),
    supabase.from('profiles').select('*').eq('is_active', true).order('name'),
    fetchHolidayDates(),
  ])

  const users = usersRes.data ?? []
  const internal = isInternalRole(profile.role)

  const assigneeIds = new Set(
    projects.map(p => p.stage_assignee_id).filter((id): id is string => Boolean(id))
  )
  const assigneeUsers = users.filter(u => assigneeIds.has(u.id))

  let filtered = projects

  if (shouldFilterBoardToSelf(profile.role)) {
    filtered = filterProjectsByAssignee(filtered, profile.id)
  } else if (params.assignee) {
    filtered = filterProjectsByAssignee(filtered, params.assignee)
  }

  if (params.ip) {
    filtered = filtered.filter(p => p.ip === params.ip)
  }

  const boardKey = `${params.assignee ?? 'all'}-${params.ip ?? 'all'}`

  return (
    <>
      {canSeeBoardAssigneeFilter(profile.role) && (
        <Suspense fallback={null}>
          <BoardAssigneeFilter
            users={assigneeUsers}
            currentUserId={profile.id}
            matchCount={filtered.length}
          />
        </Suspense>
      )}
      {shouldFilterBoardToSelf(profile.role) && (
        <p className="text-xs text-zinc-500 mb-3">Showing projects assigned to you</p>
      )}
      <KanbanBoard
        key={boardKey}
        projects={filtered}
        users={users}
        holidays={holidays}
        stages={internal ? STAGES_INTERNAL : STAGES_EXTERNAL}
        canAdd={canChangeStages(profile.role)}
        readOnly={!canChangeStages(profile.role)}
        externalView={!internal}
      />
    </>
  )
}
