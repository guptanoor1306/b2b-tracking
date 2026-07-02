import { SupabaseClient } from '@supabase/supabase-js'
import { FINAL_STAGE } from '@/lib/constants'
import { fetchHolidayDates } from '@/lib/data/holidays'
import { computeProjectHealth, computeProjectTargetDate, normalizeStage } from '@/lib/timelines'

type ProjectRow = {
  id: string
  current_stage: string
  delivered_date: string | null
  received_date: string | null
  target_delivery_date: string | null
  level_of_video: string | null
  video_language: string | null
  channel: string
  editor_id: string | null
  editor_2_id: string | null
  designer_id: string | null
  designer_2_id: string | null
  uses_teleprompter: boolean | null
  is_on_hold?: boolean
  last_status_update_at: string
}

/** Recompute target dates for in-pipeline projects after admin SLA changes */
export async function recalculateActiveProjectTargets(
  supabase: SupabaseClient,
  holidays?: string[],
  channelDbName?: string | null,
) {
  const holidayDates = holidays ?? await fetchHolidayDates()

  const { data: projects, error } = await supabase
    .from('projects')
    .select(`
      id, current_stage, delivered_date, received_date, target_delivery_date,
      level_of_video, video_language, channel, editor_id, editor_2_id, designer_id, designer_2_id,
      uses_teleprompter, is_on_hold, last_status_update_at
    `)

  if (error || !projects) return { error: error?.message ?? 'Failed to load projects', updated: 0 }

  const active = (projects as ProjectRow[]).filter(p => {
    if (p.delivered_date) return false
    if (normalizeStage(p.current_stage) === FINAL_STAGE) return false
    return !!p.received_date
  }).filter(p => !channelDbName || p.channel === channelDbName)

  let updated = 0
  for (const project of active) {
    const target_delivery_date = computeProjectTargetDate(project, holidayDates, project.channel)
    if (!target_delivery_date || target_delivery_date === project.target_delivery_date) continue

    const status_health = computeProjectHealth({
      current_stage: project.current_stage,
      target_delivery_date,
      received_date: project.received_date,
      last_status_update_at: project.last_status_update_at,
      is_on_hold: project.is_on_hold,
      level_of_video: project.level_of_video,
    }, holidayDates)

    const { error: updateError } = await supabase
      .from('projects')
      .update({ target_delivery_date, status_health })
      .eq('id', project.id)

    if (!updateError) updated++
  }

  return { updated }
}
