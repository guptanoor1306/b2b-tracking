'use server'

import { revalidatePath } from 'next/cache'
import { getSessionProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import {
  AVATAR_BUCKET,
  AVATAR_MAX_BYTES,
  avatarExtForMime,
  avatarPublicUrl,
  avatarStoragePath,
  isAllowedAvatarMime,
} from '@/lib/profile-avatar'
import type { Profile } from '@/lib/types'
import { resetProfileEmbedCache } from '@/lib/profile-fields'

function supabaseProjectUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) throw new Error('Missing Supabase URL')
  return url
}

async function removeAvatarObjects(supabase: Awaited<ReturnType<typeof createClient>>, profileId: string) {
  const prefix = `${profileId}/`
  const { data: listed } = await supabase.storage.from(AVATAR_BUCKET).list(profileId)
  if (listed?.length) {
    const paths = listed.map(f => `${prefix}${f.name}`)
    await supabase.storage.from(AVATAR_BUCKET).remove(paths)
  }
}

export async function uploadProfileAvatar(formData: FormData): Promise<{ profile?: Profile; error?: string }> {
  const session = await getSessionProfile()
  if (!session) return { error: 'Unauthorized' }

  const file = formData.get('avatar')
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Choose an image to upload.' }
  }
  if (!isAllowedAvatarMime(file.type)) {
    return { error: 'Use a JPEG, PNG, or WebP image.' }
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return { error: `Image must be under ${Math.round(AVATAR_MAX_BYTES / 1024)} KB.` }
  }

  const supabase = await createClient()
  const ext = avatarExtForMime(file.type)
  const path = avatarStoragePath(session.id, ext)
  const buffer = Buffer.from(await file.arrayBuffer())

  await removeAvatarObjects(supabase, session.id)

  const { error: uploadError } = await supabase.storage.from(AVATAR_BUCKET).upload(path, buffer, {
    upsert: true,
    contentType: file.type,
    cacheControl: '3600',
  })
  if (uploadError) return { error: uploadError.message }

  const bust = Date.now()
  const avatar_url = avatarPublicUrl(supabaseProjectUrl(), path, bust)

  const { data: profile, error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url, updated_at: new Date().toISOString() })
    .eq('id', session.id)
    .select('*')
    .single()

  if (updateError) return { error: updateError.message }

  resetProfileEmbedCache()
  revalidatePath('/account')
  revalidatePath('/studios/account')
  revalidatePath('/board')
  return { profile: profile as Profile }
}

export async function removeProfileAvatar(): Promise<{ profile?: Profile; error?: string }> {
  const session = await getSessionProfile()
  if (!session) return { error: 'Unauthorized' }

  const supabase = await createClient()
  await removeAvatarObjects(supabase, session.id)

  const { data: profile, error } = await supabase
    .from('profiles')
    .update({ avatar_url: null, updated_at: new Date().toISOString() })
    .eq('id', session.id)
    .select('*')
    .single()

  if (error) return { error: error.message }

  resetProfileEmbedCache()
  revalidatePath('/account')
  revalidatePath('/studios/account')
  revalidatePath('/board')
  return { profile: profile as Profile }
}
