'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Lock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { submitClientReviewFeedback } from '@/lib/actions/client-review-feedback'
import { ClientReviewSubmission } from '@/lib/types'
import {
  isZerodhaClientReviewStage,
  normalizeZerodhaBoardStage,
} from '@/lib/zerodha-sla'
import { hasClientReviewSubmission } from '@/lib/zerodha-sla'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

type Props = {
  projectId: string
  currentStage: string
  canSubmit: boolean
  submissions: ClientReviewSubmission[]
}

export function ClientReviewFeedbackPanel({
  projectId,
  currentStage,
  canSubmit,
  submissions,
}: Props) {
  const router = useRouter()
  const reviewStage = normalizeZerodhaBoardStage(currentStage)
  const isActiveReview = isZerodhaClientReviewStage(reviewStage)
  const alreadySubmitted = hasClientReviewSubmission(submissions, reviewStage)
  const pastSubmissions = submissions.filter(s => s.items?.length)

  const [items, setItems] = useState<string[]>([''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const showForm = canSubmit && isActiveReview && !alreadySubmitted

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    const result = await submitClientReviewFeedback(projectId, items)
    setLoading(false)
    if (result.error) {
      setError(result.error)
      return
    }
    router.refresh()
  }

  const submissionBlocks = useMemo(() => pastSubmissions.map(sub => (
    <div key={sub.id} className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-zinc-800">{sub.review_stage}</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-200/80 px-2 py-0.5 text-[10px] font-medium text-zinc-600">
          <Lock size={10} /> Submitted
        </span>
        <span className="text-[10px] text-zinc-500">
          {formatDate(sub.submitted_at, 'dd MMM yyyy HH:mm')}
          {sub.submitter?.name ? ` · ${sub.submitter.name}` : ''}
        </span>
      </div>
      <ol className="list-decimal space-y-2 pl-4">
        {(sub.items ?? []).map((item, i) => (
          <li key={item.id} className="text-sm text-zinc-800 leading-relaxed">
            {item.comment}
          </li>
        ))}
      </ol>
    </div>
  )), [pastSubmissions])

  if (!isActiveReview && !pastSubmissions.length) return null

  return (
    <div className="space-y-4">
      {showForm && (
        <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-4">
          <h4 className="text-sm font-semibold text-zinc-900">Submit review feedback</h4>
          <p className="mt-1 text-xs text-zinc-600">
            Add all feedback for <strong>{reviewStage}</strong> below, then submit once.
            Feedback cannot be edited after submission.
          </p>
          <div className="mt-3 space-y-2">
            {items.map((item, index) => (
              <div key={index} className="flex gap-2">
                <div className="flex-1">
                  <Textarea
                    label={`Feedback ${index + 1}`}
                    placeholder="Describe the change or comment…"
                    value={item}
                    onChange={e => setItems(prev => prev.map((v, i) => i === index ? e.target.value : v))}
                    rows={2}
                  />
                </div>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setItems(prev => prev.filter((_, i) => i !== index))}
                    className="mt-6 shrink-0 text-zinc-400 hover:text-red-600"
                    aria-label="Remove feedback item"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setItems(prev => [...prev, ''])}
            >
              <Plus size={14} /> Add feedback
            </Button>
            <Button size="sm" loading={loading} onClick={handleSubmit}>
              Submit all feedback
            </Button>
          </div>
        </div>
      )}

      {isActiveReview && alreadySubmitted && (
        <p className="text-xs text-emerald-700 font-medium">Feedback submitted for this review round.</p>
      )}

      {isActiveReview && !canSubmit && !alreadySubmitted && (
        <p className="text-xs text-zinc-500 italic">Awaiting client review feedback.</p>
      )}

      {submissionBlocks.length > 0 && (
        <div className={cn('space-y-3', showForm && 'pt-2 border-t border-zinc-100')}>
          {showForm && (
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">Previous submissions</p>
          )}
          {submissionBlocks}
        </div>
      )}
    </div>
  )
}
