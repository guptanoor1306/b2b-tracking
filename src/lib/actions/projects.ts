'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getSessionProfile } from '@/lib/auth'
import { CHANNEL, FINAL_STAGE } from '@/lib/constants'
import { isInternalRole } from '@/lib/views'
import {
  computeTargetReleaseDateString,
  computeProjectHealth,
} from '@/lib/timelines'
import { fetchHolidayDates } from '@/lib/data/holidays'

type ProjectInput = {
  ip?: string
  content_type?: string
  title?: string
  level_of_video?: string | null
  received_date?: string | null
  picked_up_date?: string | null
  target_delivery_date?: string | null
  editor?: string | null
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
  const profile = await getSessionProfile()
  if (!profile || !isInternalRole(profile.role)) {
    return { error: 'Unauthorized' }
  }

  const supabase = await createClient()
  const holidays = await fetchHolidayDates()
  const initialStage = 'Script Received'
  const now = new Date().toISOString()
  const target_delivery_date = input.received_date
    ? computeTargetReleaseDateString(input.received_date, holidays)
    : null

  const { data, error } = await supabase
    .from('projects')
    .insert({
      title: input.title?.trim() || 'Untitled project',
      ip: input.ip?.trim() || '—',
      content_type: input.content_type || 'Long-Form',
      level_of_video: input.level_of_video ?? null,
      priority: input.priority || 'Medium',
      editor: input.editor ?? null,
      graphic_designer_id: null,
      stage_assignee_id: input.stage_assignee_id ?? null,
      received_date: input.received_date ?? null,
      picked_up_date: input.picked_up_date ?? input.received_date ?? null,
      target_delivery_date,
      channel: CHANNEL,
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

  await supabase.from('stage_history').insert({
    project_id: data.id,
    old_stage: null,
    new_stage: initialStage,
    changed_by: profile.id,
    assignee_id: input.stage_assignee_id ?? null,
    note: 'Project created',
    is_hold_event: false,
  })

  revalidatePath('/dashboard')
  revalidatePath('/projects')
  revalidatePath('/board')
  return { id: data.id }
}

export async function updateProject(id: string, input: Partial<ProjectInput>) {
  const profile = await getSessionProfile()
  if (!profile) return { error: 'Unauthorized' }

  const supabase = await createClient()
  const { data: existing } = await supabase.from('projects').select('*').eq('id', id).single()
  if (!existing) return { error: 'Project not found' }

  const isInternal = isInternalRole(profile.role)
  const isExternal = !isInternal

  if (isExternal) {
    const allowed = [
      'drive_link', 'assets_link', 'thumbnail_copy', 'title_copy',
      'final_file_link', 'notes', 'blocker', 'next_action', 'next_action_due_date',
    ]
    const keys = Object.keys(input)
    if (keys.some(k => !allowed.includes(k))) return { error: 'Cannot edit this field' }
  }

  const patch: Partial<ProjectInput> = { ...input }
  const holidays = await fetchHolidayDates()
  if (input.received_date && input.received_date !== existing.received_date) {
    patch.target_delivery_date = computeTargetReleaseDateString(input.received_date, holidays)
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
  assigneeId?: string | null
) {
  const profile = await getSessionProfile()
  if (!profile || !['Admin', 'Internal Team'].includes(profile.role)) {
    return { error: 'Unauthorized' }
  }

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
  }, holidays)
  const updates: Record<string, unknown> = {
    current_stage: newStage,
    status_health,
    updated_by: profile.id,
    last_status_update_at: new Date().toISOString(),
    stage_assignee_id: assigneeId ?? null,
  }

  if (newStage === FINAL_STAGE && !project.delivered_date) {
    updates.delivered_date = new Date().toISOString().split('T')[0]
  }

  const { error } = await supabase.from('projects').update(updates).eq('id', projectId)
  if (error) return { error: error.message }

  await supabase.from('stage_history').insert({
    project_id: projectId,
    old_stage: oldStage,
    new_stage: newStage,
    changed_by: profile.id,
    assignee_id: assigneeId ?? null,
    note: note ?? null,
    is_hold_event: false,
  })

  await logActivity(projectId, profile.id, 'stage_change', 'current_stage', oldStage, newStage)

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
  const profile = await getSessionProfile()
  if (!profile || !['Admin', 'Internal Team'].includes(profile.role)) {
    return { error: 'Unauthorized' }
  }
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

    if (isFirst) {
      projectPatch.received_date = dateStr
      projectPatch.picked_up_date = dateStr
      projectPatch.target_delivery_date = computeTargetReleaseDateString(dateStr, holidays)
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
  const profile = await getSessionProfile()
  if (!profile || !isInternalRole(profile.role)) {
    return { error: 'Unauthorized' }
  }

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
  const profile = await getSessionProfile()
  if (!profile || !['Admin', 'Internal Team', 'Super Admin'].includes(profile.role)) {
    return { error: 'Unauthorized' }
  }

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
  const resendKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.REMINDER_FROM_EMAIL ?? 'reminders@learnapp.in'

  if (resendKey) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: assignee.email,
        subject,
        text: body,
      }),
    })
    emailSent = res.ok
    if (!res.ok) {
      const err = await res.text()
      return { error: `Email failed: ${err}` }
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
      : `Reminder logged for ${assignee.name} (set RESEND_API_KEY to enable email)`,
  }
}

export async function deleteProject(projectId: string) {
  const profile = await getSessionProfile()
  if (!profile || profile.role !== 'Admin') {
    return { error: 'Unauthorized' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('projects').delete().eq('id', projectId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard')
  revalidatePath('/board')
  revalidatePath('/projects')
  return { success: true }
}
