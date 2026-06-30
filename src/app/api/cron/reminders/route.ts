import { NextRequest, NextResponse } from 'next/server'
import { processAutomatedStageReminders } from '@/lib/email/notifications'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Automated 24h reminders disabled until Resend + cron are configured.
  // Set EMAIL_REMINDERS_ENABLED=true to activate.
  if (process.env.EMAIL_REMINDERS_ENABLED !== 'true') {
    return NextResponse.json({ ok: true, sent: 0, skipped: 0, disabled: true })
  }

  try {
    const result = await processAutomatedStageReminders()
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
