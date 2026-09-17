import type { SupabaseClient } from '@supabase/supabase-js'

/** Columns embedded when joining `profiles` on projects, comments, etc. */
export const PROFILE_EMBED_BASE = 'id, name, email'

let cachedProfileEmbed: string | null = null

export function isAvatarColumnMissingError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false
  if (error.code === '42703') return true
  return /avatar_url/i.test(error.message ?? '')
}

export function resetProfileEmbedCache(): void {
  cachedProfileEmbed = null
}

/** Detects whether `profiles.avatar_url` exists (cached for process lifetime). */
export async function resolveProfileEmbed(client: SupabaseClient): Promise<string> {
  if (cachedProfileEmbed) return cachedProfileEmbed
  const { error } = await client.from('profiles').select('avatar_url').limit(1)
  cachedProfileEmbed = isAvatarColumnMissingError(error)
    ? PROFILE_EMBED_BASE
    : `${PROFILE_EMBED_BASE}, avatar_url`
  return cachedProfileEmbed
}

export function projectListSelect(embed: string): string {
  return `
  *,
  stage_assignee:profiles!projects_stage_assignee_id_fkey(${embed}),
  external_team_member:profiles!projects_external_team_member_id_fkey(${embed}),
  graphic_designer:profiles!projects_graphic_designer_id_fkey(${embed})
`
}

export function projectDetailSelect(embed: string): string {
  return `
  *,
  agency:agencies(id, name),
  owner:profiles!projects_internal_owner_id_fkey(${embed}),
  graphic_designer:profiles!projects_graphic_designer_id_fkey(${embed}),
  stage_assignee:profiles!projects_stage_assignee_id_fkey(${embed}),
  editor_profile:profiles!projects_editor_id_fkey(${embed}),
  editor_2_profile:profiles!projects_editor_2_id_fkey(${embed}),
  designer:profiles!projects_designer_id_fkey(${embed}),
  designer_2:profiles!projects_designer_2_id_fkey(${embed}),
  writer:profiles!projects_writer_id_fkey(${embed}),
  sound_designer:profiles!projects_sound_designer_id_fkey(${embed}),
  external_team_member:profiles!projects_external_team_member_id_fkey(${embed}),
  creator:profiles!projects_created_by_fkey(${embed}),
  qc_reviewer:profiles!projects_qc_reviewer_id_fkey(${embed}),
  updater:profiles!projects_updated_by_fkey(${embed})
`
}

export function channelMemberProfileSelect(embed: string): string {
  return `profile_id, channel_slug, channel_role, profile:profiles(${embed}, role, is_active, created_at, updated_at, organization)`
}
