import { unstable_cache } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { canUseDataCache, createCachedReadClient } from '@/lib/supabase/cache-read'
import { HOLIDAYS_CACHE_TAG } from '@/lib/cache-tags'

export type OrgHoliday = {
  id: string
  holiday_date: string
  name: string | null
  created_at: string
}

export async function fetchHolidays(): Promise<OrgHoliday[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('org_holidays')
    .select('*')
    .order('holiday_date', { ascending: true })

  if (error) return []
  return (data ?? []) as OrgHoliday[]
}

const fetchHolidayDatesCached = unstable_cache(
  async (): Promise<string[]> => {
    const supabase = createCachedReadClient()
    const { data, error } = await supabase
      .from('org_holidays')
      .select('holiday_date')
      .order('holiday_date', { ascending: true })

    if (error) return []
    return (data ?? []).map(h => h.holiday_date as string)
  },
  ['org-holiday-dates'],
  { revalidate: 3600, tags: [HOLIDAYS_CACHE_TAG] },
)

export async function fetchHolidayDates(): Promise<string[]> {
  if (!canUseDataCache()) {
    const holidays = await fetchHolidays()
    return holidays.map(h => h.holiday_date)
  }
  return fetchHolidayDatesCached()
}
