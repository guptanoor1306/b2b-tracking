import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/send'
import {
  projectAssignedEmail,
  stageActionableEmail,
  stageReminderEmail,
  channelAccessEmail,
  userWelcomeEmail,
  requestApprovedEmail,
  requestDeclinedEmail,
  requestReceivedInternalEmail,
  requestStatusInternalEmail,
  commentDigestEmail,
  type CommentDigestItem,
} from '@/lib/email/templates'
import { getProjectTeamMemberIds } from '@/lib/projects/team'
import { getChannelByDbName, getChannelBySlug } from '@/lib/channels'
import { isZerodhaChannelDbName } from '@/lib/zerodha-sla'
import { Project } from '@/lib/types'
import { resolveStageAssigneeId } from '@/lib/views'
import { FINAL_STAGE } from '@/lib/constants'

export type NotificationType =
  | 'project_assigned'
  | 'stage_actionable'
  | 'stage_reminder'
  | 'channel_access'
  | 'user_welcome'
  | 'request_approved'
  | 'request_declined'
  | 'request_received'
  | 'comment_digest'

const REMINDER_THRESHOLDS_HOURS = [24, 48, 72, 96, 120] as const

type ProfileRow = { id: string; name: string; email: string; is_active: boolean }

async function fetchProfiles(ids: string[]): Promise<ProfileRow[]> {
  if (!ids.length) return []
  const admin = createAdminClient()
  const { data } = await admin
    .from('profiles')
    .select('id, name, email, is_active')
    .in('id', ids)
  return (data ?? []).filter(p => p.is_active && p.email)
}

async function wasNotificationSent(params: {
  type: NotificationType
  recipientId: string
  projectId?: string
  stage?: string
  reminderNumber?: number
  channelSlug?: string
}): Promise<boolean> {
  const admin = createAdminClient()
  let query = admin
    .from('email_notifications')
    .select('id')
    .eq('notification_type', params.type)
    .eq('recipient_id', params.recipientId)

  if (params.projectId) query = query.eq('project_id', params.projectId)
  if (params.stage) query = query.eq('stage', params.stage)
  if (params.reminderNumber != null) query = query.eq('reminder_number', params.reminderNumber)
  if (params.channelSlug) query = query.eq('channel_slug', params.channelSlug)

  const { data } = await query.limit(1).maybeSingle()
  return Boolean(data)
}

async function logNotification(params: {
  type: NotificationType
  recipientId: string
  recipientEmail: string
  projectId?: string
  channelSlug?: string
  stage?: string
  reminderNumber?: number
  metadata?: Record<string, unknown>
}) {
  const admin = createAdminClient()
  await admin.from('email_notifications').insert({
    notification_type: params.type,
    recipient_id: params.recipientId,
    recipient_email: params.recipientEmail,
    project_id: params.projectId ?? null,
    channel_slug: params.channelSlug ?? null,
    stage: params.stage ?? null,
    reminder_number: params.reminderNumber ?? null,
    metadata: params.metadata ?? null,
  })
}

function channelNameFromProject(project: Pick<Project, 'channel'>): string {
  return getChannelByDbName(project.channel)?.name ?? project.channel
}

function channelSlugFromProject(project: Pick<Project, 'channel'>): string | undefined {
  return getChannelByDbName(project.channel)?.slug
}

export async function notifyProjectTeamOnCreate(project: Project): Promise<void> {
  const memberIds = getProjectTeamMemberIds(project)
  if (!memberIds.length) return

  const profiles = await fetchProfiles(memberIds)
  const channelName = channelNameFromProject(project)
  const channelSlug = channelSlugFromProject(project)

  for (const profile of profiles) {
    if (await wasNotificationSent({
      type: 'project_assigned',
      recipientId: profile.id,
      projectId: project.id,
      stage: project.current_stage,
    })) continue

    const { subject, text, html } = projectAssignedEmail({
      recipientName: profile.name,
      projectTitle: project.title,
      channelName,
      projectId: project.id,
      stage: project.current_stage,
    })

    const result = await sendEmail({ to: profile.email, subject, text, html })
    if (result.sent) {
      await logNotification({
        type: 'project_assigned',
        recipientId: profile.id,
        recipientEmail: profile.email,
        projectId: project.id,
        channelSlug,
        stage: project.current_stage,
      })
    }
  }
}

