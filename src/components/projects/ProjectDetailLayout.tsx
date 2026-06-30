'use client'

import { Project, Profile, StageHistory, Comment, HoldPeriod, RpCut } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { AssigneeAvatar } from '@/components/ui/AssigneeAvatar'
import { ProjectSectionsGrid, pendingContentCount } from '@/components/projects/ProjectSectionsGrid'
import { ProjectEditModal } from '@/components/projects/ProjectEditModal'
import { DeleteProjectButton } from '@/components/projects/DeleteProjectButton'
import { ProjectHoldButton } from '@/components/projects/ProjectHoldButton'
import { StagePipelineGantt } from '@/components/projects/StagePipelineGantt'
import { resolveTargetReleaseDate } from '@/lib/timelines'
import { formatDate } from '@/lib/utils'
import {
  healthLabel, HEALTH_PILL_V2, pipelineProgressPercent,
} from '@/lib/design/theme-v2'
import { Pencil } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

type Props = {
  project: Project
  displayStage: string
  internal: boolean
  canEdit?: boolean
  canEditLinks?: boolean
  canEditCopy?: boolean
  canViewRpCuts?: boolean
  canEditRpCuts?: boolean
  canSendReminder?: boolean
  holidays?: string[]
  users: Profile[]
  graphicsDesigners: Profile[]
  history: StageHistory[]
  holdPeriods?: HoldPeriod[]
  comments: Comment[]
  rpCuts?: RpCut[]
}

export function ProjectDetailLayout({
  project, displayStage, internal, canEdit = true,
  canEditLinks = false, canEditCopy = false,
  canViewRpCuts = false, canEditRpCuts = false,
  canSendReminder = false,
  holidays = [], users, graphicsDesigners, history, holdPeriods = [], comments, rpCuts = [],
}: Props) {
  const currentAssignee = project.stage_assignee?.name ?? null
  const assigneeId = project.stage_assignee?.id
  const [editOpen, setEditOpen] = useState(false)
  const targetRelease = resolveTargetReleaseDate(project, holidays)
  const progress = pipelineProgressPercent(project.current_stage)
  const healthPill = HEALTH_PILL_V2[project.status_health] ?? 'bg-zinc-100 text-zinc-600 border-zinc-200'

  const pendingLinks = pendingContentCount(project, { checkLinks: canEditLinks, checkCopy: false })
  const pendingCopy = pendingContentCount(project, { checkLinks: false, checkCopy: canEditCopy })

  return (
    <div className="theme-v2 min-h-0 max-w-full space-y-4 pb-8 pt-1">
      <Link
        href="/board"
        className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-violet-600 transition-colors"
      >
        ← Board
      </Link>

      {/* Compact header */}
      <div className="rounded-xl border border-zinc-200/80 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
              {project.content_id}
            </span>
            <h1 className="text-base font-bold leading-snug text-zinc-900 sm:text-lg break-words">
              {project.title}
            </h1>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            {internal && (
              <span className={cn(
                'rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                healthPill,
              )}>
                {healthLabel(project.status_health)}
              </span>
            )}
            {canEdit && internal && (
              <>
                <ProjectHoldButton projectId={project.id} isOnHold={!!project.is_on_hold} />
                <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)} className="v2-btn-secondary h-7 text-xs px-2">
                  <Pencil size={11} /> Edit
                </Button>
                <DeleteProjectButton projectId={project.id} projectTitle={project.title} />
              </>
            )}
          </div>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="text-zinc-400">Assignee</span>
            {currentAssignee && assigneeId ? (
              <>
                <AssigneeAvatar name={currentAssignee} id={assigneeId} size="sm" theme="light" />
                <span className="font-medium text-zinc-800">{currentAssignee}</span>
              </>
            ) : (
              <span className="text-zinc-400">—</span>
            )}
          </span>
          <span><span className="text-zinc-400">Stage</span> <span className="font-medium text-zinc-800">{displayStage}</span></span>
          <span><span className="text-zinc-400">Release</span> <span className="font-medium text-zinc-800">{targetRelease ? formatDate(targetRelease, 'dd MMM yyyy') : '—'}</span></span>
          <span><span className="text-zinc-400">IP</span> <span className="font-medium text-zinc-800">{project.ip}{project.content_type ? ` · ${project.content_type}` : ''}</span></span>
          {internal && project.editor && (
            <span><span className="text-zinc-400">Editor</span> <span className="font-medium text-zinc-800">{project.editor}</span></span>
          )}
        </div>

        {internal && (
          <div className="mt-2.5 flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100">
              <div className="h-full rounded-full bg-violet-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <span className="shrink-0 text-[10px] font-semibold tabular-nums text-zinc-500">{progress}%</span>
          </div>
        )}

        {(pendingLinks > 0 || pendingCopy > 0) && (
          <p className="mt-2 text-[11px] text-amber-700">
            {pendingLinks + pendingCopy} field{pendingLinks + pendingCopy !== 1 ? 's' : ''} pending below
          </p>
        )}
      </div>

      <ProjectSectionsGrid
        project={project}
        comments={comments}
        rpCuts={rpCuts}
        canEditLinks={canEditLinks}
        canEditCopy={canEditCopy}
        canViewRpCuts={canViewRpCuts}
        canEditRpCuts={canEditRpCuts}
      />

      <section className="w-full min-w-0 overflow-x-auto">
          <div className="mb-3">
            <h2 className="text-base font-semibold text-zinc-900">Pipeline timeline</h2>
            {!internal && (
              <p className="mt-0.5 text-xs text-zinc-500">Your view of production stages</p>
            )}
            {internal && canEdit && (
              <p className="mt-0.5 text-xs text-zinc-500">Drag to move dates · resize edges</p>
            )}
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
            externalView={!internal}
          />
        </section>

      {internal && (
        <ProjectEditModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          project={project}
          users={users}
          holidays={holidays}
        />
      )}
    </div>
  )
}
