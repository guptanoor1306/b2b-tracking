'use client'

import { Project, Profile, StageHistory, Comment, HoldPeriod } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { AssigneeAvatar } from '@/components/ui/AssigneeAvatar'
import { ProjectCopyLinks } from '@/components/projects/ProjectCopyLinks'
import { ProjectEditModal } from '@/components/projects/ProjectEditModal'
import { ExternalProjectEditModal } from '@/components/projects/ExternalProjectEditModal'
import { DeleteProjectButton } from '@/components/projects/DeleteProjectButton'
import { ProjectHoldButton } from '@/components/projects/ProjectHoldButton'
import { CommentsSection } from '@/components/projects/CommentsSection'
import { StagePipelineGantt } from '@/components/projects/StagePipelineGantt'
import { resolveTargetReleaseDate } from '@/lib/timelines'
import { formatDate } from '@/lib/utils'
import {
  healthLabel, HEALTH_PILL_V2, pipelineProgressPercent,
} from '@/lib/design/theme-v2'
import { Pencil, AlertCircle, Calendar, Layers, Tag, User } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

type Props = {
  project: Project
  displayStage: string
  internal: boolean
  canEdit?: boolean
  canSendReminder?: boolean
  holidays?: string[]
  users: Profile[]
  graphicsDesigners: Profile[]
  history: StageHistory[]
  holdPeriods?: HoldPeriod[]
  comments: Comment[]
}

function ClientAssetNudge({ project, onEdit }: { project: Project; onEdit: () => void }) {
  const missing = [
    !project.assets_link?.trim(),
    !project.title_copy?.trim(),
    !project.thumbnail_copy?.trim(),
    !(project.drive_link || project.final_file_link)?.trim(),
  ].filter(Boolean).length

  if (missing === 0) return null

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <div className="flex min-w-0 items-start gap-2">
        <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-600" />
        <p className="text-sm text-amber-800">
          {missing} item{missing !== 1 ? 's' : ''} pending — add links or copy
        </p>
      </div>
      <Button size="sm" variant="secondary" onClick={onEdit} className="v2-btn-secondary shrink-0">
        Add now
      </Button>
    </div>
  )
}

export function ProjectDetailLayout({
  project, displayStage, internal, canEdit = true, canSendReminder = false,
  holidays = [], users, graphicsDesigners, history, holdPeriods = [], comments,
}: Props) {
  const currentAssignee = project.stage_assignee?.name ?? null
  const assigneeId = project.stage_assignee?.id
  const [editOpen, setEditOpen] = useState(false)
  const targetRelease = resolveTargetReleaseDate(project, holidays)
  const progress = pipelineProgressPercent(project.current_stage)
  const healthPill = HEALTH_PILL_V2[project.status_health] ?? 'bg-zinc-100 text-zinc-600 border-zinc-200'

  return (
    <div className="theme-v2 -mx-6 -mt-2 min-h-[calc(100vh-4rem)] w-[calc(100%+3rem)] px-6 pb-10 pt-2">
      <div className="w-full max-w-none space-y-5">
        <Link
          href="/board"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-violet-600 transition-colors"
        >
          ← Back to board
        </Link>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-start">
          <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                    {project.content_id}
                  </p>
                  <h1 className="mt-1 text-xl font-bold tracking-tight text-zinc-900 leading-snug">
                    {project.title}
                  </h1>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {internal && (
                    <span className={cn(
                      'rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wide',
                      healthPill
                    )}>
                      {healthLabel(project.status_health)}
                    </span>
                  )}
                  {canEdit && internal && (
                    <>
                      <ProjectHoldButton projectId={project.id} isOnHold={!!project.is_on_hold} />
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setEditOpen(true)}
                        className="v2-btn-secondary h-8"
                      >
                        <Pencil size={12} /> Edit
                      </Button>
                      {internal && (
                        <DeleteProjectButton projectId={project.id} projectTitle={project.title} />
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
                <MetaCell label="Assignee" icon={User}>
                  {currentAssignee && assigneeId ? (
                    <span className="flex items-center gap-1.5">
                      <AssigneeAvatar name={currentAssignee} id={assigneeId} size="sm" theme="light" />
                      <span className="truncate">{currentAssignee}</span>
                    </span>
                  ) : 'Unassigned'}
                </MetaCell>
                <MetaCell label="Target release" icon={Calendar}>
                  {targetRelease ? formatDate(targetRelease, 'dd MMM yyyy') : '—'}
                </MetaCell>
                <MetaCell label="Current stage" icon={Layers}>
                  {displayStage}
                </MetaCell>
                <MetaCell label="IP · Type" icon={Tag}>
                  {[project.ip, project.content_type].filter(Boolean).join(' · ') || '—'}
                </MetaCell>
                {internal && (
                  <>
                    <MetaCell label="Editor">{project.editor ?? '—'}</MetaCell>
                    <MetaCell label="Start">{formatDate(project.received_date)}</MetaCell>
                  </>
                )}
              </div>

              {internal && (
                <div className="mt-4 border-t border-zinc-100 pt-3">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[11px] font-medium text-zinc-500">Pipeline progress</span>
                    <span className="text-xs font-bold text-zinc-900">{progress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className="h-full rounded-full bg-violet-600"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

          <ProjectCopyLinks project={project} />
        </div>

        {!internal && (
          <ClientAssetNudge project={project} onEdit={() => setEditOpen(true)} />
        )}

        <div className="min-w-0 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-zinc-900">
              {internal ? 'Activity' : 'Feedback & comments'}
            </h2>
            {comments.length > 0 && (
              <span className="shrink-0 text-xs text-zinc-400">{comments.length} comment{comments.length !== 1 ? 's' : ''}</span>
            )}
          </div>
          <CommentsSection projectId={project.id} comments={comments} canAdd variant="light" />
        </div>

        {internal && history.length > 0 && (
          <section className="w-full min-w-0">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-zinc-900">Pipeline timeline</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Duration and status on each bar
                {canEdit && internal ? ' · drag to move dates, edges to resize' : ''}
              </p>
            </div>
            <StagePipelineGantt
              history={history}
              holdPeriods={holdPeriods}
              project={project}
              currentStage={project.current_stage}
              projectId={project.id}
              currentAssignee={currentAssignee}
              currentAssigneeId={assigneeId}
              canSendReminder={canSendReminder && internal}
              canEdit={canEdit && internal}
              holidays={holidays}
            />
          </section>
        )}
      </div>

      {internal ? (
        <ProjectEditModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          project={project}
          users={users}
          holidays={holidays}
        />
      ) : (
        <ExternalProjectEditModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          project={project}
        />
      )}
    </div>
  )
}

function MetaCell({
  label,
  children,
  icon: Icon,
}: {
  label: string
  children: React.ReactNode
  icon?: typeof Calendar
}) {
  return (
    <div>
      <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-zinc-400">
        {Icon && <Icon size={10} />}
        {label}
      </p>
      <div className="mt-0.5 text-xs font-medium text-zinc-800">{children}</div>
    </div>
  )
}
