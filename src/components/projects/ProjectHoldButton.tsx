'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pause, Play } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { Modal } from '@/components/ui/Modal'
import { toggleProjectHold } from '@/lib/actions/projects'
import { cn } from '@/lib/utils'

type Props = {
  projectId: string
  isOnHold: boolean
  className?: string
}

export function ProjectHoldButton({ projectId, isOnHold, className }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  const handleResume = async () => {
    setLoading(true)
    const result = await toggleProjectHold(projectId)
    setLoading(false)
    if (!result.error) router.refresh()
  }

  const handleHoldClick = () => {
    if (isOnHold) {
      void handleResume()
      return
    }
    setReason('')
    setError('')
    setModalOpen(true)
  }

  const confirmHold = async () => {
    const trimmed = reason.trim()
    if (!trimmed) {
      setError('Please enter a reason for putting this project on hold.')
      return
    }
    setLoading(true)
    setError('')
    const result = await toggleProjectHold(projectId, trimmed)
    setLoading(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setModalOpen(false)
    router.refresh()
  }

  return (
    <>
      <Button
        size="sm"
        variant="secondary"
        loading={loading && !modalOpen}
        onClick={handleHoldClick}
        className={cn(
          'h-8',
          isOnHold
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            : 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100',
          className,
        )}
      >
        {isOnHold ? <Play size={12} /> : <Pause size={12} />}
        {isOnHold ? 'Resume' : 'Hold'}
      </Button>

      <Modal open={modalOpen} onClose={() => !loading && setModalOpen(false)} title="Put project on hold" size="md">
        <p className="mb-4 text-sm text-zinc-600">
          This reason will be visible to the internal team and the client.
        </p>
        <Textarea
          label="Reason for hold"
          placeholder="e.g. Awaiting client feedback on script changes"
          value={reason}
          onChange={e => setReason(e.target.value)}
          rows={4}
          autoFocus
        />
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button loading={loading} onClick={confirmHold}>
            Put on hold
          </Button>
        </div>
      </Modal>
    </>
  )
}
