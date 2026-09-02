import { StageSlaRow } from '@/lib/stage-sla'

export const CC_REQUEST_RECEIVED = 'Request Received'
export const CC_READY_TO_PRODUCE = 'Ready to Produce'
export const CC_FIRST_CUT = '1st Cut'
export const CC_FIRST_CUT_REVIEW = '1st Cut Review'
export const CC_FIRST_CUT_REVIEW_DONE = '1st Cut Review Done'
export const CC_FIRST_DRAFT_QC = '1st Draft QC (Internal)'
export const CC_FIRST_DRAFT_REVIEW = '1st Draft Review'
export const CC_FIRST_DRAFT_REVIEW_DONE = '1st Draft Review Done'
export const CC_FIRST_REVIEW_CHANGES = '1st Review Changes'

export const STAGES_CASH_COPIUM_INTERNAL = [
  CC_REQUEST_RECEIVED,
  CC_READY_TO_PRODUCE,
  CC_FIRST_CUT,
  CC_FIRST_CUT_REVIEW,
  CC_FIRST_CUT_REVIEW_DONE,
  'Animation & VD',
  CC_FIRST_DRAFT_QC,
  CC_FIRST_DRAFT_REVIEW,
  CC_FIRST_DRAFT_REVIEW_DONE,
  CC_FIRST_REVIEW_CHANGES,
  'Sound',
  'Final Changes',
  'Final Delivery',
] as const

export const STAGES_CASH_COPIUM_EXTERNAL = [
  CC_REQUEST_RECEIVED,
  CC_READY_TO_PRODUCE,
  CC_FIRST_CUT_REVIEW,
  CC_FIRST_CUT_REVIEW_DONE,
  CC_FIRST_DRAFT_REVIEW,
  CC_FIRST_DRAFT_REVIEW_DONE,
  'Final Delivery',
] as const

export const CASH_COPIUM_CLIENT_REVIEW_STAGES = [
  CC_FIRST_CUT_REVIEW,
  CC_FIRST_DRAFT_REVIEW,
] as const

export const CASH_COPIUM_REVIEW_TO_DONE: Record<string, string> = {
  [CC_FIRST_CUT_REVIEW]: CC_FIRST_CUT_REVIEW_DONE,
  [CC_FIRST_DRAFT_REVIEW]: CC_FIRST_DRAFT_REVIEW_DONE,
}

/** level_1_hours = Long-Form, level_0_hours = Reel */
export const CASH_COPIUM_LEVEL_LABELS: Record<string, string> = {
  'Long-Form': 'Long-Form',
  Reel: 'Reel',
}

type LevelHoursKey = 'level_0_hours' | 'level_1_hours'

export function cashCopiumLevelKey(contentType: string | null | undefined): LevelHoursKey | null {
  if (contentType === 'Long-Form') return 'level_1_hours'
  if (contentType === 'Reel') return 'level_0_hours'
  return null
}

/** Map legacy / Zerodha rows into the Cash & Copium pipeline. */
export function normalizeCashCopiumBoardStage(stage: string): string {
  if (stage === 'First Cut Changes' || stage === 'Thumbnail Copy + RP Cuts') return CC_FIRST_CUT
  if (stage === 'Video received') return CC_READY_TO_PRODUCE
  if (
    stage === 'First Cut'
    || stage === 'First Cut Received'
    || stage === 'Storyboard'
    || stage === '1st Cut & Storyboard'
  ) {
    return CC_FIRST_CUT
  }
  if (stage === 'Video/Thumbnail Review') return CC_FIRST_DRAFT_REVIEW
  if (stage === 'First Cut sent for Review' || stage === 'First Cut Review') return CC_FIRST_CUT_REVIEW
  if (stage === 'First Cut Review Done') return CC_FIRST_CUT_REVIEW_DONE
  if (stage === 'First Review') return CC_FIRST_DRAFT_REVIEW
  if (stage === 'First Review Done') return CC_FIRST_DRAFT_REVIEW_DONE
  if (stage === 'Graphics & VD') return 'Animation & VD'
  if (stage === '2nd Review' || stage === '2nd Draft Review' || stage === '2nd Draft Review Done') {
    return 'Sound'
  }
  if (stage === 'Editing' || stage === 'Editing with Sound' || stage === 'Premiere') return 'Sound'
  return stage
}

