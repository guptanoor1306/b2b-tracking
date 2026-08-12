import Link from 'next/link'
import { Project } from '@/lib/types'
import { DisplayProfile } from '@/lib/projects/display-assignee'
import { CollapsibleProjectSection } from '@/components/dashboard/CollapsibleProjectSection'
import { NewProjectsReceivedSection } from '@/components/dashboard/NewProjectsReceivedSection'
import { AssigneeAvatar } from '@/components/ui/AssigneeAvatar'
import { resolveTargetReleaseDate } from '@/lib/timelines'
import { formatDate, formatWaitingSince } from '@/lib/utils'
import { businessDaysLate } from '@/lib/businessTime'
import { welcomeFirstName, HEALTH_PILL_V2 } from '@/lib/design/theme-v2'
import { getProjectTimeliness } from '@/lib/timelines'
import { CheckCircle, AlertTriangle, GitBranch, Zap, ArrowRight, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isAwaitingRequestReview, isZerodhaChannelDbName } from '@/lib/zerodha-sla'
import { mapInternalToExternalStage, needsExternalClientAttention } from '@/lib/views'
import { CreateRequestButton } from '@/components/board/CreateRequestButton'
import { CreateReportButton } from '@/components/reports/ChannelReportModal'
import { ReleaseScheduleButton } from '@/components/dashboard/ReleaseScheduleButton'
import type { ReleaseScheduleItem } from '@/components/dashboard/ReleaseScheduleModal'
import { RecentCommentsSection } from '@/components/dashboard/RecentCommentsSection'
import type { RecentCommentFeedItem } from '@/lib/data/comments'
import type { ReactNode } from 'react'

type Props = {
  profileName: string
  month: string
  monthFilter: ReactNode
  counts: [number, number, number]
  inPipeline: Project[]
  delivered: Project[]
  onHold: Project[]
  allInPipeline?: Project[]
  holidays: string[]
  holdStarters?: Record<string, DisplayProfile>
  externalView?: boolean
  channelDbName?: string | null
  workspaceLabel?: string
  showCreateRequest?: boolean
  showCreateReport?: boolean
  releaseScheduleItems?: ReleaseScheduleItem[]
  recentComments?: RecentCommentFeedItem[]
}

const STAT_CONFIG = [
  { key: 'onTime', icon: CheckCircle, iconBg: 'bg-emerald-100 text-emerald-600', label: 'Delivered on time' },
  { key: 'late', icon: AlertTriangle, iconBg: 'bg-orange-100 text-orange-600', label: 'Delivered late' },
  { key: 'pipeline', icon: GitBranch, iconBg: 'bg-violet-100 text-violet-600', label: 'In pipeline' },
]

