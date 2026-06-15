import { Project } from '@/lib/types'
import { getProjectTimeliness, resolveTargetReleaseDate } from '@/lib/timelines'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

type Props = {
  project: Pick<Project, 'current_stage' | 'last_status_update_at' | 'target_delivery_date' | 'received_date'>
  holidays?: string[]
  compact?: boolean
}

export function ProjectTimeliness({ project, holidays = [], compact }: Props) {
  const t = getProjectTimeliness(project, holidays)
  const target = resolveTargetReleaseDate(project, holidays)

  if (compact) {
    return (
      <div className="flex items-center justify-between gap-2 mt-1 text-[10px] min-h-[14px]">
        {t.showLabel ? (
          <span className={cn('font-medium', t.textClass)}>{t.label}</span>
        ) : (
          <span />
        )}
        {target && t.status !== 'delivered' && (
          <span className="text-zinc-600 shrink-0">→ {formatDate(target, 'dd MMM')}</span>
        )}
      </div>
    )
  }

  return null
}

export function getTimelinessBorderClass(
  project: Pick<Project, 'current_stage' | 'last_status_update_at' | 'target_delivery_date' | 'received_date'>,
  holidays: string[] = []
): string {
  return getProjectTimeliness(project, holidays).borderClass
}
