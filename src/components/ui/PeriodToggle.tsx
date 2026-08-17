'use client'

import { cn } from '@/lib/utils'

type Props = {
  period: 'week' | 'month'
  onChange: (period: 'week' | 'month') => void
  className?: string
}

export function PeriodToggle({ period, onChange, className }: Props) {
  return (
    <div
      className={cn(
        'inline-flex rounded-xl border border-zinc-200 bg-zinc-100/80 p-1 shadow-sm',
        className,
      )}
      role="group"
      aria-label="Time period"
    >
      {(['week', 'month'] as const).map(p => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          aria-pressed={period === p}
          className={cn(
            'min-h-11 min-w-[5.75rem] rounded-lg px-4 text-sm font-medium transition-all',
            'touch-manipulation select-none',
            'active:scale-[0.97] active:transition-transform',
            period === p
              ? 'bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200/90'
              : 'text-zinc-600 hover:bg-white/60 hover:text-zinc-900 active:bg-white/80',
          )}
        >
          {p === 'week' ? 'Weekly' : 'Monthly'}
        </button>
      ))}
    </div>
  )
}
