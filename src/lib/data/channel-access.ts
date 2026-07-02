import { createClient } from '@/lib/supabase/server'
import { Profile, ChannelMember, ChannelMemberRole } from '@/lib/types'
import { allChannelSlugs } from '@/lib/channels'
import { isSuperAdmin } from '@/lib/views'

export type ProfileChannelRow = {
  profile_id: string
  channel_slug: string
  channel_role: ChannelMemberRole
  profile?: Profile
}

function mapProfileChannelRow(row: {
  profile_id: string
  channel_slug: string
  channel_role: string
  profile: Profile | Profile[] | null
}): ProfileChannelRow {
  const raw = row.profile
  const profile = Array.isArray(raw) ? raw[0] : raw
  return {
    profile_id: row.profile_id,
    channel_slug: row.channel_slug,
    channel_role: row.channel_role as ChannelMemberRole,
    profile: profile ?? undefined,
  }
}

export async function fetchUserChannelSlugs(profile: Pick<Profile, 'id' | 'role'>): Promise<string[]> {
  if (isSuperAdmin(profile.role)) return allChannelSlugs()

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profile_channels')
    .select('channel_slug')
    .eq('profile_id', profile.id)

  if (error || !data?.length) return []
  return data.map(r => r.channel_slug)
}

export async function fetchChannelRole(profileId: string, channelSlug: string): Promise<ChannelMemberRole | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profile_channels')
    .select('channel_role')
    .eq('profile_id', profileId)
    .eq('channel_slug', channelSlug)
    .maybeSingle()

  return (data?.channel_role as ChannelMemberRole) ?? null
}

export async function fetchChannelMembers(slug: string): Promise<ChannelMember[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profile_channels')
    .select('profile_id, channel_slug, channel_role, profile:profiles(id, name, email, role, is_active, created_at, updated_at, organization)')
    .eq('channel_slug', slug)

  if (error || !data?.length) return []

  return data
    .map(row => {
      const mapped = mapProfileChannelRow(row as Parameters<typeof mapProfileChannelRow>[0])
      if (!mapped.profile || !mapped.profile.is_active) return null
      return { ...mapped.profile, channel_role: mapped.channel_role }
    })
    .filter((m): m is ChannelMember => Boolean(m))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function fetchAllProfileChannels(): Promise<ProfileChannelRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profile_channels')
    .select('profile_id, channel_slug, channel_role, profile:profiles(id, name, email, role, is_active, created_at)')

  if (error) return []
  return (data ?? []).map(row => mapProfileChannelRow(row as Parameters<typeof mapProfileChannelRow>[0]))
}

export async function fetchChannelMemberCounts(): Promise<Record<string, number>> {
  const rows = await fetchAllProfileChannels()
  const counts: Record<string, number> = {}
  for (const r of rows) {
    counts[r.channel_slug] = (counts[r.channel_slug] ?? 0) + 1
  }
  return counts
}

export async function fetchMembersByChannel(): Promise<Record<string, ChannelMember[]>> {
  const rows = await fetchAllProfileChannels()
  const map: Record<string, ChannelMember[]> = {}
  for (const row of rows) {
    if (!row.profile) continue
    if (!map[row.channel_slug]) map[row.channel_slug] = []
    const exists = map[row.channel_slug].some(p => p.id === row.profile!.id)
    if (!exists) {
      map[row.channel_slug].push({ ...row.profile, channel_role: row.channel_role })
    }
  }
  for (const slug of Object.keys(map)) {
    map[slug].sort((a, b) => a.name.localeCompare(b.name))
  }
  return map
}

export async function fetchUserChannelRoles(profileId: string): Promise<Record<string, ChannelMemberRole>> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profile_channels')
    .select('channel_slug, channel_role')
    .eq('profile_id', profileId)

  const map: Record<string, ChannelMemberRole> = {}
  for (const row of data ?? []) {
    map[row.channel_slug as string] = row.channel_role as ChannelMemberRole
  }
  return map
}
