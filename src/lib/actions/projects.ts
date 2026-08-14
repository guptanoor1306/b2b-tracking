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
  canCreateExternalRequest,
  isBlockedReadyToProduceMove,
  canReviewExternalRequest,
  canEditIntakeMaterials,
  canResubmitDeclinedRequest,
  isExternalClientAdmin,
} from '@/lib/views'
import { hasIntakeMaterials, ZERODHA_REQUEST_RECEIVED, ZERODHA_READY_TO_PRODUCE, isAwaitingRequestReview } from '@/lib/zerodha-sla'
import { FIRST_CUT_STAGE } from '@/lib/constants'
import { normalizeStage } from '@/lib/timelines'
import {
  computeProjectHealth,
  isProjectTimelineLocked,
} from '@/lib/timelines'
import { fetchHolidayDates } from '@/lib/data/holidays'
import { notifyProjectTeamOnCreate, notifyStageActionable, notifyRequestApproved, notifyRequestDeclined, notifyRequestReceived, notifyRequestResubmitted } from '@/lib/email/notifications'
import { isEmailConfigured, sendEmail } from '@/lib/email/send'
import { insertStageHistoryRecord } from '@/lib/data/stage-history'
import { Project } from '@/lib/types'
import { format } from 'date-fns'
import { resolveZerodhaStageAssigneeId, defaultQcReviewerId } from '@/lib/actions/client-review-feedback'
import { getActiveChannelSlug } from '@/lib/channel-context'
import { minReleaseDateFromRequest } from '@/lib/businessTime'
import { CONTENT_TYPES } from '@/lib/constants'
import { ZERODHA_FIRST_DRAFT_QC, normalizeZerodhaBoardStage, getZerodhaQcStageMoveError } from '@/lib/zerodha-sla'
import { fetchProjectHoldPeriods } from '@/lib/data/stage-sla'

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
  qc_reviewer_id?: string | null
  uses_teleprompter?: boolean | null
  department?: string | null
  graphic_designer_id?: string | null
  stage_assignee_id?: string | null
  assigned_agency_id?: string | null
  internal_owner_id?: string | null
  assets_link?: string | null
  script_link?: string | null
  screen_captures_link?: string | null
  audio_link?: string | null
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
    if (!input.target_delivery_date) return { error: 'Release date is required' }
  }

  const initialStage = isZerodhaChannelDbName(channelName) ? ZERODHA_READY_TO_PRODUCE : 'Video received'
  const now = new Date().toISOString()
  const target_delivery_date = input.target_delivery_date ?? null

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

export type ExternalRequestInput = {
  title: string
  content_type: string
  script_link: string
  drive_link: string
  screen_captures_link?: string
  audio_link: string
  thumbnail_copy: string
  target_delivery_date: string
  video_language: string
}

