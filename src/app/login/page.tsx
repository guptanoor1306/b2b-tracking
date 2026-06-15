'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    setLoading(false)
    if (error) { setError(error.message); return }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-100 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-violet-600 mb-4">
            <span className="text-lg font-bold text-white">V</span>
          </div>
          <h1 className="text-xl font-semibold text-zinc-900">Varsity</h1>
          <p className="text-sm text-zinc-500 mt-1">Production Tracker</p>
        </div>

        <form onSubmit={handleLogin} className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
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
