import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { differenceInDays, differenceInHours, format, parseISO, isValid, startOfMonth, endOfMonth } from 'date-fns'
import { StageHistory, HoldPeriod } from '@/lib/types'
import { FINAL_STAGE } from '@/lib/constants'
import { businessHoursBetween, businessHoursBetweenExcluding, splitBusinessHours } from '@/lib/businessTime'
import { effectiveStageStartIso } from '@/lib/pipeline-parallel'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr: string | null | undefined, fmt = 'dd MMM yyyy'): string {
  if (!dateStr) return '—'
  try {
    const d = parseISO(dateStr)
    return isValid(d) ? format(d, fmt) : '—'
  } catch {
    return '—'
  }
}

export function daysAgo(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null
  try {
    const d = parseISO(dateStr)
    return isValid(d) ? differenceInDays(new Date(), d) : null
  } catch {
    return null
  }
}

export function daysInStage(lastChangedAt: string | null | undefined): number {
  if (!lastChangedAt) return 0
  return Math.max(0, daysAgo(lastChangedAt) ?? 0)
}

export function calcHealth(
  currentStage: string,
  targetDate: string | null | undefined
): string {
  if (currentStage === FINAL_STAGE || currentStage === 'Final Delivery') return 'Delivered'
  if (currentStage === 'Hold') return 'On hold'
  if (!targetDate) return 'On track'
  const diff = differenceInDays(parseISO(targetDate), new Date())
  if (diff < 0) return 'Delayed'
  if (diff <= 3) return 'At risk'
  return 'On track'
}

export function getMonthYear(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  try {
    return format(parseISO(dateStr), 'yyyy-MM')
  } catch {
    return ''
  }
}

export function truncate(str: string, len = 40): string {
  return str.length > len ? str.slice(0, len) + '…' : str
}

export function currentMonth(): string {
  return format(new Date(), 'yyyy-MM')
}

export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return format(new Date(y, m - 1), 'MMMM yyyy')
}

export function isDateInMonth(dateStr: string | null | undefined, month: string): boolean {
  if (!dateStr || !month) return false
  const [year, m] = month.split('-').map(Number)
  const start = format(startOfMonth(new Date(year, m - 1)), 'yyyy-MM-dd')
  const end = format(endOfMonth(new Date(year, m - 1)), 'yyyy-MM-dd')
  return dateStr >= start && dateStr <= end
}

export type StageDuration = {
  stage: string
  startedAt: string
  endedAt: string | null
  days: number
  hours: number
}

export function stageHistoryEntries(history: StageHistory[]): StageHistory[] {
  return [...history]
    .filter(h => !h.is_hold_event)
    .sort((a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime())
}

export function computeStageDurations(history: StageHistory[], holidays: string[] = [], holdPeriods: HoldPeriod[] = []): StageDuration[] {
  const sorted = stageHistoryEntries(history)
  const exclude = holdPeriods.map(p => ({
    start: parseISO(p.started_at),
    end: p.ended_at ? parseISO(p.ended_at) : new Date(),
  }))
  return sorted.map((item, i) => {
    const startedAt = effectiveStageStartIso(sorted, item)
    const start = parseISO(startedAt)
    const end = sorted[i + 1] ? parseISO(sorted[i + 1].changed_at) : new Date()
    const totalHours = businessHoursBetweenExcluding(start, end, holidays, exclude)
    const { days, hours } = splitBusinessHours(totalHours)
    return {
      stage: item.new_stage,
      startedAt,
      endedAt: sorted[i + 1]?.changed_at ?? null,
      days,
      hours,
    }
  })
}

export function formatWaitingSince(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    const d = parseISO(dateStr)
    if (!isValid(d)) return '—'
    const totalHours = Math.max(1, differenceInHours(new Date(), d))
    if (totalHours < 24) return `${totalHours} hour${totalHours !== 1 ? 's' : ''}`
    const days = differenceInDays(new Date(), d)
    return `${days} day${days !== 1 ? 's' : ''}`
  } catch {
    return '—'
  }
}

export function isTimestampInMonth(dateStr: string, month: string): boolean {
  if (!dateStr || !month) return false
  const [year, m] = month.split('-').map(Number)
  const start = startOfMonth(new Date(year, m - 1))
  const end = endOfMonth(start)
  const d = parseISO(dateStr)
  return isValid(d) && d >= start && d <= end
}

export function formatDuration(days: number, hours: number): string {
  if (days === 0 && hours === 0) return '< 1 hour'
  if (days === 0) return `${hours}h`
  if (hours === 0) return `${days}d`
  return `${days}d ${hours}h`
}

export function sumDurations(durations: Pick<StageDuration, 'days' | 'hours'>[]): { days: number; hours: number } {
  const totalHours = durations.reduce((sum, d) => sum + d.days * 24 + d.hours, 0)
  return { days: Math.floor(totalHours / 24), hours: totalHours % 24 }
}
