export type ProjectTeamFields = {
  editor_id?: string | null
  editor_2_id?: string | null
  designer_id?: string | null
  designer_2_id?: string | null
  sound_designer_id?: string | null
  writer_id?: string | null
  external_team_member_id?: string | null
}

export function getProjectTeamMemberIds(project: ProjectTeamFields): string[] {
  const ids = [
    project.editor_id,
    project.editor_2_id,
    project.designer_id,
    project.designer_2_id,
    project.sound_designer_id,
    project.writer_id,
    project.external_team_member_id,
  ].filter((id): id is string => Boolean(id))
  return [...new Set(ids)]
}

export function isUserOnProjectTeam(project: ProjectTeamFields, userId: string): boolean {
  return getProjectTeamMemberIds(project).includes(userId)
}

export function filterProjectsByTeamMembership<
  T extends ProjectTeamFields,
>(projects: T[], userId: string | null | undefined): T[] {
  if (!userId) return projects
  return projects.filter(p => isUserOnProjectTeam(p, userId))
}
