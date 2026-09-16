'use client'

import { createClient } from '@/lib/supabase/client'
import { clearAllListQueries } from '@/lib/list-query-session'

/** Clears auth cookies and hard-navigates so middleware sees logged-out state immediately. */
export async function signOutAndRedirect() {
  clearAllListQueries()
  const supabase = createClient()
  await supabase.auth.signOut()
  window.location.assign('/login')
}
