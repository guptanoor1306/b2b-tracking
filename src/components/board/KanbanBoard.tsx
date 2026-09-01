'use client'

import { useState, useEffect, useMemo, useCallback, memo, useRef, type ReactNode } from 'react'
import Link from 'next/link'
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent, DragCancelEvent,
  MouseSensor, TouchSensor, useSensor, useSensors,
  useDraggable, useDroppable, rectIntersection,
  type CollisionDetection,
} from '@dnd-kit/core'
import { Project, Profile, HoldPeriod } from '@/lib/types'
import { cn, formatDate } from '@/lib/utils'
import { changeProjectStage } from '@/lib/actions/projects'
import { StageChangeModal, needsTeleprompterPrompt } from '@/components/projects/StageChangeModal'
import { GripVertical, Clock, Layers, AlertTriangle, Pause } from 'lucide-react'
import { getBoardDisplayStage, resolveStageAssigneeId } from '@/lib/views'
import { getProjectDeliveredAssignees } from '@/lib/projects/display-assignee'
import { AssigneeAvatar } from '@/components/ui/AssigneeAvatar'
import { getProjectTimeliness, resolveTargetReleaseDate, normalizeStage } from '@/lib/timelines'
import { FINAL_STAGE } from '@/lib/constants'
import { useActiveChannel } from '@/context/ChannelContext'
import {
  getTimelinessTextClassV2,
  getColumnAccent,
  getIpCardBorderClass,
  getIpAccent,
} from '@/lib/design/theme-v2'
import {
  isZerodhaChannelDbName,
  normalizeZerodhaBoardStage,
  pipelineProgressPercentForChannel,
  isPendingRequestReview,
  isDeclinedRequest,
  isResubmittedRequest,
  isAwaitingRequestReview,
  getZerodhaQcStageMoveError,
  getZerodhaQcReviewLinkError,
  suppressProductionMetrics,
} from '@/lib/zerodha-sla'

const CARD_BASE = 'rounded-xl border bg-white transition-[box-shadow,opacity] hover:shadow-md'

function resolveDropStage(
  overId: string | undefined,
  stages: readonly string[],
  projectsByStage: Map<string, Project[]>,
): string | null {
  if (!overId) return null
  if (stages.includes(overId)) return overId
  for (const stage of stages) {
    if (projectsByStage.get(stage)?.some(p => p.id === overId)) return stage
  }
  return null
}

const boardCollisionDetection: CollisionDetection = args => {
  const hits = rectIntersection(args)
  const columnHit = hits.find(hit =>
    args.droppableContainers.some(
      c => c.id === hit.id && c.data.current?.type === 'column',
    ),
  )
  return columnHit ? [columnHit, ...hits.filter(h => h.id !== columnHit.id)] : hits
}

