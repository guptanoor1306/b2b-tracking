import { LEVELS_OF_VIDEO, STAGES_EXTERNAL, STAGES_INTERNAL } from '@/lib/constants'
import { normalizeStage } from '@/lib/timelines'

/** Zerodha-only intake stages (external submissions → internal review). */
export const ZERODHA_REQUEST_RECEIVED = 'Request Received'
export const ZERODHA_READY_TO_PRODUCE = 'Ready to Produce'
export const ZERODHA_INTAKE_STAGES = [ZERODHA_REQUEST_RECEIVED, ZERODHA_READY_TO_PRODUCE] as const

export type RequestStatus = 'pending' | 'approved' | 'declined'

export function isZerodhaIntakeStage(stage: string): boolean {
  return (ZERODHA_INTAKE_STAGES as readonly string[]).includes(stage)
}

/** Client submission awaiting internal LearnApp review. */
export function isPendingRequestReview(project: {
  channel: string
  current_stage: string
  request_status?: RequestStatus | string | null
}): boolean {
  return isZerodhaChannelDbName(project.channel)
    && project.current_stage === ZERODHA_REQUEST_RECEIVED
    && (project.request_status === 'pending' || project.request_status == null)
}

export function isDeclinedRequest(project: {
  channel?: string
  current_stage?: string
  request_status?: RequestStatus | string | null
}): boolean {
  return project.request_status === 'declined'
    && project.current_stage === ZERODHA_REQUEST_RECEIVED
}

export function suppressProductionMetrics(project: {
  channel: string
  current_stage: string
  request_status?: RequestStatus | string | null
}): boolean {
  return isPendingRequestReview(project) || isDeclinedRequest(project)
}

export function hasIntakeMaterials(project: {
  channel: string
  current_stage: string
  script_link?: string | null
  screen_captures_link?: string | null
  audio_link?: string | null
}): boolean {
  return isZerodhaChannelDbName(project.channel) && (
    !!project.script_link || !!project.screen_captures_link || !!project.audio_link
    || isZerodhaIntakeStage(project.current_stage)
  )
}
import {
  StageSlaRow,
  ProjectTeamContext,
  resolveStageHours,
  totalPipelineHoursFromSla,
} from '@/lib/stage-sla'

export const ZERODHA_CHANNEL_DB_NAME = 'Zerodha Online'
export const ZERODHA_CHANNEL_SLUG = 'zerodha-online'

/** Zerodha pipeline omits stages that Varsity still uses. */
export const ZERODHA_REMOVED_STAGES = ['First Cut Changes', 'Thumbnail Copy + RP Cuts', 'Video received'] as const

const STAGES_ZERODHA_PRODUCTION_INTERNAL = STAGES_INTERNAL.filter(
  s => !(ZERODHA_REMOVED_STAGES as readonly string[]).includes(s),
) as readonly string[]

const STAGES_ZERODHA_PRODUCTION_EXTERNAL = STAGES_EXTERNAL.filter(
  s => !(ZERODHA_REMOVED_STAGES as readonly string[]).includes(s),
) as readonly string[]

export const STAGES_ZERODHA_INTERNAL = [
  ...ZERODHA_INTAKE_STAGES,
  ...STAGES_ZERODHA_PRODUCTION_INTERNAL,
] as readonly string[]

export const STAGES_ZERODHA_EXTERNAL = [
  ...ZERODHA_INTAKE_STAGES,
  ...STAGES_ZERODHA_PRODUCTION_EXTERNAL,
] as readonly string[]

export function internalStagesForChannel(channelDbName: string | null | undefined): readonly string[] {
  return isZerodhaChannelDbName(channelDbName) ? STAGES_ZERODHA_INTERNAL : STAGES_INTERNAL
}

export function externalStagesForChannel(channelDbName: string | null | undefined): readonly string[] {
  return isZerodhaChannelDbName(channelDbName) ? STAGES_ZERODHA_EXTERNAL : STAGES_EXTERNAL
}

