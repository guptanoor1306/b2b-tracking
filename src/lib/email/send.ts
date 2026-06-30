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

export type EmailPayload = {
  to: string
  subject: string
  text: string
  html: string
}

export async function sendEmail(payload: EmailPayload): Promise<{ sent: boolean; error?: string }> {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    return { sent: false, error: 'RESEND_API_KEY not configured' }
  }

  const fromEmail = process.env.REMINDER_FROM_EMAIL ?? 'learnappstudios@learnapp.com'

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
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
