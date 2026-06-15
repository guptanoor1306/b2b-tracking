'use client'

import { useMemo, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { format, parse } from 'date-fns'
import { CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = { month: string; variant?: 'dark' | 'light' }

export function MonthFilter({ month, variant = 'dark' }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inputRef = useRef<HTMLInputElement>(null)
  const light = variant === 'light'

  const displayLabel = useMemo(() => {
    try {
      return format(parse(month, 'yyyy-MM', new Date()), 'MMMM yyyy')
    } catch {
      return month
    }
  }, [month])

  const onChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('month', value)
    router.push(`${window.location.pathname}?${params.toString()}`)
  }

  const openPicker = () => {
    const el = inputRef.current
    if (!el) return
    if (typeof el.showPicker === 'function') el.showPicker()
    else el.click()
  }

  return (
    <button
      type="button"
      onClick={openPicker}
      className={cn(
        'inline-flex items-center gap-2.5 px-4 py-2.5 cursor-pointer rounded-xl border shadow-sm transition-colors',
        light
          ? 'bg-white border-zinc-200/80 hover:border-violet-300 hover:bg-violet-50/30'
          : 'glow-card-static hover:border-indigo-500/30'
      )}
    >
      <CalendarDays size={16} className={cn('shrink-0', light ? 'text-violet-600' : 'text-indigo-400')} />
      <span className={cn('text-sm font-medium', light ? 'text-zinc-800' : 'text-zinc-200')}>
        {displayLabel}
      </span>
      <input
        ref={inputRef}
        type="month"
        value={month}
        onChange={e => onChange(e.target.value)}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
      />
    </button>
  )
}
