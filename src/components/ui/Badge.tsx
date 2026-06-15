import { cn } from '@/lib/utils'
import { HEALTH_COLORS } from '@/lib/constants'

type BadgeVariant = 'health' | 'stage' | 'custom'

type BadgeProps = {
  label: string
  variant?: BadgeVariant
  className?: string
}

export function Badge({ label, variant = 'custom', className }: BadgeProps) {
  let colorClass = 'bg-zinc-100 text-zinc-600 border border-zinc-200'
  if (variant === 'health') colorClass = HEALTH_COLORS[label] ?? colorClass
  if (variant === 'stage') colorClass = 'bg-zinc-100 text-zinc-600 border border-zinc-200'

  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap', colorClass, className)}>
      {label}
    </span>
  )
}
