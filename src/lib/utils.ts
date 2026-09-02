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
  if (isAllMonths(month)) return 'All time'
  const [y, m] = month.split('-').map(Number)
  return format(new Date(y, m - 1), 'MMMM yyyy')
}

export const ALL_MONTHS = 'all'

export function isAllMonths(month: string | null | undefined): boolean {
  return !month || month === ALL_MONTHS
}

export function isDateInMonth(dateStr: string | null | undefined, month: string): boolean {
  if (!dateStr || !month || isAllMonths(month)) return false
  const [year, m] = month.split('-').map(Number)
  const start = format(startOfMonth(new Date(year, m - 1)), 'yyyy-MM-dd')
  const end = format(endOfMonth(new Date(year, m - 1)), 'yyyy-MM-dd')
  return dateStr >= start && dateStr <= end
}

type MonthFilterProject = {
  current_stage?: string
  received_date: string | null
  picked_up_date: string | null
  delivered_date: string | null
  last_status_update_at?: string | null
  on_hold_since?: string | null
  target_delivery_date?: string | null
  created_at?: string | null
}


function monthBounds(month: string): { start: string; end: string } {
  const [year, m] = month.split('-').map(Number)
  const anchor = new Date(year, m - 1)
  return {
    start: format(startOfMonth(anchor), 'yyyy-MM-dd'),
    end: format(endOfMonth(anchor), 'yyyy-MM-dd'),
  }
}

function projectLifecycleAnchor(project: MonthFilterProject): string | null {
  return (
    project.received_date
    ?? project.picked_up_date
    ?? project.created_at
    ?? project.last_status_update_at
    ?? null
  )?.slice(0, 10) ?? null
}

/**
 * Non-delivered projects stay visible from their start month through every later month
 * until delivery. Delivered projects are handled separately via isDeliveredInMonth.
 */
export function isActiveProjectVisibleInMonth(project: MonthFilterProject, month: string): boolean {
  if (isAllMonths(month)) return true

  const anchor = projectLifecycleAnchor(project)
  if (!anchor) return true

  const { start, end } = monthBounds(month)
  if (anchor > end) return false
  if (project.delivered_date && project.delivered_date.slice(0, 10) < start) return false
  return true
}

/** Active / in-pipeline project visible in the given month (carry-forward until delivery). */
export function isProjectRelevantInMonth(project: MonthFilterProject, month: string): boolean {
  if (isAllMonths(month)) return true
  return isActiveProjectVisibleInMonth(project, month)
}

export function isDeliveredInMonth(project: Pick<MonthFilterProject, 'delivered_date'>, month: string): boolean {
  if (isAllMonths(month)) return true
  return isDateInMonth(project.delivered_date, month)
}

type MonthFilterableProject = MonthFilterProject & { current_stage: string }

/** Filter board/home lists: delivered by delivery date; active carry forward until delivery. */
export function filterProjectsByMonth<T extends MonthFilterableProject>(projects: T[], month: string): T[] {
  if (isAllMonths(month)) return projects
  return projects.filter(p => {
    if (p.current_stage === FINAL_STAGE) return isDeliveredInMonth(p, month)
    return isActiveProjectVisibleInMonth(p, month)
  })
}

export type StageDuration = {
  stage: string
  startedAt: string
  endedAt: string | null
  days: number
  hours: number
  totalBusinessHours: number
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
      totalBusinessHours: totalHours,
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
