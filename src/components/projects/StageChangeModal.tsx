'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { FIRST_CUT_STAGE, STAGES_INTERNAL } from '@/lib/constants'
import { normalizeStage } from '@/lib/timelines'
import { channelUsesTeleprompterFlow } from '@/lib/zerodha-sla'

type Props = {
  open: boolean
  onClose: () => void
  currentStage: string
  targetStage: string
  onConfirm: (usesTeleprompter: boolean) => Promise<void>
}

/** Shown only when moving into First Cut — asks teleprompter question */
export function StageChangeModal({
  open, onClose, currentStage, targetStage, onConfirm,
}: Props) {
  const [teleprompter, setTeleprompter] = useState<'yes' | 'no' | ''>('')
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    if (!teleprompter) return
    setLoading(true)
    await onConfirm(teleprompter === 'yes')
    setLoading(false)
    setTeleprompter('')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Is Teleprompter Used" size="sm">
      <div className="space-y-5">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTeleprompter('yes')}
            className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${teleprompter === 'yes' ? 'border-violet-500 bg-violet-50 text-violet-800' : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'}`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => setTeleprompter('no')}
            className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${teleprompter === 'no' ? 'border-violet-500 bg-violet-50 text-violet-800' : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'}`}
          >
            No
          </button>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={loading} onClick={handleConfirm} disabled={!teleprompter}>
            Move card
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export function needsTeleprompterPrompt(
  currentStage: string,
  targetStage: string,
  channelDbName?: string | null,
): boolean {
  if (!channelUsesTeleprompterFlow(channelDbName)) return false
  return normalizeStage(targetStage) === FIRST_CUT_STAGE
    && normalizeStage(currentStage) !== FIRST_CUT_STAGE
}

export function StageSelectModal({
  open, onClose, currentStage, onConfirm,
}: {
  open: boolean
  onClose: () => void
  currentStage: string
  onConfirm: (stage: string, note: string) => Promise<void>
}) {
  const [stage, setStage] = useState(currentStage)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    await onConfirm(stage, note)
    setLoading(false)
    setNote('')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Change stage" size="sm">
      <div className="space-y-4">
        <select
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
          value={stage}
          onChange={e => setStage(e.target.value)}
        >
          {STAGES_INTERNAL.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={loading} onClick={handleConfirm} disabled={stage === currentStage}>Update</Button>
        </div>
      </div>
    </Modal>
  )
}
