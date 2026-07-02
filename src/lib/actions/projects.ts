'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getSessionProfile } from '@/lib/auth'
import { getActiveChannelRole } from '@/lib/channel-context'
import { FINAL_STAGE } from '@/lib/constants'
import { getActiveChannelDbName } from '@/lib/channel-context'
import { isZerodhaChannelDbName } from '@/lib/zerodha-sla'
import {
  isInternalRole,
  resolveStageAssigneeId,
  effectiveRoleForChannel,
  canChangeStages,
  canMoveBoardCards,
  canSendStageReminder,
  isChannelAdmin,
  canEditRpCuts,
} from '@/lib/views'
import { FIRST_CUT_STAGE } from '@/lib/constants'
import { normalizeStage } from '@/lib/timelines'
import {
  computeTargetReleaseDateString,
  computeProjectHealth,
  computeProjectTargetDate,
  isProjectTimelineLocked,
} from '@/lib/timelines'
import { fetchHolidayDates } from '@/lib/data/holidays'
import { notifyProjectTeamOnCreate, notifyStageActionable } from '@/lib/email/notifications'
import { isEmailConfigured, sendEmail } from '@/lib/email/send'
import { insertStageHistoryRecord } from '@/lib/data/stage-history'
import { Project } from '@/lib/types'

async function getSessionEffectiveRole() {
  const profile = await getSessionProfile()
  if (!profile) return null
  const channelRole = await getActiveChannelRole(profile)
  return { profile, role: effectiveRoleForChannel(channelRole, profile.role) }
}

type ProjectInput = {
  ip?: string
  content_type?: string
  title?: string
  level_of_video?: string | null
  video_language?: string | null
  received_date?: string | null
  picked_up_date?: string | null
  target_delivery_date?: string | null
  editor?: string | null
  editor_id?: string | null
  editor_2_id?: string | null
  designer_id?: string | null
  designer_2_id?: string | null
  sound_designer_id?: string | null
  writer_id?: string | null
  external_team_member_id?: string | null
  uses_teleprompter?: boolean | null
  department?: string | null
  graphic_designer_id?: string | null
  stage_assignee_id?: string | null
  assigned_agency_id?: string | null
  internal_owner_id?: string | null
  assets_link?: string | null
  drive_link?: string | null
  final_file_link?: string | null
  thumbnail_copy?: string | null
  title_copy?: string | null
  thumbnail_file_link?: string | null
  priority?: string
  blocker?: string | null
  next_action?: string | null
  next_action_due_date?: string | null
  notes?: string | null
  is_external_visible?: boolean
}

async function logActivity(
  projectId: string,
  userId: string,
  actionType: string,
  fieldChanged?: string,
  oldValue?: string | null,
  newValue?: string | null
) {
  const supabase = await createClient()
  await supabase.from('activity_logs').insert({
    project_id: projectId,
    action_type: actionType,
    field_changed: fieldChanged ?? null,
    old_value: oldValue ?? null,
    new_value: newValue ?? null,
    updated_by: userId,
  })
}

