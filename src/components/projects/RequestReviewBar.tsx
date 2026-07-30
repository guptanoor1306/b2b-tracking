'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Textarea'
import { approveExternalRequest, declineExternalRequest } from '@/lib/actions/projects'
import { CheckCircle2, XCircle, ClipboardList } from 'lucide-react'

type Props = {
  projectId: string
}

export function RequestReviewBar({ projectId }: Props) {
  const router = useRouter()
  const [declineOpen, setDeclineOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState<'approve' | 'decline' | null>(null)
  const [error, setError] = useState('')

  const handleApprove = async () => {
    setLoading('approve')
    setError('')
    const result = await approveExternalRequest(projectId)
    setLoading(null)
    if (result.error) {
      setError(result.error)
      return
    }
    router.refresh()
  }

  const handleDecline = async () => {
    if (!reason.trim()) {
      setError('Please explain why this request is being declined')
      return
    }
    setLoading('decline')
    setError('')
    const result = await declineExternalRequest(projectId, reason.trim())
    setLoading(null)
    if (result.error) {
      setError(result.error)
      return
    }
    setDeclineOpen(false)
    setReason('')
    router.refresh()
  }

  return (
    <>
      <div className="rounded-xl border border-violet-200 bg-violet-50/60 px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
              <ClipboardList size={16} />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-900">Review production request</p>
              <p className="text-xs text-zinc-600 mt-0.5">
                Approve to move to Ready to Produce, or decline with a reason for the client.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              loading={loading === 'decline'}
              disabled={loading === 'approve'}
              onClick={() => { setError(''); setDeclineOpen(true) }}
              className="v2-btn-secondary"
            >
              <XCircle size={14} /> Decline
            </Button>
            <Button
              size="sm"
              loading={loading === 'approve'}
              disabled={loading === 'decline'}
              onClick={handleApprove}
              className="v2-btn-primary"
            >
              <CheckCircle2 size={14} /> Accept request
            </Button>
          </div>
        </div>
        {error && !declineOpen && (
          <p className="mt-2 text-xs text-red-600">{error}</p>
        )}
      </div>

      <Modal open={declineOpen} onClose={() => { setDeclineOpen(false); setError('') }} title="Decline request" size="md">
        <p className="mb-3 text-sm text-zinc-600">
          The request stays in <strong>Request Received</strong>. Your reason is posted in Feedback &amp; Changes for the client.
        </p>
        <Textarea
          label="Decline reason *"
          placeholder="Explain what needs to change or why this request cannot proceed…"
          value={reason}
          onChange={e => setReason(e.target.value)}
          rows={4}
        />
        {error && declineOpen && (
          <p className="mt-2 text-xs text-red-600">{error}</p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => { setDeclineOpen(false); setError('') }}>Cancel</Button>
          <Button loading={loading === 'decline'} onClick={handleDecline} className="bg-red-600 hover:bg-red-700 text-white">
            Decline request
          </Button>
        </div>
      </Modal>
    </>
  )
}

export function DeclinedRequestNotice() {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50/80 px-4 py-3">
      <p className="text-sm font-semibold text-red-800">Request declined</p>
      <p className="mt-0.5 text-xs text-red-700">
        See the decline reason in Feedback &amp; Changes below. Update your materials and contact LearnApp if you need to resubmit.
      </p>
    </div>
  )
}

export function PendingRequestNotice() {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3">
      <p className="text-sm font-semibold text-amber-900">Awaiting LearnApp review</p>
      <p className="mt-0.5 text-xs text-amber-800">
        Your request is with the internal team. You&apos;ll be notified here if any changes are needed.
      </p>
    </div>
  )
}
