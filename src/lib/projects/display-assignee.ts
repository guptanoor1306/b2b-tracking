import { Project, Profile } from '@/lib/types'
import { resolveStageAssigneeId } from '@/lib/views'

export type AssigneeContext = 'stage' | 'hold' | 'delivered'
export type DisplayProfile = Pick<Profile, 'id' | 'name' | 'email'>

function profileFromProject(project: Project, id: string): DisplayProfile | null {
  const candidates: (Profile | null | undefined)[] = [
    project.stage_assignee,
    project.editor_profile,
    project.editor_2_profile,
    project.designer,
    project.designer_2,
    project.writer,
    project.sound_designer,
    project.external_team_member,
    project.creator,
    project.updater,
    project.owner,
    project.graphic_designer,
  ]
  return candidates.find(p => p?.id === id) ?? null
}

export function getProjectDisplayAssignee(
  project: Project,
  context: AssigneeContext,
  holdStarter?: DisplayProfile | null,
): DisplayProfile | null {
  if (context === 'delivered') {
    const assignees = getProjectDeliveredAssignees(project)
    return assignees[0] ?? null
  }

  if (context === 'hold') {
    return holdStarter ?? project.updater ?? project.stage_assignee ?? null
  }

  const assigneeId = resolveStageAssigneeId(project, project.current_stage)
  if (assigneeId) {
    const fromTeam = profileFromProject(project, assigneeId)
    if (fromTeam) return fromTeam
  }

  return project.stage_assignee ?? null
}

export function getProjectDeliveredAssignees(project: Project): DisplayProfile[] {
  const seen = new Set<string>()
  const assignees: DisplayProfile[] = []

  const add = (profile: DisplayProfile | null | undefined) => {
    if (!profile || seen.has(profile.id)) return
    seen.add(profile.id)
    assignees.push(profile)
  }

  add(project.editor_profile ?? (project.editor_id ? profileFromProject(project, project.editor_id) : null))
  add(project.external_team_member)
  if (!project.external_team_member) {
    add(project.creator ?? (project.created_by ? profileFromProject(project, project.created_by) : null))
  }

  if (!assignees.length) {
    add(getProjectDisplayAssignee(project, 'stage'))
  }

  return assignees
}
