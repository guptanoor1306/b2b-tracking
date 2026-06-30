#!/usr/bin/env node
/**
 * Local email smoke test — run: node scripts/test-email.mjs [recipient@email.com]
 *
 * SendGrid (no DNS): verify Single Sender in SendGrid dashboard, then set
 *   EMAIL_PROVIDER=sendgrid
 *   SENDGRID_API_KEY=SG.xxx
 *   REMINDER_FROM_EMAIL=<exact verified sender email>
 *
 * Resend sandbox: REMINDER_FROM_EMAIL=onboarding@resend.dev + Resend signup email as TO
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(__dirname, '..', '.env.local')

function loadEnv(file) {
  if (!fs.existsSync(file)) return
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
}

loadEnv(envPath)

function resolveProvider() {
  const explicit = process.env.EMAIL_PROVIDER?.toLowerCase()
  if (explicit === 'sendgrid' || explicit === 'resend') return explicit
  if (process.env.SENDGRID_API_KEY) return 'sendgrid'
  if (process.env.RESEND_API_KEY) return 'resend'
  return null
}

const provider = resolveProvider()
const to = process.argv[2] || process.env.TEST_EMAIL_TO
const fromEmail = process.env.REMINDER_FROM_EMAIL || 'noor@learnapp.com'
const fromName = process.env.REMINDER_FROM_NAME || 'LearnApp Studios'

if (!provider) {
  console.error('Missing email provider. Set SENDGRID_API_KEY or RESEND_API_KEY in .env.local')
  process.exit(1)
}

if (!to) {
  console.error('Usage: node scripts/test-email.mjs your@email.com')
  console.error('Or set TEST_EMAIL_TO=your@email.com in .env.local')
  process.exit(1)
}

const subject = '[LearnApp Studios] Local email test'
const text = 'If you received this, email is working locally.\n\nhttp://localhost:3000'
const html = '<p>If you received this, <strong>email is working locally</strong>.</p><p><a href="http://localhost:3000">Open app</a></p>'

console.log('Sending test email...')
console.log('  Provider:', provider)
console.log('  From:', fromEmail)
console.log('  To:  ', to)

let res
if (provider === 'sendgrid') {
  const apiKey = process.env.SENDGRID_API_KEY
  if (!apiKey) {
    console.error('Missing SENDGRID_API_KEY')
    process.exit(1)
  }
  res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: fromEmail, name: fromName },
      subject,
      content: [
        { type: 'text/plain', value: text },
        { type: 'text/html', value: html },
      ],
    }),
  })
} else {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error('Missing RESEND_API_KEY')
    process.exit(1)
  }
  res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to,
      subject,
      text,
      html,
    }),
  })
}

const responseText = await res.text()
if (!res.ok) {
  console.error('Failed:', res.status, responseText)
  if (provider === 'sendgrid') {
    console.error('\nSendGrid tip: verify Single Sender at Settings → Sender Authentication.')
    console.error('REMINDER_FROM_EMAIL must match the verified sender exactly.')
  } else {
    console.error('\nResend tip: use onboarding@resend.dev as FROM and your Resend signup email as TO.')
  }
  process.exit(1)
}

console.log('Success:', responseText || `(HTTP ${res.status})`)
console.log('Check inbox (and spam) for', to)
