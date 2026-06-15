'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Zap } from 'lucide-react'

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
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.15)_0%,_transparent_50%)]" />
      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl mb-4 shadow-xl shadow-indigo-500/25">
            <Zap size={26} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-zinc-100">Varsity</h1>
          <p className="text-sm text-zinc-500 mt-1">Production Tracker</p>
        </div>

        <form onSubmit={handleLogin} className="panel p-6 space-y-4">
          {error && <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-lg">{error}</p>}
          <Input label="Email" type="email" required value={email} onChange={e => setEmail(e.target.value)} />
          <Input label="Password" type="password" required value={password} onChange={e => setPassword(e.target.value)} />
          <Button type="submit" className="w-full" loading={loading}>Sign In</Button>
        </form>
      </div>
    </div>
  )
}
