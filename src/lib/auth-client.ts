'use client'

import { createClient } from '@/lib/supabase/client'

/** Clears auth cookies and hard-navigates so middleware sees logged-out state immediately. */
export async function signOutAndRedirect() {
  const supabase = createClient()
  await supabase.auth.signOut()
  window.location.assign('/login')
}
