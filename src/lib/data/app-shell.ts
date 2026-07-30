import { cache } from 'react'
import { redirect } from 'next/navigation'
import { getSessionProfile } from '@/lib/auth'
import { getActiveChannelSlug } from '@/lib/channel-context'
import { getChannelBySlug } from '@/lib/channels'
import { fetchUserChannelSlugs, fetchChannelRole } from '@/lib/data/channel-access'
import { ChannelMemberRole, Profile } from '@/lib/types'
import { StudioChannel } from '@/lib/channels'
import { isSuperAdmin } from '@/lib/views'

export type AppShellData = {
  profile: Profile
  channel: StudioChannel
  channelRole: ChannelMemberRole | null
  showChannelSwitcher: boolean
}

/** Single cached fetch for the (app) layout — dedupes auth/channel DB calls per request. */
export const loadAppShell = cache(async (): Promise<AppShellData> => {
  const [profile, slug] = await Promise.all([
    getSessionProfile(),
    getActiveChannelSlug(),
  ])

  if (!profile) redirect('/login')
  if (!slug) redirect('/studios')

  const channel = getChannelBySlug(slug)
  if (!channel) redirect('/studios')

  const superAdmin = isSuperAdmin(profile.role)
  const [accessibleSlugs, channelRole] = await Promise.all([
    fetchUserChannelSlugs(profile),
    superAdmin ? Promise.resolve('Channel Admin' as ChannelMemberRole) : fetchChannelRole(profile.id, slug),
  ])

  if (!accessibleSlugs.includes(slug)) redirect('/studios')

  return {
    profile,
    channel,
    channelRole,
    showChannelSwitcher: accessibleSlugs.length > 1,
  }
})
