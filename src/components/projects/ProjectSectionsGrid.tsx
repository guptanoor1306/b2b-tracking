'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Project, Comment, RpCut } from '@/lib/types'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { CommentsSection } from '@/components/projects/CommentsSection'
import { updateProject, saveRpCuts, RpCutInput } from '@/lib/actions/projects'
import { ExternalLink, Plus, Trash2 } from 'lucide-react'
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
      'flex min-h-[220px] flex-col rounded-xl border border-zinc-200/90 bg-white shadow-sm',
      className,
    )}>
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-zinc-100 px-4 py-2.5">
        <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
        {badge}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">{children}</div>
      {footer && (
        <div className="shrink-0 border-t border-zinc-100 px-4 py-2.5">{footer}</div>
      )}
    </div>
  )
}

function ReadLink({ label, url }: { label: string; url: string | null | undefined }) {
  const href = url?.trim()
  return (
    <div className="rounded-lg bg-zinc-50/80 px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">{label}</p>
      {!href ? (
        <p className="mt-1 text-xs italic text-zinc-400">Not added</p>
      ) : (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 flex items-start gap-1 text-xs text-violet-700 hover:text-violet-800 break-all"
        >
          <ExternalLink size={11} className="mt-0.5 shrink-0" />
          <span className="line-clamp-3">{href}</span>
        </a>
      )}
    </div>
  )
}

function ReadCopy({ label, value }: { label: string; value: string | null | undefined }) {
  const text = value?.trim()
  return (
    <div className="rounded-lg bg-zinc-50/80 px-3 py-2">
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
  canViewRpCuts: boolean
  canEditRpCuts: boolean
}

export function ProjectSectionsGrid({
  project, comments, rpCuts,
  canEditLinks, canEditCopy, canViewRpCuts, canEditRpCuts,
}: Props) {
  const router = useRouter()
  const driveLink = project.drive_link || project.final_file_link

  const [links, setLinks] = useState({
    assets_link: project.assets_link ?? '',
    drive_link: driveLink ?? '',
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
  const [cutsLoading, setCutsLoading] = useState(false)
  const [cutsError, setCutsError] = useState('')

  const saveLinks = async () => {
    setLinksLoading(true)
    await updateProject(project.id, {
      assets_link: links.assets_link.trim() || null,
      drive_link: links.drive_link.trim() || null,
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

  const filledCuts = cuts.filter(c => c.timestamps.trim() || c.thumbnail.trim()).length

  return (
    <div className={cn(
      'grid gap-4',
      canViewRpCuts ? 'lg:grid-cols-2' : 'md:grid-cols-2',
    )}>
      {/* Row 1: Review Links | Client Information */}
      <SectionCard
        title="Review Links"
        footer={canEditLinks ? (
          <div className="flex justify-end">
            <Button size="sm" loading={linksLoading} onClick={saveLinks}>Save</Button>
          </div>
        ) : undefined}
      >
        {canEditLinks ? (
          <div className="space-y-3">
            <Input
              label="Asset link"
              placeholder="Paste asset link"
              value={links.assets_link}
              onChange={e => setLinks(l => ({ ...l, assets_link: e.target.value }))}
            />
            <Input
              label="Drive video link"
              placeholder="Paste drive or video link"
              value={links.drive_link}
              onChange={e => setLinks(l => ({ ...l, drive_link: e.target.value }))}
            />
          </div>
        ) : (
          <div className="space-y-2">
            <ReadLink label="Asset link" url={project.assets_link} />
            <ReadLink label="Drive video link" url={driveLink} />
          </div>
        )}
      </SectionCard>

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
            <Textarea
              label="Thumbnail copy"
              placeholder="Thumbnail text"
              value={copy.thumbnail_copy}
              onChange={e => setCopy(c => ({ ...c, thumbnail_copy: e.target.value }))}
              rows={3}
            />
            <Textarea
              label="Title copy"
              placeholder="Title text"
              value={copy.title_copy}
              onChange={e => setCopy(c => ({ ...c, title_copy: e.target.value }))}
              rows={3}
            />
          </div>
        ) : (
          <div className="space-y-2">
            <ReadCopy label="Thumbnail copy" value={project.thumbnail_copy} />
            <ReadCopy label="Title copy" value={project.title_copy} />
          </div>
        )}
      </SectionCard>

      {/* Row 2: Feedback | RP Cuts */}
      <SectionCard
        title="Feedback & Changes"
        badge={comments.length > 0 ? (
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500">
            {comments.length}
          </span>
        ) : undefined}
        className={!canViewRpCuts ? 'md:col-span-2' : undefined}
      >
        <CommentsSection projectId={project.id} comments={comments} canAdd variant="light" compact />
      </SectionCard>

      {canViewRpCuts && (
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
                  <div className="grid grid-cols-2 gap-2 text-xs">
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
      )}
    </div>
  )
}

export function pendingContentCount(
  project: Project,
  opts: { checkLinks: boolean; checkCopy: boolean },
): number {
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
