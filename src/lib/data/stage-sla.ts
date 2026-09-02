import { unstable_cache } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { canUseDataCache, createCachedReadClient } from '@/lib/supabase/cache-read'
import { Profile } from '@/lib/types'
import { DEFAULT_STAGE_SLA, StageSlaRow } from '@/lib/stage-sla'
import { stageSlaCacheTag } from '@/lib/cache-tags'
import {
  usesExternalIntakeFlow,
  externalIntakeChannelSlug,
  DEFAULT_ZERODHA_STAGE_SLA,
  filterZerodhaSlaRows,
  DEFAULT_CASH_COPIUM_STAGE_SLA,
  filterCashCopiumSlaRows,
  cashCopiumStageSlaRows,
} from '@/lib/zerodha-sla'
import { getChannelBySlug } from '@/lib/channels'
import { isCashAndCopiumChannelSlug } from '@/lib/external-intake-flow'

function mapSlaRow(row: Record<string, unknown>): StageSlaRow {
  return {
    id: String(row.id),
    stage_name: String(row.stage_name),
    role_owner: String(row.role_owner),
    duration_hours: Number(row.duration_hours),
    level_0_hours: row.level_0_hours != null ? Number(row.level_0_hours) : null,
    level_1_hours: row.level_1_hours != null ? Number(row.level_1_hours) : null,
    level_2_hours: row.level_2_hours != null ? Number(row.level_2_hours) : null,
    level_3_hours: row.level_3_hours != null ? Number(row.level_3_hours) : null,
    level_4_hours: row.level_4_hours != null ? Number(row.level_4_hours) : null,
    parallel_group: (row.parallel_group as string | null) ?? null,
    sort_order: Number(row.sort_order),
  }
}

async function seedChannelStageSla(channelSlug: string, supabase = createCachedReadClient()): Promise<StageSlaRow[]> {
  const channel = getChannelBySlug(channelSlug)
  const defaults = isCashAndCopiumChannelSlug(channelSlug)
    ? DEFAULT_CASH_COPIUM_STAGE_SLA
    : usesExternalIntakeFlow(channel?.dbName)
      ? DEFAULT_ZERODHA_STAGE_SLA
      : DEFAULT_STAGE_SLA

  const { error } = await supabase.from('channel_stage_sla').insert(
    defaults.map(r => ({
      channel_slug: channelSlug,
      stage_name: r.stage_name,
      role_owner: r.role_owner,
      duration_hours: r.duration_hours,
      level_0_hours: r.level_0_hours,
      level_1_hours: r.level_1_hours,
      level_2_hours: r.level_2_hours,
      level_3_hours: r.level_3_hours,
      level_4_hours: r.level_4_hours,
      parallel_group: r.parallel_group,
      sort_order: r.sort_order,
    }))
  )

  if (error) throw new Error(error.message)

  const { data } = await supabase
    .from('channel_stage_sla')
    .select('*')
    .eq('channel_slug', channelSlug)
    .order('sort_order')

  return (data ?? []).map(mapSlaRow)
}

async function fetchChannelStageSlaUncached(channelSlug: string): Promise<StageSlaRow[]> {
  const supabase = createCachedReadClient()
  const { data, error } = await supabase
    .from('channel_stage_sla')
    .select('*')
    .eq('channel_slug', channelSlug)
    .order('sort_order')

  if (error) {
    if (isCashAndCopiumChannelSlug(channelSlug)) {
      return cashCopiumStageSlaRows()
    }
    if (usesExternalIntakeFlow(getChannelBySlug(channelSlug)?.dbName)) {
      return DEFAULT_ZERODHA_STAGE_SLA.map((r, i) => ({ ...r, id: `zerodha-${i}` }))
    }
    return DEFAULT_STAGE_SLA.map((r, i) => ({ ...r, id: `default-${i}` }))
  }

  if (!data?.length) {
    try {
      return await seedChannelStageSla(channelSlug)
    } catch {
      if (isCashAndCopiumChannelSlug(channelSlug)) {
        return cashCopiumStageSlaRows()
      }
      return DEFAULT_ZERODHA_STAGE_SLA.map((r, i) => ({ ...r, id: `zerodha-${i}` }))
    }
  }

  const mapped = data.map(mapSlaRow)
  if (isCashAndCopiumChannelSlug(channelSlug)) {
    const filtered = filterCashCopiumSlaRows(mapped)
    return filtered.length ? filtered : cashCopiumStageSlaRows()
  }
  return filterZerodhaSlaRows(mapped)
}

function getCachedChannelStageSla(channelSlug: string) {
  return unstable_cache(
    async () => fetchChannelStageSlaUncached(channelSlug),
    ['channel-stage-sla', channelSlug],
    { revalidate: 3600, tags: [stageSlaCacheTag(channelSlug)] },
  )()
}

