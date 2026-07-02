import { createAdminClient } from '@/lib/supabase/admin'

type AuthErrorLike = { message?: string; code?: string }

export function isDuplicateAuthError(error: AuthErrorLike): boolean {
  if (error.code === 'email_exists' || error.code === 'user_already_exists') return true
  const msg = error.message ?? ''
  return /already registered|already exists|duplicate|user already/i.test(msg)
}

/** Direct GoTrue admin filter — finds users listUsers pagination can miss. */
export async function findAuthUserByEmail(email: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null

  const normalized = email.trim().toLowerCase()

  try {
    const filter = `email.eq.${email.trim()}`
    const res = await fetch(
      `${url}/auth/v1/admin/users?${new URLSearchParams({ filter })}`,
      {
        headers: {
          Authorization: `Bearer ${key}`,
          apikey: key,
        },
        cache: 'no-store',
      },
    )

    if (res.ok) {
      const body = await res.json()
      const users = Array.isArray(body?.users) ? body.users : Array.isArray(body) ? body : []
      const match = users.find((u: { email?: string }) => u.email?.toLowerCase() === normalized)
      if (match) return match as { id: string; email?: string }
    }
  } catch {
    // fall through to paginated lookup
  }

  const admin = createAdminClient()
  let page = 1
  const perPage = 1000

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) return null

    const match = data.users.find(u => u.email?.toLowerCase() === normalized)
    if (match) return match

    if (data.users.length < perPage) break
    page++
  }

  return null
}

export async function lookupAuthUserIdByEmail(email: string): Promise<string | null> {
  const user = await findAuthUserByEmail(email)
  return user?.id ?? null
}
