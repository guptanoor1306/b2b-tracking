'use server'

import { getSessionProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type AccountAuthHint = {
  initial_password: string | null
  password_changed_at: string | null
}

export async function fetchAccountAuthHint(): Promise<AccountAuthHint | null> {
  const profile = await getSessionProfile()
  if (!profile) return null

  const supabase = await createClient()
  const { data } = await supabase
    .from('profile_auth_hints')
    .select('initial_password, password_changed_at')
    .eq('profile_id', profile.id)
    .maybeSingle()

  return data ?? { initial_password: null, password_changed_at: null }
}

export async function saveInitialPasswordHint(profileId: string, password: string) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return

  const admin = createAdminClient()
  await admin.from('profile_auth_hints').upsert({
    profile_id: profileId,
    initial_password: password,
    password_changed_at: null,
    updated_at: new Date().toISOString(),
  })
}

export async function clearInitialPasswordHint() {
  const profile = await getSessionProfile()
  if (!profile) return { error: 'Unauthorized' }

  const now = new Date().toISOString()
  const row = {
    profile_id: profile.id,
    initial_password: null,
    password_changed_at: now,
    updated_at: now,
  }

  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = createAdminClient()
    const { error } = await admin.from('profile_auth_hints').upsert(row)
    if (error) return { error: error.message }
  } else {
    const supabase = await createClient()
    const { error } = await supabase.from('profile_auth_hints').upsert(row)
    if (error) return { error: error.message }
  }

  revalidatePath('/account')
  return { success: true }
}
