import { addDays, format, isValid, parseISO, startOfDay } from 'date-fns'
import { FINAL_STAGE, STAGES_INTERNAL } from '@/lib/constants'
import {
  addBusinessHours,
  businessDaysLate,
  businessHoursBetween,
  isBusinessDay,
} from '@/lib/businessTime'

/** Maps legacy DB stage names to the current pipeline. */
export const LEGACY_STAGE_ALIASES: Record<string, string> = {
  'Video Assets': 'Video Data Received',
  'Editing with Sound': 'Sound',
  'Editing': 'Sound',
  '1st Draft Review': 'Video 1st Draft',
  '1st Draft Changes': 'Final Changes',
  'Final Cut Review': 'Feedback from Zerodha',
  'Final Cut Changes': 'Final Changes',
  'Final Delivery': 'Final Delivery Done',
}

/** SLA per stage in hours (stages without an entry have no fixed SLA). */
export const STAGE_SLA_HOURS: Partial<Record<string, number>> = {
  'First Cut Received': 2,
  'First Cut Review': 24,
  'First Cut Changes': 0.5,
  'Storyboard': 24,
  'Thumbnails': 0.5,
  'Graphics Creation': 36,
  'Animation Completion': 84,
  'Sound': 36,
  'Premiere': 12,
  'Video 1st Draft': 12,
  'Feedback from Zerodha': 24,
  'Final Changes': 0.5,
}

export function normalizeStage(stage: string): string {
  return LEGACY_STAGE_ALIASES[stage] ?? stage
}

export function totalPipelineHours(): number {
  return Object.values(STAGE_SLA_HOURS).reduce<number>((sum, h) => sum + (h ?? 0), 0)
}

export function computeTargetReleaseDate(
  startDate: string | null | undefined,
  holidays: string[] = []
): Date | null {
  if (!startDate) return null
  const start = parseISO(startDate)
  if (!isValid(start)) return null
  return addBusinessHours(start, totalPipelineHours(), holidays)
}

export function computeTargetReleaseDateString(
  startDate: string | null | undefined,
  holidays: string[] = []
): string | null {
  const d = computeTargetReleaseDate(startDate, holidays)
  return d ? format(d, 'yyyy-MM-dd') : null
}

export function resolveTargetReleaseDate(
  project: { target_delivery_date: string | null; received_date: string | null },
  holidays: string[] = []
): string | null {
  return project.target_delivery_date ?? computeTargetReleaseDateString(project.received_date, holidays)
}

export function formatSlaDuration(hours: number): string {
  if (hours < 24) return hours === 1 ? '1h' : `${hours % 1 === 0 ? hours : hours.toFixed(1)}h`
  const days = hours / 24
  return days === 1 ? '1d' : `${days % 1 === 0 ? days : days.toFixed(1)}d`
}

function formatOverrun(hours: number): string {
  if (hours < 24) {
    const h = Math.round(hours * 10) / 10
    return `${h}h over`
  }
  const days = Math.round((hours / 24) * 10) / 10
  return `${days}d over`
}

export type TimelinessResult = {
  status: 'on_time' | 'delayed' | 'delivered'
  borderClass: string
  textClass: string
  label: string
  showLabel: boolean
  targetReleaseDate: string | null
  stageSlaHours: number | null
  hoursInStage: number
  stageOverHours: number
}

export function getProjectTimeliness(
  project: {
    current_stage: string
    last_status_update_at: string
    target_delivery_date: string | null
    received_date: string | null
  },
  holidays: string[] = []
): TimelinessResult {
  const stage = normalizeStage(project.current_stage)
  const targetReleaseDate = resolveTargetReleaseDate(project, holidays)
  const base = {
    targetReleaseDate,
    stageSlaHours: STAGE_SLA_HOURS[stage] ?? null,
    hoursInStage: 0,
    stageOverHours: 0,
    showLabel: false,
  }

  if (stage === FINAL_STAGE) {
    return {
      ...base,
      status: 'delivered',
      borderClass: 'border-emerald-500/35',
      textClass: 'text-emerald-400',
      label: 'Delivered',
      showLabel: false,
    }
  }

  const hoursInStage = project.last_status_update_at
    ? businessHoursBetween(parseISO(project.last_status_update_at), new Date(), holidays)
    : 0
  const sla = STAGE_SLA_HOURS[stage] ?? null
  const stageOverHours = sla != null ? Math.max(0, hoursInStage - sla) : 0
  const overallLateDays = targetReleaseDate ? businessDaysLate(targetReleaseDate, holidays) : 0
  const delayed = stageOverHours > 0 || overallLateDays > 0

  let label: string
  if (stageOverHours > 0) {
    label = formatOverrun(stageOverHours)
  } else if (overallLateDays > 0) {
    label = `${overallLateDays}d late`
  } else {
    label = 'On track'
  }

  return {
    ...base,
    hoursInStage,
    stageOverHours,
    status: delayed ? 'delayed' : 'on_time',
    borderClass: delayed ? 'border-rose-500/45' : 'border-emerald-500/35',
    textClass: delayed ? 'text-rose-400' : 'text-emerald-400',
    label,
    showLabel: delayed,
  }
}

export function computeProjectHealth(
  project: {
    current_stage: string
    target_delivery_date: string | null
    received_date: string | null
    last_status_update_at: string
  },
  holidays: string[] = []
): string {
  const stage = normalizeStage(project.current_stage)
  if (stage === FINAL_STAGE) return 'Delivered'

  const { status } = getProjectTimeliness(project, holidays)
  if (status === 'delayed') return 'Delayed'

  const target = resolveTargetReleaseDate(project, holidays)
  if (!target) return 'On track'

  const holidaySet = new Set(holidays)
  const targetDay = startOfDay(parseISO(target))
  let cur = startOfDay(new Date())
  let businessDaysUntil = 0

  while (cur < targetDay) {
    cur = addDays(cur, 1)
    if (isBusinessDay(cur, holidaySet)) businessDaysUntil++
  }

  if (businessDaysUntil <= 2) return 'At risk'
  return 'On track'
}

export function isStageDurationOverSla(
  stage: string,
  startedAt: string,
  endedAt: Date | string,
  holidays: string[] = []
): boolean {
  const sla = STAGE_SLA_HOURS[normalizeStage(stage)]
  if (sla == null) return false
  const end = typeof endedAt === 'string' ? parseISO(endedAt) : endedAt
  const elapsed = businessHoursBetween(parseISO(startedAt), end, holidays)
  return elapsed > sla
}

export function getStageIndex(stage: string): number {
  const normalized = normalizeStage(stage)
  const idx = STAGES_INTERNAL.indexOf(normalized as typeof STAGES_INTERNAL[number])
  return idx >= 0 ? idx : 0
}
