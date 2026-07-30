import { NextResponse } from 'next/server'

export async function GET() {
  const hasUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const hasKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

  return NextResponse.json({
    ok: hasUrl && hasKey,
    supabaseConfigured: hasUrl && hasKey,
    hint: !hasUrl || !hasKey
      ? 'Copy .env.example to .env.local and add Supabase keys, then restart npm run dev'
      : 'App config looks good — open http://127.0.0.1:3000/login',
  })
}
