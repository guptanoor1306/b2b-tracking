'use client'

import { useRef, useState } from 'react'
import { Profile } from '@/lib/types'
import { AssigneeAvatar } from '@/components/ui/AssigneeAvatar'
import { Button } from '@/components/ui/Button'
import { SettingsCard } from '@/components/settings/SettingsLayout'
import { useAuth } from '@/context/AuthContext'
import { prepareProfileAvatarFile } from '@/lib/client/resize-profile-image'
import { removeProfileAvatar, uploadProfileAvatar } from '@/lib/actions/profile-avatar'
import { AVATAR_MAX_BYTES, AVATAR_MAX_DIMENSION_PX } from '@/lib/profile-avatar'
import { Camera, Trash2 } from 'lucide-react'

type Props = {
  profile: Profile
}

export function ProfileAvatarEditor({ profile: initial }: Props) {
  const { syncServerProfile } = useAuth()
  const inputRef = useRef<HTMLInputElement>(null)
  const [profile, setProfile] = useState(initial)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onPick = () => inputRef.current?.click()

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setError('')
    setLoading(true)
    try {
      const prepared = await prepareProfileAvatarFile(file)
      const formData = new FormData()
      formData.set('avatar', new File([prepared.blob], 'avatar', { type: prepared.mime }))
      const result = await uploadProfileAvatar(formData)
      if (result.error) {
        setError(result.error)
        return
      }
      if (result.profile) {
        setProfile(result.profile)
        syncServerProfile(result.profile)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setLoading(false)
    }
  }

  const onRemove = async () => {
    setError('')
    setLoading(true)
    try {
      const result = await removeProfileAvatar()
      if (result.error) {
        setError(result.error)
        return
      }
      if (result.profile) {
        setProfile(result.profile)
        syncServerProfile(result.profile)
      }
    } finally {
      setLoading(false)
    }
  }

  const maxKb = Math.round(AVATAR_MAX_BYTES / 1024)

  return (
    <SettingsCard padding="md" className="mb-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <AssigneeAvatar
            name={profile.name}
            id={profile.id}
            avatarUrl={profile.avatar_url}
            size="lg"
            theme="light"
          />
          <div>
            <p className="text-sm font-semibold text-zinc-900">Display picture</p>
            <p className="mt-0.5 text-xs text-zinc-500 max-w-sm">
              Optional. Shown on the board and in the app header. JPEG, PNG, or WebP — cropped to a square, up to{' '}
              {AVATAR_MAX_DIMENSION_PX}×{AVATAR_MAX_DIMENSION_PX}px, {maxKb} KB max.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={onFile}
          />
          <Button type="button" variant="secondary" size="sm" disabled={loading} onClick={onPick}>
            <Camera size={14} className="mr-1.5" />
            {profile.avatar_url ? 'Change photo' : 'Add photo'}
          </Button>
          {profile.avatar_url && (
            <Button type="button" variant="ghost" size="sm" disabled={loading} onClick={onRemove}>
              <Trash2 size={14} className="mr-1.5" />
              Remove
            </Button>
          )}
        </div>
      </div>
      {error && <p className="mt-3 text-xs font-medium text-red-600">{error}</p>}
    </SettingsCard>
  )
}
