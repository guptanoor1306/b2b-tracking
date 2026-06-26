import { requireProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { fetchHolidays } from '@/lib/data/holidays'
import { fetchStageSlaConfig, fetchSettingsActivityLogs } from '@/lib/data/stage-sla'
import { setStageSlaCache } from '@/lib/timelines'
import { SettingsClient } from '@/components/settings/SettingsClient'

export default async function SettingsPage() {
  const profile = await requireProfile(['Admin', 'Super Admin'])

  const supabase = await createClient()
  const [{ data: users }, holidays, stageSla, slaActivity] = await Promise.all([
    supabase.from('profiles').select('*'),
    fetchHolidays(),
    fetchStageSlaConfig(),
    fetchSettingsActivityLogs(),
  ])

  setStageSlaCache(stageSla)

  return (
    <SettingsClient
      users={users ?? []}
      holidays={holidays}
      currentUserId={profile.id}
      stageSla={stageSla}
      slaActivity={slaActivity}
    />
  )
}