export async function createExternalProjectRequest(input: ExternalRequestInput) {
  const session = await getSessionEffectiveRole()
  if (!session) return { error: 'Unauthorized' }

  const channelName = await getActiveChannelDbName()
  if (!canCreateExternalRequest(session.role, channelName)) {
    return { error: 'Unauthorized' }
  }

  const title = input.title?.trim()
  const content_type = input.content_type?.trim()
  const script_link = input.script_link?.trim()
  const drive_link = input.drive_link?.trim()
  const screen_captures_link = input.screen_captures_link?.trim()
  const audio_link = input.audio_link?.trim()
  const thumbnail_copy = input.thumbnail_copy?.trim()
  const target_delivery_date = input.target_delivery_date?.trim()
  const video_language = input.video_language?.trim()

  if (!title) return { error: 'Title is required' }
  if (!content_type) return { error: 'Type of video is required' }
  if (!(CONTENT_TYPES as readonly string[]).includes(content_type)) {
    return { error: 'Invalid video type' }
  }
  if (!script_link) return { error: 'Script link is required' }
  if (!drive_link) return { error: 'Video link is required' }
  if (!audio_link) return { error: 'Audio link is required' }
  if (!thumbnail_copy) return { error: 'Thumbnail copy is required' }
  if (!target_delivery_date) return { error: 'Release date is required' }
  if (!video_language) return { error: 'Language is required' }

  const { profile } = session
  const supabase = await createClient()
  const holidays = await fetchHolidayDates()
  const initialStage = ZERODHA_REQUEST_RECEIVED
  const now = new Date().toISOString()
  const today = format(new Date(), 'yyyy-MM-dd')
  const minRelease = minReleaseDateFromRequest(new Date(), 3, holidays)
  if (target_delivery_date < minRelease) {
    return { error: `Release date must be at least 3 working days from today (earliest: ${minRelease})` }
  }

  const { data, error } = await supabase
    .from('projects')
    .insert({
      title,
      ip: 'TBD',
      content_type,
      priority: 'Medium',
      script_link,
      drive_link,
      screen_captures_link: screen_captures_link || null,
      audio_link,
      thumbnail_copy,
      target_delivery_date,
      video_language,
      received_date: today,
      channel: channelName,
      current_stage: initialStage,
      request_status: 'pending',
      external_team_member_id: profile.id,
      stage_assignee_id: null,
      created_by: profile.id,
      updated_by: profile.id,
      status_health: computeProjectHealth({
        current_stage: initialStage,
        target_delivery_date,
        received_date: today,
        last_status_update_at: now,
      }, holidays),
      last_status_update_at: now,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  await insertStageHistoryRecord({
    project_id: data.id,
    old_stage: null,
    new_stage: initialStage,
    changed_by: profile.id,
    assignee_id: null,
    note: 'Production request submitted',
    is_hold_event: false,
  })

  const { data: created } = await supabase.from('projects').select('*').eq('id', data.id).single()
  if (created) {
    void notifyRequestReceived(created as Project).catch(() => {})
  }

  revalidatePath('/dashboard')
  revalidatePath('/board')
  return { id: data.id }
}

export async function approveExternalRequest(projectId: string) {
  const session = await getSessionEffectiveRole()
  if (!session || !canReviewExternalRequest(session.role, (await getActiveChannelDbName()))) {
    return { error: 'Unauthorized' }
  }
  const { profile } = session

  const supabase = await createClient()
  const holidays = await fetchHolidayDates()
  const { data: project } = await supabase.from('projects').select('*').eq('id', projectId).single()
  if (!project) return { error: 'Project not found' }
  if (!isZerodhaChannelDbName(project.channel) || project.current_stage !== ZERODHA_REQUEST_RECEIVED) {
    return { error: 'This request is not awaiting review' }
  }
  if (project.request_status === 'declined') {
    return { error: 'Declined requests must be resubmitted by the client' }
  }

  const newStage = ZERODHA_READY_TO_PRODUCE
  const oldStage = project.current_stage
  const now = new Date().toISOString()
  const resolvedAssignee = resolveStageAssigneeId(project, newStage)
  const status_health = computeProjectHealth({
    current_stage: newStage,
    target_delivery_date: project.target_delivery_date,
    received_date: project.received_date,
    last_status_update_at: now,
    is_on_hold: project.is_on_hold,
    level_of_video: project.level_of_video,
  }, holidays)

  const { error } = await supabase.from('projects').update({
    current_stage: newStage,
    request_status: 'approved',
    status_health,
    stage_assignee_id: resolvedAssignee,
    updated_by: profile.id,
    last_status_update_at: now,
  }).eq('id', projectId)

  if (error) return { error: error.message }

  const historyResult = await insertStageHistoryRecord({
    project_id: projectId,
    old_stage: oldStage,
    new_stage: newStage,
    changed_by: profile.id,
    assignee_id: resolvedAssignee,
    note: 'Request approved',
    is_hold_event: false,
  })
  if (historyResult.error) return { error: `Stage history failed: ${historyResult.error}` }

  await logActivity(projectId, profile.id, 'stage_change', 'current_stage', oldStage, newStage)

  void notifyRequestApproved({ ...project, request_status: 'approved' } as Project).catch(() => {})

  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/dashboard')
  revalidatePath('/board')
  revalidatePath('/projects')
  return { success: true }
}

export async function declineExternalRequest(projectId: string, reason: string) {
  const session = await getSessionEffectiveRole()
  if (!session || !canReviewExternalRequest(session.role, (await getActiveChannelDbName()))) {
    return { error: 'Unauthorized' }
  }
  const { profile } = session

  const text = reason?.trim()
  if (!text) return { error: 'Decline reason is required' }

  const supabase = await createClient()
  const { data: project } = await supabase.from('projects').select('*').eq('id', projectId).single()
  if (!project) return { error: 'Project not found' }
  if (!isAwaitingRequestReview(project)) return { error: 'This request is not awaiting review' }

  const { error: updateError } = await supabase.from('projects').update({
    request_status: 'declined',
    updated_by: profile.id,
    last_status_update_at: new Date().toISOString(),
  }).eq('id', projectId)

  if (updateError) return { error: updateError.message }

  const { error: commentError } = await supabase.from('comments').insert({
    project_id: projectId,
    comment: text,
    kind: 'decline',
    created_by: profile.id,
  })

  if (commentError) return { error: commentError.message }

  await logActivity(projectId, profile.id, 'request_declined', 'request_status', 'pending', 'declined')

  void notifyRequestDeclined(project as Project, text).catch(() => {})

  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/dashboard')
  revalidatePath('/board')
  return { success: true }
}

export async function resubmitExternalRequest(projectId: string) {
  const session = await getSessionEffectiveRole()
  if (!session) return { error: 'Unauthorized' }
  const { profile } = session

  const supabase = await createClient()
  const { data: project } = await supabase.from('projects').select('*').eq('id', projectId).single()
  if (!project) return { error: 'Project not found' }
  if (!canResubmitDeclinedRequest(session.role, project, profile.id)) {
    return { error: 'Unauthorized' }
  }

  const now = new Date().toISOString()
  const { error } = await supabase.from('projects').update({
    request_status: 'resubmitted',
    updated_by: profile.id,
    last_status_update_at: now,
  }).eq('id', projectId)

  if (error) return { error: error.message }

  await logActivity(projectId, profile.id, 'request_resubmitted', 'request_status', 'declined', 'resubmitted')

  void notifyRequestResubmitted(project as Project).catch(() => {})

  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/dashboard')
  revalidatePath('/board')
  return { success: true }
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
    const zerodhaIntakeFields = ['script_link', 'screen_captures_link', 'audio_link', 'drive_link', 'thumbnail_copy', 'title_copy', 'video_language']
    if (isZerodhaChannelDbName(existing.channel)) {
      zerodhaIntakeFields.push('target_delivery_date')
    }
    const allowed =
      session.role === 'Agency'
        ? ['drive_link', 'assets_link', 'final_file_link', ...zerodhaIntakeFields, ...shared]
        : session.role === 'Zerodha Viewer' || isExternalClientAdmin(session.role)
          ? [...zerodhaIntakeFields, ...shared]
          : []
    const keys = Object.keys(input)
    if (keys.some(k => !allowed.includes(k))) return { error: 'Cannot edit this field' }

    const intakeKeys = keys.filter(k => zerodhaIntakeFields.includes(k))
    if (intakeKeys.length > 0 && hasIntakeMaterials(existing)) {
      if (!canEditIntakeMaterials(session.role, existing, profile.id)) {
        return { error: 'Unauthorized' }
      }
    }
  }

  const patch: Partial<ProjectInput> & { status_health?: string } = { ...input }
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

  if (isZerodhaChannelDbName(existing.channel)) {
    const lang = input.video_language !== undefined ? input.video_language : existing.video_language
    const level = input.level_of_video !== undefined ? input.level_of_video : existing.level_of_video
    const settingProductionMeta =
      (input.video_language != null && input.video_language !== '') ||
      (input.level_of_video != null && input.level_of_video !== '')
    if (settingProductionMeta && (!lang || !level)) {
      return { error: 'Video language and level are both required when setting production metadata' }
    }
  }

  if (
    input.target_delivery_date !== undefined
    || input.received_date !== undefined
    || input.level_of_video !== undefined
  ) {
    patch.status_health = computeProjectHealth({
      current_stage: existing.current_stage,
      target_delivery_date: (patch.target_delivery_date ?? existing.target_delivery_date) as string | null,
      received_date: (patch.received_date ?? existing.received_date) as string | null,
      last_status_update_at: existing.last_status_update_at,
      is_on_hold: existing.is_on_hold,
      level_of_video: (patch.level_of_video ?? existing.level_of_video) as string | null,
    }, holidays)
  }

  const teamFields = [
    'editor_id', 'editor_2_id', 'designer_id', 'designer_2_id',
    'sound_designer_id', 'writer_id', 'external_team_member_id', 'qc_reviewer_id',
  ] as const
  if (teamFields.some(f => input[f] !== undefined)) {
    const merged = { ...existing, ...patch }
    patch.stage_assignee_id = resolveStageAssigneeId(merged, merged.current_stage as string)
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
  if (!session) return { error: 'Unauthorized' }
  const { profile } = session

  const supabase = await createClient()
  const holidays = await fetchHolidayDates()
  const { data: project } = await supabase.from('projects').select('*').eq('id', projectId).single()
  if (!project) return { error: 'Project not found' }

  if (!canMoveBoardCards(session.role, project.channel)) {
    return { error: 'Unauthorized' }
  }

  const oldStage = project.current_stage
  if (oldStage === newStage) return { success: true }

  if (isBlockedReadyToProduceMove(session.role, project.channel, newStage)) {
    return { error: 'Ready to Produce can only be marked by LearnApp.' }
  }

  if (isZerodhaChannelDbName(project.channel)) {
    const qcError = getZerodhaQcStageMoveError(project.current_stage, newStage)
    if (qcError) return { error: qcError }
  }

  const holdPeriods = await fetchProjectHoldPeriods(projectId)
  const channelSlug = await getActiveChannelSlug()
  const status_health = computeProjectHealth({
    current_stage: newStage,
    target_delivery_date: project.target_delivery_date,
    received_date: project.received_date,
    last_status_update_at: new Date().toISOString(),
    is_on_hold: project.is_on_hold,
    level_of_video: project.level_of_video,
    channel: project.channel,
    editor_id: project.editor_id,
    editor_2_id: project.editor_2_id,
    designer_id: project.designer_id,
    designer_2_id: project.designer_2_id,
    uses_teleprompter: project.uses_teleprompter,
  }, holidays, holdPeriods)
  let projectForAssignee = project as Project
  const updates: Record<string, unknown> = {
    current_stage: newStage,
    status_health,
    updated_by: profile.id,
    last_status_update_at: new Date().toISOString(),
  }

  if (
    isZerodhaChannelDbName(project.channel)
    && normalizeZerodhaBoardStage(newStage) === ZERODHA_FIRST_DRAFT_QC
    && !project.qc_reviewer_id
  ) {
    const qcId = await defaultQcReviewerId(channelSlug)
    if (qcId) {
      updates.qc_reviewer_id = qcId
      projectForAssignee = { ...project, qc_reviewer_id: qcId } as Project
    }
  }

  const resolvedAssignee = isZerodhaChannelDbName(project.channel)
    ? await resolveZerodhaStageAssigneeId(projectForAssignee, newStage, channelSlug)
    : resolveStageAssigneeId(project, newStage)
  updates.stage_assignee_id = resolvedAssignee

  if (
    normalizeStage(newStage) === FIRST_CUT_STAGE
    && usesTeleprompter != null
  ) {
    updates.uses_teleprompter = usesTeleprompter
  }

  if (newStage === FINAL_STAGE && !project.delivered_date) {
    updates.delivered_date = new Date().toISOString().split('T')[0]
  }

  if (
    isZerodhaChannelDbName(project.channel)
    && project.current_stage === ZERODHA_REQUEST_RECEIVED
    && normalizeStage(newStage) === ZERODHA_READY_TO_PRODUCE
  ) {
    updates.request_status = 'approved'
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

export async function updateComment(projectId: string, commentId: string, comment: string) {
  const profile = await getSessionProfile()
  if (!profile) return { error: 'Unauthorized' }

  const text = comment.trim()
  if (!text) return { error: 'Comment cannot be empty' }

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('comments')
    .select('id, project_id, created_by, comment')
    .eq('id', commentId)
    .eq('project_id', projectId)
    .single()

  if (!existing) return { error: 'Comment not found' }
  if (existing.created_by !== profile.id) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('comments')
    .update({ comment: text })
    .eq('id', commentId)

  if (error) return { error: error.message }

  await logActivity(projectId, profile.id, 'comment_edit', 'comment', existing.comment, text)

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

    const holdPeriods = await fetchProjectHoldPeriods(projectId)
    await supabase.from('projects').update({
      is_on_hold: false,
      on_hold_since: null,
      status_health: computeProjectHealth({
        ...project,
        is_on_hold: false,
      }, holidays, holdPeriods),
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
