'use client'

import { useState, useEffect, useMemo, useCallback, memo } from 'react'
import Link from 'next/link'
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent, DragCancelEvent,
  MouseSensor, TouchSensor, useSensor, useSensors,
  useDraggable, useDroppable, rectIntersection,
  type CollisionDetection,
} from '@dnd-kit/core'
import { Project, Profile } from '@/lib/types'
import { cn, formatDate } from '@/lib/utils'
import { changeProjectStage } from '@/lib/actions/projects'
import { StageChangeModal, needsTeleprompterPrompt } from '@/components/projects/StageChangeModal'
import { GripVertical, Clock, Layers, AlertTriangle, Pause } from 'lucide-react'
import { getBoardDisplayStage } from '@/lib/views'
import { AssigneeAvatar } from '@/components/ui/AssigneeAvatar'
import { getProjectTimeliness, resolveTargetReleaseDate } from '@/lib/timelines'
import {
  getTimelinessTextClassV2,
  pipelineProgressPercent,
  getColumnAccent,
  getIpCardBorderClass,
  getIpAccent,
} from '@/lib/design/theme-v2'

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
  project, holidays, compact = false, titleHref,
}: {
  project: Project
  holidays: string[]
  compact?: boolean
  titleHref?: string
}) {
  const t = getProjectTimeliness(project, holidays)
  const target = resolveTargetReleaseDate(project, holidays)
  const progress = pipelineProgressPercent(project.current_stage)
  const delayClass = getTimelinessTextClassV2(t.status)

  return (
    <>
      {t.status === 'delayed' && (
        <span className="inline-block mb-1.5 rounded-md bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange-700">
          Delayed
        </span>
      )}
      {project.is_on_hold && (
        <span className="inline-block mb-1.5 ml-1 rounded-md bg-zinc-200 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-700">
          On hold
        </span>
      )}
      <p className={cn(
        'font-bold text-zinc-900 line-clamp-2 leading-snug tracking-tight',
        compact ? 'text-sm' : 'text-[15px]',
      )}>
        {titleHref ? (
          <Link
            href={titleHref}
            prefetch
            draggable={false}
            onPointerDown={e => e.stopPropagation()}
            className="pointer-events-auto hover:text-violet-700 hover:underline underline-offset-2"
          >
            {project.title}
          </Link>
        ) : (
          project.title
        )}
      </p>
      <p className="text-xs text-zinc-500 mt-1 truncate font-medium inline-flex items-center gap-1.5">
        <span className={cn('h-2 w-2 shrink-0 rounded-full', getIpAccent(project.ip).bg)} />
        {project.ip}
      </p>
      {!compact && (
        <>
          <div className="mt-3">
            <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  t.status === 'delayed' ? 'bg-orange-400' : 'bg-violet-500'
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[11px] text-zinc-500 mt-1 font-medium tabular-nums">{progress}% complete</p>
          </div>
          <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-zinc-100">
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
            {project.stage_assignee ? (
              <div className="flex items-center gap-1.5 shrink-0 max-w-[110px]">
                <AssigneeAvatar
                  name={project.stage_assignee.name}
                  id={project.stage_assignee.id}
                  size="sm"
                  theme="light"
                />
                <span className="text-[11px] font-semibold text-zinc-700 truncate">
                  {project.stage_assignee.name.split(' ')[0]}
                </span>
              </div>
            ) : (
              <span className="text-[11px] text-zinc-400 font-medium">Unassigned</span>
            )}
          </div>
        </>
      )}
    </>
  )
}

const KanbanCard = memo(function KanbanCard({
  project, readOnly, holidays,
}: {
  project: Project
  readOnly?: boolean
  holidays: string[]
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: project.id,
    data: { type: 'card', project },
    disabled: readOnly,
  })

  const cardClass = getIpCardBorderClass(project.ip, project.is_on_hold)
  const ipAccent = getIpAccent(project.ip)
  const projectHref = `/projects/${project.id}`

  return (
    <div
      ref={setNodeRef}
      style={isDragging ? { opacity: 0.35 } : undefined}
      className={cn(
        CARD_BASE, cardClass, 'relative p-3.5 select-none',
        !readOnly && 'cursor-grab active:cursor-grabbing touch-none',
        isDragging && cn('shadow-lg ring-2', ipAccent.ring),
      )}
      {...(!readOnly ? listeners : {})}
      {...(!readOnly ? attributes : {})}
    >
      <div className="pointer-events-none flex gap-2">
        {!readOnly && (
          <div className="text-zinc-300 shrink-0 mt-1">
            <GripVertical size={15} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <CardContent project={project} holidays={holidays} titleHref={projectHref} />
        </div>
      </div>
    </div>
  )
})

function KanbanColumn({
  stage, projects, readOnly, holidays, index, isLast, hideHeader,
}: {
  stage: string
  projects: Project[]
  readOnly?: boolean
  holidays: string[]
  index: number
  isLast: boolean
  hideHeader?: boolean
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
        'flex flex-col w-[268px] shrink-0 max-h-[520px]',
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
          'flex-1 min-h-[160px] max-h-[480px] overflow-y-auto space-y-3 p-2 rounded-xl transition-colors duration-150',
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
          />
        ))}
      </div>
    </div>
  )
}

function BoardFooter({ projects, holidays }: { projects: Project[]; holidays: string[] }) {
  const overdue = useMemo(
    () => projects.filter(p => getProjectTimeliness(p, holidays).status === 'delayed').length,
    [projects, holidays]
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
  readOnly?: boolean
  externalView?: boolean
  viewerUserId?: string
}

export function KanbanBoard({
  projects: initialProjects,
  users,
  stages,
  holidays = [],
  readOnly = false,
  externalView = false,
  viewerUserId,
}: Props) {
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
      // Always lay out cards by real stage so drag-and-drop sticks (team view only filters the list)
      if (!externalView) return project.current_stage
      return getBoardDisplayStage(project, { externalView, viewerUserId, teamBoardView: false })
    },
    [externalView, viewerUserId],
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

    if (needsTeleprompterPrompt(project.current_stage, newStage)) {
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

  return (
    <>
      {dragError && (
        <p className="mb-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
          Could not move card: {dragError}
        </p>
      )}
      <div className="rounded-2xl border border-zinc-200/80 bg-white/60 shadow-sm overflow-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={boardCollisionDetection}
          onDragStart={handleDragStart}
          onDragCancel={handleDragCancel}
          onDragEnd={handleDragEnd}
        >
          <div className="max-h-[calc(100vh-14rem)] flex flex-col">
            <div
              id="board-scroll-top"
              className="overflow-x-auto overflow-y-hidden shrink-0 border-b border-zinc-100 h-3"
              onScroll={e => {
                const main = document.getElementById('board-scroll-main')
                if (main) main.scrollLeft = e.currentTarget.scrollLeft
              }}
            >
              <div className="h-1" style={{ width: stages.length * 280 }} />
            </div>

            <div
              id="board-scroll-main"
              className="overflow-auto flex-1"
              onScroll={e => {
                const top = document.getElementById('board-scroll-top')
                if (top) top.scrollLeft = e.currentTarget.scrollLeft
              }}
            >
              <div className="flex min-w-max sticky top-0 z-20 bg-[#fafafa] border-b border-zinc-200 px-4 pt-3 pb-0">
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
                    hideHeader
                  />
                ))}
              </div>
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
                <CardContent project={activeProject} holidays={holidays} compact />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <BoardFooter projects={projects} holidays={holidays} />

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
