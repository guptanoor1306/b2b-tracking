import { createClient } from '@/lib/supabase/server'

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

export async function fetchHolidayDates(): Promise<string[]> {
  const holidays = await fetchHolidays()
  return holidays.map(h => h.holiday_date)
}