function CardContent({
  project, holidays, holdPeriods = [], compact = false, channelDbName, users = [],
}: {
  project: Project
  holidays: string[]
  holdPeriods?: HoldPeriod[]
  compact?: boolean
  channelDbName?: string | null
  users?: Profile[]
}) {
  const t = getProjectTimeliness(project, holidays, holdPeriods)
  const target = resolveTargetReleaseDate(project, holidays)
  const progress = pipelineProgressPercentForChannel(project.current_stage, channelDbName ?? project.channel)
  const delayClass = getTimelinessTextClassV2(t.status)
  const showLanguage = isZerodhaChannelDbName(channelDbName ?? project.channel) && project.video_language
  const isDelivered = normalizeStage(project.current_stage) === FINAL_STAGE
  const cardAssignees = isDelivered ? getProjectDeliveredAssignees(project) : []
  const assigneeId = resolveStageAssigneeId(project, project.current_stage)
  const displayAssignee = isDelivered
    ? null
    : project.stage_assignee
      ?? (assigneeId ? users.find(u => u.id === assigneeId) ?? null : null)
  const intakeReview = isAwaitingRequestReview(project) || isDeclinedRequest(project)
  const hideMetrics = suppressProductionMetrics(project)

  return (
    <>
      {intakeReview && isPendingRequestReview(project) && (
        <span className="inline-block mb-1.5 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
          Pending review
        </span>
      )}
      {intakeReview && isResubmittedRequest(project) && (
        <span className="inline-block mb-1.5 rounded-md bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-800">
          Resubmitted
        </span>
      )}
      {intakeReview && isDeclinedRequest(project) && (
        <span className="inline-block mb-1.5 rounded-md bg-red-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-700">
          Declined
        </span>
      )}
      {!hideMetrics && t.status === 'delayed' && (
        <span className="inline-block mb-1.5 rounded-md bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange-700">
          Delayed
        </span>
      )}
      {!hideMetrics && project.is_on_hold && (
        <span className="inline-block mb-1.5 ml-1 rounded-md bg-zinc-200 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-700">
          On hold
        </span>
      )}
      <p className={cn(
        'font-bold text-zinc-900 line-clamp-2 leading-snug tracking-tight',
        compact ? 'text-sm' : 'text-[15px]',
      )}>
        {project.title}
      </p>
      <p className="text-xs text-zinc-500 mt-1 truncate font-medium inline-flex items-center gap-1.5 flex-wrap">
        <span className="inline-flex items-center gap-1.5 min-w-0">
          <span className={cn('h-2 w-2 shrink-0 rounded-full', getIpAccent(project.ip).bg)} />
          <span className="truncate">{project.ip}</span>
        </span>
        {showLanguage && (
          <span className="shrink-0 rounded border border-zinc-200 bg-zinc-50 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            {project.video_language}
          </span>
        )}
      </p>
      {!compact && !hideMetrics && (
        <div className="mt-3">
          <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full bg-zinc-400 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[11px] text-zinc-500 mt-1 font-medium tabular-nums">{progress}% complete</p>
        </div>
      )}
      {!compact && (
        <div className={cn(
          'flex items-center justify-between gap-2 mt-3 pt-3 border-t border-zinc-100',
          hideMetrics && 'border-t-0 pt-2',
        )}>
          {!hideMetrics && (
            <div className="min-w-0">
              {t.showLabel && (
                <span className={cn('text-[11px] font-bold', delayClass)}>{t.label}</span>
              )}
              {target && t.status !== 'delivered' && (
                <span className="flex items-center gap-1 text-[11px] text-zinc-500 mt-0.5 font-medium">
                  <Clock size={11} className="shrink-0" />
                  {formatDate(target, 'dd MMM')}
                </span>
              )}
            </div>
          )}
          <div className={cn(hideMetrics && 'ml-auto')}>
            {cardAssignees.length > 0 ? (
              <div className="flex items-center gap-1.5 shrink-0 max-w-[130px]">
                <div className="flex -space-x-1.5 shrink-0">
                  {cardAssignees.map(a => (
                    <AssigneeAvatar
                      key={a.id}
                      name={a.name}
                      id={a.id}
                      size="sm"
                      theme="light"
                      className="ring-2 ring-white"
                    />
                  ))}
                </div>
                <span className="text-[11px] font-semibold text-zinc-700 truncate">
                  {cardAssignees.map(a => a.name.split(' ')[0]).join(' · ')}
                </span>
              </div>
            ) : displayAssignee ? (
              <div className="flex items-center gap-1.5 shrink-0 max-w-[110px]">
                <AssigneeAvatar
                  name={displayAssignee.name}
                  id={displayAssignee.id}
                  size="sm"
                  theme="light"
                />
                <span className="text-[11px] font-semibold text-zinc-700 truncate">
                  {displayAssignee.name.split(' ')[0]}
                </span>
              </div>
            ) : (
              <span className="text-[11px] text-zinc-400 font-medium">Unassigned</span>
            )}
          </div>
        </div>
      )}
    </>
  )
}

