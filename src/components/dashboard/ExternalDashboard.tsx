'use client'

import { type ReactNode } from 'react'
import Link from 'next/link'
import { isUserOnProjectTeam } from '@/lib/projects/team'
import { Project } from '@/lib/types'
import { DisplayProfile } from '@/lib/projects/display-assignee'
import { formatWaitingSince, formatDate, isAllMonths, isProjectRelevantInMonth, isDeliveredInMonth } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { resolveTargetReleaseDate } from '@/lib/timelines'
import { FINAL_STAGE } from '@/lib/constants'
import {
  isDeclinedRequest,
  isPendingRequestReview,
  ZERODHA_REQUEST_RECEIVED,
} from '@/lib/zerodha-sla'
import { AssigneeAvatar } from '@/components/ui/AssigneeAvatar'
import { CollapsibleProjectSection } from '@/components/dashboard/CollapsibleProjectSection'
import { CreateRequestButton } from '@/components/board/CreateRequestButton'
import { ReleaseScheduleButton } from '@/components/dashboard/ReleaseScheduleButton'
import type { ReleaseScheduleItem } from '@/components/dashboard/ReleaseScheduleModal'
import { RecentCommentsSection } from '@/components/dashboard/RecentCommentsSection'
import type { RecentCommentFeedItem } from '@/lib/data/comments'
import { welcomeFirstName } from '@/lib/design/theme-v2'
import {
  PlayCircle, CheckCircle2, Zap, ArrowRight, Clock,
} from 'lucide-react'

type Props = {
  projects: Project[]
  userId: string
  userName: string
  month: string
  monthFilter: ReactNode
  holidays?: string[]
  showAssignedSections?: boolean
  showCreateRequest?: boolean
  holdStarters?: Record<string, DisplayProfile>
  releaseScheduleItems?: ReleaseScheduleItem[]
  recentComments?: RecentCommentFeedItem[]
}

