import { cn } from '@/lib/utils'
import { HEALTH_COLORS } from '@/lib/constants'

type BadgeVariant = 'health' | 'stage' | 'custom'

type BadgeProps = {
  label: string
  variant?: BadgeVariant
  className?: string
}

export function Badge({ label, variant = 'custom', className }: BadgeProps) {
  let colorClass = 'bg-white/5 text-zinc-400 border border-white/10'
  if (variant === 'health') colorClass = HEALTH_COLORS[label] ?? colorClass
  if (variant === 'stage') colorClass = 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'

  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap', colorClass, className)}>
      {label}
    </span>
  )
}
