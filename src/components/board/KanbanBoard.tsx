'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCorners,
  useDraggable, useDroppable,
} from '@dnd-kit/core'
import { Project, Profile } from '@/lib/types'
import { cn, formatDate } from '@/lib/utils'
import { changeProjectStage } from '@/lib/actions/projects'
import { StageChangeModal } from '@/components/projects/StageChangeModal'
import { QuickAddModal } from './QuickAddModal'
import { Button } from '@/components/ui/Button'
import { Plus, GripVertical } from 'lucide-react'
import { mapInternalToExternalStage } from '@/lib/views'
import { AssigneeAvatar } from '@/components/ui/AssigneeAvatar'
import { getProjectTimeliness, resolveTargetReleaseDate } from '@/lib/timelines'
import { getTimelinessBorderClass } from '@/components/projects/ProjectTimeliness'

const CARD_BASE =
  'rounded-md border bg-[#1a1a1a] hover:brightness-110 transition-colors'

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
  const borderClass = getTimelinessBorderClass(project, holidays)
  const t = getProjectTimeliness(project, holidays)
  const target = resolveTargetReleaseDate(project, holidays)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(CARD_BASE, borderClass, 'p-2.5', isDragging && 'opacity-50 scale-[0.98]')}
    >
      <div className="flex gap-2">
        {!readOnly && (
          <button
            {...listeners}
            {...attributes}
            className="text-zinc-700 hover:text-zinc-500 cursor-grab shrink-0 mt-0.5"
            aria-label="Drag"
          >
            <GripVertical size={13} />
          </button>
        )}
        <button type="button" onClick={onOpen} className="flex-1 text-left min-w-0">
          <p className="text-sm font-medium text-zinc-200 line-clamp-2 leading-snug">{project.title}</p>
          <p className="text-[10px] text-zinc-500 mt-1 truncate">{project.ip}</p>
          <div className="flex items-center justify-between gap-2 mt-1.5">
            <div className="min-w-0">
              {t.showLabel && (
                <span className={cn('text-[10px] font-medium', t.textClass)}>{t.label}</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {target && t.status !== 'delivered' && (
                <span className="text-[10px] text-zinc-500">
                  {formatDate(target, 'dd MMM')}
                </span>
              )}
              {project.stage_assignee && (
                <AssigneeAvatar
                  name={project.stage_assignee.name}
                  id={project.stage_assignee.id}
                  size="sm"
                />
              )}
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}

function KanbanColumn({
  stage, projects, onOpen, readOnly, holidays,
}: {
  stage: string
  projects: Project[]
  onOpen: (id: string) => void
  readOnly?: boolean
  holidays: string[]
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage, disabled: readOnly })

  return (
    <div className="flex flex-col w-[220px] shrink-0">
      <div className="flex items-center justify-between mb-2 px-1">
        <h3 className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider leading-tight">{stage}</h3>
        <span className="text-[10px] text-zinc-600 bg-[#141414] px-1.5 py-0.5 rounded border border-white/[0.06]">
          {projects.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 min-h-[120px] space-y-2 p-1 rounded-md transition-colors',
          isOver ? 'bg-white/[0.03] ring-1 ring-white/[0.08]' : 'bg-transparent'
        )}
      >
        {projects.length === 0 && (
          <p className="text-[10px] text-zinc-700 text-center py-6">No projects</p>
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

type Props = {
  projects: Project[]
  users: Profile[]
  stages: readonly string[]
  holidays?: string[]
  canAdd?: boolean
  readOnly?: boolean
  externalView?: boolean
}

export function KanbanBoard({
  projects: initialProjects,
  users,
  stages,
  holidays = [],
  canAdd = true,
  readOnly = false,
  externalView = false,
}: Props) {
  const router = useRouter()
  const [projects, setProjects] = useState(initialProjects)
  const [activeProject, setActiveProject] = useState<Project | null>(null)
  const [pending, setPending] = useState<{ project: Project; newStage: string } | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => {
    setProjects(initialProjects)
  }, [initialProjects])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const getDisplayStage = (project: Project) =>
    externalView ? mapInternalToExternalStage(project.current_stage) : project.current_stage

  const handleDragEnd = (e: DragEndEvent) => {
    if (readOnly) return
    setActiveProject(null)
    const project = projects.find(p => p.id === e.active.id)
    const newStage = e.over?.id as string
    if (!project || !newStage || !stages.includes(newStage)) return
    if (project.current_stage === newStage) return
    setPending({ project, newStage })
  }

  const handleConfirm = async (note: string, assigneeId: string | null) => {
    if (!pending) return
    const result = await changeProjectStage(pending.project.id, pending.newStage, note, assigneeId)
    if (!result.error) {
      const assignee = users.find(u => u.id === assigneeId) ?? null
      setProjects(prev =>
        prev.map(p =>
          p.id === pending.project.id
            ? {
                ...p,
                current_stage: pending.newStage,
                last_status_update_at: new Date().toISOString(),
                stage_assignee_id: assigneeId,
                stage_assignee: assignee,
              }
            : p
        )
      )
    }
    setPending(null)
  }

  const byStage = (stage: string) =>
    projects.filter(p => getDisplayStage(p) === stage)

  return (
    <>
      {canAdd && (
        <div className="mb-4">
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus size={14} /> Add project
          </Button>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={e => { const p = projects.find(x => x.id === e.active.id); if (p) setActiveProject(p) }}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4">
          {stages.map(stage => (
            <KanbanColumn
              key={stage}
              stage={stage}
              projects={byStage(stage)}
              onOpen={id => router.push(`/projects/${id}`)}
              readOnly={readOnly}
              holidays={holidays}
            />
          ))}
        </div>
        <DragOverlay>
          {activeProject && (
            <div className={cn(CARD_BASE, getTimelinessBorderClass(activeProject, holidays), 'p-2.5 w-52')}>
              <p className="text-sm font-medium text-zinc-200 line-clamp-2">{activeProject.title}</p>
              <p className="text-[10px] text-zinc-500 mt-1">{activeProject.ip}</p>
              {resolveTargetReleaseDate(activeProject, holidays) && (
                <p className="text-[10px] text-zinc-500 mt-1">
                  {formatDate(resolveTargetReleaseDate(activeProject, holidays), 'dd MMM')}
                </p>
              )}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {pending && (
        <StageChangeModal
          open={!!pending}
          onClose={() => setPending(null)}
          currentStage={pending.project.current_stage}
          targetStage={pending.newStage}
          users={users}
          onConfirm={handleConfirm}
        />
      )}

      <QuickAddModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        users={users}
        holidays={holidays}
      />
    </>
  )
}
