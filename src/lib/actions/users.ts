'use server'

import { revalidatePath } from 'next/cache'
import { requireProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

type CreateUserInput = {
  name: string
  email: string
  password: string
  role: string
  organization?: string
}

export async function createUser(input: CreateUserInput) {
  await requireProfile(['Admin', 'Super Admin'])

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { error: 'SUPABASE_SERVICE_ROLE_KEY is required for user creation' }
  }

  const admin = createAdminClient()

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { name: input.name },
  })

  if (authError) return { error: authError.message }

  const { error: profileError } = await admin.from('profiles').insert({
    id: authData.user.id,
    name: input.name,
    email: input.email,
    role: input.role,
    organization: input.organization ?? null,
    is_active: true,
  })

  if (profileError) return { error: profileError.message }

  revalidatePath('/settings')
  return { success: true }
}

export async function updateUser(
  id: string,
  updates: { name?: string; role?: string; organization?: string; is_active?: boolean }
) {
  await requireProfile(['Admin', 'Super Admin'])

  const supabase = await createClient()
  const { error } = await supabase.from('profiles').update(updates).eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/settings')
  return { success: true }
}

export async function deleteUser(id: string) {
  const profile = await requireProfile(['Admin', 'Super Admin'])

  if (profile.id === id) {
    return { error: 'You cannot delete your own account' }
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { error: 'SUPABASE_SERVICE_ROLE_KEY is required for user deletion' }
  }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(id)

  if (error) return { error: error.message }

  revalidatePath('/settings')
  return { success: true }
}
