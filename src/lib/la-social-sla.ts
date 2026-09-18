import { FINAL_STAGE } from '@/lib/constants'
import { StageSlaRow } from '@/lib/stage-sla'
import type { StageHistory } from '@/lib/types'

export const LA_SOCIAL_CHANNEL_DB_NAME = 'LA Social'
export const LA_SOCIAL_CHANNEL_SLUG = 'la-social'

export const LA_SOCIAL_IPS = ['Zero1', 'PS'] as const

export const LA_SOCIAL_CONTENT_TYPES = ['Reel', 'Static', 'Carousel', 'LinkedIn'] as const

/** Settings UI: content-type columns map to level_0 … level_3 hours. */
export const LA_SOCIAL_TYPE_SLA_COLUMNS = [
  { key: 'level_0_hours' as const, label: 'Reel' },
  { key: 'level_1_hours' as const, label: 'Static' },
  { key: 'level_2_hours' as const, label: 'Carousel' },
  { key: 'level_3_hours' as const, label: 'LinkedIn' },
]

export const LA_SOCIAL_TOPIC = 'Topic Selection & Research'
export const LA_SOCIAL_WRITING = 'Writing'
export const LA_SOCIAL_RETRO = 'Retro'

export const STAGES_LA_SOCIAL = [
  LA_SOCIAL_TOPIC,
  LA_SOCIAL_WRITING,
  'Review & Feedback',
  'Script Changes',
  'VD/Canva',
  'Design',
  'QC',
  'Shoot',
  'Storyboard',
  'Editing',
  'Final review',
  'Final changes',
  'Founder Review',
  'Upload & Schedule',
  LA_SOCIAL_RETRO,
] as const

type ContentType = (typeof LA_SOCIAL_CONTENT_TYPES)[number]

/** Reel, Static, Carousel, LinkedIn → level_0 … level_3 */
const TYPE_LEVEL: Record<ContentType, keyof Pick<StageSlaRow, 'level_0_hours' | 'level_1_hours' | 'level_2_hours' | 'level_3_hours'>> = {
  Reel: 'level_0_hours',
  Static: 'level_1_hours',
  Carousel: 'level_2_hours',
  LinkedIn: 'level_3_hours',
}

type StageHoursByType = Record<ContentType, number>

function row(
  stage_name: string,
  role_owner: string,
  hours: StageHoursByType,
  sort_order: number,
): Omit<StageSlaRow, 'id'> {
  return {
    stage_name,
    role_owner,
    duration_hours: hours.Reel,
    level_0_hours: hours.Reel,
    level_1_hours: hours.Static,
    level_2_hours: hours.Carousel,
    level_3_hours: hours.LinkedIn,
    level_4_hours: null,
    parallel_group: null,
    sort_order,
  }
}

const h = (reel: number, stat: number, carousel: number, linkedin: number): StageHoursByType => ({
  Reel: reel,
  Static: stat,
  Carousel: carousel,
  LinkedIn: linkedin,
})

export const DEFAULT_LA_SOCIAL_STAGE_SLA: Omit<StageSlaRow, 'id'>[] = [
  row(LA_SOCIAL_TOPIC, 'Internal', h(0, 0, 0, 0), 1),
  row(LA_SOCIAL_WRITING, 'Writer', h(1, 1, 2, 1), 2),
  row('Review & Feedback', 'Writing Reviewer', h(0.5, 0.5, 0.5, 0), 3),
  row('Script Changes', 'Writer', h(0.5, 0.5, 0.5, 0), 4),
  row('VD/Canva', 'Primary POC', h(0.5, 0.5, 1, 0), 5),
  row('Design', 'Designer', h(0, 0.5, 1, 0), 6),
  row('QC', 'Primary POC', h(0, 0.5, 0.5, 0), 7),
  row('Shoot', 'Primary POC', h(1, 0, 0, 0), 8),
  row('Storyboard', 'Primary POC', h(1.5, 0, 0, 0), 9),
  row('Editing', 'Editor', h(36, 0, 0, 0), 10),
  row('Final review', 'Primary POC', h(0.5, 0.5, 0.5, 0.5), 11),
  row('Final changes', 'Editor', h(1, 0.5, 0.5, 0.5), 12),
  row('Founder Review', 'Primary POC', h(8, 8, 8, 8), 13),
  row('Upload & Schedule', 'Internal', h(0.5, 0.5, 0.5, 0.5), 14),
  row(LA_SOCIAL_RETRO, 'Primary POC', h(0.5, 0.5, 0.5, 0.5), 15),
]

export function laSocialStageSlaRows(): StageSlaRow[] {
  return DEFAULT_LA_SOCIAL_STAGE_SLA.map((r, i) => ({ ...r, id: `la-social-${i}` }))
}

