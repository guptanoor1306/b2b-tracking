'use client'

import { LogOut } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

type Props = { email: string }

export function MissingProfileNotice({ email }: Props) {
  const { signOut } = useAuth()

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
        <span className="text-xl font-bold">!</span>
      </div>
      <h1 className="text-xl font-bold text-zinc-900">Profile not set up</h1>
      <p className="mt-3 text-sm leading-relaxed text-zinc-600">
        Signed in as <span className="font-medium text-zinc-800">{email}</span>, but no profile
        exists in the database yet. Ask a Super Admin to create your profile, or run this in Supabase
        SQL Editor (replace the id with your auth user id):
      </p>
      <pre className="mt-4 w-full overflow-x-auto rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-left text-xs text-zinc-700">
{`INSERT INTO profiles (id, name, email, role)
VALUES ('<auth-user-id>', 'Prateek', 'prateek@learnapp.com', 'Super Admin');`}
      </pre>
      <button
        type="button"
        onClick={signOut}
        className="mt-6 inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
      >
        <LogOut size={16} />
        Sign out
      </button>
    </div>
  )
}
