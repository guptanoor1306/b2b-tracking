'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { sendStageReminder } from '@/lib/actions/projects'
import { Button } from '@/components/ui/Button'
import { Bell } from 'lucide-react'

type Props = {
  projectId: string
  assigneeName: string | null
  daysInStage: number
  canSend?: boolean
}

export function StageReminderButton({ projectId, assigneeName, daysInStage, canSend = true }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  if (!canSend || !assigneeName) return null

  const handleSend = async () => {
    setLoading(true)
    setMessage('')
    const result = await sendStageReminder(projectId)
    setLoading(false)
    if ('error' in result && result.error) {
      setMessage(result.error)
    } else if ('message' in result && result.message) {
      setMessage(result.message)
      router.refresh()
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        variant="secondary"
        loading={loading}
        onClick={handleSend}
        className="h-7 text-[10px] gap-1"
        title={`Send reminder to ${assigneeName}`}
      >
        <Bell size={11} /> Remind
      </Button>
      {daysInStage >= 3 && (
        <span className="text-[9px] text-amber-500/80">{daysInStage}d pending</span>
      )}
      {message && <span className="text-[9px] text-zinc-500 max-w-[140px] text-right">{message}</span>}
    </div>
  )
}
