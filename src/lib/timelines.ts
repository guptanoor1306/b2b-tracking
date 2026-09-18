import { addDays, format, isValid, parseISO, startOfDay } from 'date-fns'
import { FINAL_STAGE, STAGES_INTERNAL } from '@/lib/constants'
import {
  addBusinessHours,
  businessDaysLate,
  businessDaysLateExcluding,
  businessHoursBetweenExcluding,
  hoursPerBusinessDay,
  isBusinessDay,
  type BusinessHoursMode,
} from '@/lib/businessTime'
import { businessHoursModeForChannel } from '@/lib/sla-timing-mode'
import {
  StageSlaRow,
  ProjectTeamContext,
  resolveStageHours,
  totalPipelineHoursFromSla,
  DEFAULT_STAGE_SLA,
  slaLevelForProject,
} from '@/lib/stage-sla'
import {
  usesExternalIntakeFlow,
  isZerodhaIntakeStage,
  normalizeZerodhaBoardStage,
  suppressProductionMetrics,
  zerodhaStageSlaRows,
  cashCopiumStageSlaRows,
  filterCashCopiumSlaRows,
  filterZerodhaSlaRows,
  isCashAndCopiumChannelDbName,
  finalStageForChannel,
} from '@/lib/zerodha-sla'
import { isLaSocialChannelDbName, laSocialStageSlaRows } from '@/lib/la-social-sla'
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
let cachedSlaChannel: string | null = null

export function setStageSlaCache(rows: StageSlaRow[], channelDbName?: string | null) {
  cachedSlaChannel = channelDbName ?? null
  if (isLaSocialChannelDbName(channelDbName)) {
    cachedSlaRows = rows.length ? rows : laSocialStageSlaRows()
    return
  }
  if (isCashAndCopiumChannelDbName(channelDbName)) {
    cachedSlaRows = rows.length ? filterCashCopiumSlaRows(rows) : cashCopiumStageSlaRows()
    return
  }
  if (usesExternalIntakeFlow(channelDbName)) {
    cachedSlaRows = rows.length ? filterZerodhaSlaRows(rows) : zerodhaStageSlaRows()
    return
  }
  cachedSlaRows = rows.length ? rows : DEFAULT_STAGE_SLA.map((r, i) => ({ ...r, id: `default-${i}` }))
}

function slaRowsForChannel(channelDbName?: string | null): StageSlaRow[] {
  const channel = channelDbName ?? cachedSlaChannel
  if (channel && channel === cachedSlaChannel && cachedSlaRows.length) {
    return cachedSlaRows
  }
  if (isLaSocialChannelDbName(channel)) return laSocialStageSlaRows()
  if (isCashAndCopiumChannelDbName(channel)) return cashCopiumStageSlaRows()
  if (usesExternalIntakeFlow(channel)) return zerodhaStageSlaRows()
  return cachedSlaRows
}

function resolveChannelDbName(project?: ProjectTeamContext & { channel?: string | null }, channelDbName?: string | null) {
  return channelDbName ?? project?.channel ?? cachedSlaChannel
}

export function getStageSlaRows(): StageSlaRow[] {
  return cachedSlaRows
}

export function getStageSlaHours(
  stage: string,
  level?: string | null,
  project?: ProjectTeamContext & { channel?: string | null },
  teleprompter?: boolean | null,
  channelDbName?: string | null,
): number | null {
  const channel = resolveChannelDbName(project, channelDbName)

  const normalized = resolvePipelineStage(stage, channel)
  const row = slaRowsForChannel(channel).find(r => r.stage_name === normalized)
  if (!row) return null
  const h = resolveStageHours(row, level, project, teleprompter)
  return h > 0 ? h : null
}

/** Back-compat map for components still reading STAGE_SLA_HOURS */
export function buildStageSlaHoursMap(
  level?: string | null,
  project?: ProjectTeamContext & { channel?: string | null },
  channelDbName?: string | null,
): Partial<Record<string, number>> {
  const channel = resolveChannelDbName(project, channelDbName)
  if (usesExternalIntakeFlow(channel)) {
    const map: Partial<Record<string, number>> = {}
    for (const row of slaRowsForChannel(channel)) {
      const h = resolveStageHours(row, level, project)
      if (h > 0) map[row.stage_name] = h
    }
    return map
  }
  const map: Partial<Record<string, number>> = {}
  for (const row of slaRowsForChannel(channel)) {
    const h = resolveStageHours(row, level, project)
    if (h > 0) map[row.stage_name] = h
  }
  return map
}

export const STAGE_SLA_HOURS: Partial<Record<string, number>> = buildStageSlaHoursMap()

export function normalizeStage(stage: string): string {
  return LEGACY_STAGE_ALIASES[stage] ?? stage
}

