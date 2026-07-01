export function appBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')
}

export function projectUrl(projectId: string): string {
  return `${appBaseUrl()}/projects/${projectId}`
}

export function boardUrl(): string {
  return `${appBaseUrl()}/board`
}

export function studiosUrl(): string {
  return `${appBaseUrl()}/studios`
}

export function channelEnterUrl(slug: string): string {
  return `${appBaseUrl()}/studios/enter/${slug}`
}

export function loginUrl(): string {
  return `${appBaseUrl()}/login`
}

export function accountUrl(): string {
  return `${appBaseUrl()}/account`
}

export type EmailPayload = {
  to: string
  subject: string
  text: string
  html: string
}

type EmailProvider = 'sendgrid' | 'resend'

function resolveProvider(): EmailProvider | null {
  const explicit = process.env.EMAIL_PROVIDER?.toLowerCase()
  if (explicit === 'sendgrid' || explicit === 'resend') return explicit
  if (process.env.SENDGRID_API_KEY) return 'sendgrid'
  if (process.env.RESEND_API_KEY) return 'resend'
  return null
}

export function emailProvider(): EmailProvider | null {
  return resolveProvider()
}

export function isEmailConfigured(): boolean {
  return resolveProvider() !== null
}

function fromAddress(): { email: string; name: string } {
  return {
    email: process.env.REMINDER_FROM_EMAIL ?? 'learnappstudios@learnapp.com',
    name: process.env.REMINDER_FROM_NAME ?? 'LearnApp Studios',
  }
}

async function sendViaSendGrid(payload: EmailPayload): Promise<{ sent: boolean; error?: string }> {
  const apiKey = process.env.SENDGRID_API_KEY
  if (!apiKey) {
    return { sent: false, error: 'SENDGRID_API_KEY not configured' }
  }

  const from = fromAddress()

  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: payload.to }] }],
      from: { email: from.email, name: from.name },
      subject: payload.subject,
      content: [
        { type: 'text/plain', value: payload.text },
        { type: 'text/html', value: payload.html },
      ],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    return { sent: false, error: err || `SendGrid HTTP ${res.status}` }
  }

  return { sent: true }
}

async function sendViaResend(payload: EmailPayload): Promise<{ sent: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return { sent: false, error: 'RESEND_API_KEY not configured' }
  }

  const from = fromAddress()

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: from.name ? `${from.name} <${from.email}>` : from.email,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    return { sent: false, error: err }
  }

  return { sent: true }
}

export async function sendEmail(payload: EmailPayload): Promise<{ sent: boolean; error?: string }> {
  const provider = resolveProvider()
  if (!provider) {
    return { sent: false, error: 'No email provider configured (set SENDGRID_API_KEY or RESEND_API_KEY)' }
  }

  if (provider === 'sendgrid') return sendViaSendGrid(payload)
  return sendViaResend(payload)
}
