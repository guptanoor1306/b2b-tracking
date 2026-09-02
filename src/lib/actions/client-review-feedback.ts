'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSessionProfile } from '@/lib/auth'
import { getActiveChannelRole } from '@/lib/channel-context'
import { canSubmitClientReviewFeedback, effectiveRoleForChannel, resolveStageAssigneeId } from '@/lib/views'
import {
  isZerodhaClientReviewStage,
  normalizeZerodhaBoardStage,
  zerodhaReviewDoneStage,
  ZERODHA_FIRST_DRAFT_QC,
  ZERODHA_FIRST_CUT_REVIEW,
  usesExternalIntakeFlow,
} from '@/lib/zerodha-sla'
import { requiresIntroTimelineOnFirstCutReview } from '@/lib/external-intake-flow'
import { fetchHolidayDates } from '@/lib/data/holidays'
import { fetchChannelSuperAdmins } from '@/lib/data/channel-access'
import { computeProjectHealth } from '@/lib/timelines'
import { insertStageHistoryRecord } from '@/lib/data/stage-history'
import { Project } from '@/lib/types'

export async function resolveZerodhaStageAssigneeId(
  project: Project,
  newStage: string,
  channelSlug: string | null,
): Promise<string | null> {
  if (normalizeZerodhaBoardStage(newStage, project.channel) === ZERODHA_FIRST_DRAFT_QC) {
    if (project.qc_reviewer_id) return project.qc_reviewer_id
    if (channelSlug) {
      const superAdmins = await fetchChannelSuperAdmins(channelSlug)
      if (superAdmins[0]) return superAdmins[0].id
    }
  }
  return resolveStageAssigneeId(project, newStage)
}

export async function defaultQcReviewerId(channelSlug: string | null): Promise<string | null> {
  if (!channelSlug) return null
  const superAdmins = await fetchChannelSuperAdmins(channelSlug)
  return superAdmins[0]?.id ?? null
}

export async function submitClientReviewFeedback(
  projectId: string,
  feedbackItems: string[],
  introTimeline?: string | null,
) {
  const profile = await getSessionProfile()
  if (!profile) return { error: 'Unauthorized' }
  const channelRole = await getActiveChannelRole(profile)
  const role = effectiveRoleForChannel(channelRole, profile.role)

  const items = feedbackItems.map(s => s.trim()).filter(Boolean)
  const intro = introTimeline?.trim() ?? ''

  const supabase = await createClient()
  const { data: project } = await supabase.from('projects').select('*').eq('id', projectId).single()
  if (!project) return { error: 'Project not found' }
  if (!usesExternalIntakeFlow(project.channel)) return { error: 'Not supported for this channel' }

  if (!canSubmitClientReviewFeedback(role, project, profile.id)) {
    return { error: 'Unauthorized' }
  }

  const reviewStage = normalizeZerodhaBoardStage(project.current_stage, project.channel)
  if (!isZerodhaClientReviewStage(reviewStage, project.channel)) {
    return { error: 'Project is not awaiting client review feedback' }
  }

  const needsIntro = requiresIntroTimelineOnFirstCutReview(project.channel)
    && reviewStage === ZERODHA_FIRST_CUT_REVIEW
  if (needsIntro && !intro) {
    return { error: 'Intro timeline is required before submitting' }
  }
  if (!needsIntro && !items.length) {
    return { error: 'Add at least one feedback item before submitting' }
  }

  const doneStage = zerodhaReviewDoneStage(reviewStage, project.channel)
  if (!doneStage) return { error: 'Invalid review stage' }

  const admin = createAdminClient()

  const { data: existing } = await admin
    .from('client_review_submissions')
    .select('id')
    .eq('project_id', projectId)
    .eq('review_stage', reviewStage)
    .maybeSingle()

  if (existing) return { error: 'Feedback has already been submitted for this review round' }

  const { data: submission, error: subError } = await admin
    .from('client_review_submissions')
    .insert({
      project_id: projectId,
      review_stage: reviewStage,
      submitted_by: profile.id,
      intro_timeline: intro || null,
    })
    .select('id')
    .single()

  if (subError || !submission) return { error: subError?.message ?? 'Failed to save submission' }

  if (items.length) {
    const { error: itemsError } = await admin.from('client_review_feedback_items').insert(
      items.map((comment, index) => ({
        submission_id: submission.id,
        comment,
        sort_order: index,
      })),
    )

    if (itemsError) return { error: itemsError.message }
  }

  const holidays = await fetchHolidayDates()
  const now = new Date().toISOString()
  const resolvedAssignee = resolveStageAssigneeId(project, doneStage)
  const status_health = computeProjectHealth({
    current_stage: doneStage,
    target_delivery_date: project.target_delivery_date,
    received_date: project.received_date,
    last_status_update_at: now,
    is_on_hold: project.is_on_hold,
    level_of_video: project.level_of_video,
  }, holidays)

  const { error: updateError } = await admin.from('projects').update({
    current_stage: doneStage,
    status_health,
    stage_assignee_id: resolvedAssignee,
    updated_by: profile.id,
    last_status_update_at: now,
  }).eq('id', projectId)

  if (updateError) return { error: updateError.message }

  await insertStageHistoryRecord({
    project_id: projectId,
    old_stage: project.current_stage,
    new_stage: doneStage,
    changed_by: profile.id,
    assignee_id: resolvedAssignee,
    note: needsIntro
      ? 'Client submitted intro timeline'
      : `Client submitted ${items.length} feedback item(s)`,
    is_hold_event: false,
  })

  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/dashboard')
  revalidatePath('/board')
  return { success: true }
}
