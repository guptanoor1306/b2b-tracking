'use client'

import { Project } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { resolveTargetReleaseDate } from '@/lib/timelines'
import { ExternalLink } from 'lucide-react'

type Props = {
  project: Project
  internal: boolean
  holidays?: string[]
}

function CopyBlock({ label, value, missing }: { label: string; value: string | null | undefined; missing?: boolean }) {
  const text = value?.trim()
  if (!text) {
    return (
      <div className="rounded-md border border-dashed border-amber-500/20 bg-amber-500/[0.03] px-3 py-2">
        <p className="text-[10px] text-zinc-600 uppercase tracking-wide">{label}</p>
        <p className="text-xs text-amber-500/70 italic mt-1">Not added yet</p>
      </div>
    )
  }
  return (
    <div className="rounded-md border border-white/[0.08] bg-[#141414] px-3 py-2">
      <p className="text-[10px] text-zinc-600 uppercase tracking-wide">{label}</p>
      <p className="text-xs text-zinc-200 mt-1 whitespace-pre-wrap break-words leading-relaxed">{text}</p>
    </div>
  )
}

function LinkBlock({ label, url }: { label: string; url: string | null | undefined }) {
  const href = url?.trim()
  if (!href) {
    return (
      <div className="rounded-md border border-dashed border-amber-500/20 bg-amber-500/[0.03] px-3 py-2">
        <p className="text-[10px] text-zinc-600 uppercase tracking-wide">{label}</p>
        <p className="text-xs text-amber-500/70 italic mt-1">Not added yet</p>
      </div>
    )
  }
  return (
    <div className="rounded-md border border-indigo-500/20 bg-indigo-500/[0.04] px-3 py-2">
      <p className="text-[10px] text-zinc-600 uppercase tracking-wide">{label}</p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-start gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 mt-1 break-all leading-relaxed"
      >
        <ExternalLink size={12} className="shrink-0 mt-0.5" />
        <span>{href}</span>
      </a>
    </div>
  )
}

export function ProjectDetailsSidebar({ project, internal, holidays = [] }: Props) {
  const driveLink = project.drive_link || project.final_file_link
  const assetLink = project.assets_link

  const meta: { label: string; value: string }[] = [
    { label: 'IP', value: project.ip || '—' },
    { label: 'Type', value: project.content_type || '—' },
    ...(internal ? [
      { label: 'Editor', value: project.editor ?? '—' },
      { label: 'Assignee', value: project.stage_assignee?.name ?? '—' },
      { label: 'Start', value: formatDate(project.received_date) },
      { label: 'Target release', value: formatDate(resolveTargetReleaseDate(project, holidays)) },
    ] : []),
  ]

  return (
    <aside className="panel p-3 lg:sticky lg:top-4 space-y-3">
      <div>
        <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Details</p>
        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
          {meta.map(m => (
            <div key={m.label} className="min-w-0">
              <p className="text-[10px] text-zinc-600">{m.label}</p>
              <p className="text-xs text-zinc-300 mt-0.5 truncate">{m.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-2 border-t border-white/[0.06] space-y-2">
        <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Copy & links</p>
        <CopyBlock label="Thumbnail copy" value={project.thumbnail_copy} />
        <CopyBlock label="Title copy" value={project.title_copy} />
        <LinkBlock label="Drive / video link" url={driveLink} />
        <LinkBlock label="Asset link" url={assetLink} />
      </div>
    </aside>
  )
}
