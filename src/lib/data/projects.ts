import { createClient } from '@/lib/supabase/server'
import { Project, Profile } from '@/lib/types'
import { calcHealth, filterProjectsByMonth, isAllMonths } from '@/lib/utils'
import { FINAL_STAGE } from '@/lib/constants'
import { getActiveChannelDbName } from '@/lib/channel-context'
import { computeProjectHealth } from '@/lib/timelines'
import { format, startOfMonth, endOfMonth } from 'date-fns'

export type ProjectFilters = {
  ip?: string
  content_type?: string
  current_stage?: string
  status_health?: string
  editor?: string
  agency?: string
  owner?: string
  month?: string
}

const PROJECT_LIST_SELECT = `
  *,
  stage_assignee:profiles!projects_stage_assignee_id_fkey(id, name, email),
  external_team_member:profiles!projects_external_team_member_id_fkey(id, name, email),
  graphic_designer:profiles!projects_graphic_designer_id_fkey(id, name, email)
`

const PROJECT_DETAIL_SELECT = `
  *,
  agency:agencies(id, name),
  owner:profiles!projects_internal_owner_id_fkey(id, name, email),
  graphic_designer:profiles!projects_graphic_designer_id_fkey(id, name, email),
  stage_assignee:profiles!projects_stage_assignee_id_fkey(id, name, email),
  editor_profile:profiles!projects_editor_id_fkey(id, name, email),
  editor_2_profile:profiles!projects_editor_2_id_fkey(id, name, email),
  designer:profiles!projects_designer_id_fkey(id, name, email),
  designer_2:profiles!projects_designer_2_id_fkey(id, name, email),
  writer:profiles!projects_writer_id_fkey(id, name, email),
  sound_designer:profiles!projects_sound_designer_id_fkey(id, name, email),
  external_team_member:profiles!projects_external_team_member_id_fkey(id, name, email),
  creator:profiles!projects_created_by_fkey(id, name, email),
  qc_reviewer:profiles!projects_qc_reviewer_id_fkey(id, name, email),
  updater:profiles!projects_updated_by_fkey(id, name, email)
`

export async function fetchAllProjects(): Promise<Project[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('projects')
    .select(PROJECT_DETAIL_SELECT)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as Project[]
}

export async function fetchProjects(
  filters: ProjectFilters = {},
  channelOverride?: string,
): Promise<Project[]> {
  const supabase = await createClient()
  const channel = channelOverride ?? await getActiveChannelDbName()
  let query = supabase
    .from('projects')
    .select(PROJECT_LIST_SELECT)
    .eq('channel', channel)
    .order('updated_at', { ascending: false })

  if (filters.ip) query = query.eq('ip', filters.ip)
  if (filters.content_type) query = query.eq('content_type', filters.content_type)
  if (filters.current_stage) query = query.eq('current_stage', filters.current_stage)
  if (filters.status_health) query = query.eq('status_health', filters.status_health)
  if (filters.editor) query = query.eq('editor', filters.editor)
  if (filters.agency) query = query.eq('assigned_agency_id', filters.agency)
  if (filters.owner) query = query.eq('internal_owner_id', filters.owner)

  if (filters.month && !isAllMonths(filters.month)) {
    const [year, month] = filters.month.split('-').map(Number)
    const startStr = format(startOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd')
    // Drop projects delivered before this month; active carry-forward rows stay.
    query = query.or(`delivered_date.is.null,delivered_date.gte.${startStr}`)
  }

  const { data, error } = await query
  if (error) throw error

  let projects = (data ?? []) as Project[]

  if (filters.month && !isAllMonths(filters.month)) {
    projects = filterProjectsByMonth(projects, filters.month)
  }

  return projects
}

export async function fetchProjectById(id: string) {
  const supabase = await createClient()
  const channel = await getActiveChannelDbName()
  const { data, error } = await supabase
    .from('projects')
    .select(PROJECT_DETAIL_SELECT)
    .eq('id', id)
    .eq('channel', channel)
    .single()
  if (error) throw error
  return data as Project
}

export async function fetchAgencyProjects(profile: Profile): Promise<Project[]> {
  const supabase = await createClient()
  if (!profile.organization) return []

  const { data: agency } = await supabase
    .from('agencies')
    .select('id')
    .eq('name', profile.organization)
    .single()

  if (!agency) return []

  const { data, error } = await supabase
    .from('projects')
    .select(PROJECT_DETAIL_SELECT)
    .eq('assigned_agency_id', agency.id)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as Project[]
}

export function computeDashboardStats(projects: Project[]) {
  const now = new Date()
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd')

  return {
    totalActive: projects.filter(p => p.current_stage !== FINAL_STAGE && p.current_stage !== 'Delivered').length,
    deliveredThisMonth: projects.filter(
      p => p.delivered_date && p.delivered_date >= monthStart
    ).length,
    onHold: projects.filter(p => p.status_health === 'On hold').length,
    delayed: projects.filter(p => p.status_health === 'Delayed').length,
    atRisk: projects.filter(p => p.status_health === 'At risk').length,
    pendingAgencyAction: projects.filter(
      p => p.next_action && ['1st Cut', 'Edit sent for review', 'Final Edit sent for review'].includes(p.current_stage)
    ).length,
    pendingInternalAction: projects.filter(
      p => p.next_action && ['Sent for Approval on 1st Cut', 'Feedback received'].includes(p.current_stage)
    ).length,
  }
}

export function recalcHealthForProject(project: Pick<Project, 'current_stage' | 'target_delivery_date' | 'received_date' | 'last_status_update_at'>) {
  return computeProjectHealth(project)
}
