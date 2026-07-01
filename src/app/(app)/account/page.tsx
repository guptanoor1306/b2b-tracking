import { redirect } from 'next/navigation'
import { getSessionProfile } from '@/lib/auth'
import { fetchAccountAuthHint } from '@/lib/actions/account'
import { AccountView } from '@/components/account/AccountView'

export default async function AccountPage() {
  const profile = await getSessionProfile()
  if (!profile) redirect('/login')

  const authHint = await fetchAccountAuthHint()

  return (
    <div className="theme-v2 -mx-6 -mt-2 min-h-[calc(100vh-4rem)] px-6 pb-10 pt-2">
      <div className="mx-auto max-w-2xl">
        <AccountView profile={profile} authHint={authHint} />
      </div>
    </div>
  )
}