/** Channel-aware stage name for SLA, timeline display, and health checks. */
export function resolvePipelineStage(stage: string, channelDbName?: string | null): string {
  if (usesExternalIntakeFlow(channelDbName)) {
    return normalizeZerodhaBoardStage(stage, channelDbName)
  }
  return normalizeStage(stage)
}

/** Delivered = final stage reached or delivery date set (LA Social: entering Retro). */
export function isProjectDelivered(project: {
  current_stage?: string | null
  delivered_date?: string | null
  channel?: string | null
}): boolean {
  if (project.delivered_date) return true
  const stage = resolvePipelineStage(project.current_stage ?? '', project.channel)
  if (stage === FINAL_STAGE || stage === 'Delivered') return true
  return stage === finalStageForChannel(project.channel)
}

export function effectiveStatusHealth(project: {
  current_stage: string
  status_health: string
  channel?: string | null
  request_status?: string | null
}): string {
  if (isProjectDelivered(project)) return 'Delivered'
  if (suppressProductionMetrics(project)) {
    return 'On track'
  }
  return project.status_health
}

/** Delivered projects keep their stored target date; SLA edits do not apply retroactively */
export function isProjectTimelineLocked(project: {
  current_stage?: string | null
  delivered_date?: string | null
  channel?: string | null
}): boolean {
  const stage = normalizeStage(project.current_stage ?? '')
  const deliveredStage = finalStageForChannel(project.channel)
  return stage === FINAL_STAGE || stage === deliveredStage || !!project.delivered_date
}

export function projectTeamContext(project: {
  level_of_video?: string | null
  content_type?: string | null
  video_language?: string | null
  channel?: string | null
  editor_id?: string | null
  editor_2_id?: string | null
  designer_id?: string | null
  designer_2_id?: string | null
  uses_teleprompter?: boolean | null
}): ProjectTeamContext & { channel?: string | null } {
  return {
    level_of_video: project.level_of_video,
    content_type: project.content_type,
    video_language: project.video_language,
    channel: project.channel,
    editor_id: project.editor_id,
    editor_2_id: project.editor_2_id,
    designer_id: project.designer_id,
    designer_2_id: project.designer_2_id,
    uses_teleprompter: project.uses_teleprompter,
  }
}

export function computeProjectTargetDate(
  project: {
    target_delivery_date?: string | null
  },
): string | null {
  return project.target_delivery_date ?? null
}

export function totalPipelineHours(
  level?: string | null,
  project?: ProjectTeamContext & { channel?: string | null },
  channelDbName?: string | null,
): number {
  const channel = resolveChannelDbName(project, channelDbName)
  if (usesExternalIntakeFlow(channel)) {
    return totalPipelineHoursFromSla(slaRowsForChannel(channel), level, project)
  }
  return totalPipelineHoursFromSla(slaRowsForChannel(channel), level, project)
}

export function computeTargetReleaseDate(
  startDate: string | null | undefined,
  holidays: string[] = [],
  level?: string | null,
  project?: ProjectTeamContext & { channel?: string | null },
  channelDbName?: string | null,
): Date | null {
  if (!startDate) return null
  const start = parseISO(startDate)
  if (!isValid(start)) return null
  const mode = businessHoursModeForChannel(channelDbName ?? project?.channel)
  return addBusinessHours(start, totalPipelineHours(level, project, channelDbName), holidays, mode)
}

export function computeTargetReleaseDateString(
  startDate: string | null | undefined,
  holidays: string[] = [],
  level?: string | null,
  project?: ProjectTeamContext & { channel?: string | null },
  channelDbName?: string | null,
): string | null {
  const d = computeTargetReleaseDate(startDate, holidays, level, project, channelDbName)
  return d ? format(d, 'yyyy-MM-dd') : null
}

export function resolveTargetReleaseDate(
  project: {
    target_delivery_date: string | null
  },
  _holidays?: string[],
): string | null {
  return project.target_delivery_date ?? null
}

export function formatSlaDuration(hours: number, mode: BusinessHoursMode = 'calendar'): string {
  const dayLen = hoursPerBusinessDay(mode)
  if (hours < 1) return `${Math.round(hours * 60)}m`
  if (hours < dayLen) return hours === 1 ? '1h' : `${hours % 1 === 0 ? hours : hours.toFixed(1)}h`
  const days = hours / dayLen
  return days === 1 ? '1d' : `${days % 1 === 0 ? days : days.toFixed(1)}d`
}

