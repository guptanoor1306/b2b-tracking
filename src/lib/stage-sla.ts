import { STAGES_INTERNAL, STAGE_ROLE_OWNER, DUAL_ASSIGNEE_STAGES } from '@/lib/constants'

export type StageSlaRow = {
  id: string
  stage_name: string
  role_owner: string
  duration_hours: number
  level_0_hours: number | null
  level_1_hours: number | null
  level_2_hours: number | null
  level_3_hours: number | null
  level_4_hours: number | null
  parallel_group: string | null
  sort_order: number
}

/** Default SLA config — Varsity / legacy channels */
export const DEFAULT_STAGE_SLA: Omit<StageSlaRow, 'id'>[] = [
  { stage_name: 'Video received', role_owner: 'Internal', duration_hours: 0, level_0_hours: null, level_1_hours: null, level_2_hours: null, level_3_hours: null, level_4_hours: null, parallel_group: null, sort_order: 1 },
  { stage_name: 'First Cut', role_owner: 'Editor', duration_hours: 12, level_0_hours: null, level_1_hours: null, level_2_hours: null, level_3_hours: null, level_4_hours: null, parallel_group: null, sort_order: 2 },
  { stage_name: 'First Cut sent for Review', role_owner: 'External Team', duration_hours: 24, level_0_hours: null, level_1_hours: null, level_2_hours: null, level_3_hours: null, level_4_hours: null, parallel_group: 'review_bundle', sort_order: 3 },
  { stage_name: 'Thumbnail Copy + RP Cuts', role_owner: 'External Team', duration_hours: 24, level_0_hours: null, level_1_hours: null, level_2_hours: null, level_3_hours: null, level_4_hours: null, parallel_group: 'review_bundle', sort_order: 4 },
  { stage_name: 'First Cut Changes', role_owner: 'Editor', duration_hours: 2, level_0_hours: null, level_1_hours: null, level_2_hours: null, level_3_hours: null, level_4_hours: null, parallel_group: null, sort_order: 5 },
  { stage_name: 'Storyboard', role_owner: 'Writer', duration_hours: 24, level_0_hours: null, level_1_hours: null, level_2_hours: null, level_3_hours: null, level_4_hours: null, parallel_group: null, sort_order: 6 },
  { stage_name: 'Graphics & VD', role_owner: 'Designer', duration_hours: 24, level_0_hours: null, level_1_hours: 24, level_2_hours: 24, level_3_hours: 60, level_4_hours: null, parallel_group: 'vd_bundle', sort_order: 7 },
  { stage_name: 'Animation & VD', role_owner: 'Editor', duration_hours: 84, level_0_hours: null, level_1_hours: 84, level_2_hours: 120, level_3_hours: 168, level_4_hours: null, parallel_group: 'vd_bundle', sort_order: 8 },
  { stage_name: 'Video/Thumbnail Review', role_owner: 'External Team', duration_hours: 24, level_0_hours: null, level_1_hours: null, level_2_hours: null, level_3_hours: null, level_4_hours: null, parallel_group: null, sort_order: 9 },
  { stage_name: 'Final Changes', role_owner: 'Editor', duration_hours: 12, level_0_hours: null, level_1_hours: null, level_2_hours: null, level_3_hours: null, level_4_hours: null, parallel_group: null, sort_order: 10 },
  { stage_name: 'Sound', role_owner: 'Sound Designer', duration_hours: 24, level_0_hours: null, level_1_hours: null, level_2_hours: null, level_3_hours: null, level_4_hours: null, parallel_group: null, sort_order: 11 },
  { stage_name: 'Final Delivery', role_owner: 'Internal', duration_hours: 0, level_0_hours: null, level_1_hours: null, level_2_hours: null, level_3_hours: null, level_4_hours: null, parallel_group: null, sort_order: 12 },
]

export type ProjectTeamContext = {
  level_of_video?: string | null
  video_language?: string | null
  channel?: string | null
  editor_id?: string | null
  editor_2_id?: string | null
  designer_id?: string | null
  designer_2_id?: string | null
  uses_teleprompter?: boolean | null
}

type LevelHoursKey = 'level_0_hours' | 'level_1_hours' | 'level_2_hours' | 'level_3_hours' | 'level_4_hours'

export function levelKey(level: string | null | undefined): LevelHoursKey | null {
  if (level === 'Level 0') return 'level_0_hours'
  if (level === 'Level 1') return 'level_1_hours'
  if (level === 'Level 2') return 'level_2_hours'
  if (level === 'Level 3') return 'level_3_hours'
  if (level === 'Level 4') return 'level_4_hours'
  return null
}

export function resolveStageHours(
  row: Pick<StageSlaRow, 'stage_name' | 'duration_hours' | 'level_0_hours' | 'level_1_hours' | 'level_2_hours' | 'level_3_hours' | 'level_4_hours'>,
  level: string | null | undefined,
  project?: ProjectTeamContext,
  teleprompterOverride?: boolean | null
): number {
  let hours = row.duration_hours

  const lk = levelKey(level)
  if (lk && row[lk] != null) hours = row[lk]!

  // Teleprompter split applies to Varsity First Cut (12h base) only
  if (row.stage_name === 'First Cut' && row.duration_hours === 12) {
    const tp = teleprompterOverride ?? project?.uses_teleprompter
    if (tp === true) hours = 0.5
    else if (tp === false) hours = 12
  }

  if (DUAL_ASSIGNEE_STAGES.includes(row.stage_name as typeof DUAL_ASSIGNEE_STAGES[number]) && project) {
    const dual =
      row.stage_name === 'Graphics & VD'
        ? !!(project.designer_id && project.designer_2_id)
        : !!(project.editor_id && project.editor_2_id)
    if (dual) hours = hours / 2
  }

  return hours
}

/** Total pipeline hours for target release (respects parallel groups) */
export function totalPipelineHoursFromSla(
  rows: Pick<StageSlaRow, 'stage_name' | 'duration_hours' | 'level_0_hours' | 'level_1_hours' | 'level_2_hours' | 'level_3_hours' | 'level_4_hours' | 'parallel_group'>[],
  level: string | null | undefined,
  project?: ProjectTeamContext
): number {
  const sorted = [...rows].sort((a, b) => {
    const ai = STAGES_INTERNAL.indexOf(a.stage_name as typeof STAGES_INTERNAL[number])
    const bi = STAGES_INTERNAL.indexOf(b.stage_name as typeof STAGES_INTERNAL[number])
    return ai - bi
  })

  const seenGroups = new Set<string>()
  let total = 0

  for (const row of sorted) {
    if (row.stage_name === 'Final Delivery') continue
    const h = resolveStageHours(row, level, project)
    if (row.parallel_group) {
      if (seenGroups.has(row.parallel_group)) continue
      seenGroups.add(row.parallel_group)
      const groupMax = sorted
        .filter(r => r.parallel_group === row.parallel_group)
        .reduce((max, r) => Math.max(max, resolveStageHours(r, level, project)), 0)
      total += groupMax
    } else {
      total += h
    }
  }

  return total
}

export function slaRowsToMap(rows: StageSlaRow[]): Record<string, number> {
  const map: Record<string, number> = {}
  for (const row of rows) {
    map[row.stage_name] = row.duration_hours
  }
  return map
}

export function getRoleOwner(stage: string): string {
  return STAGE_ROLE_OWNER[stage] ?? 'Internal'
}
