'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireProfile, getSessionProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { ACTIVE_CHANNEL_COOKIE, getChannelBySlug } from '@/lib/channels'
import { fetchUserChannelSlugs, fetchChannelRole } from '@/lib/data/channel-access'
import { isSuperAdmin } from '@/lib/views'
import { ChannelMemberRole } from '@/lib/types'
import { getActiveChannelSlug } from '@/lib/channel-context'
import { notifyChannelAccess } from '@/lib/email/notifications'

export async function enterChannel(slug: string) {
  const profile = await getSessionProfile()
  if (!profile) redirect('/login')

  const channel = getChannelBySlug(slug)
  if (!channel) return { error: 'Unknown channel' }

  const allowed = await fetchUserChannelSlugs(profile)
  if (!allowed.includes(slug)) return { error: 'You do not have access to this channel' }

  const jar = await cookies()
  jar.set(ACTIVE_CHANNEL_COOKIE, slug, {
    path: '/',
    maxAge: 60 * 60 * 24 * 90,
    sameSite: 'lax',
  })

  revalidatePath('/dashboard')
  revalidatePath('/board')
  redirect('/dashboard')
}

export async function clearActiveChannel() {
  const jar = await cookies()
  jar.delete(ACTIVE_CHANNEL_COOKIE)
  redirect('/studios')
}

async function assertCanManageChannel(channelSlug: string) {
  const profile = await getSessionProfile()
  if (!profile) throw new Error('Unauthorized')
  if (isSuperAdmin(profile.role)) return profile
  const role = await fetchChannelRole(profile.id, channelSlug)
  if (role !== 'Channel Admin') throw new Error('Unauthorized')
  return profile
}

export async function addChannelMember(
  profileId: string,
  channelSlug: string,
  channelRole: ChannelMemberRole = 'Channel Team',
  exclusive = false,
) {
  await assertCanManageChannel(channelSlug)
  const supabase = await createClient()

  if (exclusive) {
    await supabase.from('profile_channels').delete().eq('profile_id', profileId)
  }

  const { error } = await supabase.from('profile_channels').upsert({
    profile_id: profileId,
    channel_slug: channelSlug,
    channel_role: channelRole,
  }, { onConflict: 'profile_id,channel_slug' })

  if (error) return { error: error.message }

  void notifyChannelAccess({ profileId, channelSlug, channelRole }).catch(() => {})

  revalidatePath('/studios/settings')
  revalidatePath('/studios')
  revalidatePath('/settings')
  return { success: true }
}

export async function updateChannelMemberRole(
  profileId: string,
  channelSlug: string,
  channelRole: ChannelMemberRole,
) {
  const profile = await getSessionProfile()
  if (!profile) return { error: 'Unauthorized' }

  // Only Super Admin can change roles across any channel; Channel Admin only within their channel
  if (!isSuperAdmin(profile.role)) {
    await assertCanManageChannel(channelSlug)
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('profile_channels')
    .update({ channel_role: channelRole })
    .eq('profile_id', profileId)
    .eq('channel_slug', channelSlug)

  if (error) return { error: error.message }

  revalidatePath('/studios/settings')
  revalidatePath('/settings')
  return { success: true }
}

export async function removeChannelMember(profileId: string, channelSlug: string) {
  await assertCanManageChannel(channelSlug)
  const supabase = await createClient()

  const { error } = await supabase
    .from('profile_channels')
    .delete()
    .eq('profile_id', profileId)
    .eq('channel_slug', channelSlug)

  if (error) return { error: error.message }

  revalidatePath('/studios/settings')
  revalidatePath('/studios')
  revalidatePath('/settings')
  return { success: true }
}

export async function setSuperAdminRole(profileId: string, isSuper: boolean) {
  await requireProfile(['Super Admin'])
  const supabase = await createClient()

  const { error } = await supabase
    .from('profiles')
    .update({ role: isSuper ? 'Super Admin' : 'Member' })
    .eq('id', profileId)

  if (error) return { error: error.message }

  if (isSuper) {
    await supabase.from('profile_channels').delete().eq('profile_id', profileId)
  }

  revalidatePath('/studios/settings')
  return { success: true }
}

export async function getLoginRedirectPath(): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return '/login'

  const profile = await getSessionProfile()
  if (!profile) return '/studios'

  const allowed = await fetchUserChannelSlugs(profile)
  if (allowed.length === 0) return '/studios'
  if (allowed.length === 1) {
    return `/studios/enter/${allowed[0]}`
  }
  return '/studios'
}
