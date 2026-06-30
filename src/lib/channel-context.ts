import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ACTIVE_CHANNEL_COOKIE, getChannelBySlug, slugToDbName, type StudioChannel } from '@/lib/channels'
import { getSessionProfile } from '@/lib/auth'
import { fetchUserChannelSlugs, fetchChannelRole } from '@/lib/data/channel-access'
import { Profile, ChannelMemberRole } from '@/lib/types'
import { isSuperAdmin } from '@/lib/views'

export async function getActiveChannelSlug(): Promise<string | null> {
  const jar = await cookies()
  return jar.get(ACTIVE_CHANNEL_COOKIE)?.value ?? null
}

export async function getActiveChannelDbName(): Promise<string> {
  const slug = await getActiveChannelSlug()
  if (!slug) return 'Varsity'
  return slugToDbName(slug) ?? 'Varsity'
}

export async function getActiveChannel(): Promise<StudioChannel | null> {
  const slug = await getActiveChannelSlug()
  if (!slug) return null
  return getChannelBySlug(slug) ?? null
}

export async function getActiveChannelRole(profile: Profile): Promise<ChannelMemberRole | null> {
  if (isSuperAdmin(profile.role)) return 'Channel Admin'
  const slug = await getActiveChannelSlug()
  if (!slug) return null
  return fetchChannelRole(profile.id, slug)
}

/** Ensures user has an active channel cookie with access; redirects to /studios if not */
export async function requireActiveChannel(): Promise<StudioChannel> {
  const profile = await getSessionProfile()
  if (!profile) redirect('/login')

  const slug = await getActiveChannelSlug()
  if (!slug) redirect('/studios')

  const channel = getChannelBySlug(slug)
  if (!channel) redirect('/studios')

  const allowed = await fetchUserChannelSlugs(profile)
  if (!allowed.includes(slug)) redirect('/studios')

  return channel
}

export async function requireChannelAdmin(): Promise<{
  profile: Profile
  channel: StudioChannel
  channelRole: ChannelMemberRole
}> {
  const profile = await getSessionProfile()
  if (!profile) redirect('/login')

  const channel = await requireActiveChannel()
  const channelRole = await getActiveChannelRole(profile)

  if (!isSuperAdmin(profile.role) && channelRole !== 'Channel Admin') {
    redirect('/board')
  }

  return { profile, channel, channelRole: channelRole ?? 'Channel Admin' }
}

export async function resolvePostLoginPath(profile: Pick<Profile, 'id' | 'role'>): Promise<string> {
  const allowed = await fetchUserChannelSlugs(profile)
  if (allowed.length === 0) return '/studios'
  if (allowed.length === 1) return `/studios/enter/${allowed[0]}`
  return '/studios'
}
