'use server'

import { revalidatePath } from 'next/cache'
import { getSessionProfile, requireProfile } from '@/lib/auth'
import { getActiveChannelSlug } from '@/lib/channel-context'
import { fetchChannelRole } from '@/lib/data/channel-access'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { ChannelMemberRole } from '@/lib/types'
import { isSuperAdmin } from '@/lib/views'
import { notifyChannelAccess, notifyUserWelcome } from '@/lib/email/notifications'
import { saveInitialPasswordHint } from '@/lib/actions/account'
import { reconcileAuthAndProfile, ensureProfileForUser } from '@/lib/users/reconcile'

type CreateUserInput = {
  name: string
  email: string
  password: string
  role: string
  organization?: string
}

async function assertCanManageChannel(channelSlug: string) {
  const profile = await getSessionProfile()
  if (!profile) throw new Error('Unauthorized')
  if (!channelSlug) throw new Error('No channel specified')
  if (isSuperAdmin(profile.role)) return { profile, slug: channelSlug }
  const role = await fetchChannelRole(profile.id, channelSlug)
  if (role !== 'Channel Admin') throw new Error('Unauthorized')
  return { profile, slug: channelSlug }
}

export async function createChannelUser(
  input: CreateUserInput,
  channelRole: ChannelMemberRole,
  channelSlug?: string,
) {
  const slug = channelSlug ?? await getActiveChannelSlug()
  if (!slug) return { error: 'No channel selected' }

  const { slug: resolvedSlug } = await assertCanManageChannel(slug)

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { error: 'SUPABASE_SERVICE_ROLE_KEY is required for user creation' }
  }

  const admin = createAdminClient()

  const authResult = await reconcileAuthAndProfile(input)
  if ('error' in authResult) return { error: authResult.error }

  const { userId, isNewAuth } = authResult

  const profileResult = await ensureProfileForUser(userId, input)
  if ('error' in profileResult) return { error: profileResult.error }

  const isNewUser = isNewAuth || profileResult.isNewProfile

  const { error: memberError } = await admin.from('profile_channels').upsert({
    profile_id: userId,
    channel_slug: resolvedSlug,
    channel_role: channelRole,
  }, { onConflict: 'profile_id,channel_slug' })

  if (memberError) return { error: memberError.message }

  await saveInitialPasswordHint(userId, input.password)

  if (isNewUser) {
    void notifyUserWelcome({
      profileId: userId,
      name: input.name,
      email: input.email,
      password: input.password,
      channelSlug: resolvedSlug,
      channelRole,
    }).catch(() => {})
  }

  void notifyChannelAccess({ profileId: userId, channelSlug: resolvedSlug, channelRole }).catch(() => {})

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
  const { error } = await admin.auth.admin.deleteUser(id, false)

  if (error) return { error: error.message }

  revalidatePath('/settings')
  revalidatePath('/studios/settings')
  return { success: true }
}
