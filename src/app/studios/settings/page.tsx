import { redirect } from 'next/navigation'
import { requireProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { fetchMembersByChannel } from '@/lib/data/channel-access'
import { STUDIOS_CHANNELS } from '@/lib/channels'
import { StudiosSettingsClient } from '@/components/studios/StudiosSettingsClient'

export default async function StudiosSettingsPage() {
  await requireProfile(['Super Admin'])

  const supabase = await createClient()
  const [{ data: users }, membersByChannel] = await Promise.all([
    supabase.from('profiles').select('*').order('name'),
    fetchMembersByChannel(),
  ])

  // Ensure every channel tab has an array (even if empty)
  const members: Record<string, typeof membersByChannel[string]> = {}
  for (const ch of STUDIOS_CHANNELS) {
    members[ch.slug] = membersByChannel[ch.slug] ?? []
  }

  return (
    <StudiosSettingsClient
      allUsers={users ?? []}
      membersByChannel={members}
    />
  )
}
