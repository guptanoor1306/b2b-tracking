'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setLoading(false)
      setError(authError.message)
      return
    }

    // Full navigation so auth cookies are available to the server on the next request
    window.location.assign('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-100 via-white to-violet-50/40 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 mb-4 shadow-lg shadow-violet-200">
            <span className="text-lg font-bold text-white">LS</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">LearnApp Studios</h1>
          <p className="text-sm text-zinc-500 mt-1">Production command center</p>
        </div>

        <form onSubmit={handleLogin} className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm space-y-4">
          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">{error}</p>
          )}
          <Input label="Email" type="email" required value={email} onChange={e => setEmail(e.target.value)} />
          <Input label="Password" type="password" required value={password} onChange={e => setPassword(e.target.value)} />
          <Button type="submit" className="w-full" loading={loading}>Sign in</Button>
        </form>
      </div>
    </div>
  )
}
