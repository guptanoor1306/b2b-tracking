import { normalizeStage } from '@/lib/timelines'
import {
  STAGES_INTERNAL,
  STAGES_EXTERNAL,
  EXTERNAL_STAGE_ANCHORS,
  INTERNAL_ROLES,
  EXTERNAL_ROLES,
  BOARD_FULL_ACCESS_ROLES,
  SUPER_ADMIN_ROLES,
  ADMIN_ROLES,
  FINAL_STAGE,
} from '@/lib/constants'
import { Role } from '@/lib/types'

export function isInternalRole(role: Role | string): boolean {
  return (INTERNAL_ROLES as readonly string[]).includes(role)
}

export function isExternalRole(role: Role | string): boolean {
  return (EXTERNAL_ROLES as readonly string[]).includes(role)
}

export function isSuperAdmin(role: Role | string): boolean {
  return (SUPER_ADMIN_ROLES as readonly string[]).includes(role)
}

export function isAdminRole(role: Role | string): boolean {
  return role === 'Admin'
}

export function usesActionItemsDashboard(role: Role | string): boolean {
  return isExternalRole(role) || role === 'Internal Team'
}

export function usesFullAdminDashboard(role: Role | string): boolean {
  return role === 'Admin'
}

export function usesIpOverviewDashboard(role: Role | string): boolean {
  return isSuperAdmin(role)
}

export function canManageUsers(role: Role | string): boolean {
  return (ADMIN_ROLES as readonly string[]).includes(role)
}

export function canEditProjects(role: Role | string): boolean {
  return role === 'Admin' || role === 'Internal Team'
}

export function canChangeStages(role: Role | string): boolean {
  return role === 'Admin' || role === 'Internal Team'
}

export function canSendStageReminder(role: Role | string): boolean {
  return role === 'Admin' || role === 'Internal Team' || isSuperAdmin(role)
}

export function canSeeBoardAssigneeFilter(role: Role | string): boolean {
  return (BOARD_FULL_ACCESS_ROLES as readonly string[]).includes(role)
}

export function shouldFilterBoardToSelf(role: Role | string): boolean {
  return isExternalRole(role)
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
  return project.current_stage === 'Script Received' && !project.picked_up_date
}

export function filterProjectsByAssignee<T extends { stage_assignee_id: string | null }>(
  projects: T[],
  assigneeId: string | null | undefined
): T[] {
  if (!assigneeId) return projects
  return projects.filter(p => p.stage_assignee_id === assigneeId)
}
