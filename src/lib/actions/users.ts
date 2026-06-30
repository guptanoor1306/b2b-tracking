'use server'

import { revalidatePath } from 'next/cache'
import { getSessionProfile, requireProfile } from '@/lib/auth'
import { getActiveChannelSlug } from '@/lib/channel-context'
import { fetchChannelRole } from '@/lib/data/channel-access'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { ChannelMemberRole } from '@/lib/types'
import { isSuperAdmin } from '@/lib/views'
import { notifyChannelAccess } from '@/lib/email/notifications'

type CreateUserInput = {
  name: string
  email: string
  password: string
  role: string
  organization?: string
}

async function assertCanManageActiveChannel() {
  const profile = await getSessionProfile()
  if (!profile) throw new Error('Unauthorized')
  const slug = await getActiveChannelSlug()
  if (!slug) throw new Error('No active channel')
  if (isSuperAdmin(profile.role)) return { profile, slug }
  const role = await fetchChannelRole(profile.id, slug)
  if (role !== 'Channel Admin') throw new Error('Unauthorized')
  return { profile, slug }
}

export async function createChannelUser(input: CreateUserInput, channelRole: ChannelMemberRole) {
  const { slug } = await assertCanManageActiveChannel()

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

  const userId = authData.user.id

  const { data: existing } = await admin.from('profiles').select('id').eq('id', userId).maybeSingle()
  if (!existing) {
    const { error: profileError } = await admin.from('profiles').insert({
      id: userId,
      name: input.name,
      email: input.email,
      role: 'Member',
      organization: input.organization ?? null,
      is_active: true,
    })
    if (profileError) return { error: profileError.message }
  }

  const { error: memberError } = await admin.from('profile_channels').upsert({
    profile_id: userId,
    channel_slug: slug,
    channel_role: channelRole,
  }, { onConflict: 'profile_id,channel_slug' })

  if (memberError) return { error: memberError.message }

  void notifyChannelAccess({ profileId: userId, channelSlug: slug, channelRole }).catch(() => {})

  revalidatePath('/settings')
  revalidatePath('/studios/settings')
  return { success: true, userId }
}

export async function updateChannelMember(
  profileId: string,
  channelSlug: string,
  updates: { channel_role?: ChannelMemberRole; is_active?: boolean; organization?: string; name?: string },
) {
  const profile = await getSessionProfile()
  if (!profile) return { error: 'Unauthorized' }

  if (!isSuperAdmin(profile.role)) {
    const slug = await getActiveChannelSlug()
    if (slug !== channelSlug) return { error: 'Unauthorized' }
    const role = await fetchChannelRole(profile.id, channelSlug)
    if (role !== 'Channel Admin') return { error: 'Unauthorized' }
  }

  const supabase = await createClient()

  if (updates.channel_role) {
    const { error } = await supabase
      .from('profile_channels')
      .update({ channel_role: updates.channel_role })
      .eq('profile_id', profileId)
      .eq('channel_slug', channelSlug)
    if (error) return { error: error.message }
  }

  const profileUpdates: Record<string, unknown> = {}
  if (updates.is_active !== undefined) profileUpdates.is_active = updates.is_active
  if (updates.organization !== undefined) profileUpdates.organization = updates.organization
  if (updates.name !== undefined) profileUpdates.name = updates.name

  if (Object.keys(profileUpdates).length > 0) {
    const { error } = await supabase.from('profiles').update(profileUpdates).eq('id', profileId)
    if (error) return { error: error.message }
  }

  revalidatePath('/settings')
  revalidatePath('/studios/settings')
  return { success: true }
}

export async function removeChannelMemberFromChannel(profileId: string, channelSlug: string) {
  const profile = await getSessionProfile()
  if (!profile) return { error: 'Unauthorized' }

  if (!isSuperAdmin(profile.role)) {
    const slug = await getActiveChannelSlug()
    if (slug !== channelSlug) return { error: 'Unauthorized' }
    const role = await fetchChannelRole(profile.id, channelSlug)
    if (role !== 'Channel Admin') return { error: 'Unauthorized' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('profile_channels')
    .delete()
    .eq('profile_id', profileId)
    .eq('channel_slug', channelSlug)

  if (error) return { error: error.message }

  revalidatePath('/settings')
  revalidatePath('/studios/settings')
  return { success: true }
}

export async function deleteUser(id: string) {
  const profile = await requireProfile(['Super Admin'])

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
  revalidatePath('/studios/settings')
  return { success: true }
}
