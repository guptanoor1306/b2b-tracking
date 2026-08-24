import { ChannelMember, Project } from '@/lib/types'
import { FINAL_STAGE } from '@/lib/constants'
import { isAllMonths, isDeliveredInMonth, isProjectRelevantInMonth } from '@/lib/utils'
import { resolveStageAssigneeId } from '@/lib/views'
import { suppressProductionMetrics } from '@/lib/zerodha-sla'

export type TeamMemberVital = {
  id: string
  name: string
  roleLabel: string
  delivered: number
  inPipeline: number
  onTimeRate: number | null
}

export type TeamPerformanceStats = {
  members: TeamMemberVital[]
  summary: {
    delivered: number
    inPipeline: number
    onTimeRate: number | null
  }
}

const PRODUCTION_TEAM_ROLES = ['Channel Admin', 'Channel Team'] as const

function isProductionTeamMember(member: ChannelMember): boolean {
  return (PRODUCTION_TEAM_ROLES as readonly string[]).includes(member.channel_role)
}

function isDeliveredOnTime(project: Project): boolean {
  if (!project.delivered_date || !project.target_delivery_date) return true
  return project.delivered_date <= project.target_delivery_date
}

function isEditorOnProject(project: Project, memberId: string): boolean {
  return project.editor_id === memberId || project.editor_2_id === memberId
}

function deliveredProjectsForMember(projects: Project[], memberId: string, month: string): Project[] {
  return projects.filter(project => {
    if (project.current_stage !== FINAL_STAGE) return false
    if (!isAllMonths(month) && !isDeliveredInMonth(project, month)) return false
    return isEditorOnProject(project, memberId)
  })
}

function pipelineProjectsForMember(projects: Project[], memberId: string, month: string): Project[] {
  return projects.filter(project => {
    if (project.current_stage === FINAL_STAGE || project.status_health === 'On hold') return false
    if (suppressProductionMetrics(project)) return false
    if (!isAllMonths(month) && !isProjectRelevantInMonth(project, month)) return false
    return resolveStageAssigneeId(project, project.current_stage) === memberId
  })
}

export function computeTeamPerformance(
  projects: Project[],
  members: ChannelMember[],
  month: string,
): TeamPerformanceStats {
  const productionMembers = members.filter(isProductionTeamMember)

  const memberRows: TeamMemberVital[] = productionMembers.map(member => {
    const delivered = deliveredProjectsForMember(projects, member.id, month)
    const inPipeline = pipelineProjectsForMember(projects, member.id, month)
    const onTimeCount = delivered.filter(isDeliveredOnTime).length
    const onTimeRate = delivered.length
      ? Math.round((onTimeCount / delivered.length) * 100)
      : null

    return {
      id: member.id,
      name: member.name,
      roleLabel: member.organization?.trim() || 'Team member',
      delivered: delivered.length,
      inPipeline: inPipeline.length,
      onTimeRate,
    }
  })
    .filter(row => row.delivered > 0 || row.inPipeline > 0)
    .sort((a, b) => (b.delivered + b.inPipeline) - (a.delivered + a.inPipeline))

  const deliveredInScope = projects.filter(project => {
    if (project.current_stage !== FINAL_STAGE) return false
    if (!isAllMonths(month) && !isDeliveredInMonth(project, month)) return false
    const ownerId = project.editor_id ?? project.editor_2_id
    return ownerId != null && productionMembers.some(member => member.id === ownerId)
  })

  const pipelineInScope = projects.filter(project => {
    if (project.current_stage === FINAL_STAGE || project.status_health === 'On hold') return false
    if (suppressProductionMetrics(project)) return false
    if (!isAllMonths(month) && !isProjectRelevantInMonth(project, month)) return false
    const assigneeId = resolveStageAssigneeId(project, project.current_stage)
    return assigneeId != null && productionMembers.some(member => member.id === assigneeId)
  })

  const onTimeDelivered = deliveredInScope.filter(isDeliveredOnTime).length

  return {
    members: memberRows,
    summary: {
      delivered: deliveredInScope.length,
      inPipeline: pipelineInScope.length,
      onTimeRate: deliveredInScope.length
        ? Math.round((onTimeDelivered / deliveredInScope.length) * 100)
        : null,
    },
  }
}
