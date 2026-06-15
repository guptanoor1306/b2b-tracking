import { requireProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { fetchHolidays } from '@/lib/data/holidays'
import { SettingsClient } from '@/components/settings/SettingsClient'

export default async function SettingsPage() {
  await requireProfile(['Admin', 'Super Admin'])

  const supabase = await createClient()
  const [{ data: users }, holidays] = await Promise.all([
    supabase.from('profiles').select('*'),
    fetchHolidays(),
  ])

  return <SettingsClient users={users ?? []} holidays={holidays} />
}
