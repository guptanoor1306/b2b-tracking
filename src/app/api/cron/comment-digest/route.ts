import { NextRequest, NextResponse } from 'next/server'
import { processDailyCommentDigest } from '@/lib/email/notifications'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (process.env.EMAIL_COMMENT_DIGEST_ENABLED !== 'true') {
    return NextResponse.json({ ok: true, sent: 0, skipped: 0, disabled: true })
  }

  try {
    const result = await processDailyCommentDigest()
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
