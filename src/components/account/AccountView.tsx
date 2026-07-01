import { Profile } from '@/lib/types'
import { AccountAuthHint } from '@/lib/actions/account'
import { ChangePasswordForm } from '@/components/account/ChangePasswordForm'
import { SettingsCard } from '@/components/settings/SettingsLayout'

type Props = {
  profile: Profile
  authHint: AccountAuthHint | null
  className?: string
}

export function AccountView({ profile, authHint, className }: Props) {
  return (
    <div className={className}>
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Account</h1>
        <p className="mt-1 text-sm font-medium text-zinc-500">Profile and sign-in security</p>
      </header>

      <SettingsCard padding="md" className="mb-6">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Name</dt>
            <dd className="mt-0.5 text-sm font-medium text-zinc-900">{profile.name}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Email</dt>
            <dd className="mt-0.5 text-sm font-medium text-zinc-900">{profile.email}</dd>
          </div>
          {profile.organization && (
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Organization</dt>
              <dd className="mt-0.5 text-sm font-medium text-zinc-900">{profile.organization}</dd>
            </div>
          )}
        </dl>
      </SettingsCard>

      <ChangePasswordForm
        email={profile.email}
        initialPassword={authHint?.initial_password ?? null}
        passwordChangedAt={authHint?.password_changed_at ?? null}
      />
    </div>
  )
}