export async function notifyStageActionable(
  project: Project,
  newStage: string,
  assigneeId: string | null,
): Promise<void> {
  if (!assigneeId) return

  if (await wasNotificationSent({
    type: 'stage_actionable',
    recipientId: assigneeId,
    projectId: project.id,
    stage: newStage,
  })) return

  const [profile] = await fetchProfiles([assigneeId])
  if (!profile) return

  const channelName = channelNameFromProject(project)
  const channelSlug = channelSlugFromProject(project)

  const { subject, text, html } = stageActionableEmail({
    recipientName: profile.name,
    projectTitle: project.title,
    channelName,
    projectId: project.id,
    stage: newStage,
  })

  const result = await sendEmail({ to: profile.email, subject, text, html })
  if (result.sent) {
    await logNotification({
      type: 'stage_actionable',
      recipientId: profile.id,
      recipientEmail: profile.email,
      projectId: project.id,
      channelSlug,
      stage: newStage,
    })
  }
}

export async function notifyChannelAccess(params: {
  profileId: string
  channelSlug: string
  channelRole: string
}): Promise<void> {
  const channel = getChannelBySlug(params.channelSlug)
  if (!channel) return

  if (await wasNotificationSent({
    type: 'channel_access',
    recipientId: params.profileId,
    channelSlug: params.channelSlug,
  })) return

  const [profile] = await fetchProfiles([params.profileId])
  if (!profile) return

  const { subject, text, html } = channelAccessEmail({
    recipientName: profile.name,
    channelName: channel.name,
    channelSlug: params.channelSlug,
    channelRole: params.channelRole,
  })

  const result = await sendEmail({ to: profile.email, subject, text, html })
  if (result.sent) {
    await logNotification({
      type: 'channel_access',
      recipientId: profile.id,
      recipientEmail: profile.email,
      channelSlug: params.channelSlug,
      metadata: { channelRole: params.channelRole },
    })
  }
}

export async function notifyUserWelcome(params: {
  profileId: string
  name: string
  email: string
  password: string
  channelSlug: string
  channelRole: string
}): Promise<void> {
  const channel = getChannelBySlug(params.channelSlug)
  if (!channel) return

  if (await wasNotificationSent({
    type: 'user_welcome',
    recipientId: params.profileId,
  })) return

  const { subject, text, html } = userWelcomeEmail({
    recipientName: params.name,
    email: params.email,
    password: params.password,
    channelName: channel.name,
    channelRole: params.channelRole,
  })

  const result = await sendEmail({ to: params.email, subject, text, html })
  if (result.sent) {
    await logNotification({
      type: 'user_welcome',
      recipientId: params.profileId,
      recipientEmail: params.email,
      channelSlug: params.channelSlug,
      metadata: { channelRole: params.channelRole },
    })
  }
}

