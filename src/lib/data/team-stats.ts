import { ChannelMember, Project } from '@/lib/types'
import { isAllMonths, isDeliveredInMonth, isProjectRelevantInMonth } from '@/lib/utils'
import { resolveStageAssigneeId } from '@/lib/views'
import { suppressProductionMetrics } from '@/lib/zerodha-sla'
import { isProjectDelivered } from '@/lib/timelines'

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

function memberCreditedOnDelivered(project: Project, memberId: string, creditPrimaryPoc: boolean): boolean {
  if (isEditorOnProject(project, memberId)) return true
  if (!creditPrimaryPoc) return false
  if (project.internal_owner_id === memberId) return true
  return resolveStageAssigneeId(project, project.current_stage) === memberId
}

function deliveredProjectsForMember(
  projects: Project[],
  memberId: string,
  month: string,
  creditPrimaryPoc: boolean,
): Project[] {
  return projects.filter(project => {
    if (!isProjectDelivered(project)) return false
    if (!isAllMonths(month) && !isDeliveredInMonth(project, month)) return false
    return memberCreditedOnDelivered(project, memberId, creditPrimaryPoc)
  })
}

function pipelineProjectsForMember(projects: Project[], memberId: string, month: string): Project[] {
  return projects.filter(project => {
    if (isProjectDelivered(project) || project.status_health === 'On hold') return false
    if (suppressProductionMetrics(project)) return false
    if (!isAllMonths(month) && !isProjectRelevantInMonth(project, month)) return false
    return resolveStageAssigneeId(project, project.current_stage) === memberId
  })
}

export type TeamPerformanceOptions = {
  /** Include Channel Super Admin rows (e.g. LA Social Primary POC). */
  includeChannelSuperAdmin?: boolean
}

function isTeamPerformanceMember(member: ChannelMember, options: TeamPerformanceOptions): boolean {
  if (isProductionTeamMember(member)) return true
  return !!options.includeChannelSuperAdmin && member.channel_role === 'Channel Super Admin'
}

export function computeTeamPerformance(
  projects: Project[],
  members: ChannelMember[],
  month: string,
  options: TeamPerformanceOptions = {},
): TeamPerformanceStats {
  const productionMembers = members.filter(m => isTeamPerformanceMember(m, options))
  const creditPrimaryPoc = !!options.includeChannelSuperAdmin

  const memberRows: TeamMemberVital[] = productionMembers.map(member => {
    const delivered = deliveredProjectsForMember(projects, member.id, month, creditPrimaryPoc)
    const inPipeline = pipelineProjectsForMember(projects, member.id, month)
    const onTimeCount = delivered.filter(isDeliveredOnTime).length
    const onTimeRate = delivered.length
      ? Math.round((onTimeCount / delivered.length) * 100)
      : null

    return {
      id: member.id,
      name: member.name,
      roleLabel: member.channel_role === 'Channel Super Admin'
        ? 'Super admin'
        : (member.organization?.trim() || 'Team member'),
      delivered: delivered.length,
      inPipeline: inPipeline.length,
      onTimeRate,
    }
  })
    .filter(row => {
      if (row.delivered > 0 || row.inPipeline > 0) return true
      const member = productionMembers.find(m => m.id === row.id)
      return member?.channel_role === 'Channel Super Admin'
    })
    .sort((a, b) => (b.delivered + b.inPipeline) - (a.delivered + a.inPipeline))

  const deliveredInScope = projects.filter(project => {
    if (!isProjectDelivered(project)) return false
    if (!isAllMonths(month) && !isDeliveredInMonth(project, month)) return false
    return productionMembers.some(member =>
      memberCreditedOnDelivered(project, member.id, creditPrimaryPoc),
    )
  })

  const pipelineInScope = projects.filter(project => {
    if (isProjectDelivered(project) || project.status_health === 'On hold') return false
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
