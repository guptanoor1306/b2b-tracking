import { LEVELS_OF_VIDEO, STAGES_INTERNAL } from '@/lib/constants'
import {
  StageSlaRow,
  ProjectTeamContext,
  resolveStageHours,
  totalPipelineHoursFromSla,
} from '@/lib/stage-sla'

export const ZERODHA_CHANNEL_DB_NAME = 'Zerodha Online'
export const ZERODHA_CHANNEL_SLUG = 'zerodha-online'

export type VideoLanguage = 'English' | 'Hindi'

export const VIDEO_LANGUAGES: VideoLanguage[] = ['English', 'Hindi']

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

export function zerodhaLevelOptions(language: VideoLanguage | string | null | undefined): { value: string; label: string }[] {
  const levels = language === 'Hindi'
    ? (['Level 2', 'Level 3'] as const)
    : (['Level 0', 'Level 1', 'Level 2', 'Level 3', 'Level 4'] as const)
  return levels.map(level => ({ value: level, label: zerodhaLevelLabel(level) }))
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

/** Hindi projects: end-to-end totals only (Level 2 = 1 day, Level 3 = 1.5 days) */
export function hindiTotalPipelineHours(level: string | null | undefined): number {
  if (level === 'Level 3') return 36
  if (level === 'Level 2') return 24
  return 24
}

/** English Zerodha SLA — steps 1–5 and 9–12 fixed; 6–8 vary by level (7 & 8 parallel from end of 6) */
export const DEFAULT_ZERODHA_STAGE_SLA: Omit<StageSlaRow, 'id'>[] = [
  { stage_name: 'Video received', role_owner: 'Internal', duration_hours: 0, level_0_hours: null, level_1_hours: null, level_2_hours: null, level_3_hours: null, level_4_hours: null, parallel_group: null, sort_order: 1 },
  { stage_name: 'First Cut', role_owner: 'Editor', duration_hours: 1, level_0_hours: null, level_1_hours: null, level_2_hours: null, level_3_hours: null, level_4_hours: null, parallel_group: null, sort_order: 2 },
  { stage_name: 'First Cut sent for Review', role_owner: 'External Team', duration_hours: 24, level_0_hours: null, level_1_hours: null, level_2_hours: null, level_3_hours: null, level_4_hours: null, parallel_group: 'review_bundle', sort_order: 3 },
  { stage_name: 'Thumbnail Copy + RP Cuts', role_owner: 'External Team', duration_hours: 24, level_0_hours: null, level_1_hours: null, level_2_hours: null, level_3_hours: null, level_4_hours: null, parallel_group: 'review_bundle', sort_order: 4 },
  { stage_name: 'First Cut Changes', role_owner: 'Editor', duration_hours: 2, level_0_hours: null, level_1_hours: null, level_2_hours: null, level_3_hours: null, level_4_hours: null, parallel_group: null, sort_order: 5 },
  { stage_name: 'Storyboard', role_owner: 'Writer', duration_hours: 0, level_0_hours: 0, level_1_hours: 0, level_2_hours: 1.5, level_3_hours: 2, level_4_hours: 12, parallel_group: null, sort_order: 6 },
  { stage_name: 'Graphics & VD', role_owner: 'Designer', duration_hours: 0, level_0_hours: 0, level_1_hours: 24, level_2_hours: 48, level_3_hours: 72, level_4_hours: 96, parallel_group: 'vd_bundle', sort_order: 7 },
  { stage_name: 'Animation & VD', role_owner: 'Editor', duration_hours: 12, level_0_hours: 12, level_1_hours: 24, level_2_hours: 72, level_3_hours: 144, level_4_hours: 192, parallel_group: 'vd_bundle', sort_order: 8 },
  { stage_name: 'Video/Thumbnail Review', role_owner: 'External Team', duration_hours: 24, level_0_hours: null, level_1_hours: null, level_2_hours: null, level_3_hours: null, level_4_hours: null, parallel_group: null, sort_order: 9 },
  { stage_name: 'Final Changes', role_owner: 'Editor', duration_hours: 24, level_0_hours: null, level_1_hours: null, level_2_hours: null, level_3_hours: null, level_4_hours: null, parallel_group: null, sort_order: 10 },
  { stage_name: 'Sound', role_owner: 'Sound Designer', duration_hours: 1.5, level_0_hours: null, level_1_hours: null, level_2_hours: null, level_3_hours: null, level_4_hours: null, parallel_group: null, sort_order: 11 },
  { stage_name: 'Final Delivery', role_owner: 'Internal', duration_hours: 0, level_0_hours: null, level_1_hours: null, level_2_hours: null, level_3_hours: null, level_4_hours: null, parallel_group: null, sort_order: 12 },
]

export function zerodhaStageSlaRows(): StageSlaRow[] {
  return DEFAULT_ZERODHA_STAGE_SLA.map((r, i) => ({ ...r, id: `zerodha-${i}` }))
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
  if (project?.video_language === 'Hindi') {
    return hindiTotalPipelineHours(level)
  }
  return totalPipelineHoursFromSla(DEFAULT_ZERODHA_STAGE_SLA, level, project)
}

export function zerodhaStageSlaHoursMap(
  level?: string | null,
  project?: ProjectTeamContext,
): Partial<Record<string, number>> {
  if (project?.video_language === 'Hindi') return {}
  const map: Partial<Record<string, number>> = {}
  for (const row of DEFAULT_ZERODHA_STAGE_SLA) {
    const h = resolveZerodhaStageHours(row, level, project)
    if (h > 0) map[row.stage_name] = h
  }
  return map
}

export function isZerodhaStage(stage: string): boolean {
  return (STAGES_INTERNAL as readonly string[]).includes(stage)
}