export async function processAutomatedStageReminders(): Promise<{ sent: number; skipped: number }> {
  const admin = createAdminClient()
  const { data: projects } = await admin
    .from('projects')
    .select('id, title, channel, current_stage, stage_assignee_id, last_status_update_at, is_on_hold, editor_id, designer_id, writer_id, sound_designer_id, external_team_member_id')
    .neq('current_stage', FINAL_STAGE)
    .eq('is_on_hold', false)
    .not('stage_assignee_id', 'is', null)

  let sent = 0
  let skipped = 0

  for (const project of projects ?? []) {
    if (!project.stage_assignee_id || !project.last_status_update_at) {
      skipped++
      continue
    }

    const assigneeId = resolveStageAssigneeId(project, project.current_stage)
    if (assigneeId !== project.stage_assignee_id) {
      skipped++
      continue
    }

    const elapsedMs = Date.now() - new Date(project.last_status_update_at).getTime()
    const elapsedHours = elapsedMs / (1000 * 60 * 60)

    for (let i = 0; i < REMINDER_THRESHOLDS_HOURS.length; i++) {
      const threshold = REMINDER_THRESHOLDS_HOURS[i]
      const reminderNumber = i + 1

      if (elapsedHours < threshold) break

      if (await wasNotificationSent({
        type: 'stage_reminder',
        recipientId: project.stage_assignee_id,
        projectId: project.id,
        stage: project.current_stage,
        reminderNumber,
      })) continue

      const [profile] = await fetchProfiles([project.stage_assignee_id])
      if (!profile) break

      const channelName = channelNameFromProject(project)
      const channelSlug = channelSlugFromProject(project)

      const { subject, text, html } = stageReminderEmail({
        recipientName: profile.name,
        projectTitle: project.title,
        channelName,
        projectId: project.id,
        stage: project.current_stage,
        waitingHours: elapsedHours,
        reminderNumber,
      })

      const result = await sendEmail({ to: profile.email, subject, text, html })
      if (result.sent) {
        await logNotification({
          type: 'stage_reminder',
          recipientId: profile.id,
          recipientEmail: profile.email,
          projectId: project.id,
          channelSlug,
          stage: project.current_stage,
          reminderNumber,
        })
        sent++
      }
    }
  }

  return { sent, skipped }
}

async function fetchRequestSubmitter(submitterId: string | null): Promise<ProfileRow | null> {
  if (!submitterId) return null
  const [profile] = await fetchProfiles([submitterId])
  return profile ?? null
}

export async function notifyRequestApproved(project: Pick<Project, 'id' | 'title' | 'channel' | 'external_team_member_id' | 'created_by' | 'target_delivery_date'>): Promise<void> {
  const submitterId = project.external_team_member_id ?? project.created_by
  const profile = await fetchRequestSubmitter(submitterId)
  if (!profile) return

  if (await wasNotificationSent({
    type: 'request_approved',
    recipientId: profile.id,
    projectId: project.id,
  })) return

  const channelName = channelNameFromProject(project)
  const channelSlug = channelSlugFromProject(project)
  const { subject, text, html } = requestApprovedEmail({
    recipientName: profile.name,
    projectTitle: project.title,
    channelName,
    projectId: project.id,
    releaseDate: project.target_delivery_date,
  })

  const result = await sendEmail({ to: profile.email, subject, text, html })
  if (result.sent) {
    await logNotification({
      type: 'request_approved',
      recipientId: profile.id,
      recipientEmail: profile.email,
      projectId: project.id,
      channelSlug,
    })
  }

  void notifyZerodhaSuperAdminsRequestStatus(project, 'approved').catch(() => {})
}

export async function notifyRequestDeclined(
  project: Pick<Project, 'id' | 'title' | 'channel' | 'external_team_member_id' | 'created_by'>,
  reason: string,
): Promise<void> {
  const submitterId = project.external_team_member_id ?? project.created_by
  const profile = await fetchRequestSubmitter(submitterId)
  if (!profile) return

  const channelName = channelNameFromProject(project)
  const channelSlug = channelSlugFromProject(project)
  const { subject, text, html } = requestDeclinedEmail({
    recipientName: profile.name,
    projectTitle: project.title,
    channelName,
    projectId: project.id,
    reason,
  })

  const result = await sendEmail({ to: profile.email, subject, text, html })
  if (result.sent) {
    await logNotification({
      type: 'request_declined',
      recipientId: profile.id,
      recipientEmail: profile.email,
      projectId: project.id,
      channelSlug,
      metadata: { reason },
    })
  }

  void notifyZerodhaSuperAdminsRequestStatus(project, 'declined', reason).catch(() => {})
}

