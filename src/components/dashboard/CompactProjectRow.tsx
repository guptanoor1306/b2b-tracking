import Link from 'next/link'
import { Project, Profile } from '@/lib/types'
import { Badge } from '@/components/ui/Badge'
import { AssigneeAvatar } from '@/components/ui/AssigneeAvatar'
import { HEALTH_PILL_V2 } from '@/lib/design/theme-v2'
import { AssigneeContext, DisplayProfile, getProjectDisplayAssignee } from '@/lib/projects/display-assignee'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  project: Project
  variant?: 'dark' | 'light'
  assigneeContext?: AssigneeContext
  holdStarter?: DisplayProfile | null
}

export function CompactProjectRow({
  project, variant = 'dark', assigneeContext = 'stage', holdStarter,
}: Props) {
  const light = variant === 'light'
  const pill = HEALTH_PILL_V2[project.status_health]
  const displayAssignee = getProjectDisplayAssignee(project, assigneeContext, holdStarter)

  return (
    <Link
      href={`/projects/${project.id}`}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors group',
        light ? 'hover:bg-zinc-50' : 'hover:bg-white/[0.03]'
      )}
    >
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm font-semibold truncate transition-colors',
          light ? 'text-zinc-900 group-hover:text-violet-700' : 'text-zinc-200 group-hover:text-indigo-300'
        )}>
          {project.title}
        </p>
        <p className={cn('text-[11px] mt-0.5 truncate', light ? 'text-zinc-500' : 'text-zinc-600')}>
          {project.current_stage}
        </p>
      </div>
      {light && pill ? (
        <span className={cn('shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold', pill)}>
          {project.status_health}
        </span>
      ) : (
        <>
          <Badge label={project.current_stage} variant="stage" className="shrink-0 max-w-[120px] truncate hidden sm:inline-flex" />
          <Badge label={project.status_health} variant="health" className="shrink-0" />
        </>
      )}
      {light && displayAssignee && (
        <AssigneeAvatar
          name={displayAssignee.name}
          id={displayAssignee.id}
          size="sm"
          theme="light"
        />
      )}
      <ChevronRight size={14} className={cn(
        'shrink-0 transition-colors',
        light ? 'text-zinc-300 group-hover:text-violet-500' : 'text-zinc-600 group-hover:text-indigo-400'
      )} />
    </Link>
  )
}
