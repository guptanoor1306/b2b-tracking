/** Profile display picture limits (enforced client + server + storage bucket). */

export const AVATAR_MAX_BYTES = 512 * 1024
export const AVATAR_MAX_DIMENSION_PX = 256
export const AVATAR_ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const
export type AvatarMime = (typeof AVATAR_ALLOWED_MIME)[number]

export const AVATAR_BUCKET = 'avatars'

export function avatarStoragePath(profileId: string, ext: 'webp' | 'jpg' | 'png'): string {
  return `${profileId}/avatar.${ext}`
}

export function avatarPublicUrl(supabaseUrl: string, path: string, cacheBust?: number): string {
  const base = `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${AVATAR_BUCKET}/${path}`
  return cacheBust ? `${base}?v=${cacheBust}` : base
}

export function isAllowedAvatarMime(mime: string): mime is AvatarMime {
  return (AVATAR_ALLOWED_MIME as readonly string[]).includes(mime)
}

export function avatarExtForMime(mime: AvatarMime): 'webp' | 'jpg' | 'png' {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/jpeg') return 'jpg'
  return 'webp'
}
