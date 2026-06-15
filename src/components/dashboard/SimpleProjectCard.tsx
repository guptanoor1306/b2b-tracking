import Link from 'next/link'
import { Project } from '@/lib/types'
import { Badge } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import { Calendar, User, Palette, ChevronRight } from 'lucide-react'

type Props = { project: Project }

export function SimpleProjectCard({ project }: Props) {

  return (
    <Link href={`/projects/${project.id}`} className="block glow-card p-4 group">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-zinc-100 truncate group-hover:text-indigo-300 transition-colors">
            {project.title}
          </p>
          <p className="text-xs text-zinc-600 mt-1 font-mono">{project.content_id} · {project.ip}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge label={project.status_health} variant="health" />
          <ChevronRight size={14} className="text-zinc-600 group-hover:text-indigo-400 transition-colors" />
        </div>
      </div>
      <div className="flex flex-wrap gap-3 mt-3 text-xs text-zinc-500">
        <span className="inline-flex items-center gap-1"><User size={11} />{project.stage_assignee?.name ?? '—'}</span>
        {project.graphic_designer?.name && (
          <span className="inline-flex items-center gap-1"><Palette size={11} />{project.graphic_designer.name}</span>
        )}
      </div>
      <div className="flex items-center gap-2 mt-3">
        <Badge label={project.current_stage} variant="stage" />
        <span className="text-xs text-zinc-600 inline-flex items-center gap-1">
          <Calendar size={11} />{formatDate(project.target_delivery_date)}
        </span>
      </div>
    </Link>
  )
}
