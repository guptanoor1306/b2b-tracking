import { createAdminClient } from '@/lib/supabase/admin'
import { findAuthUserByEmail, isDuplicateAuthError, lookupAuthUserIdByEmail } from '@/lib/supabase/auth-admin'
import { Profile } from '@/lib/types'

type CreateInput = {
  name: string
  email: string
  password: string
  organization?: string
}

async function findProfileByEmail(admin: ReturnType<typeof createAdminClient>, email: string) {
  const { data } = await admin
    .from('profiles')
    .select('id, email, name, role, is_active')
    .ilike('email', email.trim())
    .maybeSingle()
  return data as Pick<Profile, 'id' | 'email' | 'name' | 'role' | 'is_active'> | null
}

async function mergeProfileChannels(
  admin: ReturnType<typeof createAdminClient>,
  fromId: string,
  toId: string,
) {
  if (fromId === toId) return

  const { data: rows } = await admin
    .from('profile_channels')
    .select('channel_slug, channel_role')
    .eq('profile_id', fromId)

  for (const row of rows ?? []) {
    await admin.from('profile_channels').upsert({
      profile_id: toId,
      channel_slug: row.channel_slug,
      channel_role: row.channel_role,
    }, { onConflict: 'profile_id,channel_slug' })
  }

  await admin.from('profile_channels').delete().eq('profile_id', fromId)
}

/** Remove a stale profiles row that blocks recreation under the same email. */
async function removeConflictingProfile(
  admin: ReturnType<typeof createAdminClient>,
  profileId: string,
  keepUserId: string,
) {
  if (profileId === keepUserId) return
  await mergeProfileChannels(admin, profileId, keepUserId)
  await admin.from('profiles').delete().eq('id', profileId)
}

export async function reconcileAuthAndProfile(
  input: CreateInput,
): Promise<{ userId: string; isNewAuth: boolean } | { error: string }> {
  const admin = createAdminClient()
  const email = input.email.trim()

  let profileByEmail = await findProfileByEmail(admin, email)
  let authUserId = await lookupAuthUserIdByEmail(email)

  if (profileByEmail && authUserId && profileByEmail.id !== authUserId) {
    await removeConflictingProfile(admin, profileByEmail.id, authUserId)
    profileByEmail = await findProfileByEmail(admin, email)
  }

  if (profileByEmail && !authUserId) {
    const { data, error } = await admin.auth.admin.createUser({
      id: profileByEmail.id,
      email,
      password: input.password,
      email_confirm: true,
      user_metadata: { name: input.name },
    })

    if (error && isDuplicateAuthError(error)) {
      authUserId = await lookupAuthUserIdByEmail(email)
      if (!authUserId) return { error: error.message }
    } else if (error) {
      return { error: error.message }
    } else {
      return { userId: data.user.id, isNewAuth: false }
    }
  }

  if (authUserId) {
    const { error } = await admin.auth.admin.updateUserById(authUserId, {
      password: input.password,
      email_confirm: true,
      ban_duration: 'none',
      user_metadata: { name: input.name },
    })
    if (error) return { error: error.message }
    return { userId: authUserId, isNewAuth: false }
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: { name: input.name },
  })

  if (error) {
    if (isDuplicateAuthError(error)) {
      const existing = await findAuthUserByEmail(email)
      if (!existing) return { error: error.message }

      const { error: updateError } = await admin.auth.admin.updateUserById(existing.id, {
        password: input.password,
        email_confirm: true,
        ban_duration: 'none',
        user_metadata: { name: input.name },
      })
      if (updateError) return { error: updateError.message }
      return { userId: existing.id, isNewAuth: false }
    }
    return { error: error.message }
  }

  return { userId: data.user.id, isNewAuth: true }
}

export async function ensureProfileForUser(
  userId: string,
  input: CreateInput,
): Promise<{ isNewProfile: boolean } | { error: string }> {
  const admin = createAdminClient()
  const email = input.email.trim()

  const profileByEmail = await findProfileByEmail(admin, email)
  if (profileByEmail && profileByEmail.id !== userId) {
    await removeConflictingProfile(admin, profileByEmail.id, userId)
  }

  const { data: existing } = await admin.from('profiles').select('id').eq('id', userId).maybeSingle()

  if (!existing) {
    const { error: profileError } = await admin.from('profiles').insert({
      id: userId,
      name: input.name,
      email,
      role: 'Member',
      organization: input.organization ?? null,
      is_active: true,
    })
    if (profileError) return { error: profileError.message }
    return { isNewProfile: true }
  }

  const { error: profileError } = await admin.from('profiles').update({
    name: input.name,
    email,
    organization: input.organization ?? null,
    is_active: true,
  }).eq('id', userId)

  if (profileError) return { error: profileError.message }
  return { isNewProfile: false }
}
