import { NextRequest, NextResponse } from 'next/server'
import { emailProvider, isEmailConfigured, sendEmail } from '@/lib/email/send'
import { projectAssignedEmail } from '@/lib/email/templates'

export const dynamic = 'force-dynamic'

/** Local/dev only — send a test email via configured provider (SendGrid or Resend) */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }

  let to = process.env.TEST_EMAIL_TO
  try {
    const body = await request.json().catch(() => ({}))
    if (body?.to && typeof body.to === 'string') to = body.to
  } catch {
    // ignore
  }

  if (!to) {
    return NextResponse.json({
      error: 'Set TEST_EMAIL_TO in .env.local, or POST { "to": "you@example.com" }',
    }, { status: 400 })
  }

  if (!isEmailConfigured()) {
    return NextResponse.json({
      error: 'No email provider configured. Set SENDGRID_API_KEY or RESEND_API_KEY in .env.local',
    }, { status: 400 })
  }

  const fromEmail = process.env.REMINDER_FROM_EMAIL ?? 'learnappstudios@learnapp.com'
  const { subject, text, html } = projectAssignedEmail({
    recipientName: 'Test User',
    projectTitle: 'Local email test',
    channelName: 'Varsity',
    projectId: '00000000-0000-0000-0000-000000000001',
    stage: 'Video received',
  })

  const result = await sendEmail({ to, subject: `[TEST] ${subject}`, text, html })

  if (!result.sent) {
    return NextResponse.json({
      ok: false,
      provider: emailProvider(),
      error: result.error,
      hint: emailProvider() === 'sendgrid'
        ? 'Verify a Single Sender in SendGrid (Settings → Sender Authentication). REMINDER_FROM_EMAIL must match that address exactly.'
        : 'Without DNS use REMINDER_FROM_EMAIL=onboarding@resend.dev and send only to your Resend signup email.',
      from: fromEmail,
      to,
    }, { status: 502 })
  }

  return NextResponse.json({ ok: true, sent: true, provider: emailProvider(), from: fromEmail, to })
}

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }

  const provider = emailProvider()

  return NextResponse.json({
    ok: true,
    message: 'POST to this URL to send a test email. Set TEST_EMAIL_TO in .env.local or pass { "to": "..." }.',
    provider,
    configured: isEmailConfigured(),
    sendgridKey: Boolean(process.env.SENDGRID_API_KEY),
    resendKey: Boolean(process.env.RESEND_API_KEY),
    from: process.env.REMINDER_FROM_EMAIL ?? 'learnappstudios@learnapp.com',
    fromName: process.env.REMINDER_FROM_NAME ?? 'LearnApp Studios',
    testTo: process.env.TEST_EMAIL_TO ?? null,
    remindersEnabled: process.env.EMAIL_REMINDERS_ENABLED === 'true',
  })
}
