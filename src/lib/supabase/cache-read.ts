import { createAdminClient } from '@/lib/supabase/admin'

/** Service-role reads for unstable_cache (no cookies / dynamic APIs). */
export function canUseDataCache(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export function createCachedReadClient() {
  return createAdminClient()
}
