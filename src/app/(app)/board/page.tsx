import { Suspense } from 'react'
import { KanbanBoard } from '@/components/board/KanbanBoard'
import { BoardFiltersBar } from '@/components/board/BoardFiltersBar'
import { BoardHeaderActions } from '@/components/board/BoardHeaderActions'
import { fetchProjects } from '@/lib/data/projects'
import { fetchHolidayDates } from '@/lib/data/holidays'
import { fetchStageSlaConfig } from '@/lib/data/stage-sla'
import { setStageSlaCache } from '@/lib/timelines'
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
  const [projects, usersRes, holidays, stageSla] = await Promise.all([
    fetchProjects(),
    supabase.from('profiles').select('*').eq('is_active', true).order('name'),
    fetchHolidayDates(),
    fetchStageSlaConfig(),
  ])
  setStageSlaCache(stageSla)

  const users = usersRes.data ?? []
  const internal = isInternalRole(profile.role)

  const assigneeIds = new Set(
    projects.map(p => p.stage_assignee_id).filter((id): id is string => Boolean(id))
  )
  const assigneeUsers = users.filter(u => assigneeIds.has(u.id))

  const boardIps = [...new Set(projects.map(p => p.ip).filter(ip => ip && ip !== '—'))].sort()

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
    <div className="theme-v2 -mx-6 -mt-2 min-h-[calc(100vh-4rem)] px-6 pb-10 pt-2">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Production board</h1>
          <p className="mt-1 text-sm font-medium text-zinc-500">
            {filtered.length} project{filtered.length !== 1 ? 's' : ''} · drag cards to update stages
          </p>
        </div>
        {canChangeStages(profile.role) && (
          <BoardHeaderActions users={users} holidays={holidays} />
        )}
      </div>

      <Suspense fallback={null}>
        <BoardFiltersBar
          ips={boardIps}
          users={assigneeUsers}
          currentUserId={profile.id}
          showAssigneeFilter={canSeeBoardAssigneeFilter(profile.role)}
          matchCount={filtered.length}
        />
      </Suspense>
      {shouldFilterBoardToSelf(profile.role) && (
        <p className="text-xs text-zinc-500 mb-3">Showing projects assigned to you</p>
      )}
      <KanbanBoard
        key={boardKey}
        projects={filtered}
        users={users}
        holidays={holidays}
        stages={internal ? STAGES_INTERNAL : STAGES_EXTERNAL}
        readOnly={!canChangeStages(profile.role)}
        externalView={!internal}
      />
    </div>
  )
}
