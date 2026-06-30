'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCorners,
  useDraggable, useDroppable,
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

const CARD_BASE = 'rounded-xl border bg-white transition-all hover:shadow-md'

function KanbanCard({
  project, onOpen, readOnly, holidays,
}: {
  project: Project
  onOpen: () => void
  readOnly?: boolean
  holidays: string[]
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: project.id,
    data: { project },
    disabled: readOnly,
  })

  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined
  const t = getProjectTimeliness(project, holidays)
  const target = resolveTargetReleaseDate(project, holidays)
  const progress = pipelineProgressPercent(project.current_stage)
  const cardClass = getIpCardBorderClass(project.ip, project.is_on_hold)
  const ipAccent = getIpAccent(project.ip)
  const delayClass = getTimelinessTextClassV2(t.status)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(CARD_BASE, cardClass, 'p-3.5', isDragging && cn('opacity-60 scale-[0.98] shadow-lg ring-2', ipAccent.ring))}
    >
      <div className="flex gap-2">
        {!readOnly && (
          <button
            {...listeners}
            {...attributes}
            className="text-zinc-300 hover:text-zinc-500 cursor-grab shrink-0 mt-1"
            aria-label="Drag"
          >
            <GripVertical size={15} />
          </button>
        )}
        <button type="button" onClick={onOpen} className="flex-1 text-left min-w-0">
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
          <p className="text-[15px] font-bold text-zinc-900 line-clamp-2 leading-snug tracking-tight">
            {project.title}
          </p>
          <p className="text-xs text-zinc-500 mt-1 truncate font-medium inline-flex items-center gap-1.5">
            <span className={cn('h-2 w-2 shrink-0 rounded-full', ipAccent.bg)} />
            {project.ip}
          </p>

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
        </button>
      </div>
    </div>
  )
}

function KanbanColumn({
  stage, projects, onOpen, readOnly, holidays, index, isLast, hideHeader,
}: {
  stage: string
  projects: Project[]
  onOpen: (id: string) => void
  readOnly?: boolean
  holidays: string[]
  index: number
  isLast: boolean
  hideHeader?: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage, disabled: readOnly })
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
          'flex-1 min-h-[120px] max-h-[480px] overflow-y-auto space-y-3 p-2 rounded-xl transition-all',
          accent.bg,
          isOver && 'ring-2 ring-violet-300 ring-offset-2 ring-offset-[#f4f4f5] bg-violet-50/60'
        )}
      >
        {projects.length === 0 && (
          <p className="text-xs text-zinc-400 text-center py-10 font-medium">No projects</p>
        )}
        {projects.map(p => (
          <KanbanCard
            key={p.id}
            project={p}
            onOpen={() => onOpen(p.id)}
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
  teamBoardView?: boolean
}

export function KanbanBoard({
  projects: initialProjects,
  users,
  stages,
  holidays = [],
  readOnly = false,
  externalView = false,
  viewerUserId,
  teamBoardView = false,
}: Props) {
  const router = useRouter()
  const [projects, setProjects] = useState(initialProjects)
  const [activeProject, setActiveProject] = useState<Project | null>(null)
  const [pending, setPending] = useState<{ project: Project; newStage: string } | null>(null)

  useEffect(() => {
    setProjects(initialProjects)
  }, [initialProjects])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const getDisplayStage = (project: Project) =>
    getBoardDisplayStage(project, { externalView, viewerUserId, teamBoardView })

  const handleDragEnd = async (e: DragEndEvent) => {
    if (readOnly) return
    setActiveProject(null)
    const project = projects.find(p => p.id === e.active.id)
    const newStage = e.over?.id as string
    if (!project || !newStage || !stages.includes(newStage)) return
    if (project.current_stage === newStage) return

    if (needsTeleprompterPrompt(project.current_stage, newStage)) {
      setPending({ project, newStage })
      return
    }

    const result = await changeProjectStage(project.id, newStage)
    if (!result.error) {
      setProjects(prev =>
        prev.map(p =>
          p.id === project.id
            ? { ...p, current_stage: newStage, last_status_update_at: new Date().toISOString() }
            : p
        )
      )
      router.refresh()
    }
  }

  const handleTeleprompterConfirm = async (usesTeleprompter: boolean) => {
    if (!pending) return
    const result = await changeProjectStage(
      pending.project.id,
      pending.newStage,
      undefined,
      undefined,
      usesTeleprompter
    )
    if (!result.error) {
      setProjects(prev =>
        prev.map(p =>
          p.id === pending.project.id
            ? {
                ...p,
                current_stage: pending.newStage,
                last_status_update_at: new Date().toISOString(),
                uses_teleprompter: usesTeleprompter,
              }
            : p
        )
      )
      router.refresh()
    }
    setPending(null)
  }

  const byStage = (stage: string) =>
    projects.filter(p => getDisplayStage(p) === stage)

  return (
    <>
      <div className="rounded-2xl border border-zinc-200/80 bg-white/60 shadow-sm overflow-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={e => { const p = projects.find(x => x.id === e.active.id); if (p) setActiveProject(p) }}
          onDragEnd={handleDragEnd}
        >
          <div className="max-h-[calc(100vh-14rem)] flex flex-col">
            {/* Top horizontal scrollbar mirror */}
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
                    onOpen={id => router.push(`/projects/${id}`)}
                    readOnly={readOnly}
                    holidays={holidays}
                    hideHeader
                  />
                ))}
              </div>
            </div>
          </div>
          <DragOverlay>
            {activeProject && (
              <div className={cn(
                CARD_BASE,
                getIpCardBorderClass(activeProject.ip, activeProject.is_on_hold),
                'p-3.5 w-60 shadow-xl ring-2',
                getIpAccent(activeProject.ip).ring
              )}>
                <p className="text-[15px] font-bold text-zinc-900 line-clamp-2">{activeProject.title}</p>
                <p className="text-xs text-zinc-500 mt-1 font-medium">{activeProject.ip}</p>
              </div>
            )}
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
