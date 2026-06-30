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
} from '@/lib/constants'
import { Role } from '@/lib/types'
import { isUserOnProjectTeam } from '@/lib/projects/team'

/** Pick reminder assignee from project team based on stage role */
export function resolveStageAssigneeId(
  project: {
    editor_id?: string | null
    designer_id?: string | null
    writer_id?: string | null
    sound_designer_id?: string | null
    external_team_member_id?: string | null
    stage_assignee_id?: string | null
  },
  stage: string
): string | null {
  const s = normalizeStage(stage)
  switch (s) {
    case 'First Cut':
    case 'First Cut Changes':
    case 'Animation & VD':
    case 'Final Changes':
      return project.editor_id ?? null
    case 'Graphics & VD':
      return project.designer_id ?? null
    case 'Storyboard':
      return project.writer_id ?? null
    case 'Sound':
      return project.sound_designer_id ?? null
    case 'First Cut sent for Review':
    case 'Thumbnail Copy + RP Cuts':
    case 'Video/Thumbnail Review':
      return project.external_team_member_id ?? null
    default:
      return project.stage_assignee_id ?? project.editor_id ?? null
  }
}

export function isInternalRole(role: Role | string): boolean {
  return (INTERNAL_ROLES as readonly string[]).includes(role)
}

export function isExternalRole(role: Role | string): boolean {
  return (EXTERNAL_ROLES as readonly string[]).includes(role)
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
  return isExternalRole(role) || role === 'Channel Team'
}

export function usesActionItemsDashboardForChannel(channelRole: string | null): boolean {
  if (!channelRole) return false
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
}

export function usesIpOverviewDashboard(role: Role | string): boolean {
  return isSuperAdmin(role)
}

export function canManageUsers(role: Role | string): boolean {
  return (CHANNEL_ADMIN_ROLES as readonly string[]).includes(role)
}

export function canEditProjects(role: Role | string): boolean {
  return role === 'Channel Admin' || role === 'Channel Team'
}

export function canChangeStages(role: Role | string): boolean {
  return role === 'Channel Admin' || role === 'Channel Team'
}

export function canSendStageReminder(role: Role | string): boolean {
  return role === 'Channel Admin' || role === 'Channel Team' || isSuperAdmin(role)
}

export function canEditProjectLinks(role: Role | string): boolean {
  return isInternalRole(role) || role === 'Agency'
}

export function canEditProjectCopy(role: Role | string): boolean {
  return role === 'Zerodha Viewer'
}

export function canViewRpCuts(role: Role | string): boolean {
  return isInternalRole(role) || role === 'Agency' || role === 'Zerodha Viewer'
}

export function canEditRpCuts(role: Role | string): boolean {
  return role === 'Zerodha Viewer'
}

export function canSeeBoardAssigneeFilter(role: Role | string): boolean {
  return (BOARD_FULL_ACCESS_ROLES as readonly string[]).includes(role)
}

export function shouldFilterBoardToSelf(role: Role | string): boolean {
  return isExternalRole(role) || role === 'Channel Team'
}

/** @deprecated use shouldFilterBoardToSelf */
export const shouldFilterBoardToTeam = shouldFilterBoardToSelf

export function getBoardDisplayStage(
  project: { current_stage: string } & Parameters<typeof resolveStageAssigneeId>[0],
  options: { externalView: boolean; viewerUserId?: string; teamBoardView?: boolean },
): string {
  if (options.externalView) {
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

export function mapInternalToExternalStage(internalStage: string): string {
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

export function filterProjectsByAssignee<T extends { stage_assignee_id: string | null }>(
  projects: T[],
  assigneeId: string | null | undefined
): T[] {
  if (!assigneeId) return projects
  return projects.filter(p => p.stage_assignee_id === assigneeId)
}
