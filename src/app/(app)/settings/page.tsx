import { requireChannelAdmin } from '@/lib/channel-context'
import { fetchChannelMembers } from '@/lib/data/channel-access'
import { fetchHolidays } from '@/lib/data/holidays'
import { fetchStageSlaConfig, fetchSettingsActivityLogs } from '@/lib/data/stage-sla'
import { setStageSlaCache } from '@/lib/timelines'
import { SettingsClient } from '@/components/settings/SettingsClient'
import { isSuperAdmin } from '@/lib/views'
import { isZerodhaChannelDbName } from '@/lib/zerodha-sla'

export default async function SettingsPage() {
  const { profile, channel } = await requireChannelAdmin()
  const isZerodha = isZerodhaChannelDbName(channel.dbName)

  const [members, holidays, stageSla, slaActivity] = await Promise.all([
    fetchChannelMembers(channel.slug),
    fetchHolidays(),
    fetchStageSlaConfig(channel.dbName),
    fetchSettingsActivityLogs(channel.slug, isZerodha),
  ])

  setStageSlaCache(stageSla, channel.dbName)

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
      channelDbName={channel.dbName}
    />
  )
}
