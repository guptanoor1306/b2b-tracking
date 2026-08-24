import { LEVELS_OF_VIDEO, STAGES_EXTERNAL, STAGES_INTERNAL } from '@/lib/constants'
import { normalizeStage } from '@/lib/timelines'
import { StageHistory } from '@/lib/types'

/** Zerodha-only intake stages (external submissions → internal review). */
export const ZERODHA_REQUEST_RECEIVED = 'Request Received'
export const ZERODHA_READY_TO_PRODUCE = 'Ready to Produce'
export const ZERODHA_INTAKE_STAGES = [ZERODHA_REQUEST_RECEIVED, ZERODHA_READY_TO_PRODUCE] as const

export type RequestStatus = 'pending' | 'approved' | 'declined' | 'resubmitted'

export function isZerodhaIntakeStage(stage: string): boolean {
  return (ZERODHA_INTAKE_STAGES as readonly string[]).includes(stage)
}

/** Client submission awaiting internal LearnApp review (first submission). */
export function isPendingRequestReview(project: {
  channel: string
  current_stage: string
  request_status?: RequestStatus | string | null
}): boolean {
  return isZerodhaChannelDbName(project.channel)
    && project.current_stage === ZERODHA_REQUEST_RECEIVED
    && (project.request_status === 'pending' || project.request_status == null)
}

/** Client resubmitted after a decline — awaiting internal review again. */
export function isResubmittedRequest(project: {
  channel?: string
  current_stage?: string
  request_status?: RequestStatus | string | null
}): boolean {
  return project.request_status === 'resubmitted'
    && project.current_stage === ZERODHA_REQUEST_RECEIVED
}

/** Pending or resubmitted — shown in internal review queue. */
export function isAwaitingRequestReview(project: {
  channel: string
  current_stage: string
  request_status?: RequestStatus | string | null
}): boolean {
  return isPendingRequestReview(project) || isResubmittedRequest(project)
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
  channel?: string | null
  current_stage: string
  request_status?: RequestStatus | string | null
}): boolean {
  const channel = project.channel
  if (!channel) return false
  const scoped = { ...project, channel }
  if (isAwaitingRequestReview(scoped) || isDeclinedRequest(scoped)) return true
  return isZerodhaChannelDbName(channel) && isZerodhaIntakeStage(project.current_stage)
}

