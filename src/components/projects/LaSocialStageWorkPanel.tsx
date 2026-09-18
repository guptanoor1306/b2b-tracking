'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { Play, Timer } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { startLaSocialStageWork } from '@/lib/actions/la-social-stage-work'
import { openStageWorkSession } from '@/lib/stage-work-session'
import type { StageWorkSession } from '@/lib/types'
import { cn } from '@/lib/utils'

type Props = {
  projectId: string
  currentStage: string
  sessions: StageWorkSession[]
  canStart: boolean
}

export function LaSocialStageWorkPanel({ projectId, currentStage, sessions, canStart }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const open = openStageWorkSession(sessions, currentStage)

  const onStart = async () => {
    setError('')
    setLoading(true)
    try {
      const result = await startLaSocialStageWork(projectId)
      if (result.error) {
        setError(result.error)
        return
      }
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-violet-200/80 bg-violet-50/40 px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-700">Stage timer</p>
          <p className="mt-0.5 text-sm font-medium text-zinc-900 truncate">{currentStage}</p>
          {open ? (
            <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-violet-800">
              <Timer size={13} className="shrink-0" />
              Started {formatDistanceToNow(parseISO(open.started_at), { addSuffix: true })}
              <span className="text-violet-600">· SLA clock running</span>
            </p>
          ) : (
            <p className="mt-1 text-xs text-zinc-600">
              Press Start when work begins on this stage. SLA time does not run until then.
            </p>
          )}
        </div>
        {canStart && (
          <Button
            type="button"
            size="sm"
            loading={loading}
            disabled={Boolean(open)}
            onClick={onStart}
            className={cn(
              'shrink-0',
              open && 'opacity-60',
            )}
          >
            <Play size={14} className="mr-1" />
            {open ? 'In progress' : 'Start stage'}
          </Button>
        )}
      </div>
      {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}
    </div>
  )
}
