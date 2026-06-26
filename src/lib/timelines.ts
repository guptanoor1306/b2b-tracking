import { addDays, format, isValid, parseISO, startOfDay } from 'date-fns'
import { FINAL_STAGE, STAGES_INTERNAL } from '@/lib/constants'
import {
  addBusinessHours,
  businessDaysLate,
  businessHoursBetween,
  businessHoursBetweenExcluding,
  isBusinessDay,
} from '@/lib/businessTime'
import {
  StageSlaRow,
  ProjectTeamContext,
  resolveStageHours,
  totalPipelineHoursFromSla,
  DEFAULT_STAGE_SLA,
} from '@/lib/stage-sla'
import { HoldPeriod } from '@/lib/types'

/** Maps legacy DB stage names to the current pipeline. */
export const LEGACY_STAGE_ALIASES: Record<string, string> = {
  'Script Received': 'Video received',
  'Visual Direction': 'Video received',
  'Video Data Received': 'Video received',
  'Video Assets': 'Video received',
  'Thumbnail Title Copy Received': 'Thumbnail Copy + RP Cuts',
  'First Cut Received': 'First Cut',
  'First Cut Review': 'First Cut sent for Review',
  'First Cut Changes': 'First Cut Changes',
  'Thumbnails': 'Thumbnail Copy + RP Cuts',
  'Graphics Creation': 'Graphics & VD',
  'Animation Completion': 'Animation & VD',
  'Editing with Sound': 'Sound',
  'Editing': 'Sound',
  'Premiere': 'Sound',
  'Video 1st Draft': 'Video/Thumbnail Review',
  '1st Draft Review': 'Video/Thumbnail Review',
  'Feedback from Zerodha': 'Video/Thumbnail Review',
  '1st Draft Changes': 'Final Changes',
  'Final Cut Changes': 'Final Changes',
  'Final Delivery Done': 'Final Delivery',
  'Final Delivery': 'Final Delivery',
  'Final Cut Review': 'Video/Thumbnail Review',
  'Hold': 'Video received',
}

let cachedSlaRows: StageSlaRow[] = DEFAULT_STAGE_SLA.map((r, i) => ({ ...r, id: `default-${i}` }))

export function setStageSlaCache(rows: StageSlaRow[]) {
  cachedSlaRows = rows.length ? rows : cachedSlaRows
}

export function getStageSlaRows(): StageSlaRow[] {
  return cachedSlaRows
}

export function getStageSlaHours(
  stage: string,
  level?: string | null,
  project?: ProjectTeamContext,
  teleprompter?: boolean | null
): number | null {
  const normalized = normalizeStage(stage)
  const row = cachedSlaRows.find(r => r.stage_name === normalized)
  if (!row) return null
  const h = resolveStageHours(row, level, project, teleprompter)
  return h > 0 ? h : null
}

/** Back-compat map for components still reading STAGE_SLA_HOURS */
export function buildStageSlaHoursMap(
  level?: string | null,
  project?: ProjectTeamContext
): Partial<Record<string, number>> {
  const map: Partial<Record<string, number>> = {}
  for (const row of cachedSlaRows) {
    const h = resolveStageHours(row, level, project)
    if (h > 0) map[row.stage_name] = h
  }
  return map
}

export const STAGE_SLA_HOURS: Partial<Record<string, number>> = buildStageSlaHoursMap()

export function normalizeStage(stage: string): string {
  return LEGACY_STAGE_ALIASES[stage] ?? stage
}

export function totalPipelineHours(
  level?: string | null,
  project?: ProjectTeamContext
): number {
  return totalPipelineHoursFromSla(cachedSlaRows, level, project)
}

export function computeTargetReleaseDate(
  startDate: string | null | undefined,
  holidays: string[] = [],
  level?: string | null,
  project?: ProjectTeamContext
): Date | null {
  if (!startDate) return null
  const start = parseISO(startDate)
  if (!isValid(start)) return null
  return addBusinessHours(start, totalPipelineHours(level, project), holidays)
}

export function computeTargetReleaseDateString(
  startDate: string | null | undefined,
  holidays: string[] = [],
  level?: string | null,
  project?: ProjectTeamContext
): string | null {
  const d = computeTargetReleaseDate(startDate, holidays, level, project)
  return d ? format(d, 'yyyy-MM-dd') : null
}

export function resolveTargetReleaseDate(
  project: {
    target_delivery_date: string | null
    received_date: string | null
    level_of_video?: string | null
    editor_id?: string | null
    editor_2_id?: string | null
    designer_id?: string | null
    designer_2_id?: string | null
    uses_teleprompter?: boolean | null
  },
  holidays: string[] = []
): string | null {
  return project.target_delivery_date ?? computeTargetReleaseDateString(
    project.received_date,
    holidays,
    project.level_of_video,
    project
  )
}

export function formatSlaDuration(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`
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
  status: 'on_time' | 'delayed' | 'delivered' | 'on_hold'
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
    level_of_video?: string | null
    is_on_hold?: boolean
    editor_id?: string | null
    editor_2_id?: string | null
    designer_id?: string | null
    designer_2_id?: string | null
    uses_teleprompter?: boolean | null
  },
  holidays: string[] = [],
  holdPeriods: HoldPeriod[] = []
): TimelinessResult {
  const stage = normalizeStage(project.current_stage)
  const targetReleaseDate = resolveTargetReleaseDate(project, holidays)
  const slaMap = buildStageSlaHoursMap(project.level_of_video, project)
  const base = {
    targetReleaseDate,
    stageSlaHours: slaMap[stage] ?? null,
    hoursInStage: 0,
    stageOverHours: 0,
    showLabel: false,
  }

  if (project.is_on_hold || project.current_stage === 'Hold') {
    return {
      ...base,
      status: 'on_hold',
      borderClass: 'border-zinc-400/45',
      textClass: 'text-zinc-500',
      label: 'On hold',
      showLabel: true,
    }
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

  const exclude = holdPeriods.map(p => ({
    start: parseISO(p.started_at),
    end: p.ended_at ? parseISO(p.ended_at) : new Date(),
  }))

  const hoursInStage = project.last_status_update_at
    ? businessHoursBetweenExcluding(
        parseISO(project.last_status_update_at),
        new Date(),
        holidays,
        exclude
      )
    : 0
  const sla = slaMap[stage] ?? null
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
    is_on_hold?: boolean
    level_of_video?: string | null
  },
  holidays: string[] = []
): string {
  if (project.is_on_hold) return 'On hold'
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
  holidays: string[] = [],
  level?: string | null,
  project?: ProjectTeamContext,
  holdPeriods: HoldPeriod[] = []
): boolean {
  const sla = getStageSlaHours(stage, level, project)
  if (sla == null) return false
  const end = typeof endedAt === 'string' ? parseISO(endedAt) : endedAt
  const exclude = holdPeriods.map(p => ({
    start: parseISO(p.started_at),
    end: p.ended_at ? parseISO(p.ended_at) : new Date(),
  }))
  const elapsed = businessHoursBetweenExcluding(parseISO(startedAt), end, holidays, exclude)
  return elapsed > sla
}

export function getStageIndex(stage: string): number {
  const normalized = normalizeStage(stage)
  const idx = STAGES_INTERNAL.indexOf(normalized as typeof STAGES_INTERNAL[number])
  return idx >= 0 ? idx : 0
}