export async function createProject(input: ProjectInput) {
  const session = await getSessionEffectiveRole()
  if (!session || !isInternalRole(session.role)) {
    return { error: 'Unauthorized' }
  }
  const { profile } = session

  const supabase = await createClient()
  const holidays = await fetchHolidayDates()
  const channelName = await getActiveChannelDbName()

  if (isZerodhaChannelDbName(channelName)) {
    if (!input.video_language) return { error: 'Video language is required' }
    if (!input.level_of_video) return { error: 'Video level is required' }
  }

  const initialStage = 'Video received'
  const now = new Date().toISOString()
  const teamCtx = {
    level_of_video: input.level_of_video,
    video_language: input.video_language,
    channel: channelName,
    editor_id: input.editor_id,
    editor_2_id: input.editor_2_id,
    designer_id: input.designer_id,
    designer_2_id: input.designer_2_id,
    uses_teleprompter: input.uses_teleprompter,
  }
  const target_delivery_date = input.received_date
    ? computeTargetReleaseDateString(input.received_date, holidays, input.level_of_video, teamCtx, channelName)
    : null

  const editorName = input.editor_id
    ? (await supabase.from('profiles').select('name').eq('id', input.editor_id).single()).data?.name
    : input.editor

  const { data, error } = await supabase
    .from('projects')
    .insert({
      title: input.title?.trim() || 'Untitled project',
      ip: input.ip?.trim() || '—',
      content_type: input.content_type || 'Long-Form',
      level_of_video: input.level_of_video ?? null,
      video_language: input.video_language ?? null,
      priority: input.priority || 'Medium',
      editor: editorName ?? input.editor ?? null,
      editor_id: input.editor_id ?? null,
      editor_2_id: input.editor_2_id ?? null,
      designer_id: input.designer_id ?? null,
      designer_2_id: input.designer_2_id ?? null,
      sound_designer_id: input.sound_designer_id ?? null,
      writer_id: input.writer_id ?? null,
      external_team_member_id: input.external_team_member_id ?? null,
      uses_teleprompter: input.uses_teleprompter ?? null,
      graphic_designer_id: input.designer_id ?? input.graphic_designer_id ?? null,
      stage_assignee_id: input.stage_assignee_id ?? input.editor_id ?? null,
      received_date: input.received_date ?? null,
      picked_up_date: input.picked_up_date ?? input.received_date ?? null,
      target_delivery_date,
      channel: channelName,
      current_stage: initialStage,
      status_health: computeProjectHealth({
        current_stage: initialStage,
        target_delivery_date,
        received_date: input.received_date ?? null,
        last_status_update_at: now,
      }, holidays),
      created_by: profile.id,
      updated_by: profile.id,
      last_status_update_at: now,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  const historyResult = await insertStageHistoryRecord({
    project_id: data.id,
    old_stage: null,
    new_stage: initialStage,
    changed_by: profile.id,
    assignee_id: input.stage_assignee_id ?? null,
    note: 'Project created',
    is_hold_event: false,
  })
  if (historyResult.error) {
    console.error('stage_history insert failed:', historyResult.error)
  }

  const { data: created } = await supabase.from('projects').select('*').eq('id', data.id).single()
  if (created) {
    void notifyProjectTeamOnCreate(created as Project).catch(() => {})
  }

  revalidatePath('/dashboard')
  revalidatePath('/projects')
  revalidatePath('/board')
  return { id: data.id }
}

export async function updateProject(id: string, input: Partial<ProjectInput>) {
  const session = await getSessionEffectiveRole()
  if (!session) return { error: 'Unauthorized' }
  const { profile } = session

  const supabase = await createClient()
  const { data: existing } = await supabase.from('projects').select('*').eq('id', id).single()
  if (!existing) return { error: 'Project not found' }

  const isInternal = isInternalRole(session.role)

  if (!isInternal) {
    const shared = ['notes', 'blocker', 'next_action', 'next_action_due_date']
    const allowed =
      session.role === 'Agency'
        ? ['drive_link', 'assets_link', 'final_file_link', ...shared]
        : session.role === 'Zerodha Viewer'
          ? ['thumbnail_copy', 'title_copy', ...shared]
          : []
    const keys = Object.keys(input)
    if (keys.some(k => !allowed.includes(k))) return { error: 'Cannot edit this field' }
  }

  const patch: Partial<ProjectInput> = { ...input }
  const holidays = await fetchHolidayDates()

  if (input.editor_id !== undefined) {
    if (input.editor_id) {
      const { data: ed } = await supabase.from('profiles').select('name').eq('id', input.editor_id).single()
      patch.editor = ed?.name ?? existing.editor
    } else {
      patch.editor = null
    }
  }
  if (input.designer_id !== undefined) {
    patch.graphic_designer_id = input.designer_id
  }

  const teamCtx = {
    level_of_video: (input.level_of_video ?? existing.level_of_video) as string | null,
    video_language: (input.video_language ?? existing.video_language) as string | null,
    channel: existing.channel as string,
    editor_id: (input.editor_id ?? existing.editor_id) as string | null,
    editor_2_id: (input.editor_2_id ?? existing.editor_2_id) as string | null,
    designer_id: (input.designer_id ?? existing.designer_id) as string | null,
    designer_2_id: (input.designer_2_id ?? existing.designer_2_id) as string | null,
    uses_teleprompter: (input.uses_teleprompter ?? existing.uses_teleprompter) as boolean | null,
  }

  if (isZerodhaChannelDbName(existing.channel)) {
    const lang = input.video_language ?? existing.video_language
    const level = input.level_of_video ?? existing.level_of_video
    if (!lang) return { error: 'Video language is required' }
    if (!level) return { error: 'Video level is required' }
  }

  const startDate = input.received_date ?? existing.received_date
  const timelineLocked = isProjectTimelineLocked(existing)
  if (!timelineLocked && startDate && (
    input.received_date !== existing.received_date ||
    input.level_of_video !== undefined ||
    input.video_language !== undefined ||
    input.editor_id !== undefined ||
    input.editor_2_id !== undefined ||
    input.designer_id !== undefined ||
    input.designer_2_id !== undefined ||
    input.uses_teleprompter !== undefined
  )) {
    patch.target_delivery_date = computeProjectTargetDate(
      { ...existing, ...patch, received_date: startDate },
      holidays,
      existing.channel,
    )
  }

  if (!timelineLocked && input.received_date && input.received_date !== existing.received_date) {
    patch.target_delivery_date = computeProjectTargetDate(
      { ...existing, ...patch, received_date: input.received_date },
      holidays,
      existing.channel,
    )
  }

  const { error } = await supabase
    .from('projects')
    .update({ ...patch, updated_by: profile.id })
    .eq('id', id)

  if (error) return { error: error.message }

  for (const [key, value] of Object.entries(patch)) {
    const oldVal = String((existing as Record<string, unknown>)[key] ?? '')
    const newVal = String(value ?? '')
    if (oldVal !== newVal) {
      await logActivity(id, profile.id, 'field_update', key, oldVal, newVal)
    }
  }

  revalidatePath(`/projects/${id}`)
  revalidatePath('/dashboard')
  revalidatePath('/board')
  revalidatePath('/projects')
  return { success: true }
}

export async function changeProjectStage(
  projectId: string,
  newStage: string,
  note?: string,
  assigneeId?: string | null,
  usesTeleprompter?: boolean | null
) {
  const session = await getSessionEffectiveRole()
  if (!session || !canMoveBoardCards(session.role)) {
    return { error: 'Unauthorized' }
  }
  const { profile } = session

  const supabase = await createClient()
  const holidays = await fetchHolidayDates()
  const { data: project } = await supabase.from('projects').select('*').eq('id', projectId).single()
  if (!project) return { error: 'Project not found' }

  const oldStage = project.current_stage
  if (oldStage === newStage) return { success: true }

  const status_health = computeProjectHealth({
    current_stage: newStage,
    target_delivery_date: project.target_delivery_date,
    received_date: project.received_date,
    last_status_update_at: new Date().toISOString(),
    is_on_hold: project.is_on_hold,
    level_of_video: project.level_of_video,
  }, holidays)
  const resolvedAssignee = resolveStageAssigneeId(project, newStage)
  const updates: Record<string, unknown> = {
    current_stage: newStage,
    status_health,
    updated_by: profile.id,
    last_status_update_at: new Date().toISOString(),
    stage_assignee_id: resolvedAssignee,
  }

  if (
    normalizeStage(newStage) === FIRST_CUT_STAGE
    && usesTeleprompter != null
    && !isProjectTimelineLocked(project)
    && project.received_date
  ) {
    updates.uses_teleprompter = usesTeleprompter
    updates.target_delivery_date = computeProjectTargetDate(
      { ...project, uses_teleprompter: usesTeleprompter },
      holidays,
      project.channel,
    )
  } else if (normalizeStage(newStage) === FIRST_CUT_STAGE && usesTeleprompter != null) {
    updates.uses_teleprompter = usesTeleprompter
  }

  if (newStage === FINAL_STAGE && !project.delivered_date) {
    updates.delivered_date = new Date().toISOString().split('T')[0]
  }

  const { error } = await supabase.from('projects').update(updates).eq('id', projectId)
  if (error) return { error: error.message }

  const historyResult = await insertStageHistoryRecord({
    project_id: projectId,
    old_stage: oldStage,
    new_stage: newStage,
    changed_by: profile.id,
    assignee_id: resolvedAssignee,
    note: note ?? null,
    is_hold_event: false,
  })
  if (historyResult.error) return { error: `Stage history failed: ${historyResult.error}` }

  await logActivity(projectId, profile.id, 'stage_change', 'current_stage', oldStage, newStage)

  const updatedProject = { ...project, ...updates, current_stage: newStage, stage_assignee_id: resolvedAssignee } as Project
  void notifyStageActionable(updatedProject, newStage, resolvedAssignee).catch(() => {})

  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/dashboard')
  revalidatePath('/board')
  revalidatePath('/projects')
  return { success: true }
}

export async function updateStageHistoryDate(
  projectId: string,
  historyId: string,
  dateStr: string
) {
  const session = await getSessionEffectiveRole()
  if (!session || !canChangeStages(session.role)) {
    return { error: 'Unauthorized' }
  }
  const { profile } = session
  if (!dateStr) return { error: 'Date required' }

  const supabase = await createClient()
  const holidays = await fetchHolidayDates()
  const changedAt = `${dateStr}T10:00:00.000Z`

  const { data: entry } = await supabase
    .from('stage_history')
    .select('id, project_id')
    .eq('id', historyId)
    .eq('project_id', projectId)
    .single()
  if (!entry) return { error: 'Stage history not found' }

  const { error } = await supabase
    .from('stage_history')
    .update({ changed_at: changedAt })
    .eq('id', historyId)

  if (error) return { error: error.message }

  const { data: allHistory } = await supabase
    .from('stage_history')
    .select('id')
    .eq('project_id', projectId)
    .order('changed_at', { ascending: true })

  const sorted = allHistory ?? []
  const isFirst = sorted[0]?.id === historyId
  const isLast = sorted[sorted.length - 1]?.id === historyId

  const { data: project } = await supabase.from('projects').select('*').eq('id', projectId).single()
  if (project) {
    const projectPatch: Record<string, unknown> = { updated_by: profile.id }

    if (isFirst && !isProjectTimelineLocked(project)) {
      projectPatch.received_date = dateStr
      projectPatch.picked_up_date = dateStr
      projectPatch.target_delivery_date = computeProjectTargetDate(
        { ...project, received_date: dateStr },
        holidays,
        project.channel,
      )
    }
    if (isLast) {
      projectPatch.last_status_update_at = changedAt
    }

    if (isFirst || isLast) {
      projectPatch.status_health = computeProjectHealth({
        current_stage: project.current_stage,
        target_delivery_date: (projectPatch.target_delivery_date as string) ?? project.target_delivery_date,
        received_date: (projectPatch.received_date as string) ?? project.received_date,
        last_status_update_at: (projectPatch.last_status_update_at as string) ?? project.last_status_update_at,
      }, holidays)
      await supabase.from('projects').update(projectPatch).eq('id', projectId)
    }
  }

  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/board')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateStageAssignee(projectId: string, assigneeId: string | null) {
  const session = await getSessionEffectiveRole()
  if (!session || !isInternalRole(session.role)) {
    return { error: 'Unauthorized' }
  }
  const { profile } = session

  const supabase = await createClient()
  const { error } = await supabase
    .from('projects')
    .update({ stage_assignee_id: assigneeId, updated_by: profile.id })
    .eq('id', projectId)

  if (error) return { error: error.message }

  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/dashboard')
  revalidatePath('/board')
  return { success: true }
}

export async function addComment(projectId: string, comment: string, parentId?: string | null) {
  const profile = await getSessionProfile()
  if (!profile) return { error: 'Unauthorized' }

  const supabase = await createClient()
  const { error } = await supabase.from('comments').insert({
    project_id: projectId,
    comment,
    parent_id: parentId ?? null,
    created_by: profile.id,
  })

  if (error) return { error: error.message }

  await logActivity(projectId, profile.id, 'comment', 'comment', null, comment)

  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function deleteComment(projectId: string, commentId: string) {
  const profile = await getSessionProfile()
  if (!profile) return { error: 'Unauthorized' }

  const supabase = await createClient()
  const { data: comment } = await supabase
    .from('comments')
    .select('id, project_id, created_by')
    .eq('id', commentId)
    .eq('project_id', projectId)
    .single()

  if (!comment) return { error: 'Comment not found' }
  if (comment.created_by !== profile.id) return { error: 'Unauthorized' }

  const { error } = await supabase.from('comments').delete().eq('id', commentId)

  if (error) return { error: error.message }

  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function sendStageReminder(projectId: string) {
  const session = await getSessionEffectiveRole()
  if (!session || !canSendStageReminder(session.role)) {
    return { error: 'Unauthorized' }
  }
  const { profile } = session

  const supabase = await createClient()
  const { data: project } = await supabase
    .from('projects')
    .select('*, stage_assignee:profiles!projects_stage_assignee_id_fkey(id, name, email)')
    .eq('id', projectId)
    .single()

  if (!project) return { error: 'Project not found' }
  if (!project.stage_assignee_id) return { error: 'No assignee on this stage' }

  const assignee = project.stage_assignee as { id: string; name: string; email: string } | null
  if (!assignee?.email) return { error: 'Assignee has no email' }

  const waitingDays = Math.max(
    0,
    Math.floor((Date.now() - new Date(project.last_status_update_at).getTime()) / 86400000)
  )

  const subject = `[Varsity] Pending: ${project.title}`
  const body = `Hi ${assignee.name},\n\nYour work on "${project.title}" at stage "${project.current_stage}" has been pending for ${waitingDays} day(s).\n\nPlease review: ${process.env.NEXT_PUBLIC_APP_URL ?? ''}/projects/${projectId}\n`

  let emailSent = false

  if (isEmailConfigured()) {
    const result = await sendEmail({
      to: assignee.email,
      subject,
      text: body,
      html: body.replace(/\n/g, '<br>'),
    })
    emailSent = result.sent
    if (!result.sent) {
      return { error: `Email failed: ${result.error ?? 'unknown error'}` }
    }
  }

  await supabase.from('stage_reminders').insert({
    project_id: projectId,
    assignee_id: assignee.id,
    stage: project.current_stage,
    sent_by: profile.id,
  })

  await logActivity(projectId, profile.id, 'reminder_sent', 'stage_assignee', null, assignee.name)

  revalidatePath(`/projects/${projectId}`)
  return {
    success: true,
    emailSent,
    message: emailSent
      ? `Reminder emailed to ${assignee.name}`
      : `Reminder logged for ${assignee.name} (set SENDGRID_API_KEY or RESEND_API_KEY to enable email)`,
  }
}

export async function deleteProject(projectId: string) {
  const session = await getSessionEffectiveRole()
  if (!session || !isChannelAdmin(session.role)) {
    return { error: 'Unauthorized' }
  }
  const { profile } = session

  const supabase = await createClient()
  const { error } = await supabase.from('projects').delete().eq('id', projectId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  revalidatePath('/board')
  revalidatePath('/projects')
  return { success: true }
}

export async function toggleProjectHold(projectId: string, note?: string) {
  const session = await getSessionEffectiveRole()
  if (!session || !isInternalRole(session.role)) {
    return { error: 'Unauthorized' }
  }
  const { profile } = session

  const supabase = await createClient()
  const holidays = await fetchHolidayDates()
  const { data: project } = await supabase.from('projects').select('*').eq('id', projectId).single()
  if (!project) return { error: 'Project not found' }

  const now = new Date().toISOString()

  if (project.is_on_hold) {
    const { data: openHold } = await supabase
      .from('project_hold_periods')
      .select('id')
      .eq('project_id', projectId)
      .is('ended_at', null)
      .maybeSingle()

    if (openHold) {
      await supabase.from('project_hold_periods').update({
        ended_at: now,
        ended_by: profile.id,
      }).eq('id', openHold.id)
    }

    await supabase.from('projects').update({
      is_on_hold: false,
      on_hold_since: null,
      status_health: computeProjectHealth({
        ...project,
        is_on_hold: false,
      }, holidays),
      updated_by: profile.id,
    }).eq('id', projectId)

    await insertStageHistoryRecord({
      project_id: projectId,
      old_stage: project.current_stage,
      new_stage: project.current_stage,
      changed_by: profile.id,
      note: note ?? 'Project resumed',
      is_hold_event: true,
    })

    await logActivity(projectId, profile.id, 'hold_resume', 'is_on_hold', 'true', 'false')
  } else {
    await supabase.from('project_hold_periods').insert({
      project_id: projectId,
      started_at: now,
      started_by: profile.id,
      note: note ?? 'Project put on hold',
    })

    await supabase.from('projects').update({
      is_on_hold: true,
      on_hold_since: now,
      status_health: 'On hold',
      updated_by: profile.id,
    }).eq('id', projectId)

    await insertStageHistoryRecord({
      project_id: projectId,
      old_stage: project.current_stage,
      new_stage: project.current_stage,
      changed_by: profile.id,
      note: note ?? 'Project on hold',
      is_hold_event: true,
    })

    await logActivity(projectId, profile.id, 'hold_start', 'is_on_hold', 'false', 'true')
  }

  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/board')
  revalidatePath('/dashboard')
  return { success: true }
}

export type RpCutInput = { id?: string; timestamps: string; thumbnail: string }

export async function saveRpCuts(projectId: string, cuts: RpCutInput[]) {
  const session = await getSessionEffectiveRole()
  if (!session || !canEditRpCuts(session.role)) {
    return { error: 'Unauthorized' }
  }
  if (cuts.length > 10) return { error: 'Maximum 10 RP cuts allowed' }

  const supabase = await createClient()
  const { profile } = session

  const { data: existing } = await supabase
    .from('project_rp_cuts')
    .select('id')
    .eq('project_id', projectId)

  const existingIds = new Set((existing ?? []).map(r => r.id))
  const keptIds = new Set(cuts.filter(c => c.id).map(c => c.id!))

  const toDelete = [...existingIds].filter(id => !keptIds.has(id))
  if (toDelete.length) {
    await supabase.from('project_rp_cuts').delete().in('id', toDelete)
  }

  for (let i = 0; i < cuts.length; i++) {
    const cut = cuts[i]
    const row = {
      project_id: projectId,
      sort_order: i,
      timestamps: cut.timestamps.trim() || null,
      thumbnail: cut.thumbnail.trim() || null,
      updated_at: new Date().toISOString(),
    }

    if (cut.id && existingIds.has(cut.id)) {
      await supabase.from('project_rp_cuts').update(row).eq('id', cut.id)
    } else {
      await supabase.from('project_rp_cuts').insert({
        ...row,
        created_by: profile.id,
      })
    }
  }

  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}
