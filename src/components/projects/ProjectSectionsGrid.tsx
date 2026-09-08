'use client'

import { useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Project, Comment, RpCut, ClientReviewSubmission, QcReviewSubmission, ReelTimestampPair } from '@/lib/types'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { CommentsSection } from '@/components/projects/CommentsSection'
import { ClientReviewFeedbackPanel } from '@/components/projects/ClientReviewFeedbackPanel'
import { QcReviewFeedbackPanel } from '@/components/projects/QcReviewFeedbackPanel'
import { ProjectLinkField, ProjectTextField } from '@/components/projects/ProjectLinkField'
import { isZerodhaClientReviewStage } from '@/lib/zerodha-sla'
import { updateProject, saveRpCuts, RpCutInput } from '@/lib/actions/projects'
import { Plus, Trash2 } from 'lucide-react'
import { hasIntakeMaterials, isCashAndCopiumChannelDbName, usesExternalIntakeFlow } from '@/lib/zerodha-sla'
import { cn } from '@/lib/utils'

const MAX_CUTS = 10

type CutForm = { id?: string; timestamps: string; thumbnail: string }

function SectionCard({
  title,
  badge,
  children,
  footer,
  className,
}: {
  title: string
  badge?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn(
      'flex min-h-0 flex-col rounded-xl border border-zinc-200/90 bg-white shadow-sm',
      className,
    )}>
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-zinc-100 px-4 py-2.5">
        <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
        {badge}
      </div>
      <div className="min-h-0 flex-1 px-4 py-3">{children}</div>
      {footer && (
        <div className="shrink-0 border-t border-zinc-100 px-4 py-2.5">{footer}</div>
      )}
    </div>
  )
}

function normalizeReelTimestamps(raw: unknown): ReelTimestampPair[] {
  if (!raw || !Array.isArray(raw)) return []
  return raw
    .map(p => {
      if (!p || typeof p !== 'object') return null
      const pair = p as { start?: unknown; end?: unknown }
      return {
        start: String(pair.start ?? '').trim(),
        end: String(pair.end ?? '').trim(),
      }
    })
    .filter((p): p is ReelTimestampPair => !!p && (p.start.length > 0 || p.end.length > 0))
}

function ReelTimestampRows({ pairs }: { pairs: ReelTimestampPair[] }) {
  if (!pairs.length) {
    return (
      <div className="border-b border-zinc-100 py-2.5 last:border-0">
        <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">Timestamps</p>
        <p className="mt-1 text-xs italic text-zinc-400">Not added</p>
      </div>
    )
  }
  return (
    <>
      {pairs.map((pair, i) => (
        <div key={i} className="border-b border-zinc-100 py-2.5 last:border-0">
          <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
            {pairs.length > 1 ? `Timestamp ${i + 1}` : 'Timestamps'}
          </p>
          <p className="mt-1 text-xs text-zinc-800">
            {pair.start} → {pair.end}
          </p>
        </div>
      ))}
    </>
  )
}

type Props = {
  project: Project
  comments: Comment[]
  rpCuts: RpCut[]
  canEditLinks: boolean
  canEditCopy: boolean
  canEditIntakeMaterials?: boolean
  canViewRpCuts: boolean
  canEditRpCuts: boolean
  clientReviewSubmissions?: ClientReviewSubmission[]
  canSubmitClientReview?: boolean
  internalView?: boolean
  qcSubmissions?: QcReviewSubmission[]
  currentQcSubmission?: QcReviewSubmission | null
  canSubmitQcReview?: boolean
  pipeline?: ReactNode
}

