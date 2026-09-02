'use client'

import { useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Project, Comment, RpCut, ClientReviewSubmission, QcReviewSubmission } from '@/lib/types'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { CommentsSection } from '@/components/projects/CommentsSection'
import { ClientReviewFeedbackPanel } from '@/components/projects/ClientReviewFeedbackPanel'
import { QcReviewFeedbackPanel } from '@/components/projects/QcReviewFeedbackPanel'
import { isZerodhaClientReviewStage } from '@/lib/zerodha-sla'
import { updateProject, saveRpCuts, RpCutInput } from '@/lib/actions/projects'
import { ExternalLink, Plus, Trash2 } from 'lucide-react'
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

function TruncatedLink({ label, url }: { label: string; url: string | null | undefined }) {
  const raw = url?.trim()
  const href = raw
    ? (/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
    : null
  return (
    <div className="border-b border-zinc-100 py-2.5 last:border-0">
      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">{label}</p>
      {!href ? (
        <p className="mt-1 text-xs italic text-zinc-400">Not added</p>
      ) : (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          title={href}
          className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-violet-700 hover:text-violet-800"
        >
          <ExternalLink size={11} className="shrink-0" />
          <span className="truncate">{href}</span>
        </a>
      )}
    </div>
  )
}

function ReadCopy({ label, value }: { label: string; value: string | null | undefined }) {
  const text = value?.trim()
  return (
    <div className="border-b border-zinc-100 py-2.5 last:border-0">
      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">{label}</p>
      <p className={cn('mt-1 text-xs leading-relaxed break-words', text ? 'text-zinc-800' : 'italic text-zinc-400')}>
        {text || 'Not added'}
      </p>
    </div>
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
  const showQcReview = internalView && usesExternalIntakeFlow(project.channel)
  const showClientReview = showIntakeSidebar
  const canEditIntakeFields = canEditIntakeMaterials && !internalView
  const canEditReviewLinkFields = canEditLinks && internalView
  const canEditProductionLinkFields = canEditLinks && internalView

  const [links, setLinks] = useState({
    assets_link: project.assets_link ?? '',
    drive_link: showIntakeSidebar ? (intakeVideoLink ?? '') : (productionDriveLink ?? ''),
    script_link: project.script_link ?? '',
    screen_captures_link: project.screen_captures_link ?? '',
    audio_link: project.audio_link ?? '',
  })
  const [copy, setCopy] = useState({
    thumbnail_copy: project.thumbnail_copy ?? '',
    title_copy: project.title_copy ?? '',
  })
  const [cuts, setCuts] = useState<CutForm[]>(() =>
    rpCuts.length
      ? rpCuts.map(c => ({ id: c.id, timestamps: c.timestamps ?? '', thumbnail: c.thumbnail ?? '' }))
      : [{ timestamps: '', thumbnail: '' }],
  )

  const [linksLoading, setLinksLoading] = useState(false)
  const [copyLoading, setCopyLoading] = useState(false)
  const [intakeLoading, setIntakeLoading] = useState(false)
  const [cutsLoading, setCutsLoading] = useState(false)
  const [cutsError, setCutsError] = useState('')

  const saveLinks = async () => {
    setLinksLoading(true)
    await updateProject(project.id, {
      assets_link: links.assets_link.trim() || null,
      drive_link: links.drive_link.trim() || null,
      script_link: links.script_link.trim() || null,
      screen_captures_link: links.screen_captures_link.trim() || null,
      audio_link: links.audio_link.trim() || null,
    })
    setLinksLoading(false)
    router.refresh()
  }

  const saveIntakeMaterials = async () => {
    setIntakeLoading(true)
    await updateProject(project.id, {
      script_link: links.script_link.trim() || null,
      drive_link: links.drive_link.trim() || null,
      screen_captures_link: links.screen_captures_link.trim() || null,
      audio_link: links.audio_link.trim() || null,
      thumbnail_copy: copy.thumbnail_copy.trim() || null,
      title_copy: copy.title_copy.trim() || null,
    })
    setIntakeLoading(false)
    router.refresh()
  }

  const saveReviewLink = async () => {
    setLinksLoading(true)
    await updateProject(project.id, {
      assets_link: links.assets_link.trim() || null,
    })
    setLinksLoading(false)
    router.refresh()
  }

  const saveCopy = async () => {
    setCopyLoading(true)
    await updateProject(project.id, {
      thumbnail_copy: copy.thumbnail_copy.trim() || null,
      title_copy: copy.title_copy.trim() || null,
    })
    setCopyLoading(false)
    router.refresh()
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
    router.refresh()
  }

  const inActiveClientReview = showClientReview && isZerodhaClientReviewStage(project.current_stage)
  const commentsCanAdd = !inActiveClientReview || !canSubmitClientReview
  const filledCuts = cuts.filter(c => c.timestamps.trim() || c.thumbnail.trim()).length

  const reviewSection = (
    <SectionCard
      title={showIntakeSidebar ? 'Client review' : 'Content Links'}
      footer={canEditReviewLinkFields ? (
        <div className="flex justify-end">
          <Button size="sm" loading={linksLoading} onClick={showIntakeSidebar ? saveReviewLink : saveLinks}>Save</Button>
        </div>
      ) : undefined}
    >
      {canEditReviewLinkFields ? (
        <div className="space-y-3">
          <Input
            label="Review link"
            placeholder="Paste review link"
            value={links.assets_link}
            onChange={e => setLinks(l => ({ ...l, assets_link: e.target.value }))}
          />
          {!showIntakeSidebar && canEditProductionLinkFields && (
            <Input
              label="Drive video link"
              placeholder="Paste drive or video link"
              value={links.drive_link}
              onChange={e => setLinks(l => ({ ...l, drive_link: e.target.value }))}
            />
          )}
        </div>
      ) : (
        <>
          <TruncatedLink label="Review link" url={project.assets_link} />
          {!showIntakeSidebar && (
            <TruncatedLink label="Drive video link" url={productionDriveLink} />
          )}
        </>
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
      <div className="px-4 py-3">
        {canEditReviewLinkFields ? (
          <Input
            label="Review link"
            placeholder="Paste review link"
            value={links.assets_link}
            onChange={e => setLinks(l => ({ ...l, assets_link: e.target.value }))}
          />
        ) : (
          <TruncatedLink label="Review link" url={project.assets_link} />
        )}
      </div>
      {canEditReviewLinkFields && (
        <div className="border-t border-zinc-100 px-4 py-2.5">
          <Button size="sm" loading={linksLoading} onClick={saveReviewLink} className="w-full">
            Save review link
          </Button>
        </div>
      )}
    </div>
  )

  const materialsSidebar = (
    <div className="rounded-xl border border-zinc-200/90 bg-white shadow-sm">
      <div className="border-b border-zinc-100 px-4 py-2.5">
        <h3 className="text-sm font-semibold text-zinc-900">Submitted materials</h3>
        <p className="mt-0.5 text-[11px] text-zinc-500">Links and copy from the request</p>
      </div>
      <div className="px-4 py-1">
        {canEditIntakeFields ? (
          <div className="space-y-2 py-2">
            {isCashCopium ? (
              <Input label="Drive link" placeholder="https://..." value={links.drive_link} onChange={e => setLinks(l => ({ ...l, drive_link: e.target.value }))} />
            ) : (
              <>
                <Input label="Script link" placeholder="https://..." value={links.script_link} onChange={e => setLinks(l => ({ ...l, script_link: e.target.value }))} />
                <Input label="Video link" placeholder="https://..." value={links.drive_link} onChange={e => setLinks(l => ({ ...l, drive_link: e.target.value }))} />
                <Input label="Screen captures" placeholder="https://..." value={links.screen_captures_link} onChange={e => setLinks(l => ({ ...l, screen_captures_link: e.target.value }))} />
                <Input label="Audio link" placeholder="https://..." value={links.audio_link} onChange={e => setLinks(l => ({ ...l, audio_link: e.target.value }))} />
              </>
            )}
            <Textarea
              label="Thumbnail copy"
              placeholder="Text for the thumbnail"
              value={copy.thumbnail_copy}
              onChange={e => setCopy(c => ({ ...c, thumbnail_copy: e.target.value }))}
              rows={2}
            />
            {!isCashCopium && (
              <Textarea
                label="Title copy"
                placeholder="Title text"
                value={copy.title_copy}
                onChange={e => setCopy(c => ({ ...c, title_copy: e.target.value }))}
                rows={2}
              />
            )}
          </div>
        ) : (
          <>
            {isCashCopium ? (
              <TruncatedLink label="Drive link" url={intakeVideoLink} />
            ) : (
              <>
                <TruncatedLink label="Script link" url={project.script_link} />
                <TruncatedLink label="Video link" url={intakeVideoLink} />
                <TruncatedLink label="Screen captures" url={project.screen_captures_link} />
                <TruncatedLink label="Audio link" url={project.audio_link} />
              </>
            )}
            <ReadCopy label="Thumbnail copy" value={project.thumbnail_copy} />
            {!isCashCopium && <ReadCopy label="Title copy" value={project.title_copy} />}
            {isCashCopium && project.content_type === 'Reel' && (project.reel_timestamps ?? []).length > 0 && (
              <div className="border-b border-zinc-100 py-2.5 last:border-0">
                <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">Reel timestamps</p>
                <ul className="mt-1 space-y-1">
                  {(project.reel_timestamps ?? []).map((pair, i) => (
                    <li key={i} className="text-xs text-zinc-800">{pair.start} → {pair.end}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
      {canEditIntakeFields && (
        <div className="border-t border-zinc-100 px-4 py-2.5">
          <Button size="sm" loading={intakeLoading} onClick={saveIntakeMaterials} className="w-full">
            Save materials
          </Button>
        </div>
      )}
    </div>
  )

  const intakeRightColumn = (
    <aside className="space-y-4 lg:sticky lg:top-4">
      {materialsSidebar}
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
      <SectionCard
        title="Client Information"
        footer={canEditCopy ? (
          <div className="flex justify-end">
            <Button size="sm" loading={copyLoading} onClick={saveCopy}>Save</Button>
          </div>
        ) : undefined}
      >
        {canEditCopy ? (
          <div className="space-y-3">
            <Textarea label="Thumbnail copy" value={copy.thumbnail_copy} onChange={e => setCopy(c => ({ ...c, thumbnail_copy: e.target.value }))} rows={3} />
            <Textarea label="Title copy" value={copy.title_copy} onChange={e => setCopy(c => ({ ...c, title_copy: e.target.value }))} rows={3} />
          </div>
        ) : (
          <div className="space-y-2">
            <ReadCopy label="Thumbnail copy" value={project.thumbnail_copy} />
            <ReadCopy label="Title copy" value={project.title_copy} />
          </div>
        )}
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
