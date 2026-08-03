'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/utils'

export type ReleaseScheduleItem = {
  id: string
  title: string
  target_delivery_date: string
  video_language?: string | null
  request_status?: string | null
}

type Props = {
  open: boolean
  onClose: () => void
  items: ReleaseScheduleItem[]
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function monthGridDays(month: Date): Date[] {
  const start = startOfMonth(month)
  const end = endOfMonth(month)
  const gridStart = new Date(start)
  const dow = (gridStart.getDay() + 6) % 7
  gridStart.setDate(gridStart.getDate() - dow)
  const gridEnd = new Date(end)
  const endDow = (gridEnd.getDay() + 6) % 7
  gridEnd.setDate(gridEnd.getDate() + (6 - endDow))
  return eachDayOfInterval({ start: gridStart, end: gridEnd })
}

export function ReleaseScheduleModal({ open, onClose, items }: Props) {
  const [anchorMonth, setAnchorMonth] = useState(() => startOfMonth(new Date()))

  const scheduled = useMemo(
    () => items.filter(i => i.target_delivery_date),
    [items],
  )

  const itemsByDate = useMemo(() => {
    const map = new Map<string, ReleaseScheduleItem[]>()
    for (const item of scheduled) {
      const key = item.target_delivery_date.slice(0, 10)
      const list = map.get(key) ?? []
      list.push(item)
      map.set(key, list)
    }
    return map
  }, [scheduled])

  const monthPrefix = format(anchorMonth, 'yyyy-MM')
  const monthCount = scheduled.filter(i => i.target_delivery_date.startsWith(monthPrefix)).length
  const days = monthGridDays(anchorMonth)
  const today = new Date()

  return (
    <Modal open={open} onClose={onClose} title="Release Schedule" size="lg">
      <div className="mb-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setAnchorMonth(m => subMonths(m, 1))}
          className="rounded-lg border border-zinc-200 p-2 text-zinc-600 hover:bg-zinc-50"
          aria-label="Previous month"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-zinc-900">{format(anchorMonth, 'MMMM yyyy')}</p>
          <p className="text-xs text-zinc-500">
            {monthCount} release{monthCount !== 1 ? 's' : ''} this month
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAnchorMonth(m => addMonths(m, 1))}
          className="rounded-lg border border-zinc-200 p-2 text-zinc-600 hover:bg-zinc-50"
          aria-label="Next month"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="rounded-lg border border-zinc-200 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-50">
          {WEEKDAYS.map(d => (
            <div key={d} className="border-r border-zinc-200 px-1 py-2 text-center text-[10px] font-semibold uppercase text-zinc-500 last:border-r-0">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map(day => {
            const key = format(day, 'yyyy-MM-dd')
            const entries = itemsByDate.get(key) ?? []
            const inMonth = isSameMonth(day, anchorMonth)
            const isToday = isSameDay(day, today)
            return (
              <div
                key={key}
                className={cn(
                  'min-h-[80px] border-b border-r border-zinc-200 p-1.5 last:border-r-0',
                  !inMonth && 'bg-zinc-50/80',
                )}
              >
                <div className={cn(
                  'mb-1 text-right text-[11px] font-medium tabular-nums',
                  inMonth ? 'text-zinc-700' : 'text-zinc-300',
                  isToday && 'font-bold text-blue-700',
                )}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-0.5">
                  {entries.map(item => {
                    const approved = item.request_status === 'approved' || !item.request_status
                    const label = item.video_language && item.video_language !== 'English'
                      ? `${item.title} (${item.video_language})`
                      : item.title
                    return (
                      <Link
                        key={item.id}
                        href={`/projects/${item.id}`}
                        className={cn(
                          'block rounded px-1 py-0.5 text-[9px] leading-tight line-clamp-2 hover:opacity-80',
                          approved
                            ? 'bg-emerald-100 text-emerald-900'
                            : 'bg-zinc-100 text-zinc-700',
                        )}
                        title={label}
                      >
                        {label}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Modal>
  )
}