export function isLaSocialChannelDbName(channel: string | null | undefined): boolean {
  return channel === LA_SOCIAL_CHANNEL_DB_NAME
}

export function isLaSocialChannelSlug(slug: string | null | undefined): boolean {
  return slug === LA_SOCIAL_CHANNEL_SLUG
}

export function laSocialLevelKey(contentType: string | null | undefined): typeof TYPE_LEVEL[ContentType] | null {
  if (!contentType) return null
  if ((LA_SOCIAL_CONTENT_TYPES as readonly string[]).includes(contentType)) {
    return TYPE_LEVEL[contentType as ContentType]
  }
  return null
}

export function finalStageForChannel(channel: string | null | undefined): string {
  if (isLaSocialChannelDbName(channel)) return LA_SOCIAL_RETRO
  return FINAL_STAGE
}

export function laSocialStageIndex(stage: string): number {
  return (STAGES_LA_SOCIAL as readonly string[]).indexOf(stage)
}

/** Detailed timeline begins once the project reaches Writing. */
export function shouldHideLaSocialPreWritingFromTimeline(
  project: { channel: string; current_stage: string },
): boolean {
  if (!isLaSocialChannelDbName(project.channel)) return false
  const idx = laSocialStageIndex(project.current_stage)
  const writingIdx = laSocialStageIndex(LA_SOCIAL_WRITING)
  return idx >= 0 && idx < writingIdx
}

export function filterLaSocialPreWritingFromHistory(
  history: StageHistory[],
  channel: string | null | undefined,
): StageHistory[] {
  if (!isLaSocialChannelDbName(channel)) return history
  return history.filter(entry => entry.new_stage !== LA_SOCIAL_TOPIC)
}

export const LA_SOCIAL_CONTENT_LINKS_ANCHOR = 'la-social-content-links'

export type LaSocialStageMoveBlock = {
  message: string
  anchor: typeof LA_SOCIAL_CONTENT_LINKS_ANCHOR
}

export function laSocialProjectLinksHref(projectId: string): string {
  return `/projects/${projectId}#${LA_SOCIAL_CONTENT_LINKS_ANCHOR}`
}

/** LA Social only — block forward moves until required content links exist. */
export function getLaSocialStageMoveBlock(
  currentStage: string,
  newStage: string,
  project: {
    channel: string
    screen_captures_link?: string | null
    final_file_link?: string | null
  },
): LaSocialStageMoveBlock | null {
  if (!isLaSocialChannelDbName(project.channel)) return null

  const curIdx = laSocialStageIndex(currentStage)
  const newIdx = laSocialStageIndex(newStage)
  if (curIdx < 0 || newIdx < 0 || newIdx <= curIdx) return null

  const editingIdx = laSocialStageIndex('Editing')
  const founderReviewIdx = laSocialStageIndex('Founder Review')

  if (
    currentStage === 'Storyboard'
    && newIdx >= editingIdx
    && !project.screen_captures_link?.trim()
  ) {
    return {
      message: 'Add the Storyboard / Canva link before moving to Editing.',
      anchor: LA_SOCIAL_CONTENT_LINKS_ANCHOR,
    }
  }

  if (newIdx >= founderReviewIdx && !project.final_file_link?.trim()) {
    return {
      message: 'Add the Final delivery link before moving to Founder Review.',
      anchor: LA_SOCIAL_CONTENT_LINKS_ANCHOR,
    }
  }

  return null
}

export function resolveLaSocialStageAssigneeId(
  project: {
    internal_owner_id?: string | null
    created_by?: string | null
    writer_id?: string | null
    qc_reviewer_id?: string | null
    designer_id?: string | null
    editor_id?: string | null
    editor_2_id?: string | null
    stage_assignee_id?: string | null
    content_type?: string | null
  },
  stage: string,
): string | null {
  const poc = project.internal_owner_id ?? project.stage_assignee_id ?? project.created_by ?? null
  const editor = project.editor_id ?? project.editor_2_id ?? null

  switch (stage) {
    case LA_SOCIAL_TOPIC:
    case 'Upload & Schedule':
      return poc
    case LA_SOCIAL_WRITING:
    case 'Script Changes':
      return project.writer_id ?? poc
    case 'Review & Feedback':
      return project.qc_reviewer_id ?? poc
    case 'Design':
      return project.designer_id ?? poc
    case 'Final changes':
      if (project.content_type === 'Static' || project.content_type === 'Carousel') {
        return project.designer_id ?? editor ?? poc
      }
      if (project.content_type === 'LinkedIn') return poc
      return editor ?? poc
    case 'Editing':
      return editor ?? poc
    case 'VD/Canva':
    case 'QC':
    case 'Shoot':
    case 'Storyboard':
    case 'Final review':
    case 'Founder Review':
    case LA_SOCIAL_RETRO:
      return poc
    default:
      return poc ?? editor
  }
}