async function fetchVarsityStageSlaUncached(): Promise<StageSlaRow[]> {
  const supabase = createCachedReadClient()
  const { data } = await supabase
    .from('settings_stage_sla')
    .select('*')
    .order('sort_order')

  if (!data?.length) {
    return DEFAULT_STAGE_SLA.map((r, i) => ({
      ...r,
      id: `default-${i}`,
    }))
  }

  return data.map(mapSlaRow)
}

const fetchVarsityStageSlaCached = unstable_cache(
  fetchVarsityStageSlaUncached,
  ['varsity-stage-sla'],
  { revalidate: 3600, tags: [stageSlaCacheTag('varsity')] },
)

async function fetchChannelStageSlaLive(channelSlug: string): Promise<StageSlaRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('channel_stage_sla')
    .select('*')
    .eq('channel_slug', channelSlug)
    .order('sort_order')

  if (error) {
    if (isCashAndCopiumChannelSlug(channelSlug)) {
      return cashCopiumStageSlaRows()
    }
    if (usesExternalIntakeFlow(getChannelBySlug(channelSlug)?.dbName)) {
      return DEFAULT_ZERODHA_STAGE_SLA.map((r, i) => ({ ...r, id: `zerodha-${i}` }))
    }
    return DEFAULT_STAGE_SLA.map((r, i) => ({ ...r, id: `default-${i}` }))
  }

  if (!data?.length) {
    try {
      return await seedChannelStageSla(channelSlug, supabase)
    } catch {
      if (isCashAndCopiumChannelSlug(channelSlug)) {
        return cashCopiumStageSlaRows()
      }
      return DEFAULT_ZERODHA_STAGE_SLA.map((r, i) => ({ ...r, id: `zerodha-${i}` }))
    }
  }

  const mapped = data.map(mapSlaRow)
  if (isCashAndCopiumChannelSlug(channelSlug)) {
    const filtered = filterCashCopiumSlaRows(mapped)
    return filtered.length ? filtered : cashCopiumStageSlaRows()
  }
  return filterZerodhaSlaRows(mapped)
}

async function fetchVarsityStageSlaLive(): Promise<StageSlaRow[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('settings_stage_sla')
    .select('*')
    .order('sort_order')

  if (!data?.length) {
    return DEFAULT_STAGE_SLA.map((r, i) => ({
      ...r,
      id: `default-${i}`,
    }))
  }

  return data.map(mapSlaRow)
}

export async function fetchStageSlaConfig(channelDbName?: string | null): Promise<StageSlaRow[]> {
  const slug = externalIntakeChannelSlug(channelDbName ?? null)
  if (!canUseDataCache()) {
    if (slug) return fetchChannelStageSlaLive(slug)
    return fetchVarsityStageSlaLive()
  }

  if (slug) {
    return getCachedChannelStageSla(slug)
  }

  return fetchVarsityStageSlaCached()
}

export async function fetchProjectHoldPeriods(projectId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('project_hold_periods')
    .select('*')
    .eq('project_id', projectId)
    .order('started_at')
  return data ?? []
}

export async function fetchHoldPeriodsForProjects(projectIds: string[]) {
  if (!projectIds.length) return {} as Record<string, Awaited<ReturnType<typeof fetchProjectHoldPeriods>>>

  const supabase = await createClient()
  const { data } = await supabase
    .from('project_hold_periods')
    .select('*')
    .in('project_id', projectIds)
    .order('started_at')

  const map: Record<string, NonNullable<typeof data>> = {}
  for (const row of data ?? []) {
    const id = row.project_id as string
    if (!map[id]) map[id] = []
    map[id].push(row)
  }
  return map
}

export async function fetchOpenHoldStarters(
  projectIds?: string[],
): Promise<Record<string, Pick<Profile, 'id' | 'name' | 'email'>>> {
  if (!projectIds?.length) return {}

  const supabase = await createClient()
  const { data } = await supabase
    .from('project_hold_periods')
    .select('project_id, starter:profiles!project_hold_periods_started_by_fkey(id, name, email)')
    .in('project_id', projectIds)
    .is('ended_at', null)

  const starters: Record<string, Pick<Profile, 'id' | 'name' | 'email'>> = {}
  for (const row of data ?? []) {
    const raw = row.starter as Pick<Profile, 'id' | 'name' | 'email'> | Pick<Profile, 'id' | 'name' | 'email'>[] | null
    const starter = Array.isArray(raw) ? raw[0] : raw
    if (starter) starters[row.project_id] = starter
  }
  return starters
}

export async function fetchSettingsActivityLogs(
  channelSlug?: string | null,
  channelScoped = false,
  limit = 50,
) {
  const supabase = await createClient()
  let query = supabase
    .from('settings_activity_logs')
    .select('*, updater:profiles!settings_activity_logs_updated_by_fkey(id, name, email)')
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (channelScoped && channelSlug) {
    query = query.eq('channel_slug', channelSlug)
  } else if (!channelScoped) {
    query = query.is('channel_slug', null)
  }

  const { data } = await query
  return data ?? []
}
