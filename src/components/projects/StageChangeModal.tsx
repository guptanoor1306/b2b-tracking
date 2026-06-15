'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { UserSearchSelect } from '@/components/ui/UserSearchSelect'
import { Profile } from '@/lib/types'
import { STAGES_INTERNAL } from '@/lib/constants'

type Props = {
  open: boolean
  onClose: () => void
  currentStage: string
  targetStage: string
  users: Profile[]
  onConfirm: (note: string, assigneeId: string | null) => Promise<void>
}

export function StageChangeModal({
  open, onClose, currentStage, targetStage, users, onConfirm,
}: Props) {
  const [note, setNote] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    await onConfirm(note, assigneeId || null)
    setLoading(false)
    setNote('')
    setAssigneeId('')
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Confirm stage change" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-zinc-600">
          Move from <strong className="text-zinc-900">{currentStage}</strong> →{' '}
          <strong className="text-zinc-900">{targetStage}</strong>
        </p>
        <UserSearchSelect
          label="Stage assignee"
          users={users}
          value={assigneeId}
          onChange={setAssigneeId}
          placeholder="Assign for reminders"
        />
        <Textarea
          label="Note (optional)"
          placeholder="e.g. Waiting for client feedback"
          value={note}
          onChange={e => setNote(e.target.value)}
        />
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={loading} onClick={handleConfirm}>Confirm</Button>
        </div>
      </div>
    </Modal>
  )
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
        <Textarea label="Note (optional)" value={note} onChange={e => setNote(e.target.value)} />
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={loading} onClick={handleConfirm} disabled={stage === currentStage}>Update</Button>
        </div>
      </div>
    </Modal>
  )
}
