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

function isDuplicateAuthError(message: string): boolean {
  return /already registered|already exists|duplicate/i.test(message)
}

async function findAuthUserByEmail(
  admin: ReturnType<typeof createAdminClient>,
  email: string,
) {
  const normalized = email.trim().toLowerCase()
  let page = 1
  const perPage = 1000

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) throw error

    const match = data.users.find(u => u.email?.toLowerCase() === normalized)
    if (match) return match

    if (data.users.length < perPage) break
    page++
  }

  return null
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

  let userId: string
  let isNewUser = false

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { name: input.name },
  })

  if (authError) {
    if (!isDuplicateAuthError(authError.message)) {
      return { error: authError.message }
    }

    const existingAuthUser = await findAuthUserByEmail(admin, input.email)
    if (!existingAuthUser) return { error: authError.message }

    userId = existingAuthUser.id

    const { error: updateAuthError } = await admin.auth.admin.updateUserById(userId, {
      password: input.password,
      email_confirm: true,
      user_metadata: { name: input.name },
    })
    if (updateAuthError) return { error: updateAuthError.message }
  } else {
    userId = authData.user.id
    isNewUser = true
  }

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
    isNewUser = true
  } else {
    const { error: profileError } = await admin.from('profiles').update({
      name: input.name,
      email: input.email,
      organization: input.organization ?? null,
      is_active: true,
    }).eq('id', userId)
    if (profileError) return { error: profileError.message }
  }

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
  const { error } = await admin.auth.admin.deleteUser(id)

  if (error) return { error: error.message }

  revalidatePath('/settings')
  revalidatePath('/studios/settings')
  return { success: true }
}
