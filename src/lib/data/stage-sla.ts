import { createClient } from '@/lib/supabase/server'
import { DEFAULT_STAGE_SLA, StageSlaRow } from '@/lib/stage-sla'
import {
  isZerodhaChannelDbName,
  ZERODHA_CHANNEL_SLUG,
  DEFAULT_ZERODHA_STAGE_SLA,
} from '@/lib/zerodha-sla'
import { getChannelBySlug } from '@/lib/channels'

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

async function seedChannelStageSla(channelSlug: string): Promise<StageSlaRow[]> {
  const supabase = await createClient()
  const defaults = isZerodhaChannelDbName(getChannelBySlug(channelSlug)?.dbName)
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

async function fetchChannelStageSla(channelSlug: string): Promise<StageSlaRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('channel_stage_sla')
    .select('*')
    .eq('channel_slug', channelSlug)
    .order('sort_order')

  if (error) {
    if (isZerodhaChannelDbName(getChannelBySlug(channelSlug)?.dbName)) {
      return DEFAULT_ZERODHA_STAGE_SLA.map((r, i) => ({ ...r, id: `zerodha-${i}` }))
    }
    return DEFAULT_STAGE_SLA.map((r, i) => ({ ...r, id: `default-${i}` }))
  }

  if (!data?.length) {
    try {
      return await seedChannelStageSla(channelSlug)
    } catch {
      return DEFAULT_ZERODHA_STAGE_SLA.map((r, i) => ({ ...r, id: `zerodha-${i}` }))
    }
  }

  return data.map(mapSlaRow)
}

export async function fetchStageSlaConfig(channelDbName?: string | null): Promise<StageSlaRow[]> {
  if (isZerodhaChannelDbName(channelDbName)) {
    return fetchChannelStageSla(ZERODHA_CHANNEL_SLUG)
  }

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

export async function fetchProjectHoldPeriods(projectId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('project_hold_periods')
    .select('*')
    .eq('project_id', projectId)
    .order('started_at')
  return data ?? []
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