/** Dashboard row label before production starts — no On track / Delayed / At risk. */
export function pipelineIntakeLabel(project: {
  channel?: string | null
  current_stage: string
  request_status?: RequestStatus | string | null
}): string | null {
  if (!suppressProductionMetrics(project)) return null
  const channel = project.channel
  if (!channel) return null
  const scoped = { ...project, channel }
  if (isAwaitingRequestReview(scoped)) return null
  if (isDeclinedRequest(scoped)) return 'Declined'
  if (project.current_stage === ZERODHA_READY_TO_PRODUCE) return ZERODHA_READY_TO_PRODUCE
  return null
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

/** Zerodha pipeline omits Varsity-only stages and uses renamed review stages. */
export const ZERODHA_REMOVED_STAGES = [
  'First Cut Changes',
  'Thumbnail Copy + RP Cuts',
  'Video received',
  'Video/Thumbnail Review',
] as const

/** Zerodha production + review stage names. */
export const ZERODHA_FIRST_DRAFT_QC = '1st Draft QC (Internal)'
export const ZERODHA_FIRST_CUT = '1st Cut'
export const ZERODHA_FIRST_CUT_REVIEW = '1st Cut Review'
export const ZERODHA_FIRST_CUT_REVIEW_DONE = '1st Cut Review Done'
export const ZERODHA_FIRST_DRAFT_REVIEW = '1st Draft Review'
export const ZERODHA_FIRST_DRAFT_REVIEW_DONE = '1st Draft Review Done'
export const ZERODHA_FIRST_REVIEW_CHANGES = '1st Review Changes'
export const ZERODHA_SECOND_DRAFT_REVIEW = '2nd Draft Review'
export const ZERODHA_SECOND_DRAFT_REVIEW_DONE = '2nd Draft Review Done'

export const ZERODHA_EXTERNAL_REVIEW_STAGES = [
  ZERODHA_FIRST_CUT_REVIEW,
  ZERODHA_FIRST_CUT_REVIEW_DONE,
  ZERODHA_FIRST_DRAFT_REVIEW,
  ZERODHA_FIRST_DRAFT_REVIEW_DONE,
  ZERODHA_SECOND_DRAFT_REVIEW,
  ZERODHA_SECOND_DRAFT_REVIEW_DONE,
] as const

export const ZERODHA_CLIENT_REVIEW_STAGES = [
  ZERODHA_FIRST_CUT_REVIEW,
  ZERODHA_FIRST_DRAFT_REVIEW,
  ZERODHA_SECOND_DRAFT_REVIEW,
] as const

export const ZERODHA_REVIEW_TO_DONE: Record<string, string> = {
  [ZERODHA_FIRST_CUT_REVIEW]: ZERODHA_FIRST_CUT_REVIEW_DONE,
  [ZERODHA_FIRST_DRAFT_REVIEW]: ZERODHA_FIRST_DRAFT_REVIEW_DONE,
  [ZERODHA_SECOND_DRAFT_REVIEW]: ZERODHA_SECOND_DRAFT_REVIEW_DONE,
}

export function isZerodhaClientReviewStage(stage: string): boolean {
  return (ZERODHA_CLIENT_REVIEW_STAGES as readonly string[]).includes(normalizeZerodhaBoardStage(stage))
}

export function zerodhaReviewDoneStage(reviewStage: string): string | null {
  return ZERODHA_REVIEW_TO_DONE[normalizeZerodhaBoardStage(reviewStage)] ?? null
}

export function hasClientReviewSubmission(
  submissions: { review_stage: string }[],
  reviewStage: string,
): boolean {
  const stage = normalizeZerodhaBoardStage(reviewStage)
  return submissions.some(s => normalizeZerodhaBoardStage(s.review_stage) === stage)
}

export function stageBeforeQc(channelDbName: string | null | undefined): string {
  const stages = internalStagesForChannel(channelDbName)
  const idx = (stages as readonly string[]).indexOf(ZERODHA_FIRST_DRAFT_QC)
  if (idx > 0) return stages[idx - 1]
  return 'Animation & VD'
}

export const STAGES_ZERODHA_INTERNAL = [
  ZERODHA_REQUEST_RECEIVED,
  ZERODHA_READY_TO_PRODUCE,
  ZERODHA_FIRST_CUT,
  ZERODHA_FIRST_CUT_REVIEW,
  ZERODHA_FIRST_CUT_REVIEW_DONE,
  'Storyboard',
  'Graphics & VD',
  'Animation & VD',
  ZERODHA_FIRST_DRAFT_QC,
  ZERODHA_FIRST_DRAFT_REVIEW,
  ZERODHA_FIRST_DRAFT_REVIEW_DONE,
  ZERODHA_FIRST_REVIEW_CHANGES,
  ZERODHA_SECOND_DRAFT_REVIEW,
  ZERODHA_SECOND_DRAFT_REVIEW_DONE,
  'Final Changes',
  'Sound',
  'Final Delivery',
] as const

export const STAGES_ZERODHA_EXTERNAL = [
  ZERODHA_REQUEST_RECEIVED,
  ZERODHA_READY_TO_PRODUCE,
  ZERODHA_FIRST_CUT_REVIEW,
  ZERODHA_FIRST_CUT_REVIEW_DONE,
  ZERODHA_FIRST_DRAFT_REVIEW,
  ZERODHA_FIRST_DRAFT_REVIEW_DONE,
  ZERODHA_SECOND_DRAFT_REVIEW,
  ZERODHA_SECOND_DRAFT_REVIEW_DONE,
  'Final Delivery',
] as const

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
  if (stage === 'First Cut' || stage === 'First Cut Received') return ZERODHA_FIRST_CUT
  if (stage === 'Video/Thumbnail Review') return ZERODHA_FIRST_DRAFT_REVIEW
  if (stage === 'First Cut sent for Review' || stage === 'First Cut Review') return ZERODHA_FIRST_CUT_REVIEW
  if (stage === 'First Cut Review Done') return ZERODHA_FIRST_CUT_REVIEW_DONE
  if (stage === 'First Review') return ZERODHA_FIRST_DRAFT_REVIEW
  if (stage === 'First Review Done') return ZERODHA_FIRST_DRAFT_REVIEW_DONE
  if (stage === '2nd Review') return ZERODHA_SECOND_DRAFT_REVIEW
  if (stage === '2nd Review Done') return ZERODHA_SECOND_DRAFT_REVIEW_DONE
  if (stage === 'Editing' || stage === 'Editing with Sound' || stage === 'Premiere') return 'Sound'
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

/** Zerodha SLA — review/done pairs with 0.5d internal pickup between done → next production stage */
export const DEFAULT_ZERODHA_STAGE_SLA: Omit<StageSlaRow, 'id'>[] = [
  { stage_name: ZERODHA_REQUEST_RECEIVED, role_owner: 'External Team', duration_hours: 0, level_0_hours: null, level_1_hours: null, level_2_hours: null, level_3_hours: null, level_4_hours: null, parallel_group: null, sort_order: 1 },
  { stage_name: ZERODHA_READY_TO_PRODUCE, role_owner: 'Internal', duration_hours: 0, level_0_hours: null, level_1_hours: null, level_2_hours: null, level_3_hours: null, level_4_hours: null, parallel_group: null, sort_order: 2 },
  { stage_name: ZERODHA_FIRST_CUT, role_owner: 'Editor', duration_hours: 1, level_0_hours: null, level_1_hours: null, level_2_hours: null, level_3_hours: null, level_4_hours: null, parallel_group: null, sort_order: 3 },
  { stage_name: ZERODHA_FIRST_CUT_REVIEW, role_owner: 'External Team', duration_hours: 24, level_0_hours: null, level_1_hours: null, level_2_hours: null, level_3_hours: null, level_4_hours: null, parallel_group: null, sort_order: 4 },
  { stage_name: ZERODHA_FIRST_CUT_REVIEW_DONE, role_owner: 'Internal', duration_hours: 12, level_0_hours: null, level_1_hours: null, level_2_hours: null, level_3_hours: null, level_4_hours: null, parallel_group: null, sort_order: 5 },
  { stage_name: 'Storyboard', role_owner: 'Writer', duration_hours: 0, level_0_hours: 0, level_1_hours: 0, level_2_hours: 1.5, level_3_hours: 2, level_4_hours: 12, parallel_group: null, sort_order: 6 },
  { stage_name: 'Graphics & VD', role_owner: 'Designer', duration_hours: 0, level_0_hours: 0, level_1_hours: 24, level_2_hours: 48, level_3_hours: 72, level_4_hours: 96, parallel_group: 'vd_bundle', sort_order: 7 },
  { stage_name: 'Animation & VD', role_owner: 'Editor', duration_hours: 12, level_0_hours: 12, level_1_hours: 24, level_2_hours: 72, level_3_hours: 144, level_4_hours: 192, parallel_group: 'vd_bundle', sort_order: 8 },
  { stage_name: ZERODHA_FIRST_DRAFT_QC, role_owner: 'Channel Super Admin', duration_hours: 12, level_0_hours: null, level_1_hours: null, level_2_hours: null, level_3_hours: null, level_4_hours: null, parallel_group: null, sort_order: 9 },
  { stage_name: ZERODHA_FIRST_DRAFT_REVIEW, role_owner: 'External Team', duration_hours: 24, level_0_hours: null, level_1_hours: null, level_2_hours: null, level_3_hours: null, level_4_hours: null, parallel_group: null, sort_order: 10 },
  { stage_name: ZERODHA_FIRST_DRAFT_REVIEW_DONE, role_owner: 'Internal', duration_hours: 12, level_0_hours: null, level_1_hours: null, level_2_hours: null, level_3_hours: null, level_4_hours: null, parallel_group: null, sort_order: 11 },
  { stage_name: ZERODHA_FIRST_REVIEW_CHANGES, role_owner: 'Editor', duration_hours: 24, level_0_hours: null, level_1_hours: null, level_2_hours: null, level_3_hours: null, level_4_hours: null, parallel_group: null, sort_order: 12 },
  { stage_name: ZERODHA_SECOND_DRAFT_REVIEW, role_owner: 'External Team', duration_hours: 24, level_0_hours: null, level_1_hours: null, level_2_hours: null, level_3_hours: null, level_4_hours: null, parallel_group: null, sort_order: 13 },
  { stage_name: ZERODHA_SECOND_DRAFT_REVIEW_DONE, role_owner: 'Internal', duration_hours: 12, level_0_hours: null, level_1_hours: null, level_2_hours: null, level_3_hours: null, level_4_hours: null, parallel_group: null, sort_order: 14 },
  { stage_name: 'Final Changes', role_owner: 'Editor', duration_hours: 24, level_0_hours: null, level_1_hours: null, level_2_hours: null, level_3_hours: null, level_4_hours: null, parallel_group: null, sort_order: 15 },
  { stage_name: 'Sound', role_owner: 'Sound Designer', duration_hours: 1.5, level_0_hours: null, level_1_hours: null, level_2_hours: null, level_3_hours: null, level_4_hours: null, parallel_group: null, sort_order: 16 },
  { stage_name: 'Final Delivery', role_owner: 'Internal', duration_hours: 0, level_0_hours: null, level_1_hours: null, level_2_hours: null, level_3_hours: null, level_4_hours: null, parallel_group: null, sort_order: 17 },
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

function zerodhaPipelineIndex(stage: string): number {
  const normalized = normalizeZerodhaBoardStage(stage)
  return (STAGES_ZERODHA_INTERNAL as readonly string[]).indexOf(normalized)
}

/** Old Zerodha projects already at 1st Cut+ before the Request Received intake flow — keep full timeline. */
export function isLegacyZerodhaTimelineProject(
  project: { channel: string; current_stage: string },
  history: StageHistory[],
): boolean {
  if (!isZerodhaChannelDbName(project.channel)) return false
  const idx = zerodhaPipelineIndex(project.current_stage)
  const firstCutIdx = zerodhaPipelineIndex(ZERODHA_FIRST_CUT)
  if (firstCutIdx < 0 || idx < firstCutIdx) return false

  const firstStage = [...history]
    .filter(h => !h.is_hold_event)
    .sort((a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime())[0]
    ?.new_stage

  if (!firstStage) return true
  return normalizeZerodhaBoardStage(firstStage) !== ZERODHA_REQUEST_RECEIVED
}

/** Hide Request Received / Ready to Produce rows on the project detail pipeline timeline. */
export function shouldHideZerodhaIntakeFromTimeline(
  project: { channel: string; current_stage: string },
  history: StageHistory[],
): boolean {
  if (!isZerodhaChannelDbName(project.channel)) return false
  return !isLegacyZerodhaTimelineProject(project, history)
}

export function filterZerodhaIntakeFromHistory(history: StageHistory[]): StageHistory[] {
  return history.filter(h => !isZerodhaIntakeStage(h.new_stage))
}

/** Client-side + server-side guard for Kanban stage moves that bypass Draft QC. */
export function getZerodhaQcStageMoveError(currentStage: string, newStage: string): string | null {
  const cur = normalizeZerodhaBoardStage(currentStage)
  const next = normalizeZerodhaBoardStage(newStage)
  if (cur === next) return null

  const qcIdx = zerodhaPipelineIndex(ZERODHA_FIRST_DRAFT_QC)
  const postQcIdx = zerodhaPipelineIndex(ZERODHA_FIRST_DRAFT_REVIEW)
  const curIdx = zerodhaPipelineIndex(cur)
  const newIdx = zerodhaPipelineIndex(next)
  if (qcIdx < 0 || postQcIdx < 0 || curIdx < 0 || newIdx < 0) return null

  if (cur === ZERODHA_FIRST_DRAFT_QC) {
    return 'Complete Draft QC on the project page to approve or send back.'
  }

  if (curIdx < postQcIdx && newIdx >= postQcIdx) {
    return 'Project must complete Draft QC before moving to client review stages.'
  }

  return null
}

/** Require review link before entering Draft QC (Animation & VD → QC handoff). */
export function getZerodhaQcReviewLinkError(
  newStage: string,
  assetsLink: string | null | undefined,
): string | null {
  if (normalizeZerodhaBoardStage(newStage) !== ZERODHA_FIRST_DRAFT_QC) return null
  if (!assetsLink?.trim()) {
    return 'Add a review link on the project page before moving to Draft QC.'
  }
  return null
}
