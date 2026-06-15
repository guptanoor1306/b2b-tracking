import Link from 'next/link'
import { Project } from '@/lib/types'
import { Badge } from '@/components/ui/Badge'
import { ChevronRight } from 'lucide-react'

type Props = { project: Project }

export function CompactProjectRow({ project }: Props) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-white/[0.03] transition-colors group"
    >
      <p className="flex-1 min-w-0 text-sm font-medium text-zinc-200 truncate group-hover:text-indigo-300 transition-colors">
        {project.title}
      </p>
      <Badge label={project.current_stage} variant="stage" className="shrink-0 max-w-[120px] truncate" />
      <Badge label={project.status_health} variant="health" className="shrink-0" />
      <ChevronRight size={14} className="text-zinc-600 group-hover:text-indigo-400 shrink-0" />
    </Link>
  )
}
