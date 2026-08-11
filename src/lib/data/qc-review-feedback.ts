import { createClient } from '@/lib/supabase/server'
import { getSessionProfile } from '@/lib/auth'
import { getActiveChannelRole } from '@/lib/channel-context'
import { effectiveRoleForChannel, isInternalRole } from '@/lib/views'
import { QcReviewSubmission, QcReviewFeedbackItem } from '@/lib/types'
import { ZERODHA_FIRST_DRAFT_QC } from '@/lib/zerodha-sla'

const QC_SELECT = `
  *,
  items:qc_review_feedback_items(*),
  submitter:profiles!qc_review_submissions_submitted_by_fkey(id, name, email)
`

function mapSubmission(row: QcReviewSubmission & { items?: QcReviewFeedbackItem[] }): QcReviewSubmission {
  return {
    ...row,
    items: (row.items ?? []).sort((a, b) => a.sort_order - b.sort_order),
  }
}

async function canFetchQcReview(): Promise<boolean> {
  const profile = await getSessionProfile()
  if (!profile) return false
  const channelRole = await getActiveChannelRole(profile)
  const role = effectiveRoleForChannel(channelRole, profile.role)
  return isInternalRole(role)
}

export async function fetchLastQcEntryAt(projectId: string): Promise<string | null> {
  if (!(await canFetchQcReview())) return null

  const supabase = await createClient()
  const { data } = await supabase
    .from('stage_history')
    .select('changed_at')
    .eq('project_id', projectId)
    .eq('new_stage', ZERODHA_FIRST_DRAFT_QC)
    .order('changed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data?.changed_at ?? null
}

export async function fetchQcReviewSubmissions(projectId: string): Promise<QcReviewSubmission[]> {
  if (!(await canFetchQcReview())) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('qc_review_submissions')
    .select(QC_SELECT)
    .eq('project_id', projectId)
    .order('submitted_at', { ascending: true })

  if (error || !data) return []
  return data.map(row => mapSubmission(row as QcReviewSubmission & { items?: QcReviewFeedbackItem[] }))
}

/** Submission for the current QC visit (since last entry into QC stage). */
export async function fetchCurrentQcSubmission(projectId: string): Promise<QcReviewSubmission | null> {
  if (!(await canFetchQcReview())) return null

  const since = await fetchLastQcEntryAt(projectId)
  if (!since) return null

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('qc_review_submissions')
    .select(QC_SELECT)
    .eq('project_id', projectId)
    .gte('submitted_at', since)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return mapSubmission(data as QcReviewSubmission & { items?: QcReviewFeedbackItem[] })
}

/** @deprecated use fetchCurrentQcSubmission */
export async function fetchQcReviewSubmission(projectId: string): Promise<QcReviewSubmission | null> {
  return fetchCurrentQcSubmission(projectId)
}