/** Map legacy Zerodha rows still on removed stages into the board column layout. */
export function normalizeZerodhaBoardStage(stage: string): string {
  if (stage === 'First Cut Changes' || stage === 'Thumbnail Copy + RP Cuts') return 'Storyboard'
  if (stage === 'Video received') return ZERODHA_READY_TO_PRODUCE
  return stage
}

export function pipelineProgressPercentForChannel(
  currentStage: string,
  channelDbName?: string | null,
): number {
  const stages = internalStagesForChannel(channelDbName)
  const stage = isZerodhaChannelDbName(channelDbName)
    ? normalizeZerodhaBoardStage(currentStage)
    : currentStage
  if (stage === 'Final Delivery') return 100
  const idx = (stages as readonly string[]).indexOf(stage)
  if (idx < 0) return 0
  return Math.round((idx / (stages.length - 1)) * 100)
}

export type VideoLanguage = 'English' | 'Hindi'

export const VIDEO_LANGUAGES: VideoLanguage[] = ['English', 'Hindi']

export const ZERODHA_LEVELS = ['Level 0', 'Level 1', 'Level 2', 'Level 3', 'Level 4'] as const

export const ZERODHA_LEVEL_LABELS: Record<string, string> = {
  'Level 0': 'Gif',
  'Level 1': 'Reel',
  'Level 2': '3-4 mins',
  'Level 3': '6-7 mins',
  'Level 4': '14-15 mins',
}

export function zerodhaLevelLabel(level: string): string {
  const suffix = ZERODHA_LEVEL_LABELS[level]
  return suffix ? `${level} — ${suffix}` : level
}

export function zerodhaLevelOptions(_language?: VideoLanguage | string | null): { value: string; label: string }[] {
  return ZERODHA_LEVELS.map(level => ({ value: level, label: zerodhaLevelLabel(level) }))
}

export function projectLevelOptions(
  channelDbName: string | null | undefined,
  language: VideoLanguage | string | null | undefined,
): { value: string; label: string }[] {
  if (isZerodhaChannelDbName(channelDbName)) return zerodhaLevelOptions(language)
  return LEVELS_OF_VIDEO.map(level => ({ value: level, label: level }))
}

export function isZerodhaChannelDbName(channel: string | null | undefined): boolean {
  return channel === ZERODHA_CHANNEL_DB_NAME
}

export function channelUsesTeleprompterFlow(channelDbName: string | null | undefined): boolean {
  return !isZerodhaChannelDbName(channelDbName)
}

export function isZerodhaChannelSlug(slug: string | null | undefined): boolean {
  return slug === ZERODHA_CHANNEL_SLUG
}

/** Map Zerodha internal stage → external board column. */
export function mapZerodhaInternalToExternalStage(internalStage: string): string {
  const stage = normalizeZerodhaBoardStage(normalizeStage(internalStage))
  const idx = (STAGES_ZERODHA_INTERNAL as readonly string[]).indexOf(stage)
  if (idx < 0) return STAGES_ZERODHA_EXTERNAL[0]

  let mapped: string = STAGES_ZERODHA_EXTERNAL[0]
  for (const ext of STAGES_ZERODHA_EXTERNAL) {
    const anchorIdx = (STAGES_ZERODHA_INTERNAL as readonly string[]).indexOf(ext)
    if (anchorIdx >= 0 && anchorIdx <= idx) mapped = ext
  }
  return mapped
}