const KanbanCard = memo(function KanbanCard({
  project, readOnly, holidays, holdPeriods = [], channelDbName, users,
}: {
  project: Project
  readOnly?: boolean
  holidays: string[]
  holdPeriods?: HoldPeriod[]
  channelDbName?: string | null
  users: Profile[]
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: project.id,
    data: { type: 'card', project },
    disabled: readOnly,
  })

  const cardClass = getIpCardBorderClass(
    project.ip,
    isAwaitingRequestReview(project) || isDeclinedRequest(project) ? false : project.is_on_hold,
  )
  const ipAccent = getIpAccent(project.ip)
  const projectHref = `/projects/${project.id}`

  if (readOnly) {
    return (
      <Link
        href={projectHref}
        prefetch
        draggable={false}
        className={cn(CARD_BASE, cardClass, 'block p-3.5 hover:shadow-md transition-shadow')}
      >
        <CardContent
          project={project}
          holidays={holidays}
          holdPeriods={holdPeriods}
          channelDbName={channelDbName}
          users={users}
        />
      </Link>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={isDragging ? { opacity: 0.35 } : undefined}
      className={cn(
        CARD_BASE, cardClass, 'relative p-3.5 select-none',
        isDragging && cn('shadow-lg ring-2', ipAccent.ring),
      )}
    >
      <div className="flex gap-2">
        <div
          className="text-zinc-300 shrink-0 mt-1 cursor-grab active:cursor-grabbing touch-none"
          {...listeners}
          {...attributes}
        >
          <GripVertical size={15} />
        </div>
        <Link
          href={projectHref}
          prefetch
          draggable={false}
          className="flex-1 min-w-0 rounded-lg -m-1 p-1 hover:text-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
        >
          <CardContent
            project={project}
            holidays={holidays}
            holdPeriods={holdPeriods}
            channelDbName={channelDbName}
            users={users}
          />
        </Link>
      </div>
    </div>
  )
})

function KanbanColumn({
  stage, projects, readOnly, holidays, holdPeriodsByProjectId = {}, index, isLast, hideHeader, channelDbName, users,
}: {
  stage: string
  projects: Project[]
  readOnly?: boolean
  holidays: string[]
  holdPeriodsByProjectId?: Record<string, HoldPeriod[]>
  index: number
  isLast: boolean
  hideHeader?: boolean
  channelDbName?: string | null
  users: Profile[]
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage,
    data: { type: 'column', stage },
    disabled: readOnly,
  })
  const accent = getColumnAccent(index)

  return (
    <div
      className={cn(
        'flex flex-col w-[268px] shrink-0',
        !isLast && 'border-r border-zinc-200 pr-5 mr-1'
      )}
    >
      {!hideHeader && (
        <div className={cn('mb-3 pb-2 border-b-2', accent.border)}>
          <div className="flex items-center gap-2 min-w-0">
            <span className={cn('h-2.5 w-2.5 rounded-full shrink-0', accent.dot)} />
            <h3 className="text-sm font-bold text-zinc-900 truncate leading-tight">{stage}</h3>
            <span className="text-sm font-normal text-zinc-400 shrink-0">({projects.length})</span>
          </div>
        </div>
      )}
      <div
        ref={setNodeRef}
        className={cn(
          'min-h-[160px] space-y-3 p-2 rounded-xl transition-colors duration-150',
          accent.bg,
          isOver && 'ring-2 ring-violet-400 ring-offset-2 ring-offset-[#f4f4f5] bg-violet-50/70'
        )}
      >
        {projects.length === 0 && (
          <p className="text-xs text-zinc-400 text-center py-10 font-medium pointer-events-none">Drop here</p>
        )}
        {projects.map(p => (
          <KanbanCard
            key={p.id}
            project={p}
            readOnly={readOnly}
            holidays={holidays}
            holdPeriods={holdPeriodsByProjectId[p.id] ?? []}
            channelDbName={channelDbName}
            users={users}
          />
        ))}
      </div>
    </div>
  )
}

function BoardFooter({
  projects, holidays, holdPeriodsByProjectId = {},
}: {
  projects: Project[]
  holidays: string[]
  holdPeriodsByProjectId?: Record<string, HoldPeriod[]>
}) {
  const overdue = useMemo(
    () => projects.filter(p => getProjectTimeliness(p, holidays, holdPeriodsByProjectId[p.id] ?? []).status === 'delayed').length,
    [projects, holidays, holdPeriodsByProjectId]
  )
  const onHold = projects.filter(p => p.is_on_hold).length
  const inProgress = projects.filter(p => p.current_stage !== 'Final Delivery').length

  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200/80 bg-white px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-100 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
          <Layers size={13} />
          {projects.length} projects
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-600">
          {inProgress} in pipeline
        </span>
        {onHold > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300 bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
            <Pause size={13} />
            {onHold} on hold
          </span>
        )}
        {overdue > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">
            <AlertTriangle size={13} />
            {overdue} overdue
          </span>
        )}
      </div>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-700 transition-colors shadow-sm"
      >
        <Layers size={14} />
        View dashboard
      </Link>
    </div>
  )
}