async function fetchZerodhaInternalNotificationRecipients(channelSlug: string): Promise<ProfileRow[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('profile_channels')
    .select('profile:profiles(id, name, email, is_active)')
    .eq('channel_slug', channelSlug)
    .in('channel_role', ['Channel Admin', 'Channel Super Admin'])

  const byId = new Map<string, ProfileRow>()
  for (const row of data ?? []) {
    const raw = row.profile as ProfileRow | ProfileRow[] | null
    const p = Array.isArray(raw) ? raw[0] : raw
    if (p?.is_active && p.email) byId.set(p.id, p)
  }
  return [...byId.values()]
}

async function fetchChannelSuperAdminsForNotifications(channelSlug: string): Promise<ProfileRow[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('profile_channels')
    .select('profile:profiles(id, name, email, is_active)')
    .eq('channel_slug', channelSlug)
    .eq('channel_role', 'Channel Super Admin')

  const profiles: ProfileRow[] = []
  for (const row of data ?? []) {
    const raw = row.profile as ProfileRow | ProfileRow[] | null
    const p = Array.isArray(raw) ? raw[0] : raw
    if (p?.is_active && p.email) profiles.push(p)
  }
  return profiles
}

export async function notifyRequestReceived(
  project: Pick<Project, 'id' | 'title' | 'channel' | 'target_delivery_date' | 'content_type' | 'external_team_member_id' | 'created_by'>,
): Promise<void> {
  if (!isZerodhaChannelDbName(project.channel)) return
  const channelSlug = channelSlugFromProject(project)
  if (!channelSlug) return

  const channelName = channelNameFromProject(project)
  const submitter = await fetchRequestSubmitter(project.external_team_member_id ?? project.created_by)
  const recipients = await fetchZerodhaInternalNotificationRecipients(channelSlug)

  for (const recipient of recipients) {
    if (await wasNotificationSent({
      type: 'request_received',
      recipientId: recipient.id,
      projectId: project.id,
    })) continue

    const { subject, text, html } = requestReceivedInternalEmail({
      recipientName: recipient.name,
      projectTitle: project.title,
      channelName,
      projectId: project.id,
      submitterName: submitter?.name,
      releaseDate: project.target_delivery_date,
      videoType: project.content_type,
    })

    const result = await sendEmail({ to: recipient.email, subject, text, html })
    if (result.sent) {
      await logNotification({
        type: 'request_received',
        recipientId: recipient.id,
        recipientEmail: recipient.email,
        projectId: project.id,
        channelSlug,
      })
    }
  }
}

async function notifyZerodhaSuperAdminsRequestStatus(
  project: Pick<Project, 'id' | 'title' | 'channel'>,
  status: 'approved' | 'declined',
  reason?: string,
): Promise<void> {
  if (!isZerodhaChannelDbName(project.channel)) return
  const channelSlug = channelSlugFromProject(project)
  if (!channelSlug) return

  const channelName = channelNameFromProject(project)
  const superAdmins = await fetchChannelSuperAdminsForNotifications(channelSlug)
  const notificationType = status === 'approved' ? 'request_approved' : 'request_declined'

  for (const recipient of superAdmins) {
    if (await wasNotificationSent({
      type: notificationType,
      recipientId: recipient.id,
      projectId: project.id,
    })) continue

    const { subject, text, html } = requestStatusInternalEmail({
      recipientName: recipient.name,
      projectTitle: project.title,
      channelName,
      projectId: project.id,
      status,
      reason,
    })

    const result = await sendEmail({ to: recipient.email, subject, text, html })
    if (result.sent) {
      await logNotification({
        type: notificationType,
        recipientId: recipient.id,
        recipientEmail: recipient.email,
        projectId: project.id,
        channelSlug,
        metadata: reason ? { reason, audience: 'channel_super_admin' } : { audience: 'channel_super_admin' },
      })
    }
  }
}