function formatOverrun(hours: number, mode: BusinessHoursMode): string {
  const dayLen = hoursPerBusinessDay(mode)
  if (hours < dayLen) {
    const h = Math.round(hours * 10) / 10
    return `${h}h over`
  }
  const days = Math.round((hours / dayLen) * 10) / 10
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

export type TimelinessOptions = {
  /** LA Social: when set, SLA elapsed time is measured from stage Start (not stage entry). */
  stageWorkStartedAt?: string | null
}

export function getProjectTimeliness(
  project: {
    current_stage: string
    last_status_update_at: string
    target_delivery_date: string | null
    received_date: string | null
    level_of_video?: string | null
    content_type?: string | null
    video_language?: string | null
    channel?: string | null
    is_on_hold?: boolean
    editor_id?: string | null
    editor_2_id?: string | null
    designer_id?: string | null
    designer_2_id?: string | null
    uses_teleprompter?: boolean | null
  },
  holidays: string[] = [],
  holdPeriods: HoldPeriod[] = [],
  options: TimelinessOptions = {},
): TimelinessResult {
  const stage = resolvePipelineStage(project.current_stage, project.channel)
  const targetReleaseDate = resolveTargetReleaseDate(project, holidays)
  const teamCtx = projectTeamContext(project)
  const slaMap = buildStageSlaHoursMap(slaLevelForProject(project), teamCtx, project.channel)
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

  if (usesExternalIntakeFlow(project.channel) && isZerodhaIntakeStage(project.current_stage)) {
    return {
      ...base,
      status: 'on_time',
      borderClass: 'border-emerald-500/35',
      textClass: 'text-emerald-400',
      label: '',
      showLabel: false,
    }
  }

  const deliveredStage = finalStageForChannel(project.channel)
  if (stage === FINAL_STAGE || stage === deliveredStage) {
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

  const hoursMode = businessHoursModeForChannel(project.channel)

  const laSocialWorkClock = isLaSocialChannelDbName(project.channel)
  const stageClockStart = laSocialWorkClock
    ? (options.stageWorkStartedAt ?? null)
    : project.last_status_update_at

  if (laSocialWorkClock && !stageClockStart) {
    return {
      ...base,
      hoursInStage: 0,
      stageOverHours: 0,
      status: 'on_time',
      borderClass: 'border-zinc-300/60',
      textClass: 'text-zinc-500',
      label: 'Not started',
      showLabel: true,
    }
  }

  const hoursInStage = stageClockStart
    ? businessHoursBetweenExcluding(
        parseISO(stageClockStart),
        new Date(),
        holidays,
        exclude,
        hoursMode,
      )
    : 0
  const sla = slaMap[stage] ?? null
  const stageOverHours = sla != null ? Math.max(0, hoursInStage - sla) : 0
  const overallLateDays = targetReleaseDate
    ? businessDaysLateExcluding(targetReleaseDate, holidays, holdPeriods)
    : 0
  const delayed = stageOverHours > 0 || overallLateDays > 0

  let label: string
  if (stageOverHours > 0) {
    label = formatOverrun(stageOverHours, hoursMode)
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
    channel?: string | null
    editor_id?: string | null
    editor_2_id?: string | null
    designer_id?: string | null
    designer_2_id?: string | null
    uses_teleprompter?: boolean | null
  },
  holidays: string[] = [],
  holdPeriods: HoldPeriod[] = [],
): string {
  if (project.is_on_hold) return 'On hold'
  const stage = resolvePipelineStage(project.current_stage, project.channel)
  const deliveredStage = finalStageForChannel(project.channel)
  if (stage === FINAL_STAGE || stage === deliveredStage) return 'Delivered'
  if (suppressProductionMetrics(project)) return 'On track'

  const { status } = getProjectTimeliness(project, holidays, holdPeriods)
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
  project?: ProjectTeamContext & { channel?: string | null },
  holdPeriods: HoldPeriod[] = [],
  timelineLocked = false,
  elapsedBusinessHours?: number,
): boolean {
  if (timelineLocked) return false
  const channel = project?.channel ?? null
  const sla = getStageSlaHours(stage, level, project, undefined, channel)
  if (sla == null) return false
  const elapsed = elapsedBusinessHours ?? (() => {
    const end = typeof endedAt === 'string' ? parseISO(endedAt) : endedAt
    const exclude = holdPeriods.map(p => ({
      start: parseISO(p.started_at),
      end: p.ended_at ? parseISO(p.ended_at) : new Date(),
    }))
    const mode = businessHoursModeForChannel(channel)
    return businessHoursBetweenExcluding(parseISO(startedAt), end, holidays, exclude, mode)
  })()
  return elapsed > sla
}

export function getStageIndex(stage: string): number {
  const normalized = normalizeStage(stage)
  const idx = STAGES_INTERNAL.indexOf(normalized as typeof STAGES_INTERNAL[number])
  return idx >= 0 ? idx : 0
}
