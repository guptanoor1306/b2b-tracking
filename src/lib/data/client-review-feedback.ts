import { createClient } from '@/lib/supabase/server'
import { ClientReviewSubmission, ClientReviewFeedbackItem } from '@/lib/types'

export async function fetchClientReviewSubmissions(projectId: string): Promise<ClientReviewSubmission[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('client_review_submissions')
    .select(`
      *,
      items:client_review_feedback_items(*),
      submitter:profiles!client_review_submissions_submitted_by_fkey(id, name, email)
    `)
    .eq('project_id', projectId)
    .order('submitted_at', { ascending: true })

  if (error || !data) return []

  return data.map(row => ({
    ...(row as ClientReviewSubmission),
    items: ((row as { items?: ClientReviewFeedbackItem[] }).items ?? [])
      .sort((a, b) => a.sort_order - b.sort_order),
  }))
}