export function mapCashCopiumInternalToExternalStage(internalStage: string): string {
  const stage = normalizeCashCopiumBoardStage(internalStage)
  const idx = (STAGES_CASH_COPIUM_INTERNAL as readonly string[]).indexOf(stage)
  if (idx < 0) return STAGES_CASH_COPIUM_EXTERNAL[0]

  let mapped: string = STAGES_CASH_COPIUM_EXTERNAL[0]
  for (const ext of STAGES_CASH_COPIUM_EXTERNAL) {
    const anchorIdx = (STAGES_CASH_COPIUM_INTERNAL as readonly string[]).indexOf(ext)
    if (anchorIdx >= 0 && anchorIdx <= idx) mapped = ext
  }
  return mapped
}

export const DEFAULT_CASH_COPIUM_STAGE_SLA: Omit<StageSlaRow, 'id'>[] = [
  { stage_name: CC_REQUEST_RECEIVED, role_owner: 'External Team', duration_hours: 0, level_0_hours: null, level_1_hours: null, level_2_hours: null, level_3_hours: null, level_4_hours: null, parallel_group: null, sort_order: 1 },
  { stage_name: CC_READY_TO_PRODUCE, role_owner: 'Internal', duration_hours: 0, level_0_hours: null, level_1_hours: null, level_2_hours: null, level_3_hours: null, level_4_hours: null, parallel_group: null, sort_order: 2 },
  { stage_name: CC_FIRST_CUT, role_owner: 'Editor', duration_hours: 3.5, level_0_hours: null, level_1_hours: 3.5, level_2_hours: null, level_3_hours: null, level_4_hours: null, parallel_group: null, sort_order: 3 },
  { stage_name: CC_FIRST_CUT_REVIEW, role_owner: 'External Team', duration_hours: 24, level_0_hours: null, level_1_hours: null, level_2_hours: null, level_3_hours: null, level_4_hours: null, parallel_group: null, sort_order: 4 },
  { stage_name: CC_FIRST_CUT_REVIEW_DONE, role_owner: 'Internal', duration_hours: 3.5, level_0_hours: null, level_1_hours: 3.5, level_2_hours: null, level_3_hours: null, level_4_hours: null, parallel_group: null, sort_order: 5 },
  { stage_name: 'Animation & VD', role_owner: 'Editor', duration_hours: 48, level_0_hours: 2.5, level_1_hours: 48, level_2_hours: null, level_3_hours: null, level_4_hours: null, parallel_group: null, sort_order: 6 },
  { stage_name: CC_FIRST_DRAFT_QC, role_owner: 'Channel Super Admin', duration_hours: 3.5, level_0_hours: null, level_1_hours: 3.5, level_2_hours: null, level_3_hours: null, level_4_hours: null, parallel_group: null, sort_order: 7 },
  { stage_name: CC_FIRST_DRAFT_REVIEW, role_owner: 'External Team', duration_hours: 24, level_0_hours: null, level_1_hours: null, level_2_hours: null, level_3_hours: null, level_4_hours: null, parallel_group: null, sort_order: 8 },
  { stage_name: CC_FIRST_DRAFT_REVIEW_DONE, role_owner: 'Internal', duration_hours: 3.5, level_0_hours: null, level_1_hours: 3.5, level_2_hours: null, level_3_hours: null, level_4_hours: null, parallel_group: null, sort_order: 9 },
  { stage_name: CC_FIRST_REVIEW_CHANGES, role_owner: 'Editor', duration_hours: 3.5, level_0_hours: null, level_1_hours: 3.5, level_2_hours: null, level_3_hours: null, level_4_hours: null, parallel_group: null, sort_order: 10 },
  { stage_name: 'Sound', role_owner: 'Sound Designer', duration_hours: 24, level_0_hours: null, level_1_hours: null, level_2_hours: null, level_3_hours: null, level_4_hours: null, parallel_group: null, sort_order: 11 },
  { stage_name: 'Final Changes', role_owner: 'Editor', duration_hours: 1, level_0_hours: null, level_1_hours: 1, level_2_hours: null, level_3_hours: null, level_4_hours: null, parallel_group: null, sort_order: 12 },
  { stage_name: 'Final Delivery', role_owner: 'Internal', duration_hours: 0, level_0_hours: null, level_1_hours: null, level_2_hours: null, level_3_hours: null, level_4_hours: null, parallel_group: null, sort_order: 13 },
]

export function cashCopiumStageSlaRows(): StageSlaRow[] {
  return DEFAULT_CASH_COPIUM_STAGE_SLA.map((r, i) => ({ ...r, id: `cash-copium-${i}` }))
}

const CASH_COPIUM_STAGE_SET = new Set<string>(STAGES_CASH_COPIUM_INTERNAL)

export function filterCashCopiumSlaRows(rows: StageSlaRow[]): StageSlaRow[] {
  return rows
    .filter(r => CASH_COPIUM_STAGE_SET.has(r.stage_name))
    .sort((a, b) => a.sort_order - b.sort_order)
}