export function ExternalDashboard({
  projects, userId, userName, month, monthFilter, holidays = [], showAssignedSections = false,
  showCreateRequest = false, holdStarters = {},
  releaseScheduleItems = [],
  recentComments = [],
}: Props) {
  const myProjects = projects.filter(p => isUserOnProjectTeam(p, userId))
  const inPipeline = myProjects.filter(
    p => p.current_stage !== FINAL_STAGE && p.status_health !== 'On hold'
  )
  const delivered = myProjects.filter(p => p.current_stage === FINAL_STAGE)
  const onHold = myProjects.filter(p => p.status_health === 'On hold')
  const filterByMonth = !isAllMonths(month)
  const inPipelineView = filterByMonth
    ? inPipeline.filter(p => isProjectRelevantInMonth(p, month))
    : inPipeline
  const deliveredView = filterByMonth
    ? delivered.filter(p => isDeliveredInMonth(p, month))
    : delivered
  const onHoldView = filterByMonth
    ? onHold.filter(p => isProjectRelevantInMonth(p, month))
    : onHold

  const statCards = [
    { key: 'pipeline', label: 'In Pipeline', count: inPipelineView.length, icon: PlayCircle, iconBg: 'bg-violet-100 text-violet-600', href: '/board' },
    { key: 'delivered', label: 'Delivered', count: deliveredView.length, icon: CheckCircle2, iconBg: 'bg-emerald-100 text-emerald-600', href: '/board' },
  ]
  const declinedItems = projects.filter(p =>
    p.external_team_member_id === userId
    && isDeclinedRequest(p)
  )
  const assignedItems = projects.filter(p => {
    if (p.current_stage === FINAL_STAGE) return false
    if (isPendingRequestReview(p) || isDeclinedRequest(p)) return false
    if (p.stage_assignee_id === userId) return true
    if (isUserOnProjectTeam(p, userId) && p.current_stage !== ZERODHA_REQUEST_RECEIVED) return true
    return false
  })
  const actionItems = [...declinedItems, ...assignedItems]

  return (
    <div className="theme-v2 -mx-6 -mt-2 min-h-[calc(100vh-4rem)] px-6 pb-10 pt-2">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              Welcome, {welcomeFirstName(userName)}
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Your workspace · {actionItems.length} action item{actionItems.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2 self-start">
            {monthFilter}
            <ReleaseScheduleButton items={releaseScheduleItems} />
            {showCreateRequest && <CreateRequestButton />}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {statCards.map(s => {
            const Icon = s.icon
            return (
              <Link key={s.key} href={s.href} className="block group">
                <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm text-center transition-all group-hover:border-violet-200 group-hover:shadow-md">
                  <div className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl ${s.iconBg}`}>
                    <Icon size={20} />
                  </div>
                  <p className="text-3xl font-bold text-zinc-900 tabular-nums">{s.count}</p>
                  <p className="text-xs text-zinc-500 mt-1">{s.label}</p>
                </div>
              </Link>
            )
          })}
        </div>

        <section className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={16} className="text-orange-500" />
            <div>
              <h2 className="text-sm font-bold text-zinc-900">Next best actions</h2>
              <p className="text-xs text-zinc-500">Assigned to you · focus here first</p>
            </div>
          </div>

          {actionItems.length === 0 ? (
            <div className="py-10 text-center rounded-xl bg-zinc-50 border border-dashed border-zinc-200">
              <p className="text-sm text-zinc-500">No pending action items assigned to you.</p>
            </div>
          ) : (
            <div className="grid gap-2">
              {actionItems.map(p => {
                const declined = isDeclinedRequest(p)
                const target = declined ? null : resolveTargetReleaseDate(p, holidays)
                return (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}`}
                    className={cn(
                      'group flex items-center gap-3 rounded-lg border bg-white px-4 py-3.5 hover:border-zinc-300 hover:shadow-sm transition-all border-l-2',
                      declined ? 'border-l-red-500 border-red-100' : 'border-l-amber-500 border-zinc-200',
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-zinc-900 truncate group-hover:text-violet-700">
                        {p.title}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                        {declined ? (
                          <span className="text-[11px] font-medium text-red-700">
                            Request declined — see comments for details
                          </span>
                        ) : (
                          <>
                            <span className="text-[11px] text-zinc-500">{p.current_stage}</span>
                            <span className="text-[11px] font-medium text-orange-600">
                              {formatWaitingSince(p.last_status_update_at)} waiting
                            </span>
                            {target && (
                              <span className="flex items-center gap-1 text-[11px] text-zinc-500">
                                <Clock size={11} />
                                {formatDate(target, 'dd MMM')}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    {!declined && (
                      <AssigneeAvatar name={userName} id={userId} size="md" theme="light" />
                    )}
                    <span className="text-xs font-semibold text-violet-600 shrink-0 group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-0.5">
                      Open <ArrowRight size={14} />
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

        <RecentCommentsSection items={recentComments} />

        {showAssignedSections && (
          <div className="space-y-4">
            <CollapsibleProjectSection
              title="In Pipeline"
              count={inPipelineView.length}
              projects={inPipelineView}
              iconName="pipeline"
              iconColor="bg-violet-100 text-violet-600"
              emptyMessage="No projects in pipeline assigned to you."
              variant="light"
              assigneeContext="stage"
              defaultExpanded={false}
            />
            <CollapsibleProjectSection
              title="Delivered"
              count={deliveredView.length}
              projects={deliveredView}
              iconName="delivered"
              iconColor="bg-emerald-100 text-emerald-600"
              emptyMessage="No delivered projects assigned to you."
              variant="light"
              assigneeContext="stage"
              defaultExpanded={false}
            />
            <CollapsibleProjectSection
              title="On Hold"
              count={onHoldView.length}
              projects={onHoldView}
              iconName="hold"
              iconColor="bg-zinc-100 text-zinc-600"
              emptyMessage="No projects on hold assigned to you."
              variant="light"
              assigneeContext="hold"
              holdStarters={holdStarters}
              defaultExpanded={false}
            />
          </div>
        )}
      </div>
    </div>
  )
}
