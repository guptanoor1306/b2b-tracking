'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { clearInitialPasswordHint } from '@/lib/actions/account'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { SettingsPanel, SettingsCard } from '@/components/settings/SettingsLayout'
import { Eye, EyeOff, KeyRound } from 'lucide-react'

type Props = {
  email: string
  initialPassword: string | null
  passwordChangedAt: string | null
}

export function ChangePasswordForm({ email, initialPassword, passwordChangedAt }: Props) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showInitial, setShowInitial] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [initialHidden, setInitialHidden] = useState(!initialPassword)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.')
      return
    }
    if (newPassword === currentPassword) {
      setError('New password must be different from your current password.')
      return
    }

    setLoading(true)
    const supabase = createClient()

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    })
    if (verifyError) {
      setLoading(false)
      setError('Current password is incorrect.')
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
    if (updateError) {
      setLoading(false)
      setError(updateError.message)
      return
    }

    await clearInitialPasswordHint()
    setLoading(false)
    setSuccess(true)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setInitialHidden(true)
  }

  const showAdminPassword = initialPassword && !passwordChangedAt && !initialHidden

  return (
    <div className="space-y-6">
      {showAdminPassword && (
        <SettingsCard padding="md" className="border-amber-200 bg-amber-50/50">
          <div className="flex items-start gap-3">
            <KeyRound size={18} className="mt-0.5 shrink-0 text-amber-600" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-zinc-900">Password set by admin</p>
              <p className="mt-1 text-xs text-zinc-600">
                Use this to sign in until you choose a new password below. After changing, only your new password will work.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <code className="rounded-lg border border-amber-200 bg-white px-3 py-1.5 font-mono text-sm text-zinc-800">
                  {showInitial ? initialPassword : '••••••••'}
                </code>
                <button
                  type="button"
                  onClick={() => setShowInitial(v => !v)}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-amber-100"
                >
                  {showInitial ? <EyeOff size={14} /> : <Eye size={14} />}
                  {showInitial ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          </div>
        </SettingsCard>
      )}

      <SettingsPanel
        title="Change password"
        description="Enter your current password, then choose a new one. Your new password takes effect immediately."
      >
        <form onSubmit={handleSubmit} className="max-w-md space-y-4">
          {error && (
            <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
          {success && (
            <p className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Password updated. Use your new password next time you sign in.
            </p>
          )}
          <Input
            label="Current password"
            type="password"
            required
            autoComplete="current-password"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
          />
          <Input
            label="New password"
            type="password"
            required
            autoComplete="new-password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
          />
          <p className="text-xs text-zinc-500 -mt-2">At least 8 characters</p>
          <Input
            label="Confirm new password"
            type="password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
          />
          <Button type="submit" loading={loading}>Update password</Button>
        </form>
      </SettingsPanel>
    </div>
  )
}
