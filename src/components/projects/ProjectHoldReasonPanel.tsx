'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PauseCircle } from 'lucide-react'
import { HoldPeriod } from '@/lib/types'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { updateOpenHoldReason } from '@/lib/actions/projects'
import { displayHoldReason, getOpenHoldPeriod } from '@/lib/projects/hold'
import { formatDate } from '@/lib/utils'

type Props = {
  projectId: string
  holdPeriods: HoldPeriod[]
  isOnHold: boolean
  canEdit: boolean
}

export function ProjectHoldReasonPanel({ projectId, holdPeriods, isOnHold, canEdit }: Props) {
  const router = useRouter()
  const openHold = getOpenHoldPeriod(holdPeriods)
  const displayedReason = displayHoldReason(openHold?.note)
  const [draft, setDraft] = useState(displayedReason ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setDraft(displayedReason ?? '')
  }, [displayedReason, openHold?.id])

  if (!isOnHold) return null

  const saveReason = async () => {
    const trimmed = draft.trim()
    if (!trimmed) {
      setError('Hold reason cannot be empty.')
      return
    }
    setLoading(true)
    setError('')
    const result = await updateOpenHoldReason(projectId, trimmed)
    setLoading(false)
    if (result.error) {
      setError(result.error)
      return
    }
    router.refresh()
  }

  return (
    <aside className="rounded-xl border border-amber-200 bg-amber-50/60 shadow-sm lg:sticky lg:top-4 lg:self-start">
      <div className="border-b border-amber-200/80 px-4 py-3">
        <div className="flex items-center gap-2">
          <PauseCircle size={16} className="text-amber-700 shrink-0" />
          <h2 className="text-sm font-semibold text-amber-950">On hold</h2>
        </div>
        {openHold?.started_at && (
          <p className="mt-1 text-[11px] text-amber-800/80">
            Since {formatDate(openHold.started_at, 'dd MMM yyyy')}
          </p>
        )}
      </div>

      <div className="px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-800/70 mb-2">
          Reason
        </p>

        {canEdit ? (
          <div className="space-y-2">
            <Textarea
              placeholder="Why is this project on hold?"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              rows={4}
              className="bg-white"
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <Button size="sm" loading={loading} onClick={saveReason} className="w-full">
              Save reason
            </Button>
          </div>
        ) : displayedReason ? (
          <p className="text-sm leading-relaxed text-amber-950">{displayedReason}</p>
        ) : (
          <p className="text-sm italic text-amber-800/70">Reason not provided yet.</p>
        )}
      </div>
    </aside>
  )
}
