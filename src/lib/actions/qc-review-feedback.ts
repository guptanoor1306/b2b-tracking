'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSessionProfile } from '@/lib/auth'
import { getActiveChannelRole } from '@/lib/channel-context'
import { canSubmitQcReviewFeedback, effectiveRoleForChannel, resolveStageAssigneeId } from '@/lib/views'
import {
  usesExternalIntakeFlow,
  normalizeZerodhaBoardStage,
  ZERODHA_FIRST_DRAFT_QC,
  ZERODHA_FIRST_DRAFT_REVIEW,
  stageBeforeQc,
} from '@/lib/zerodha-sla'
import { fetchHolidayDates } from '@/lib/data/holidays'
import { computeProjectHealth } from '@/lib/timelines'
import { insertStageHistoryRecord } from '@/lib/data/stage-history'
import { fetchCurrentQcSubmission } from '@/lib/data/qc-review-feedback'

export async function submitQcReviewFeedback(
  projectId: string,
  feedbackItems: string[],
  goodToGo: boolean,
) {
  const profile = await getSessionProfile()
  if (!profile) return { error: 'Unauthorized' }
  const channelRole = await getActiveChannelRole(profile)
  const role = effectiveRoleForChannel(channelRole, profile.role)

  const items = feedbackItems.map(s => s.trim()).filter(Boolean)

  if (goodToGo && items.length > 0) {
    return { error: 'Clear QC notes before approving, or use Send back for changes' }
  }
  if (!goodToGo && !items.length) {
    return { error: 'Add at least one QC note to send back for changes' }
  }

  const supabase = await createClient()
  const { data: project } = await supabase.from('projects').select('*').eq('id', projectId).single()
  if (!project) return { error: 'Project not found' }
  if (!usesExternalIntakeFlow(project.channel)) return { error: 'Not supported for this channel' }

  if (!canSubmitQcReviewFeedback(role, project, profile.id)) {
    return { error: 'Unauthorized' }
  }

  if (normalizeZerodhaBoardStage(project.current_stage) !== ZERODHA_FIRST_DRAFT_QC) {
    return { error: 'Project is not at Draft QC stage' }
  }

  const existing = await fetchCurrentQcSubmission(projectId)
  if (existing) return { error: 'QC has already been submitted for this round' }

  const admin = createAdminClient()
  const { data: submission, error: subError } = await admin
    .from('qc_review_submissions')
    .insert({
      project_id: projectId,
      submitted_by: profile.id,
      is_good_to_go: goodToGo,
    })
    .select('id')
    .single()

  if (subError || !submission) return { error: subError?.message ?? 'Failed to save QC submission' }

  if (items.length > 0) {
    const { error: itemsError } = await admin.from('qc_review_feedback_items').insert(
      items.map((comment, index) => ({
        submission_id: submission.id,
        comment,
        sort_order: index,
      })),
    )
    if (itemsError) return { error: itemsError.message }
  }

  const newStage = goodToGo ? ZERODHA_FIRST_DRAFT_REVIEW : stageBeforeQc(project.channel)
  const holidays = await fetchHolidayDates()
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

  const note = goodToGo
    ? 'QC approved — good to go'
    : `QC sent back with ${items.length} note(s) → ${newStage}`

  const { error: updateError } = await admin.from('projects').update({
    current_stage: newStage,
    status_health,
    stage_assignee_id: resolvedAssignee,
    updated_by: profile.id,
    last_status_update_at: now,
  }).eq('id', projectId)

  if (updateError) return { error: updateError.message }

  await insertStageHistoryRecord({
    project_id: projectId,
    old_stage: project.current_stage,
    new_stage: newStage,
    changed_by: profile.id,
    assignee_id: resolvedAssignee,
    note,
    is_hold_event: false,
  })

  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/dashboard')
  revalidatePath('/board')
  return { success: true, nextStage: newStage }
}
