import { SupabaseClient } from '@supabase/supabase-js'

/** Release dates are user-entered; SLA changes no longer overwrite them. */
export async function recalculateActiveProjectTargets(
  _supabase: SupabaseClient,
  _holidays?: string[],
  _channelDbName?: string | null,
) {
  return { updated: 0 }
}
