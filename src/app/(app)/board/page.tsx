import { Suspense } from 'react'
import { KanbanBoardClient } from '@/components/board/KanbanBoardClient'
import { BoardFiltersBar } from '@/components/board/BoardFiltersBar'
import { BoardHeaderActions } from '@/components/board/BoardHeaderActions'
import { CreateRequestButton } from '@/components/board/CreateRequestButton'
import { MonthFilterSlot } from '@/components/dashboard/MonthFilterSlot'
import { fetchProjects } from '@/lib/data/projects'
import { fetchHolidayDates } from '@/lib/data/holidays'
import { fetchStageSlaConfig } from '@/lib/data/stage-sla'
import { fetchChannelMembers } from '@/lib/data/channel-access'
import { setStageSlaCache } from '@/lib/timelines'
import { getSessionProfile } from '@/lib/auth'
import { getActiveChannelRole, getActiveChannelDbName, getActiveChannelSlug } from '@/lib/channel-context'
import { redirect } from 'next/navigation'
import { ALL_MONTHS, filterProjectsByMonth } from '@/lib/utils'
import { isZerodhaChannelDbName, externalStagesForChannel, internalStagesForChannel, VIDEO_LANGUAGES } from '@/lib/zerodha-sla'
import {
  canSeeBoardAssigneeFilter,
  shouldFilterBoardForViewer,
  usesInternalBoardView,
  filterProjectsByAssignee,
  canChangeStages,
  canMoveBoardCards,
  canCreateExternalRequest,
  effectiveRoleForChannel,
  isSuperAdmin,
  canMarkReadyToProduce,
} from '@/lib/views'
import { filterProjectsByTeamMembership, isUserOnProjectTeam } from '@/lib/projects/team'

type SearchParams = Promise<Record<string, string | undefined>>

export default async function BoardPage({ searchParams }: { searchParams: SearchParams }) {
  const profile = await getSessionProfile()
  if (!profile) redirect('/login')

  const params = await searchParams
  const month = params.month ?? ALL_MONTHS
  const [projects, users, holidays, stageSla, channelName] = await Promise.all([
    fetchProjects(),
    getActiveChannelSlug().then(slug => fetchChannelMembers(slug ?? '')),
    fetchHolidayDates(),
    getActiveChannelDbName().then(name => fetchStageSlaConfig(name)),
    getActiveChannelDbName(),
  ])
  setStageSlaCache(stageSla, channelName)

  const channelRole = await getActiveChannelRole(profile)
  const role = effectiveRoleForChannel(channelRole, profile.role)
  const superAdmin = isSuperAdmin(profile.role)
  const internal = usesInternalBoardView(profile.role, channelRole)
  const showCreateRequest = canCreateExternalRequest(role, channelName)

  const canFilterByMember = superAdmin || canSeeBoardAssigneeFilter(role)
  const filterUsers = canFilterByMember
    ? users
    : users.filter(u =>
      projects.some(p =>
        p.stage_assignee_id === u.id
        || isUserOnProjectTeam(p, u.id)
      )
    )

  const monthScoped = filterProjectsByMonth(projects, month)
  const boardIps = [...new Set(monthScoped.map(p => p.ip).filter(ip => ip && ip !== '—'))].sort()
  const isZerodha = isZerodhaChannelDbName(channelName)
  const boardLanguages = isZerodha
    ? [...new Set(monthScoped.map(p => p.video_language).filter(Boolean))].sort() as string[]
    : []
  const internalStages = internalStagesForChannel(channelName)
  const externalStages = externalStagesForChannel(channelName)

  let filtered = monthScoped
  const teamBoard = shouldFilterBoardForViewer(profile.role, channelRole)

  if (teamBoard) {
    filtered = filterProjectsByTeamMembership(filtered, profile.id)
  } else if (params.assignee) {
    filtered = filterProjectsByAssignee(filtered, params.assignee)
  }

  if (params.ip) {
    filtered = filtered.filter(p => p.ip === params.ip)
  }

  if (params.language) {
    filtered = filtered.filter(p => p.video_language === params.language)
  }

  const boardKey = `${month}-${params.assignee ?? 'all'}-${params.ip ?? 'all'}-${params.language ?? 'all'}`

  return (
    <div className="theme-v2 -mx-6 -mt-2 min-h-[calc(100vh-4rem)] px-6 pb-10 pt-2">
      <KanbanBoardClient
        key={boardKey}
        projects={filtered}
        users={users}
        holidays={holidays}
        stages={internal ? internalStages : externalStages}
        readOnly={!canMoveBoardCards(role)}
        externalView={!internal}
        viewerUserId={profile.id}
        blockReadyToProduce={!canMarkReadyToProduce(role, channelName)}
        topChrome={(
          <>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Production board</h1>
                <p className="mt-1 text-sm font-medium text-zinc-500">
                  {filtered.length} project{filtered.length !== 1 ? 's' : ''} · drag cards to update stages
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2 self-start">
                <MonthFilterSlot month={month} />
                {showCreateRequest && <CreateRequestButton />}
                {canChangeStages(role) && (
                  <BoardHeaderActions users={users} holidays={holidays} />
                )}
              </div>
            </div>

            <Suspense fallback={null}>
              <BoardFiltersBar
                ips={boardIps}
                languages={boardLanguages.length ? boardLanguages : [...VIDEO_LANGUAGES]}
                users={filterUsers}
                currentUserId={profile.id}
                showAssigneeFilter={superAdmin || canSeeBoardAssigneeFilter(role)}
                showLanguageFilter={isZerodha}
                matchCount={filtered.length}
              />
            </Suspense>

            {teamBoard && (
              <p className="text-xs text-zinc-500">Showing projects you&apos;re assigned to</p>
            )}
          </>
        )}
      />
    </div>
  )
}
