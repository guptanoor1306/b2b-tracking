import { unstable_cache } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { canUseDataCache, createCachedReadClient } from '@/lib/supabase/cache-read'
import { projectsListCacheTag } from '@/lib/cache-tags'
import { Project, Profile } from '@/lib/types'
import {
  projectDetailSelect,
  projectListSelect,
  resolveProfileEmbed,
} from '@/lib/profile-fields'
import { filterProjectsByMonth, isAllMonths } from '@/lib/utils'
import { FINAL_STAGE } from '@/lib/constants'
import { getActiveChannelDbName } from '@/lib/channel-context'
import { computeProjectHealth, isProjectDelivered } from '@/lib/timelines'
import { format, startOfMonth } from 'date-fns'

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

function projectListHasExtraFilters(filters: ProjectFilters): boolean {
  return Boolean(
    filters.ip
    || filters.content_type
    || filters.current_stage
    || filters.status_health
    || filters.editor
    || filters.agency
    || filters.owner,
  )
}

async function fetchProjectsQuery(
  filters: ProjectFilters,
  channel: string,
  supabase: SupabaseClient,
): Promise<Project[]> {
  const embed = await resolveProfileEmbed(supabase)
  let query = supabase
    .from('projects')
    .select(projectListSelect(embed))
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
    query = query.or(`delivered_date.is.null,delivered_date.gte.${startStr}`)
  }

  const { data, error } = await query
  if (error) throw error

  let projects = (data ?? []) as unknown as Project[]

  if (filters.month && !isAllMonths(filters.month)) {
    projects = filterProjectsByMonth(projects, filters.month)
  }

  return projects
}

function getCachedProjectsList(channel: string, monthKey: string) {
  const filters: ProjectFilters = monthKey === 'all' ? {} : { month: monthKey }
  return unstable_cache(
    async () => fetchProjectsQuery(filters, channel, createCachedReadClient()),
    ['projects-list', channel, monthKey],
    { revalidate: 300, tags: [projectsListCacheTag(channel)] },
  )()
}

export async function fetchAllProjects(): Promise<Project[]> {
  const supabase = await createClient()
  const embed = await resolveProfileEmbed(supabase)
  const { data, error } = await supabase
    .from('projects')
    .select(projectDetailSelect(embed))
    .order('updated_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as unknown as Project[]
}

export async function fetchProjects(
  filters: ProjectFilters = {},
  channelOverride?: string,
): Promise<Project[]> {
  const channel = channelOverride ?? await getActiveChannelDbName()
  const monthKey = filters.month && !isAllMonths(filters.month) ? filters.month : 'all'
  const supabase = await createClient()

  if (!projectListHasExtraFilters(filters) && canUseDataCache()) {
    try {
      return await getCachedProjectsList(channel, monthKey)
    } catch (err) {
      console.error('[fetchProjects] cache read failed, using live query:', err)
    }
  }

  return fetchProjectsQuery(filters, channel, supabase)
}

export async function fetchProjectById(id: string) {
  const supabase = await createClient()
  const channel = await getActiveChannelDbName()
  const embed = await resolveProfileEmbed(supabase)
  const { data, error } = await supabase
    .from('projects')
    .select(projectDetailSelect(embed))
    .eq('id', id)
    .eq('channel', channel)
    .single()
  if (error) throw error
  return data as unknown as Project
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

  const embed = await resolveProfileEmbed(supabase)
  const { data, error } = await supabase
    .from('projects')
    .select(projectDetailSelect(embed))
    .eq('assigned_agency_id', agency.id)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as unknown as Project[]
}

export function computeDashboardStats(projects: Project[]) {
  const now = new Date()
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd')

  return {
    totalActive: projects.filter(p => !isProjectDelivered(p)).length,
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
