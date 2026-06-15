import { createClient } from '@/lib/supabase/server'
import { Profile } from '@/lib/types'
import { redirect } from 'next/navigation'

export async function getSessionProfile(): Promise<Profile | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return data
}

export async function requireProfile(allowedRoles?: string[]): Promise<Profile> {
  const profile = await getSessionProfile()
  if (!profile) redirect('/login')
  if (allowedRoles && !allowedRoles.includes(profile.role)) redirect('/dashboard')
  return profile
}
