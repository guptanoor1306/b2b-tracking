import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { Profile } from '@/lib/types'
import { redirect } from 'next/navigation'
import { isAvatarColumnMissingError } from '@/lib/profile-fields'

const PROFILE_BASE_COLUMNS =
  'id, name, email, role, organization, is_active, created_at, updated_at'

export const getSessionProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) return null

  let { data, error } = await supabase
    .from('profiles')
    .select(`${PROFILE_BASE_COLUMNS}, avatar_url`)
    .eq('id', user.id)
    .single()

  if (isAvatarColumnMissingError(error)) {
    const fallback = await supabase
      .from('profiles')
      .select(PROFILE_BASE_COLUMNS)
      .eq('id', user.id)
      .single()
    if (fallback.error || !fallback.data) return null
    return { ...fallback.data, avatar_url: null } as Profile
  }

  if (error || !data) return null
  return { ...data, avatar_url: data.avatar_url ?? null } as Profile
})

export async function requireProfile(allowedRoles?: string[]): Promise<Profile> {
  const profile = await getSessionProfile()
  if (!profile) redirect('/login')
  if (allowedRoles && !allowedRoles.includes(profile.role)) redirect('/dashboard')
  return profile
}
