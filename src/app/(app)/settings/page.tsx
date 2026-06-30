import { requireChannelAdmin } from '@/lib/channel-context'
import { fetchChannelMembers } from '@/lib/data/channel-access'
import { fetchHolidays } from '@/lib/data/holidays'
import { fetchStageSlaConfig, fetchSettingsActivityLogs } from '@/lib/data/stage-sla'
import { setStageSlaCache } from '@/lib/timelines'
import { SettingsClient } from '@/components/settings/SettingsClient'
import { isSuperAdmin } from '@/lib/views'

export default async function SettingsPage() {
  const { profile, channel } = await requireChannelAdmin()

  const [members, holidays, stageSla, slaActivity] = await Promise.all([
    fetchChannelMembers(channel.slug),
    fetchHolidays(),
    fetchStageSlaConfig(),
    fetchSettingsActivityLogs(),
  ])

  setStageSlaCache(stageSla)

  return (
    <SettingsClient
      members={members}
      channelSlug={channel.slug}
      channelName={channel.name}
      holidays={holidays}
      currentUserId={profile.id}
      canManageRoles={isSuperAdmin(profile.role)}
      stageSla={stageSla}
      slaActivity={slaActivity}
    />
  )
}