/** Zerodha SLA — fixed early/late steps; Storyboard through Animation vary by level (VD steps parallel) */
export const DEFAULT_ZERODHA_STAGE_SLA: Omit<StageSlaRow, 'id'>[] = [
  { stage_name: ZERODHA_REQUEST_RECEIVED, role_owner: 'External Team', duration_hours: 0, level_0_hours: null, level_1_hours: null, level_2_hours: null, level_3_hours: null, level_4_hours: null, parallel_group: null, sort_order: 1 },
  { stage_name: ZERODHA_READY_TO_PRODUCE, role_owner: 'Internal', duration_hours: 0, level_0_hours: null, level_1_hours: null, level_2_hours: null, level_3_hours: null, level_4_hours: null, parallel_group: null, sort_order: 2 },
  { stage_name: 'First Cut', role_owner: 'Editor', duration_hours: 1, level_0_hours: null, level_1_hours: null, level_2_hours: null, level_3_hours: null, level_4_hours: null, parallel_group: null, sort_order: 3 },
  { stage_name: 'First Cut sent for Review', role_owner: 'External Team', duration_hours: 24, level_0_hours: null, level_1_hours: null, level_2_hours: null, level_3_hours: null, level_4_hours: null, parallel_group: null, sort_order: 4 },
  { stage_name: 'Storyboard', role_owner: 'Writer', duration_hours: 0, level_0_hours: 0, level_1_hours: 0, level_2_hours: 1.5, level_3_hours: 2, level_4_hours: 12, parallel_group: null, sort_order: 5 },
  { stage_name: 'Graphics & VD', role_owner: 'Designer', duration_hours: 0, level_0_hours: 0, level_1_hours: 24, level_2_hours: 48, level_3_hours: 72, level_4_hours: 96, parallel_group: 'vd_bundle', sort_order: 6 },
  { stage_name: 'Animation & VD', role_owner: 'Editor', duration_hours: 12, level_0_hours: 12, level_1_hours: 24, level_2_hours: 72, level_3_hours: 144, level_4_hours: 192, parallel_group: 'vd_bundle', sort_order: 7 },
  { stage_name: 'Video/Thumbnail Review', role_owner: 'External Team', duration_hours: 24, level_0_hours: null, level_1_hours: null, level_2_hours: null, level_3_hours: null, level_4_hours: null, parallel_group: null, sort_order: 8 },
  { stage_name: 'Final Changes', role_owner: 'Editor', duration_hours: 24, level_0_hours: null, level_1_hours: null, level_2_hours: null, level_3_hours: null, level_4_hours: null, parallel_group: null, sort_order: 9 },
  { stage_name: 'Sound', role_owner: 'Sound Designer', duration_hours: 1.5, level_0_hours: null, level_1_hours: null, level_2_hours: null, level_3_hours: null, level_4_hours: null, parallel_group: null, sort_order: 10 },
  { stage_name: 'Final Delivery', role_owner: 'Internal', duration_hours: 0, level_0_hours: null, level_1_hours: null, level_2_hours: null, level_3_hours: null, level_4_hours: null, parallel_group: null, sort_order: 11 },
]

export function zerodhaStageSlaRows(): StageSlaRow[] {
  return DEFAULT_ZERODHA_STAGE_SLA.map((r, i) => ({ ...r, id: `zerodha-${i}` }))
}

export function filterZerodhaSlaRows(rows: StageSlaRow[]): StageSlaRow[] {
  return rows
    .filter(r => !(ZERODHA_REMOVED_STAGES as readonly string[]).includes(r.stage_name))
    .sort((a, b) => a.sort_order - b.sort_order)
}

export function resolveZerodhaStageHours(
  row: Pick<StageSlaRow, 'stage_name' | 'duration_hours' | 'level_0_hours' | 'level_1_hours' | 'level_2_hours' | 'level_3_hours' | 'level_4_hours'>,
  level: string | null | undefined,
  project?: ProjectTeamContext,
): number {
  return resolveStageHours(row, level, project, null)
}

export function totalZerodhaPipelineHours(
  level: string | null | undefined,
  project?: ProjectTeamContext,
): number {
  return totalPipelineHoursFromSla(DEFAULT_ZERODHA_STAGE_SLA, level, project)
}

export function zerodhaStageSlaHoursMap(
  level?: string | null,
  project?: ProjectTeamContext,
): Partial<Record<string, number>> {
  const map: Partial<Record<string, number>> = {}
  for (const row of DEFAULT_ZERODHA_STAGE_SLA) {
    const h = resolveZerodhaStageHours(row, level, project)
    if (h > 0) map[row.stage_name] = h
  }
  return map
}

export function isZerodhaStage(stage: string): boolean {
  return (STAGES_ZERODHA_INTERNAL as readonly string[]).includes(stage)
}