export function ProjectSectionsGrid({
  project, comments, rpCuts,
  canEditLinks, canEditCopy, canEditIntakeMaterials = false, canViewRpCuts, canEditRpCuts,
  clientReviewSubmissions = [], canSubmitClientReview = false,
  internalView = false, qcSubmissions = [], currentQcSubmission = null, canSubmitQcReview = false,
  pipeline,
}: Props) {
  const router = useRouter()
  const intakeVideoLink = project.drive_link
  const productionDriveLink = project.drive_link || project.final_file_link
  const showIntakeSidebar = hasIntakeMaterials(project)
  const isCashCopium = isCashAndCopiumChannelDbName(project.channel)
  const reelTimestamps = normalizeReelTimestamps(project.reel_timestamps)
  const showReelTimestamps = isCashCopium && project.content_type === 'Reel'
  const showQcReview = internalView && usesExternalIntakeFlow(project.channel)
  const showClientReview = showIntakeSidebar
  const canEditIntakeFields = canEditIntakeMaterials && !internalView
  const canEditReviewLink = canEditLinks && internalView

  const [cuts, setCuts] = useState<CutForm[]>(() =>
    rpCuts.length
      ? rpCuts.map(c => ({ id: c.id, timestamps: c.timestamps ?? '', thumbnail: c.thumbnail ?? '' }))
      : [{ timestamps: '', thumbnail: '' }],
  )

  const [cutsLoading, setCutsLoading] = useState(false)
  const [cutsError, setCutsError] = useState('')

  const refresh = () => router.refresh()

  const saveLinkField = async (field: 'assets_link' | 'drive_link' | 'script_link' | 'screen_captures_link' | 'audio_link', value: string) => {
    await updateProject(project.id, { [field]: value.trim() || null })
    refresh()
  }

  const saveCopyField = async (field: 'thumbnail_copy' | 'title_copy', value: string) => {
    await updateProject(project.id, { [field]: value.trim() || null })
    refresh()
  }

  const saveCuts = async () => {
    setCutsLoading(true)
    setCutsError('')
    const payload: RpCutInput[] = cuts
      .filter(c => c.timestamps.trim() || c.thumbnail.trim())
      .map(c => ({ id: c.id, timestamps: c.timestamps, thumbnail: c.thumbnail }))
    const result = await saveRpCuts(project.id, payload)
    setCutsLoading(false)
    if (result.error) { setCutsError(result.error); return }
    refresh()
  }

  const inActiveClientReview = showClientReview && isZerodhaClientReviewStage(project.current_stage, project.channel)
  const commentsCanAdd = !inActiveClientReview || !canSubmitClientReview
  const filledCuts = cuts.filter(c => c.timestamps.trim() || c.thumbnail.trim()).length

  const reviewSection = (
    <SectionCard title={showIntakeSidebar ? 'Client review' : 'Content Links'}>
      <ProjectLinkField
        label="Review link"
        url={project.assets_link}
        canEdit={canEditReviewLink}
        onSave={value => saveLinkField('assets_link', value)}
      />
      {!showIntakeSidebar && (
        <ProjectLinkField
          label="Drive video link"
          url={productionDriveLink}
          canEdit={canEditReviewLink}
          onSave={value => saveLinkField('drive_link', value)}
        />
      )}
    </SectionCard>
  )

  const rpCutsSection = canViewRpCuts ? (
    <SectionCard
      title="RP Cuts"
      badge={filledCuts > 0 ? (
        <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700">
          {filledCuts} cut{filledCuts !== 1 ? 's' : ''}
        </span>
      ) : undefined}
      footer={canEditRpCuts ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {cuts.length < MAX_CUTS ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setCuts(prev => [...prev, { timestamps: '', thumbnail: '' }])}
            >
              <Plus size={14} /> Add cut
            </Button>
          ) : (
            <span className="text-xs text-zinc-400">Max {MAX_CUTS}</span>
          )}
          <Button size="sm" loading={cutsLoading} onClick={saveCuts}>Save cuts</Button>
        </div>
      ) : undefined}
    >
      {cutsError && <p className="mb-2 text-xs text-red-600">{cutsError}</p>}
      {canEditRpCuts ? (
        <div className="space-y-2">
          {cuts.map((cut, index) => (
            <div key={cut.id ?? `new-${index}`} className="rounded-lg border border-zinc-100 bg-zinc-50/60 p-2.5">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-zinc-500">Cut {index + 1}</span>
                {cuts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setCuts(prev => {
                      const next = prev.filter((_, i) => i !== index)
                      return next.length ? next : [{ timestamps: '', thumbnail: '' }]
                    })}
                    className="text-zinc-400 hover:text-red-600"
                    aria-label="Remove cut"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
              <div className="space-y-2">
                <Input
                  label="Timestamps"
                  placeholder="e.g. 0:00–0:45"
                  value={cut.timestamps}
                  onChange={e => setCuts(prev => prev.map((c, i) => i === index ? { ...c, timestamps: e.target.value } : c))}
                />
                <Input
                  label="Thumbnail"
                  placeholder="Thumbnail note or link"
                  value={cut.thumbnail}
                  onChange={e => setCuts(prev => prev.map((c, i) => i === index ? { ...c, thumbnail: e.target.value } : c))}
                />
              </div>
            </div>
          ))}
        </div>
      ) : filledCuts > 0 ? (
        <div className="space-y-2">
          {cuts.filter(c => c.timestamps.trim() || c.thumbnail.trim()).map((cut, index) => (
            <div key={cut.id ?? index} className="rounded-lg border border-zinc-100 bg-zinc-50/60 px-3 py-2">
              <p className="text-[11px] font-semibold text-zinc-500 mb-1.5">Cut {index + 1}</p>
              <div className="space-y-2 text-xs">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-zinc-400">Timestamps</p>
                  <p className="mt-0.5 text-zinc-800">{cut.timestamps.trim() || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-zinc-400">Thumbnail</p>
                  <p className="mt-0.5 text-zinc-800 break-words">{cut.thumbnail.trim() || '—'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs italic text-zinc-400">No RP cuts yet.</p>
      )}
    </SectionCard>
  ) : null

  const reviewMaterialsCard = (
    <div className="rounded-xl border border-zinc-200/90 bg-white shadow-sm">
      <div className="border-b border-zinc-100 px-4 py-2.5">
        <h3 className="text-sm font-semibold text-zinc-900">Review materials</h3>
        <p className="mt-0.5 text-[11px] text-zinc-500">Internal client review link</p>
      </div>
      <div className="px-4 py-1">
        <ProjectLinkField
          label="Review link"
          url={project.assets_link}
          canEdit={canEditReviewLink}
          onSave={value => saveLinkField('assets_link', value)}
        />
      </div>
    </div>
  )

  const materialsSidebar = (
    <div className="rounded-xl border border-zinc-200/90 bg-white shadow-sm">
      <div className="border-b border-zinc-100 px-4 py-2.5">
        <h3 className="text-sm font-semibold text-zinc-900">Submitted materials</h3>
        <p className="mt-0.5 text-[11px] text-zinc-500">Links and copy from the request</p>
      </div>
      <div className="px-4 py-1">
        {isCashCopium ? (
          <ProjectLinkField
            label="Drive link"
            url={intakeVideoLink}
            canEdit={canEditIntakeFields}
            onSave={value => saveLinkField('drive_link', value)}
          />
        ) : (
          <>
            <ProjectLinkField
              label="Script link"
              url={project.script_link}
              canEdit={canEditIntakeFields}
              onSave={value => saveLinkField('script_link', value)}
            />
            <ProjectLinkField
              label="Video link"
              url={intakeVideoLink}
              canEdit={canEditIntakeFields}
              onSave={value => saveLinkField('drive_link', value)}
            />
            <ProjectLinkField
              label="Screen captures"
              url={project.screen_captures_link}
              canEdit={canEditIntakeFields}
              onSave={value => saveLinkField('screen_captures_link', value)}
            />
            <ProjectLinkField
              label="Audio link"
              url={project.audio_link}
              canEdit={canEditIntakeFields}
              onSave={value => saveLinkField('audio_link', value)}
            />
          </>
        )}
        <ProjectTextField
          label="Thumbnail copy"
          value={project.thumbnail_copy}
          canEdit={canEditIntakeFields}
          onSave={value => saveCopyField('thumbnail_copy', value)}
          multiline
          placeholder="Text for the thumbnail"
        />
        {!isCashCopium && (
          <ProjectTextField
            label="Title copy"
            value={project.title_copy}
            canEdit={canEditIntakeFields}
            onSave={value => saveCopyField('title_copy', value)}
            multiline
            placeholder="Title text"
          />
        )}
      </div>
    </div>
  )

  const reelTimestampsCard = showReelTimestamps ? (
    <div className="rounded-xl border border-zinc-200/90 bg-white shadow-sm">
      <div className="border-b border-zinc-100 px-4 py-2.5">
        <h3 className="text-sm font-semibold text-zinc-900">Reel timestamps</h3>
        <p className="mt-0.5 text-[11px] text-zinc-500">Start / end from the request</p>
      </div>
      <div className="px-4 py-1">
        <ReelTimestampRows pairs={reelTimestamps} />
      </div>
    </div>
  ) : null

  const intakeRightColumn = (
    <aside className="space-y-4 lg:sticky lg:top-4">
      {materialsSidebar}
      {reelTimestampsCard}
      {reviewMaterialsCard}
      {rpCutsSection}
    </aside>
  )

  if (showIntakeSidebar) {
    return (
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
        <div className="flex min-w-0 flex-col gap-4">
          <SectionCard
            title="Feedback & Changes"
            badge={comments.length > 0 ? (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500">
                {comments.length}
              </span>
            ) : undefined}
            className="min-h-[min(560px,72vh)]"
          >
            {showQcReview && (
              <div className="mb-4">
                <QcReviewFeedbackPanel
                  projectId={project.id}
                  channelDbName={project.channel}
                  currentStage={project.current_stage}
                  canSubmit={canSubmitQcReview}
                  qcSubmissions={qcSubmissions}
                  currentQcSubmission={currentQcSubmission}
                />
              </div>
            )}
            {showClientReview && (
              <div className="mb-4">
                <ClientReviewFeedbackPanel
                projectId={project.id}
                channelDbName={project.channel}
                currentStage={project.current_stage}
                canSubmit={canSubmitClientReview}
                submissions={clientReviewSubmissions}
              />
              </div>
            )}
            <CommentsSection projectId={project.id} comments={comments} canAdd={commentsCanAdd} variant="light" />
          </SectionCard>
          {pipeline}
        </div>
        {intakeRightColumn}
      </div>
    )
  }

  return (
    <div className={cn('grid gap-4', canViewRpCuts ? 'lg:grid-cols-2' : 'md:grid-cols-2')}>
      {reviewSection}
      <SectionCard title="Client Information">
        <ProjectTextField
          label="Thumbnail copy"
          value={project.thumbnail_copy}
          canEdit={canEditCopy}
          onSave={value => saveCopyField('thumbnail_copy', value)}
          multiline
        />
        <ProjectTextField
          label="Title copy"
          value={project.title_copy}
          canEdit={canEditCopy}
          onSave={value => saveCopyField('title_copy', value)}
          multiline
        />
      </SectionCard>
      <SectionCard
        title="Feedback & Changes"
        badge={comments.length > 0 ? (
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500">{comments.length}</span>
        ) : undefined}
        className={!canViewRpCuts ? 'md:col-span-2' : undefined}
      >
        {showQcReview && (
          <div className="mb-4">
            <QcReviewFeedbackPanel
              projectId={project.id}
              channelDbName={project.channel}
              currentStage={project.current_stage}
              canSubmit={canSubmitQcReview}
              qcSubmissions={qcSubmissions}
              currentQcSubmission={currentQcSubmission}
            />
          </div>
        )}
        <CommentsSection projectId={project.id} comments={comments} canAdd variant="light" compact />
      </SectionCard>
      {rpCutsSection}
    </div>
  )
}

export function pendingContentCount(
  project: Project,
  opts: { checkLinks: boolean; checkCopy: boolean; intakeView?: boolean },
): number {
  if (opts.intakeView) return 0
  let n = 0
  if (opts.checkLinks) {
    if (!project.assets_link?.trim()) n++
    if (!(project.drive_link || project.final_file_link)?.trim()) n++
  }
  if (opts.checkCopy) {
    if (!project.thumbnail_copy?.trim()) n++
    if (!project.title_copy?.trim()) n++
  }
  return n
}

export function isProjectIntakeView(project: Project): boolean {
  return hasIntakeMaterials(project)
}
