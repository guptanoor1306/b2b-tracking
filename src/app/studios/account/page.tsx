import { redirect } from 'next/navigation'
import { getSessionProfile } from '@/lib/auth'
import { fetchAccountAuthHint } from '@/lib/actions/account'
import { AccountView } from '@/components/account/AccountView'

export default async function StudiosAccountPage() {
  const profile = await getSessionProfile()
  if (!profile) redirect('/login')

  const authHint = await fetchAccountAuthHint()

  return (
    <div className="theme-v2 mx-auto max-w-2xl px-6 py-10">
      <AccountView profile={profile} authHint={authHint} />
    </div>
  )
}