type Props = {
  projects: Project[]
  users: Profile[]
  stages: readonly string[]
  holidays?: string[]
  holdPeriodsByProjectId?: Record<string, HoldPeriod[]>
  readOnly?: boolean
  externalView?: boolean
  viewerUserId?: string
  blockReadyToProduce?: boolean
  topChrome?: ReactNode
}

function StageHeaderRow({
  stages,
  byStage,
}: {
  stages: readonly string[]
  byStage: (stage: string) => Project[]
}) {
  return (
    <div className="flex min-w-max px-4 pt-3 pb-0">
      {stages.map((stage, i) => {
        const accent = getColumnAccent(i)
        return (
          <div
            key={`head-${stage}`}
            className={cn(
              'w-[268px] shrink-0 mb-0',
              i < stages.length - 1 && 'border-r border-zinc-200 pr-5 mr-1'
            )}
          >
            <div className={cn('pb-2 border-b-2', accent.border)}>
              <div className="flex items-center gap-2 min-w-0">
                <span className={cn('h-2.5 w-2.5 rounded-full shrink-0', accent.dot)} />
                <h3 className="text-sm font-bold text-zinc-900 truncate leading-tight">{stage}</h3>
                <span className="text-sm font-normal text-zinc-400 shrink-0">({byStage(stage).length})</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function KanbanBoard({
  projects: initialProjects,
  users,
  stages,
  holidays = [],
  holdPeriodsByProjectId = {},
  readOnly = false,
  externalView = false,
  viewerUserId,
  blockReadyToProduce = false,
  topChrome,
}: Props) {
  const channel = useActiveChannel()
  const [projects, setProjects] = useState(initialProjects)
  const [activeProject, setActiveProject] = useState<Project | null>(null)
  const [pending, setPending] = useState<{ project: Project; newStage: string } | null>(null)

  const [dragError, setDragError] = useState('')

  useEffect(() => {
    setProjects(initialProjects)
  }, [initialProjects])

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
  )

  const getLayoutStage = useCallback(
    (project: Project) => {
      if (!externalView) {
        const dbName = channel?.dbName ?? project.channel
        if (isZerodhaChannelDbName(dbName)) {
          return normalizeZerodhaBoardStage(project.current_stage)
        }
        return project.current_stage
      }
      return getBoardDisplayStage(project, {
        externalView,
        viewerUserId,
        teamBoardView: false,
        channelDbName: channel?.dbName ?? project.channel,
      })
    },
    [externalView, viewerUserId, channel?.dbName],
  )

  const projectsByStage = useMemo(() => {
    const map = new Map<string, Project[]>()
    for (const stage of stages) map.set(stage, [])
    for (const project of projects) {
      const layoutStage = getLayoutStage(project)
      if (map.has(layoutStage)) {
        map.get(layoutStage)!.push(project)
      }
    }
    return map
  }, [projects, stages, getLayoutStage])

  const applyStageChange = useCallback((projectId: string, newStage: string) => {
    setProjects(prev =>
      prev.map(p =>
        p.id === projectId
          ? { ...p, current_stage: newStage, last_status_update_at: new Date().toISOString() }
          : p
      )
    )
  }, [])

  const handleDragStart = (e: DragStartEvent) => {
    const p = projects.find(x => x.id === e.active.id)
    if (p) setActiveProject(p)
  }

  const handleDragCancel = (_e: DragCancelEvent) => {
    setActiveProject(null)
  }

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveProject(null)
    if (readOnly) return

    const project = projects.find(p => p.id === e.active.id)
    const newStage = resolveDropStage(e.over?.id as string | undefined, stages, projectsByStage)
    if (!project || !newStage) return

    const layoutStage = getLayoutStage(project)
    if (layoutStage === newStage) return

    setDragError('')

    if (blockReadyToProduce && newStage === 'Ready to Produce') {
      setDragError('Ready to Produce can only be marked by LearnApp.')
      return
    }

    if (isZerodhaChannelDbName(channel?.dbName ?? project.channel) && !externalView) {
      const qcError = getZerodhaQcStageMoveError(project.current_stage, newStage)
      if (qcError) {
        setDragError(qcError)
        return
      }
      const reviewLinkError = getZerodhaQcReviewLinkError(newStage, project.assets_link)
      if (reviewLinkError) {
        setDragError(reviewLinkError)
        return
      }
    }

    if (needsTeleprompterPrompt(project.current_stage, newStage, channel?.dbName ?? project.channel)) {
      setPending({ project, newStage })
      return
    }

    const previous = projects
    applyStageChange(project.id, newStage)

    const result = await changeProjectStage(project.id, newStage)
    if (result.error) {
      setProjects(previous)
      setDragError(result.error)
    }
  }

  const handleTeleprompterConfirm = async (usesTeleprompter: boolean) => {
    if (!pending) return
    const { project, newStage } = pending
    setPending(null)

    const previous = projects
    applyStageChange(project.id, newStage)

    const result = await changeProjectStage(
      project.id,
      newStage,
      undefined,
      undefined,
      usesTeleprompter
    )
    if (result.error) {
      setProjects(previous)
    } else {
      setProjects(prev =>
        prev.map(p =>
          p.id === project.id
            ? { ...p, uses_teleprompter: usesTeleprompter }
            : p
        )
      )
    }
  }

  const byStage = (stage: string) => projectsByStage.get(stage) ?? []

  const headerScrollRef = useRef<HTMLDivElement>(null)
  const bodyScrollRef = useRef<HTMLDivElement>(null)

  const syncBodyScroll = useCallback(() => {
    const header = headerScrollRef.current
    const body = bodyScrollRef.current
    if (header && body) body.scrollLeft = header.scrollLeft
  }, [])

  const syncHeaderScroll = useCallback(() => {
    const header = headerScrollRef.current
    const body = bodyScrollRef.current
    if (header && body) header.scrollLeft = body.scrollLeft
  }, [])

  return (
    <>
      {dragError && (
        <p className="mb-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
          Could not move card: {dragError}
        </p>
      )}
      <div className="sticky top-0 z-30 bg-zinc-100">
        {topChrome && <div className="space-y-4 pb-4">{topChrome}</div>}
        <div className="rounded-t-2xl border border-b-0 border-zinc-200/80 bg-white/60 shadow-sm overflow-hidden">
          <div
            ref={headerScrollRef}
            className="overflow-x-auto bg-[#fafafa] border-b border-zinc-200"
            onScroll={syncBodyScroll}
          >
            <StageHeaderRow stages={stages} byStage={byStage} />
          </div>
        </div>
      </div>
      <div className="rounded-b-2xl border border-zinc-200/80 bg-white/60 shadow-sm overflow-hidden">
        <DndContext
          id="production-kanban-board"
          sensors={sensors}
          collisionDetection={boardCollisionDetection}
          onDragStart={handleDragStart}
          onDragCancel={handleDragCancel}
          onDragEnd={handleDragEnd}
        >
          <div
            ref={bodyScrollRef}
            className="overflow-x-auto"
            onScroll={syncHeaderScroll}
          >
            <div className="flex px-4 pb-4 pt-2 gap-1 min-w-max">
              {stages.map((stage, i) => (
                <KanbanColumn
                  key={stage}
                  stage={stage}
                  index={i}
                  isLast={i === stages.length - 1}
                  projects={byStage(stage)}
                  readOnly={readOnly}
                  holidays={holidays}
                  holdPeriodsByProjectId={holdPeriodsByProjectId}
                  hideHeader
                  channelDbName={channel?.dbName}
                  users={users}
                />
              ))}
            </div>
          </div>
          <DragOverlay
            adjustScale={false}
            dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.2, 0, 0, 1)' }}
          >
            {activeProject ? (
              <div className={cn(
                CARD_BASE,
                getIpCardBorderClass(activeProject.ip, activeProject.is_on_hold),
                'p-3.5 w-[252px] shadow-2xl ring-2 rotate-[1.5deg] scale-[1.02]',
                getIpAccent(activeProject.ip).ring,
              )}>
                <CardContent
                  project={activeProject}
                  holidays={holidays}
                  holdPeriods={holdPeriodsByProjectId[activeProject.id] ?? []}
                  compact
                  channelDbName={channel?.dbName}
                  users={users}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <BoardFooter projects={projects} holidays={holidays} holdPeriodsByProjectId={holdPeriodsByProjectId} />

      {pending && (
        <StageChangeModal
          open={!!pending}
          onClose={() => setPending(null)}
          currentStage={pending.project.current_stage}
          targetStage={pending.newStage}
          onConfirm={handleTeleprompterConfirm}
        />
      )}
    </>
  )
}
