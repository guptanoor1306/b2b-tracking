'use server'

import { revalidatePath } from 'next/cache'
import { requireChannelAdmin } from '@/lib/channel-context'
import { createClient } from '@/lib/supabase/server'

export async function addHoliday(holidayDate: string, name?: string) {
  await requireChannelAdmin()

  const supabase = await createClient()
  const { error } = await supabase.from('org_holidays').insert({
    holiday_date: holidayDate,
    name: name?.trim() || null,
  })

  if (error) return { error: error.message }

  revalidatePath('/settings')
  revalidatePath('/board')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function removeHoliday(id: string) {
  await requireChannelAdmin()

  const supabase = await createClient()
  const { error } = await supabase.from('org_holidays').delete().eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/settings')
  revalidatePath('/board')
  revalidatePath('/dashboard')
  return { success: true }
}
