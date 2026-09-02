'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Lock, CheckCircle2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { submitQcReviewFeedback } from '@/lib/actions/qc-review-feedback'
import { QcReviewSubmission } from '@/lib/types'
import { ZERODHA_FIRST_DRAFT_QC, normalizeZerodhaBoardStage, stageBeforeQc } from '@/lib/zerodha-sla'
import { formatDate } from '@/lib/utils'

type Props = {
  projectId: string
  channelDbName: string
  currentStage: string
  canSubmit: boolean
  qcSubmissions: QcReviewSubmission[]
  currentQcSubmission: QcReviewSubmission | null
}

export function QcReviewFeedbackPanel({
  projectId,
  channelDbName,
  currentStage,
  canSubmit,
  qcSubmissions,
  currentQcSubmission,
}: Props) {
  const router = useRouter()
  const isAtQc = normalizeZerodhaBoardStage(currentStage, channelDbName) === ZERODHA_FIRST_DRAFT_QC
  const returnStage = stageBeforeQc(channelDbName)
  const showForm = canSubmit && isAtQc && !currentQcSubmission

  const [items, setItems] = useState<string[]>([''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const filledItems = items.map(s => s.trim()).filter(Boolean)

  const handleGoodToGo = async () => {
    setLoading(true)
    setError('')
    const result = await submitQcReviewFeedback(projectId, [], true)
    setLoading(false)
    if (result.error) { setError(result.error); return }
    router.refresh()
  }

  const handleSendBack = async () => {
    setLoading(true)
    setError('')
    const result = await submitQcReviewFeedback(projectId, items, false)
    setLoading(false)
    if (result.error) { setError(result.error); return }
    router.refresh()
  }

  if (!showForm && qcSubmissions.length === 0 && !(isAtQc && !canSubmit)) return null

  return (
    <div className="space-y-4">
      {showForm && (
        <div className="rounded-lg border border-sky-200 bg-sky-50/40 p-4">
          <h4 className="text-sm font-semibold text-zinc-900">Draft QC</h4>
          <p className="mt-1 text-xs text-zinc-600">
            Choose one: approve for client review, or send back to <strong>{returnStage}</strong> with notes.
          </p>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <button
              type="button"
              disabled={loading}
              onClick={handleGoodToGo}
              className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-left transition-colors hover:bg-emerald-100/80 disabled:opacity-60"
            >
              <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />
              <span>
                <span className="block text-sm font-semibold text-emerald-900">Good to go</span>
                <span className="mt-0.5 block text-xs text-emerald-800/90">→ 1st Draft Review</span>
              </span>
            </button>

            <div className="rounded-lg border border-zinc-200 bg-white p-3">
              <div className="mb-2 flex items-start gap-2">
                <RotateCcw size={16} className="mt-0.5 shrink-0 text-amber-600" />
                <span>
                  <span className="block text-sm font-semibold text-zinc-900">Send back</span>
                  <span className="mt-0.5 block text-xs text-zinc-500">→ {returnStage}</span>
                </span>
              </div>
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <Textarea
                      label={index === 0 ? 'QC notes' : `Note ${index + 1}`}
                      placeholder="What needs to change?"
                      value={item}
                      onChange={e => setItems(prev => prev.map((v, i) => i === index ? e.target.value : v))}
                      rows={2}
                    />
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setItems(prev => prev.filter((_, i) => i !== index))}
                        className="mt-6 shrink-0 text-zinc-400 hover:text-red-600"
                        aria-label="Remove note"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => setItems(prev => [...prev, ''])}>
                  <Plus size={14} /> Add note
                </Button>
                <Button size="sm" loading={loading} disabled={filledItems.length === 0} onClick={handleSendBack}>
                  Send back for changes
                </Button>
              </div>
            </div>
          </div>

          {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
        </div>
      )}

      {isAtQc && !canSubmit && !currentQcSubmission && (
        <p className="text-xs italic text-zinc-500">Awaiting QC reviewer.</p>
      )}

      {qcSubmissions.length > 0 && (
        <div className="space-y-2">
          {qcSubmissions.length > 1 && showForm && (
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">Previous QC rounds</p>
          )}
          {[...qcSubmissions].reverse().map(sub => (
            <SubmissionBlock key={sub.id} submission={sub} returnStage={returnStage} />
          ))}
        </div>
      )}
    </div>
  )
}

function SubmissionBlock({
  submission,
  returnStage,
}: {
  submission: QcReviewSubmission
  returnStage: string
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-zinc-800">1st Draft QC</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-200/80 px-2 py-0.5 text-[10px] font-medium text-zinc-600">
          <Lock size={10} /> Submitted
        </span>
        {submission.is_good_to_go ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
            Good to go → Client review
          </span>
        ) : (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
            Sent back → {returnStage}
          </span>
        )}
        <span className="text-[10px] text-zinc-500">
          {formatDate(submission.submitted_at, 'dd MMM yyyy HH:mm')}
          {submission.submitter?.name ? ` · ${submission.submitter.name}` : ''}
        </span>
      </div>
      {(submission.items ?? []).length > 0 ? (
        <ol className="list-decimal space-y-2 pl-4">
          {(submission.items ?? []).map(item => (
            <li key={item.id} className="text-sm leading-relaxed text-zinc-800">
              {item.comment}
            </li>
          ))}
        </ol>
      ) : submission.is_good_to_go ? (
        <p className="text-sm text-emerald-800">Approved with no changes.</p>
      ) : null}
    </div>
  )
}
