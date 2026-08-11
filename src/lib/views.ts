import { normalizeStage } from '@/lib/timelines'
import {
  STAGES_INTERNAL,
  STAGES_EXTERNAL,
  EXTERNAL_STAGE_ANCHORS,
  INTERNAL_ROLES,
  EXTERNAL_ROLES,
  BOARD_FULL_ACCESS_ROLES,
  SUPER_ADMIN_ROLES,
  CHANNEL_ADMIN_ROLES,
  FINAL_STAGE,
  STAGE_PIPELINE,
} from '@/lib/constants'
import { isZerodhaChannelDbName, mapZerodhaInternalToExternalStage, ZERODHA_READY_TO_PRODUCE, hasIntakeMaterials, isDeclinedRequest, normalizeZerodhaBoardStage, ZERODHA_FIRST_CUT_REVIEW, ZERODHA_FIRST_DRAFT_REVIEW, ZERODHA_SECOND_DRAFT_REVIEW, ZERODHA_FIRST_DRAFT_QC, isZerodhaClientReviewStage } from '@/lib/zerodha-sla'
import { Role, Project } from '@/lib/types'
import { isUserOnProjectTeam } from '@/lib/projects/team'

/** Pick reminder assignee from project team based on stage role */
export function resolveStageAssigneeId(
  project: {
    editor_id?: string | null
    editor_2_id?: string | null
    designer_id?: string | null
    writer_id?: string | null
    sound_designer_id?: string | null
    external_team_member_id?: string | null
    qc_reviewer_id?: string | null
    stage_assignee_id?: string | null
  },
  stage: string
): string | null {
  const s = normalizeStage(stage)
  const editor = project.editor_id ?? project.editor_2_id ?? null
  switch (s) {
    case 'First Cut':
    case '1st Cut':
    case 'First Cut Changes':
    case '1st Review Changes':
    case 'Animation & VD':
    case 'Final Changes':
      return editor
    case 'Graphics & VD':
      return project.designer_id ?? editor
    case 'Storyboard':
      return project.writer_id ?? editor
    case 'Sound':
      return project.sound_designer_id ?? editor
    case 'First Cut sent for Review':
    case '1st Cut Review':
    case '1st Draft Review':
    case '2nd Draft Review':
      return project.external_team_member_id ?? editor
    case '1st Draft QC (Internal)':
      return project.qc_reviewer_id ?? project.stage_assignee_id ?? editor
    case 'Thumbnail Copy + RP Cuts':
    case 'Video/Thumbnail Review':
    case 'First Review':
    case '2nd Review':
    case 'Request Received':
      return project.external_team_member_id ?? editor
    case '1st Cut Review Done':
      return project.writer_id ?? editor
    case '1st Draft Review Done':
    case '2nd Draft Review Done':
      return editor
    case 'Ready to Produce':
      return editor ?? project.stage_assignee_id ?? null
    default:
      return project.stage_assignee_id ?? editor
  }
}

export function isChannelSuperAdmin(role: Role | string): boolean {
  return role === 'Channel Super Admin'
}

export function isInternalRole(role: Role | string): boolean {
  return (INTERNAL_ROLES as readonly string[]).includes(role)
}

export function isExternalRole(role: Role | string): boolean {
  return (EXTERNAL_ROLES as readonly string[]).includes(role)
}

export function isExternalClientAdmin(role: Role | string): boolean {
  return role === 'External Client Admin'
}

export function usesExternalAdminDashboard(role: Role | string): boolean {
  return isExternalClientAdmin(role)
}

const ZERODHA_CLIENT_REVIEW_STAGES = new Set([
  ZERODHA_FIRST_CUT_REVIEW,
  ZERODHA_FIRST_DRAFT_REVIEW,
  ZERODHA_SECOND_DRAFT_REVIEW,
])

/** External-facing items awaiting client action — not internal delay/at-risk signals. */
export function needsExternalClientAttention(
  project: Pick<Project, 'current_stage' | 'channel' | 'request_status'>,
  channelDbName?: string | null,
): boolean {
  if (isDeclinedRequest(project)) return true
  if (isZerodhaChannelDbName(channelDbName ?? project.channel)) {
    return ZERODHA_CLIENT_REVIEW_STAGES.has(normalizeZerodhaBoardStage(project.current_stage))
  }
  const meta = STAGE_PIPELINE[normalizeStage(project.current_stage)]
  return meta?.owner === 'external'
}

export function isSuperAdmin(role: Role | string): boolean {
  return (SUPER_ADMIN_ROLES as readonly string[]).includes(role)
}

