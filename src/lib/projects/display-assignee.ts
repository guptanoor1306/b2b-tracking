import { Project, Profile } from '@/lib/types'
import { resolveStageAssigneeId } from '@/lib/views'

export type AssigneeContext = 'stage' | 'hold'
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