async function fetchInternalAdminsForChannel(channelSlug: string): Promise<ProfileRow[]> {
  const admin = createAdminClient()
  const { data: channelAdmins } = await admin
    .from('profile_channels')
    .select('profile:profiles(id, name, email, is_active)')
    .eq('channel_slug', channelSlug)
    .eq('channel_role', 'Channel Admin')

  const { data: superAdmins } = await admin
    .from('profiles')
    .select('id, name, email, is_active')
    .eq('role', 'Super Admin')
    .eq('is_active', true)

  const byId = new Map<string, ProfileRow>()
  for (const row of channelAdmins ?? []) {
    const raw = row.profile as ProfileRow | ProfileRow[] | null
    const p = Array.isArray(raw) ? raw[0] : raw
    if (p?.is_active && p.email) byId.set(p.id, p)
  }
  for (const p of superAdmins ?? []) {
    if (p.is_active && p.email) byId.set(p.id, p)
  }
  return [...byId.values()]
}

async function wasDigestSentToday(recipientId: string, digestDate: string): Promise<boolean> {
  const admin = createAdminClient()
  const start = `${digestDate}T00:00:00.000Z`
  const end = `${digestDate}T23:59:59.999Z`
  const { data } = await admin
    .from('email_notifications')
    .select('id')
    .eq('notification_type', 'comment_digest')
    .eq('recipient_id', recipientId)
    .gte('sent_at', start)
    .lte('sent_at', end)
    .limit(1)
    .maybeSingle()
  return Boolean(data)
}

export async function processDailyCommentDigest(): Promise<{ sent: number; skipped: number }> {
  const admin = createAdminClient()
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const digestDate = new Date().toISOString().slice(0, 10)

  const { data: comments } = await admin
    .from('comments')
    .select(`
      id, comment, created_at, kind,
      author:profiles!comments_created_by_fkey(id, name),
      project:projects(id, title, channel)
    `)
    .gte('created_at', since)
    .neq('kind', 'decline')
    .order('created_at', { ascending: true })

  if (!comments?.length) return { sent: 0, skipped: 0 }

  type Row = {
    comment: string
    created_at: string
    author: { name: string } | { name: string }[] | null
    project: { id: string; title: string; channel: string } | { id: string; title: string; channel: string }[] | null
  }

  const byChannel = new Map<string, CommentDigestItem[]>()
  for (const row of comments as Row[]) {
    const rawProject = row.project
    const project = Array.isArray(rawProject) ? rawProject[0] : rawProject
    if (!project) continue
    const rawAuthor = row.author
    const author = Array.isArray(rawAuthor) ? rawAuthor[0] : rawAuthor
    const channel = getChannelByDbName(project.channel)
    if (!channel) continue
    const items = byChannel.get(channel.slug) ?? []
    items.push({
      projectTitle: project.title,
      projectId: project.id,
      authorName: author?.name ?? 'Unknown',
      comment: row.comment,
      createdAt: new Date(row.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
    })
    byChannel.set(channel.slug, items)
  }

  let sent = 0
  let skipped = 0

  for (const [channelSlug, items] of byChannel) {
    const channel = getChannelBySlug(channelSlug)
    if (!channel || !items.length) continue

    const admins = await fetchInternalAdminsForChannel(channelSlug)
    for (const adminProfile of admins) {
      if (await wasDigestSentToday(adminProfile.id, digestDate)) {
        skipped++
        continue
      }

      const { subject, text, html } = commentDigestEmail({
        recipientName: adminProfile.name,
        channelName: channel.name,
        digestDate,
        items,
      })

      const result = await sendEmail({ to: adminProfile.email, subject, text, html })
      if (result.sent) {
        await logNotification({
          type: 'comment_digest',
          recipientId: adminProfile.id,
          recipientEmail: adminProfile.email,
          channelSlug,
          metadata: { digestDate, commentCount: items.length },
        })
        sent++
      } else {
        skipped++
      }
    }
  }

  return { sent, skipped }
}