export function effectiveRoleForChannel(
  channelRole: string | null,
  globalRole?: Role | string,
): string {
  if (globalRole && isSuperAdmin(globalRole)) return 'Channel Admin'
  return channelRole ?? 'Member'
}

export function isChannelAdmin(role: Role | string): boolean {
  return role === 'Channel Admin'
}

export function usesActionItemsDashboard(role: Role | string): boolean {
  if (isExternalClientAdmin(role)) return false
  return isExternalRole(role) || role === 'Channel Team'
}

export function usesActionItemsDashboardForChannel(channelRole: string | null): boolean {
  if (!channelRole) return false
  if (isExternalClientAdmin(channelRole)) return false
  return isExternalRole(channelRole) || channelRole === 'Channel Team'
}

export function usesFullAdminDashboard(role: Role | string): boolean {
  return isChannelAdmin(role) || isSuperAdmin(role)
}

export function usesFullAdminDashboardForChannel(
  channelRole: string | null,
  globalRole?: Role | string,
): boolean {
  if (globalRole && isSuperAdmin(globalRole)) return true
  return channelRole === 'Channel Admin'
    || channelRole === 'External Client Admin'
    || channelRole === 'Channel Super Admin'
}

export function usesIpOverviewDashboard(role: Role | string): boolean {
  return isSuperAdmin(role)
}

export function canManageUsers(role: Role | string): boolean {
  return (CHANNEL_ADMIN_ROLES as readonly string[]).includes(role) || isExternalClientAdmin(role)
}

export function canEditProjects(role: Role | string): boolean {
  return role === 'Channel Admin' || role === 'Channel Team'
}

export function canChangeStages(role: Role | string): boolean {
  return role === 'Channel Admin' || role === 'Channel Team'
}

/** External users cannot drag cards on Zerodha — feedback is submitted on project detail instead. */
export function canMoveBoardCards(role: Role | string, channelDbName?: string | null): boolean {
  if (isZerodhaChannelDbName(channelDbName) && isExternalRole(role)) return false
  return isInternalRole(role) || isExternalRole(role)
}

export function canSubmitQcReviewFeedback(
  role: Role | string,
  project: Pick<Project, 'channel' | 'current_stage' | 'qc_reviewer_id'>,
  userId: string,
): boolean {
  if (!isZerodhaChannelDbName(project.channel)) return false
  if (!isInternalRole(role)) return false
  if (normalizeZerodhaBoardStage(project.current_stage) !== ZERODHA_FIRST_DRAFT_QC) return false
  return project.qc_reviewer_id === userId || isChannelSuperAdmin(role)
}

export function canSubmitClientReviewFeedback(
  role: Role | string,
  project: Pick<Project, 'channel' | 'current_stage' | 'external_team_member_id' | 'created_by'>,
  userId: string,
): boolean {
  if (!isZerodhaChannelDbName(project.channel)) return false
  if (!isExternalRole(role) && !isExternalClientAdmin(role)) return false
  if (!isZerodhaClientReviewStage(project.current_stage)) return false
  return project.external_team_member_id === userId || project.created_by === userId
}

export function canSendStageReminder(role: Role | string): boolean {
  return role === 'Channel Admin' || role === 'Channel Team' || isSuperAdmin(role)
}

export function canEditProjectLinks(role: Role | string): boolean {
  return isInternalRole(role) || role === 'Agency'
}

export function canEditProjectCopy(role: Role | string): boolean {
  return role === 'Zerodha Viewer' || isExternalClientAdmin(role)
}

/** Client submitter or internal team may edit Zerodha request materials (links + copy). */
export function canEditIntakeMaterials(
  role: Role | string,
  project: Pick<Project, 'channel' | 'external_team_member_id' | 'created_by' | 'current_stage' | 'script_link' | 'screen_captures_link' | 'audio_link'>,
  userId: string,
): boolean {
  if (!hasIntakeMaterials(project)) return false
  if (isInternalRole(role)) return true
  if (!isExternalRole(role)) return false
  return project.external_team_member_id === userId || project.created_by === userId
}

export function canViewRpCuts(role: Role | string): boolean {
  return isInternalRole(role) || role === 'Agency' || role === 'Zerodha Viewer' || isExternalClientAdmin(role)
}

export function canEditRpCuts(role: Role | string): boolean {
  return role === 'Zerodha Viewer' || isExternalClientAdmin(role)
}

export function canSeeBoardAssigneeFilter(role: Role | string): boolean {
  return (BOARD_FULL_ACCESS_ROLES as readonly string[]).includes(role) || isExternalClientAdmin(role)
}