export function AdminDashboard({
  profileName, month, monthFilter, counts, inPipeline, delivered, onHold, allInPipeline, holidays, holdStarters = {},
  externalView = false, channelDbName = null, workspaceLabel, showCreateRequest = false,
  showCreateReport = false,
  releaseScheduleItems = [],
  recentComments = [],
}: Props) {
  const isZerodha = isZerodhaChannelDbName(channelDbName)
  const stageLabel = (project: Project) => {
    if (!externalView) return project.current_stage
    return mapInternalToExternalStage(project.current_stage, channelDbName ?? project.channel)
  }

  const attentionPool = allInPipeline ?? inPipeline
  const newProjectsReceived = isZerodha ? inPipeline.filter(isAwaitingRequestReview) : []
  const pipelineProjects = isZerodha
    ? inPipeline.filter(p => !isAwaitingRequestReview(p))
    : inPipeline
  const needsAttention = (() => {
    if (!externalView) {
      return pipelineProjects
        .filter(p => p.status_health === 'Delayed' || p.status_health === 'At risk')
        .slice(0, 6)
    }
    const seen = new Set<string>()
    const items: Project[] = []
    const add = (project: Project) => {
      if (seen.has(project.id)) return
      seen.add(project.id)
      items.push(project)
    }
    for (const project of attentionPool) {
      if (needsExternalClientAttention(project, channelDbName)) add(project)
    }
    for (const project of attentionPool) {
      if (project.status_health === 'Delayed' || project.status_health === 'At risk') add(project)
    }
    return items.slice(0, 6)
  })()

  const totalActive = pipelineProjects.length + onHold.length + newProjectsReceived.length
  const subtitle = workspaceLabel ?? (externalView ? 'Client production overview' : 'Varsity production')

  return (
    <div className="theme-v2 -mx-6 -mt-2 min-h-[calc(100vh-4rem)] px-6 pb-10 pt-2">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              Welcome, {welcomeFirstName(profileName)}
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              {subtitle} · {totalActive} active · {delivered.length} delivered
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2 self-start">
            {monthFilter}
            <ReleaseScheduleButton items={releaseScheduleItems} />
            {showCreateReport && <CreateReportButton />}
            {showCreateRequest && <CreateRequestButton />}
          </div>
        </div>

        {/* 1. Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {STAT_CONFIG.map((s, i) => {
            const Icon = s.icon
            return (
              <div
                key={s.key}
                className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm text-center"
              >
                <div className={cn('mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl', s.iconBg)}>
                  <Icon size={20} />
                </div>
                <p className="text-3xl font-bold text-zinc-900 tabular-nums">{counts[i]}</p>
                <p className="text-xs text-zinc-500 mt-1">{s.label}</p>
              </div>
            )
          })}
        </div>

        {/* 2. Needs attention */}
        {needsAttention.length > 0 && (
          <section className="rounded-2xl border border-orange-200/80 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={16} className="text-orange-500" />
              <div>
                <h2 className="text-sm font-bold text-zinc-900">Needs attention</h2>
                <p className="text-xs text-zinc-500">
                  {externalView ? 'Reviews and overdue items awaiting action' : 'Delayed or at-risk projects'}
                </p>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {needsAttention.map(p => {
                const t = getProjectTimeliness(p, holidays)
                const target = resolveTargetReleaseDate(p, holidays)
                const pendingDays = formatWaitingSince(p.last_status_update_at)
                const releaseLateDays = p.target_delivery_date
                  ? businessDaysLate(p.target_delivery_date, holidays)
                  : 0
                const pendingPerson = p.stage_assignee ?? p.external_team_member
                const healthLabel = p.status_health === 'At risk'
                  ? 'At risk'
                  : (p.status_health === 'Delayed' || t.status === 'delayed')
                    ? 'Delayed'
                    : null
                const lateLabel = externalView
                  ? (releaseLateDays > 0 ? `${releaseLateDays}d late` : (t.showLabel ? t.label : null))
                  : (t.showLabel ? t.label : null)
                const pill = healthLabel
                  ? (HEALTH_PILL_V2[healthLabel] ?? 'bg-zinc-100 text-zinc-600 border-zinc-200')
                  : ''
                return (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}`}
                    className="group flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 hover:border-zinc-300 hover:shadow-sm transition-all border-l-2 border-l-amber-500"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-zinc-900 truncate group-hover:text-violet-700">
                        {p.title}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        {healthLabel && (
                          <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold', pill)}>
                            {healthLabel}
                          </span>
                        )}
                        <span className="text-[11px] text-zinc-500">{stageLabel(p)}</span>
                        {externalView && (
                          <span className="text-[11px] font-medium text-amber-700">
                            {pendingDays} waiting
                          </span>
                        )}
                        {lateLabel && (
                          <span className={cn(
                            'text-[11px] font-medium',
                            lateLabel.includes('late') ? 'text-red-600' : 'text-orange-600',
                          )}>
                            {lateLabel}
                          </span>
                        )}
                      </div>
                      {target && (
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-zinc-500">
                          <Clock size={11} />
                          Release {formatDate(target, 'dd MMM')}
                        </p>
                      )}
                    </div>
                    {pendingPerson && (
                      <AssigneeAvatar
                        name={pendingPerson.name}
                        id={pendingPerson.id}
                        size="md"
                        theme="light"
                      />
                    )}
                    <ArrowRight size={16} className="text-violet-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* 3. New projects + recent comments */}
        <div className={cn(
          'grid gap-4',
          isZerodha && !externalView ? 'lg:grid-cols-2' : 'grid-cols-1',
        )}>
          {isZerodha && !externalView && (
            <NewProjectsReceivedSection projects={newProjectsReceived} />
          )}
          <RecentCommentsSection items={recentComments} />
        </div>

        {/* 4. Collapsed project lists */}
        <div className="space-y-4">
          <CollapsibleProjectSection
            title="In Pipeline"
            count={pipelineProjects.length}
            projects={pipelineProjects}
            iconName="pipeline"
            iconColor="bg-violet-100 text-violet-600"
            emptyMessage="No projects in pipeline."
            variant="light"
            assigneeContext="stage"
            externalView={externalView}
            channelDbName={channelDbName}
            defaultExpanded={false}
          />
          <CollapsibleProjectSection
            title="Delivered"
            count={delivered.length}
            projects={delivered}
            iconName="delivered"
            iconColor="bg-emerald-100 text-emerald-600"
            emptyMessage="No delivered projects."
            variant="light"
            assigneeContext="stage"
            externalView={externalView}
            channelDbName={channelDbName}
            defaultExpanded={false}
          />
          <CollapsibleProjectSection
            title="On Hold"
            count={onHold.length}
            projects={onHold}
            iconName="hold"
            iconColor="bg-zinc-100 text-zinc-600"
            emptyMessage="No projects on hold."
            variant="light"
            assigneeContext="hold"
            holdStarters={holdStarters}
            externalView={externalView}
            channelDbName={channelDbName}
            defaultExpanded={false}
          />
        </div>
      </div>
    </div>
  )
}
