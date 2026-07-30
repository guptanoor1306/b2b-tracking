'use client'

import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, ReactNode, useCallback } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types'
import { signOutAndRedirect } from '@/lib/auth-client'

type AuthContextType = {
  user: User | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
  syncServerProfile: (profile: Profile) => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  syncServerProfile: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const serverHydratedRef = useRef(false)

  const syncServerProfile = useCallback((next: Profile) => {
    serverHydratedRef.current = true
    setProfile(next)
    setUser({ id: next.id } as User)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (serverHydratedRef.current) return

    const supabase = createClient()

    const fetchProfile = async (userId: string) => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      setProfile(data)
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      const authUser = session?.user ?? null
      setUser(authUser)
      if (authUser) fetchProfile(authUser.id).finally(() => setLoading(false))
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user && !serverHydratedRef.current) {
        fetchProfile(session.user.id)
      } else if (!session?.user) {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    serverHydratedRef.current = false
    setUser(null)
    setProfile(null)
    await signOutAndRedirect()
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, syncServerProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function ServerProfileSync({ profile }: { profile: Profile | null }) {
  const { syncServerProfile } = useAuth()
  const syncedIdRef = useRef<string | null>(null)

  useLayoutEffect(() => {
    if (!profile || syncedIdRef.current === profile.id) return
    syncedIdRef.current = profile.id
    syncServerProfile(profile)
  }, [profile, syncServerProfile])

  return null
}

export const useAuth = () => useContext(AuthContext)
