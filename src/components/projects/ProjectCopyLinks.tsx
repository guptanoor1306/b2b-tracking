'use client'

import { Project } from '@/lib/types'
import { ExternalLink } from 'lucide-react'

function CopyBlock({ label, value }: { label: string; value: string | null | undefined }) {
  const text = value?.trim()
  if (!text) {
    return (
      <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50/50 px-3 py-2">
        <p className="text-[10px] text-zinc-400 uppercase tracking-wide">{label}</p>
        <p className="text-xs text-amber-600 italic mt-1">Not added yet</p>
      </div>
    )
  }
  return (
    <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2">
      <p className="text-[10px] text-zinc-400 uppercase tracking-wide">{label}</p>
      <p className="text-xs text-zinc-700 mt-1 whitespace-pre-wrap break-words leading-relaxed">{text}</p>
    </div>
  )
}

function LinkBlock({ label, url }: { label: string; url: string | null | undefined }) {
  const href = url?.trim()
  if (!href) {
    return (
      <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50/50 px-3 py-2">
        <p className="text-[10px] text-zinc-400 uppercase tracking-wide">{label}</p>
        <p className="text-xs text-amber-600 italic mt-1">Not added yet</p>
      </div>
    )
  }
  return (
    <div className="rounded-lg border border-violet-100 bg-violet-50/50 px-3 py-2">
      <p className="text-[10px] text-zinc-400 uppercase tracking-wide">{label}</p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-start gap-1.5 text-xs text-violet-600 hover:text-violet-700 mt-1 break-all leading-relaxed"
      >
        <ExternalLink size={12} className="shrink-0 mt-0.5" />
        <span className="line-clamp-2">{href}</span>
      </a>
    </div>
  )
}

export function ProjectCopyLinks({ project }: { project: Project }) {
  const driveLink = project.drive_link || project.final_file_link

  return (
    <aside className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm lg:sticky lg:top-4 space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
        Copy & links
      </p>
      <CopyBlock label="Thumbnail copy" value={project.thumbnail_copy} />
      <CopyBlock label="Title copy" value={project.title_copy} />
      <LinkBlock label="Drive / video link" url={driveLink} />
      <LinkBlock label="Review link" url={project.assets_link} />
    </aside>
  )
}
