'use client'

import { Project } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { resolveTargetReleaseDate } from '@/lib/timelines'
import { ExternalLink } from 'lucide-react'

type Props = {
  project: Project
  internal: boolean
  holidays?: string[]
  variant?: 'default' | 'v2'
}

function CopyBlock({ label, value, missing, v2 }: { label: string; value: string | null | undefined; missing?: boolean; v2?: boolean }) {
  const text = value?.trim()
  if (!text) {
    return (
      <div className={v2
        ? 'rounded-lg border border-dashed border-amber-200 bg-amber-50/50 px-3 py-2'
        : 'rounded-md border border-dashed border-amber-500/20 bg-amber-500/[0.03] px-3 py-2'
      }>
        <p className={v2 ? 'text-[10px] text-zinc-400 uppercase tracking-wide' : 'text-[10px] text-zinc-600 uppercase tracking-wide'}>{label}</p>
        <p className={v2 ? 'text-xs text-amber-600 italic mt-1' : 'text-xs text-amber-500/70 italic mt-1'}>Not added yet</p>
      </div>
    )
  }
  return (
    <div className={v2
      ? 'rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2'
      : 'rounded-md border border-white/[0.08] bg-[#141414] px-3 py-2'
    }>
      <p className={v2 ? 'text-[10px] text-zinc-400 uppercase tracking-wide' : 'text-[10px] text-zinc-600 uppercase tracking-wide'}>{label}</p>
      <p className={v2 ? 'text-xs text-zinc-700 mt-1 whitespace-pre-wrap break-words leading-relaxed' : 'text-xs text-zinc-200 mt-1 whitespace-pre-wrap break-words leading-relaxed'}>{text}</p>
    </div>
  )
}

function LinkBlock({ label, url, v2 }: { label: string; url: string | null | undefined; v2?: boolean }) {
  const href = url?.trim()
  if (!href) {
    return (
      <div className={v2
        ? 'rounded-lg border border-dashed border-amber-200 bg-amber-50/50 px-3 py-2'
        : 'rounded-md border border-dashed border-amber-500/20 bg-amber-500/[0.03] px-3 py-2'
      }>
        <p className={v2 ? 'text-[10px] text-zinc-400 uppercase tracking-wide' : 'text-[10px] text-zinc-600 uppercase tracking-wide'}>{label}</p>
        <p className={v2 ? 'text-xs text-amber-600 italic mt-1' : 'text-xs text-amber-500/70 italic mt-1'}>Not added yet</p>
      </div>
    )
  }
  return (
    <div className={v2
      ? 'rounded-lg border border-violet-100 bg-violet-50/50 px-3 py-2'
      : 'rounded-md border border-indigo-500/20 bg-indigo-500/[0.04] px-3 py-2'
    }>
      <p className={v2 ? 'text-[10px] text-zinc-400 uppercase tracking-wide' : 'text-[10px] text-zinc-600 uppercase tracking-wide'}>{label}</p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={v2
          ? 'inline-flex items-start gap-1.5 text-xs text-violet-600 hover:text-violet-700 mt-1 break-all leading-relaxed'
          : 'inline-flex items-start gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 mt-1 break-all leading-relaxed'
        }
      >
        <ExternalLink size={12} className="shrink-0 mt-0.5" />
        <span>{href}</span>
      </a>
    </div>
  )
}

export function ProjectDetailsSidebar({ project, internal, holidays = [], variant = 'default' }: Props) {
  const driveLink = project.drive_link || project.final_file_link
  const assetLink = project.assets_link
  const v2 = variant === 'v2'

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
    <aside className={v2
      ? 'rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm lg:sticky lg:top-4 space-y-4'
      : 'panel p-3 lg:sticky lg:top-4 space-y-3'
    }>
      <div>
        <p className={v2
          ? 'text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-2'
          : 'text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-2'
        }>
          {v2 ? 'Project details' : 'Details'}
        </p>
        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
          {meta.map(m => (
            <div key={m.label} className="min-w-0">
              <p className={v2 ? 'text-[10px] text-zinc-400' : 'text-[10px] text-zinc-600'}>{m.label}</p>
              <p className={v2 ? 'text-xs font-medium text-zinc-800 mt-0.5 truncate' : 'text-xs text-zinc-300 mt-0.5 truncate'}>{m.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className={v2 ? 'pt-2 border-t border-zinc-100 space-y-2' : 'pt-2 border-t border-white/[0.06] space-y-2'}>
        <p className={v2
          ? 'text-[10px] font-semibold uppercase tracking-wider text-zinc-400'
          : 'text-[10px] font-medium text-zinc-500 uppercase tracking-wider'
        }>
          Copy & links
        </p>
        <CopyBlock label="Thumbnail copy" value={project.thumbnail_copy} v2={v2} />
        <CopyBlock label="Title copy" value={project.title_copy} v2={v2} />
        <LinkBlock label="Drive / video link" url={driveLink} v2={v2} />
        <LinkBlock label="Review link" url={assetLink} v2={v2} />
      </div>
    </aside>
  )
}
