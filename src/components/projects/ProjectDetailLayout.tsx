'use client'

import { Project, Profile, StageHistory, Comment } from '@/lib/types'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ProjectDetailsSidebar } from '@/components/projects/ProjectDetailsSidebar'
import { ProjectEditModal } from '@/components/projects/ProjectEditModal'
import { ExternalProjectEditModal } from '@/components/projects/ExternalProjectEditModal'
import { DeleteProjectButton } from '@/components/projects/DeleteProjectButton'
import { CommentsSection } from '@/components/projects/CommentsSection'
import { Timeline } from '@/components/projects/Timeline'
import { resolveTargetReleaseDate } from '@/lib/timelines'
import { formatDate } from '@/lib/utils'
import { Pencil, AlertCircle, Clock } from 'lucide-react'
import { useState } from 'react'

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
    <div className="panel px-3 py-2.5 flex items-center justify-between gap-3 border-amber-500/20 bg-amber-500/[0.04]">
      <div className="flex items-start gap-2 min-w-0">
        <AlertCircle size={15} className="text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-200/90">
          {missing} item{missing !== 1 ? 's' : ''} pending — add links or copy
        </p>
      </div>
      <Button size="sm" variant="secondary" onClick={onEdit} className="shrink-0 text-xs h-7">
        Add now
      </Button>
    </div>
  )
}

export function ProjectDetailLayout({
  project, displayStage, internal, canEdit = true, canSendReminder = false,
  holidays = [], users, graphicsDesigners, history, comments,
}: Props) {
  const currentAssignee = project.stage_assignee?.name ?? null
  const [editOpen, setEditOpen] = useState(false)
  const targetRelease = resolveTargetReleaseDate(project, holidays)

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] text-zinc-600 font-mono">{project.content_id}</p>
          <h1 className="text-base font-semibold text-zinc-100 mt-0.5 leading-snug">{project.title}</h1>
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <Badge label={displayStage} variant="stage" className="text-[10px]" />
            {internal && <Badge label={project.status_health} variant="health" className="text-[10px]" />}
            {targetRelease && (
              <span className="text-[10px] text-zinc-500">
                Release {formatDate(targetRelease, 'dd MMM yyyy')}
              </span>
            )}
          </div>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)} className="h-8">
              <Pencil size={12} /> Edit
            </Button>
            {internal && (
              <DeleteProjectButton projectId={project.id} projectTitle={project.title} />
            )}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-[1fr_240px] gap-4 items-start">
        <div className="space-y-3 min-w-0 order-2 lg:order-1">
          {!internal && (
            <ClientAssetNudge project={project} onEdit={() => setEditOpen(true)} />
          )}

          <div className="panel p-3">
            <h2 className="text-xs font-medium text-zinc-400 mb-3">
              {internal ? 'Activity' : 'Feedback & comments'}
            </h2>
            <CommentsSection projectId={project.id} comments={comments} canAdd />
          </div>

          {history.length > 0 && (
            <div className="panel p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Clock size={13} className="text-indigo-400" />
                <h2 className="text-xs font-medium text-zinc-400">Stage timeline</h2>
                {canEdit && internal && (
                  <span className="text-[10px] text-zinc-600 ml-auto">Edit dates inline</span>
                )}
              </div>
              <Timeline
                history={history}
                currentStage={project.current_stage}
                projectId={project.id}
                currentAssignee={currentAssignee}
                canSendReminder={canSendReminder && internal}
                canEdit={canEdit && internal}
                holidays={holidays}
              />
            </div>
          )}
        </div>

        <div className="order-1 lg:order-2">
          <ProjectDetailsSidebar project={project} internal={internal} holidays={holidays} />
        </div>
      </div>

      {internal ? (
        <ProjectEditModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          project={project}
          users={users}
          graphicsDesigners={graphicsDesigners}
          holidays={holidays}
        />
      ) : (
        <ExternalProjectEditModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          project={project}
        />
      )}
    </>
  )
}