export function shouldFilterBoardToSelf(role: Role | string): boolean {
  if (isSuperAdmin(role)) return false
  if (isExternalClientAdmin(role)) return false
  return isExternalRole(role) || role === 'Channel Team'
}

export function shouldFilterBoardForViewer(
  globalRole: Role | string,
  channelRole: string | null,
): boolean {
  if (isSuperAdmin(globalRole)) return false
  return shouldFilterBoardToSelf(effectiveRoleForChannel(channelRole, globalRole))
}

/** Full internal pipeline (12 stages) — Agency sees same columns as Channel Team */
export function usesInternalPipelineView(role: Role | string): boolean {
  return isInternalRole(role) || role === 'Agency'
}

export function usesInternalBoardView(globalRole: Role | string, channelRole: string | null): boolean {
  if (isSuperAdmin(globalRole)) return true
  return usesInternalPipelineView(effectiveRoleForChannel(channelRole, globalRole))
}

/** @deprecated use shouldFilterBoardToSelf */
export const shouldFilterBoardToTeam = shouldFilterBoardToSelf

export function canCreateExternalRequest(role: Role | string, channelDbName: string | null | undefined): boolean {
  return isZerodhaChannelDbName(channelDbName) && isExternalRole(role)
}

export function canReviewExternalRequest(role: Role | string, channelDbName: string | null | undefined): boolean {
  return isZerodhaChannelDbName(channelDbName) && isInternalRole(role)
}

/** Only LearnApp internal team may move Zerodha requests to Ready to Produce. */
export function canMarkReadyToProduce(role: Role | string, channelDbName: string | null | undefined): boolean {
  if (!isZerodhaChannelDbName(channelDbName)) return true
  return isInternalRole(role)
}

export function isBlockedReadyToProduceMove(
  role: Role | string,
  channelDbName: string | null | undefined,
  newStage: string,
): boolean {
  return !canMarkReadyToProduce(role, channelDbName)
    && normalizeStage(newStage) === ZERODHA_READY_TO_PRODUCE
}

export function getBoardDisplayStage(
  project: { current_stage: string } & Parameters<typeof resolveStageAssigneeId>[0],
  options: { externalView: boolean; viewerUserId?: string; teamBoardView?: boolean; channelDbName?: string | null },
): string {
  if (options.externalView) {
    if (isZerodhaChannelDbName(options.channelDbName ?? null)) {
      return mapZerodhaInternalToExternalStage(project.current_stage)
    }
    return mapInternalToExternalStage(project.current_stage)
  }
  if (options.teamBoardView && options.viewerUserId) {
    const assignee = resolveStageAssigneeId(project, project.current_stage)
    if (assignee !== options.viewerUserId && isUserOnProjectTeam(project, options.viewerUserId)) {
      return STAGES_INTERNAL[0]
    }
  }
  return project.current_stage
}

export function getStagesForRole(role: Role | string): readonly string[] {
  return isInternalRole(role) ? STAGES_INTERNAL : STAGES_EXTERNAL
}

export function mapInternalToExternalStage(
  internalStage: string,
  channelDbName?: string | null,
): string {
  if (isZerodhaChannelDbName(channelDbName ?? null)) {
    return mapZerodhaInternalToExternalStage(internalStage)
  }
  const stage = normalizeStage(internalStage)
  const idx = STAGES_INTERNAL.indexOf(stage as typeof STAGES_INTERNAL[number])
  if (idx < 0) return STAGES_EXTERNAL[0]

  let mapped: string = STAGES_EXTERNAL[0]
  for (const ext of STAGES_EXTERNAL) {
    const anchor = EXTERNAL_STAGE_ANCHORS[ext] ?? ext
    const anchorIdx = STAGES_INTERNAL.indexOf(anchor as typeof STAGES_INTERNAL[number])
    if (anchorIdx >= 0 && anchorIdx <= idx) mapped = ext
  }
  return mapped
}

export function isDelivered(stage: string): boolean {
  return stage === FINAL_STAGE
}

export function isToBePicked(project: { current_stage: string; picked_up_date: string | null }): boolean {
  return project.current_stage === 'Video received' && !project.picked_up_date
}

export function filterProjectsByAssignee<
  T extends { stage_assignee_id: string | null; current_stage: string } & Parameters<typeof resolveStageAssigneeId>[0],
>(projects: T[], assigneeId: string | null | undefined): T[] {
  if (!assigneeId) return projects
  return projects.filter(p =>
    p.stage_assignee_id === assigneeId
    || resolveStageAssigneeId(p, p.current_stage) === assigneeId
    || isUserOnProjectTeam(p, assigneeId)
  )
}
