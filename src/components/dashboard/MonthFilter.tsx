'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { format, parse } from 'date-fns'
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { ALL_MONTHS, isAllMonths } from '@/lib/utils'
import { cn } from '@/lib/utils'

type Props = { month: string; variant?: 'dark' | 'light' }

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const

function parseMonthValue(month: string): { year: number; monthIndex: number } | null {
  if (isAllMonths(month)) return null
  try {
    const date = parse(month, 'yyyy-MM', new Date())
    return { year: date.getFullYear(), monthIndex: date.getMonth() }
  } catch {
    return null
  }
}

export function MonthFilter({ month, variant = 'light' }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const light = variant === 'light'
  const allSelected = isAllMonths(month)
  const selected = parseMonthValue(month)
  const [viewYear, setViewYear] = useState(() => selected?.year ?? new Date().getFullYear())

  useEffect(() => {
    if (open) setViewYear(selected?.year ?? new Date().getFullYear())
  }, [open, selected?.year])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const triggerLabel = useMemo(() => {
    if (allSelected) return 'All'
    try {
      return format(parse(month, 'yyyy-MM', new Date()), 'MMMM yyyy')
    } catch {
      return month
    }
  }, [month, allSelected])

  const pushMonth = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (isAllMonths(value)) params.delete('month')
    else params.set('month', value)
    const qs = params.toString()
    router.push(qs ? `${window.location.pathname}?${qs}` : window.location.pathname)
    setOpen(false)
  }

  const selectMonth = (monthIndex: number) => {
    const value = `${viewYear}-${String(monthIndex + 1).padStart(2, '0')}`
    pushMonth(value)
  }

  const isCurrentMonth = (monthIndex: number) => {
    const today = new Date()
    return viewYear === today.getFullYear() && monthIndex === today.getMonth()
  }

  const isSelectedMonth = (monthIndex: number) =>
    !allSelected && selected?.year === viewYear && selected.monthIndex === monthIndex

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cn(
          'inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium shadow-sm transition-colors',
          light
            ? 'border-zinc-200/80 bg-white text-zinc-800 hover:border-violet-300 hover:bg-violet-50/30'
            : 'glow-card-static text-zinc-200 hover:border-indigo-500/30',
          open && (light ? 'border-violet-300 bg-violet-50/40' : 'border-indigo-500/40'),
        )}
      >
        <CalendarDays size={16} className={cn('shrink-0', light ? 'text-violet-600' : 'text-indigo-400')} />
        <span>{triggerLabel}</span>
        <ChevronDown
          size={16}
          className={cn(
            'shrink-0 transition-transform',
            light ? 'text-zinc-400' : 'text-zinc-500',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Select month"
          className={cn(
            'absolute right-0 top-[calc(100%+8px)] z-50 w-[280px] rounded-xl border p-3 shadow-lg',
            light ? 'border-zinc-200 bg-white' : 'border-zinc-700 bg-zinc-900',
          )}
        >
          <button
            type="button"
            onClick={() => pushMonth(ALL_MONTHS)}
            className={cn(
              'mb-3 flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              allSelected
                ? light
                  ? 'bg-violet-100 text-violet-800'
                  : 'bg-indigo-500/20 text-indigo-200'
                : light
                  ? 'text-zinc-700 hover:bg-zinc-50'
                  : 'text-zinc-300 hover:bg-white/5',
            )}
          >
            <span>All time</span>
            {allSelected && <span className="text-xs font-semibold uppercase tracking-wide">Active</span>}
          </button>

          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewYear(y => y - 1)}
              className={cn(
                'rounded-lg p-1.5 transition-colors',
                light ? 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200',
              )}
              aria-label="Previous year"
            >
              <ChevronLeft size={16} />
            </button>
            <span className={cn('text-sm font-semibold', light ? 'text-zinc-900' : 'text-zinc-100')}>
              {viewYear}
            </span>
            <button
              type="button"
              onClick={() => setViewYear(y => y + 1)}
              className={cn(
                'rounded-lg p-1.5 transition-colors',
                light ? 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200',
              )}
              aria-label="Next year"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {MONTH_LABELS.map((label, monthIndex) => {
              const selectedMonth = isSelectedMonth(monthIndex)
              const currentMonth = isCurrentMonth(monthIndex)
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => selectMonth(monthIndex)}
                  className={cn(
                    'rounded-lg px-2 py-2 text-sm font-medium transition-colors',
                    selectedMonth
                      ? light
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'bg-indigo-500 text-white'
                      : currentMonth
                        ? light
                          ? 'border border-violet-200 bg-violet-50 text-violet-800'
                          : 'border border-indigo-400/40 bg-indigo-500/10 text-indigo-200'
                        : light
                          ? 'text-zinc-700 hover:bg-zinc-100'
                          : 'text-zinc-300 hover:bg-white/5',
                  )}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
