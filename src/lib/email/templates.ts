import { projectUrl, boardUrl, channelEnterUrl, studiosUrl, loginUrl, accountUrl } from '@/lib/email/send'

function ctaButton(href: string, label: string): string {
  return `<p style="margin:24px 0"><a href="${href}" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">${label}</a></p>`
}

function emailShell(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;color:#18181b;line-height:1.6;max-width:560px;margin:0 auto;padding:24px">
<h1 style="font-size:20px;margin:0 0 16px">${title}</h1>
${bodyHtml}
<p style="color:#71717a;font-size:13px;margin-top:32px">LearnApp Studios</p>
</body></html>`
}

export function projectAssignedEmail(opts: {
  recipientName: string
  projectTitle: string
  channelName: string
  projectId: string
  stage: string
}) {
  const url = projectUrl(opts.projectId)
  const subject = `[${opts.channelName}] New project assigned: ${opts.projectTitle}`
  const text = `Hi ${opts.recipientName},

You've been assigned to a new project "${opts.projectTitle}" in ${opts.channelName}.

Current stage: ${opts.stage}

Open the project: ${url}
View board: ${boardUrl()}

— LearnApp Studios`

  const html = emailShell('New project assigned', `
<p>Hi ${opts.recipientName},</p>
<p>You've been assigned to <strong>${opts.projectTitle}</strong> in <strong>${opts.channelName}</strong>.</p>
<p>Current stage: <strong>${opts.stage}</strong></p>
${ctaButton(url, 'Open project')}
<p style="font-size:14px;color:#71717a">You can also track progress on the <a href="${boardUrl()}">production board</a>.</p>
`)

  return { subject, text, html }
}

export function stageActionableEmail(opts: {
  recipientName: string
  projectTitle: string
  channelName: string
  projectId: string
  stage: string
  waitingHours?: number
}) {
  const url = projectUrl(opts.projectId)
  const subject = `[${opts.channelName}] Action needed: ${opts.stage} — ${opts.projectTitle}`
  const waitingLine = opts.waitingHours != null && opts.waitingHours >= 24
    ? `\nPending for ${Math.floor(opts.waitingHours / 24)} day(s).\n`
    : ''

  const text = `Hi ${opts.recipientName},

"${opts.projectTitle}" is now at stage "${opts.stage}" and needs your action.${waitingLine}

Take action: ${url}

— LearnApp Studios`

  const html = emailShell('Action needed', `
<p>Hi ${opts.recipientName},</p>
<p><strong>${opts.projectTitle}</strong> is now at stage <strong>${opts.stage}</strong> and needs your action.</p>
${opts.waitingHours != null && opts.waitingHours >= 24
  ? `<p style="color:#ea580c">Pending for ${Math.floor(opts.waitingHours / 24)} day(s).</p>`
  : ''}
${ctaButton(url, 'Take action')}
`)

  return { subject, text, html }
}

export function stageReminderEmail(opts: {
  recipientName: string
  projectTitle: string
  channelName: string
  projectId: string
  stage: string
  waitingHours: number
  reminderNumber: number
}) {
  const url = projectUrl(opts.projectId)
  const days = Math.floor(opts.waitingHours / 24)
  const subject = `[${opts.channelName}] Reminder (${opts.reminderNumber}/5): ${opts.projectTitle}`
  const text = `Hi ${opts.recipientName},

Reminder ${opts.reminderNumber} of 5: "${opts.projectTitle}" at stage "${opts.stage}" has been pending for ${days} day(s).

Take action: ${url}

— LearnApp Studios`

  const html = emailShell(`Reminder ${opts.reminderNumber} of 5`, `
<p>Hi ${opts.recipientName},</p>
<p><strong>${opts.projectTitle}</strong> at stage <strong>${opts.stage}</strong> has been pending for <strong>${days} day(s)</strong>.</p>
<p style="font-size:14px;color:#71717a">This is automated reminder ${opts.reminderNumber} of 5 (every 24 hours, up to 120 hours).</p>
${ctaButton(url, 'Take action now')}
`)

  return { subject, text, html }
}

export function channelAccessEmail(opts: {
  recipientName: string
  channelName: string
  channelSlug: string
  channelRole: string
}) {
  const enterUrl = channelEnterUrl(opts.channelSlug)
  const subject = `[LearnApp Studios] You now have access to ${opts.channelName}`
  const text = `Hi ${opts.recipientName},

You've been given access to ${opts.channelName}.

Enter channel: ${enterUrl}
Studios hub: ${studiosUrl()}

— LearnApp Studios`

  const html = emailShell('Channel access granted', `
<p>Hi ${opts.recipientName},</p>
<p>You've been given access to <strong>${opts.channelName}</strong>.</p>
${ctaButton(enterUrl, `Enter ${opts.channelName}`)}
<p style="font-size:14px;color:#71717a">Or visit the <a href="${studiosUrl()}">Studios hub</a> to switch channels.</p>
`)

  return { subject, text, html }
}

export function userWelcomeEmail(opts: {
  recipientName: string
  email: string
  password: string
  channelName: string
  channelRole: string
}) {
  const signInUrl = loginUrl()
  const accountSettingsUrl = accountUrl()
  const subject = `[LearnApp Studios] Your account is ready`

  const text = `Hi ${opts.recipientName},

Your LearnApp Studios account has been created. You've been given access to ${opts.channelName}.

Sign in with:
Email: ${opts.email}
Password: ${opts.password}

Open the tool: ${signInUrl}

After you sign in, change your password from Account in the sidebar (${accountSettingsUrl}). Your new password will be the only one that works going forward.

— LearnApp Studios`

  const html = emailShell('Welcome to LearnApp Studios', `
<p>Hi ${opts.recipientName},</p>
<p>Your account has been created. You've been given access to <strong>${opts.channelName}</strong>.</p>
<div style="background:#f4f4f5;border-radius:8px;padding:16px;margin:16px 0">
  <p style="margin:0 0 8px;font-size:14px"><strong>Email:</strong> ${opts.email}</p>
  <p style="margin:0;font-size:14px"><strong>Temporary password:</strong> <code style="background:#fff;padding:2px 6px;border-radius:4px">${opts.password}</code></p>
</div>
${ctaButton(signInUrl, 'Open LearnApp Studios')}
<p style="font-size:14px;color:#71717a">After signing in, go to <strong>Account</strong> in the sidebar to change your password. Only your new password will work once you update it.</p>
<p style="font-size:14px;color:#71717a"><a href="${accountSettingsUrl}">Account settings</a></p>
`)

  return { subject, text, html }
}
