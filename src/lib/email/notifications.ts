import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/send'
import {
  projectAssignedEmail,
  stageActionableEmail,
  stageReminderEmail,
  channelAccessEmail,
  userWelcomeEmail,
} from '@/lib/email/templates'
import { getProjectTeamMemberIds } from '@/lib/projects/team'
import { getChannelByDbName, getChannelBySlug } from '@/lib/channels'
import { Project } from '@/lib/types'
import { resolveStageAssigneeId } from '@/lib/views'
import { FINAL_STAGE } from '@/lib/constants'

export type NotificationType =
  | 'project_assigned'
  | 'stage_actionable'
  | 'stage_reminder'
  | 'channel_access'
  | 'user_welcome'

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
