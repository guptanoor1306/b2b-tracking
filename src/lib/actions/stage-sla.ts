'use server'

import { revalidatePath } from 'next/cache'
import { requireProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { DEFAULT_STAGE_SLA } from '@/lib/stage-sla'
import { recalculateActiveProjectTargets } from '@/lib/recalculate-project-targets'

async function logSettingsActivity(
  userId: string,
  fieldChanged: string,
  oldValue: string | null,
  newValue: string | null
) {
  const supabase = await createClient()
  await supabase.from('settings_activity_logs').insert({
    action_type: 'sla_update',
    field_changed: fieldChanged,
    old_value: oldValue,
    new_value: newValue,
    updated_by: userId,
  })
}

export async function updateStageSla(
  stageName: string,
  updates: {
    duration_hours?: number
    level_1_hours?: number | null
    level_2_hours?: number | null
    level_3_hours?: number | null
  }
) {
  const profile = await requireProfile(['Admin', 'Super Admin'])
  const supabase = await createClient()

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

  revalidatePath('/settings')
  revalidatePath('/board')
  revalidatePath('/dashboard')
  revalidatePath('/projects')
  return { success: true, projectsUpdated: recalc.updated ?? 0 }
}

export async function seedStageSlaIfEmpty() {
  await requireProfile(['Admin', 'Super Admin'])
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
  revalidatePath('/settings')
  return { success: true }
}
