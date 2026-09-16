'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { requireChannelAdmin } from '@/lib/channel-context'
import { createClient } from '@/lib/supabase/server'
import { DEFAULT_STAGE_SLA } from '@/lib/stage-sla'
import { usesExternalIntakeFlow } from '@/lib/zerodha-sla'
import { isLaSocialChannelDbName, DEFAULT_LA_SOCIAL_STAGE_SLA } from '@/lib/la-social-sla'
import { isCashAndCopiumChannelSlug } from '@/lib/external-intake-flow'
import { DEFAULT_CASH_COPIUM_STAGE_SLA } from '@/lib/cash-and-copium-sla'
import { stageSlaCacheTag } from '@/lib/cache-tags'
import { recalculateActiveProjectTargets } from '@/lib/recalculate-project-targets'

type SlaUpdatePayload = {
  duration_hours?: number
  level_0_hours?: number | null
  level_1_hours?: number | null
  level_2_hours?: number | null
  level_3_hours?: number | null
  level_4_hours?: number | null
}

function usesChannelStageSlaTable(channelDbName: string): boolean {
  return usesExternalIntakeFlow(channelDbName) || isLaSocialChannelDbName(channelDbName)
}

async function ensureChannelStageSlaSeeded(
  supabase: Awaited<ReturnType<typeof createClient>>,
  channelSlug: string,
  channelDbName: string,
): Promise<{ error?: string }> {
  const { count } = await supabase
    .from('channel_stage_sla')
    .select('*', { count: 'exact', head: true })
    .eq('channel_slug', channelSlug)

  if (count && count > 0) return {}

  const defaults = isLaSocialChannelDbName(channelDbName)
    ? DEFAULT_LA_SOCIAL_STAGE_SLA
    : isCashAndCopiumChannelSlug(channelSlug)
      ? DEFAULT_CASH_COPIUM_STAGE_SLA
      : null

  if (!defaults) return {}

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
    })),
  )

  if (error) return { error: error.message }
  return {}
}

async function logSettingsActivity(
  userId: string,
  fieldChanged: string,
  oldValue: string | null,
  newValue: string | null,
  channelSlug?: string | null,
) {
  const supabase = await createClient()
  await supabase.from('settings_activity_logs').insert({
    action_type: 'sla_update',
    field_changed: fieldChanged,
    old_value: oldValue,
    new_value: newValue,
    updated_by: userId,
    channel_slug: channelSlug ?? null,
  })
}

export async function updateStageSla(stageName: string, updates: SlaUpdatePayload) {
  const { profile, channel } = await requireChannelAdmin()
  const supabase = await createClient()

  if (usesChannelStageSlaTable(channel.dbName)) {
    if (isLaSocialChannelDbName(channel.dbName)) {
      const seed = await ensureChannelStageSlaSeeded(supabase, channel.slug, channel.dbName)
      if (seed.error) return { error: seed.error }
    }

    const { data: existing } = await supabase
      .from('channel_stage_sla')
      .select('*')
      .eq('channel_slug', channel.slug)
      .eq('stage_name', stageName)
      .single()

    if (!existing) return { error: 'Stage SLA not found' }

    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      updated_by: profile.id,
    }

    for (const [k, v] of Object.entries(updates)) {
      if (v !== undefined) payload[k] = v
    }

    const { error } = await supabase
      .from('channel_stage_sla')
      .update(payload)
      .eq('channel_slug', channel.slug)
      .eq('stage_name', stageName)

    if (error) return { error: error.message }

    for (const [k, v] of Object.entries(updates)) {
      if (v === undefined) continue
      const oldVal = existing[k] != null ? String(existing[k]) : null
      await logSettingsActivity(
        profile.id,
        `${stageName}.${k}`,
        oldVal,
        v != null ? String(v) : null,
        channel.slug,
      )
    }

    const recalc = await recalculateActiveProjectTargets(supabase, undefined, channel.dbName)
    revalidateTag(stageSlaCacheTag(channel.slug), 'max')
    revalidatePath('/settings')
    revalidatePath('/board')
    revalidatePath('/dashboard')
    revalidatePath('/projects')
    return { success: true, projectsUpdated: recalc.updated ?? 0 }
  }

  const { data: existing } = await supabase
    .from('settings_stage_sla')
    .select('*')
    .eq('stage_name', stageName)
    .single()

  if (!existing) return { error: 'Stage SLA not found' }

  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    updated_by: profile.id,
  }

  for (const [k, v] of Object.entries(updates)) {
    if (v !== undefined) payload[k] = v
  }

  const { error } = await supabase
    .from('settings_stage_sla')
    .update(payload)
    .eq('stage_name', stageName)

  if (error) return { error: error.message }

  for (const [k, v] of Object.entries(updates)) {
    if (v === undefined) continue
    const oldVal = existing[k] != null ? String(existing[k]) : null
    await logSettingsActivity(profile.id, `${stageName}.${k}`, oldVal, v != null ? String(v) : null)
  }

  const recalc = await recalculateActiveProjectTargets(supabase)

  revalidateTag(stageSlaCacheTag('varsity'), 'max')
  revalidatePath('/settings')
  revalidatePath('/board')
  revalidatePath('/dashboard')
  revalidatePath('/projects')
  return { success: true, projectsUpdated: recalc.updated ?? 0 }
}

export async function seedStageSlaIfEmpty() {
  await requireChannelAdmin()
  const supabase = await createClient()
  const { count } = await supabase.from('settings_stage_sla').select('*', { count: 'exact', head: true })
  if (count && count > 0) return { success: true }

  const { error } = await supabase.from('settings_stage_sla').insert(
    DEFAULT_STAGE_SLA.map(r => ({
      stage_name: r.stage_name,
      role_owner: r.role_owner,
      duration_hours: r.duration_hours,
      level_1_hours: r.level_1_hours,
      level_2_hours: r.level_2_hours,
      level_3_hours: r.level_3_hours,
      parallel_group: r.parallel_group,
      sort_order: r.sort_order,
    }))
  )
  if (error) return { error: error.message }
  revalidateTag(stageSlaCacheTag('varsity'), 'max')
  revalidatePath('/settings')
  return { success: true }
}
