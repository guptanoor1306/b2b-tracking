'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { StageHistory } from '@/lib/types'
import { formatDate, computeStageDurations, formatDuration, sumDurations, daysInStage } from '@/lib/utils'
import { StageReminderButton } from '@/components/projects/StageReminderButton'
import { updateStageHistoryDate } from '@/lib/actions/projects'
import { isStageDurationOverSla, normalizeStage } from '@/lib/timelines'
import { cn } from '@/lib/utils'

type Props = {
  history: StageHistory[]
  currentStage?: string
  projectId: string
  currentAssignee?: string | null
  canSendReminder?: boolean
  canEdit?: boolean
  holidays?: string[]
}

function toDateInput(iso: string): string {
  return iso.slice(0, 10)
}

function DateInput({
  value,
  onSave,
  disabled,
}: {
  value: string
  onSave: (date: string) => void
  disabled?: boolean
}) {
  if (disabled) {
    return <span className="text-[10px] text-zinc-600">{formatDate(value, 'dd MMM yyyy')}</span>
  }
  return (
    <input
      type="date"
      defaultValue={toDateInput(value)}
      onBlur={e => {
        if (e.target.value && e.target.value !== toDateInput(value)) {
          onSave(e.target.value)
        }
      }}
      className="text-[10px] rounded border border-white/10 bg-[#141414] px-1 py-0.5 text-zinc-300 w-[118px]"
    />
  )
}

export function Timeline({
  history,
  currentStage,
  projectId,
  currentAssignee,
  canSendReminder,
  canEdit = false,
  holidays = [],
}: Props) {
  const router = useRouter()

  const sorted = useMemo(
    () => [...history].sort(
      (a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime()
    ),
    [history]
  )

  const durations = computeStageDurations(history, holidays)

  if (durations.length === 0) {
    return <p className="text-sm text-zinc-600">No stage history yet.</p>
  }

  const total = sumDurations(durations)
  const latestHistory = sorted[sorted.length - 1]
  const stageAssigneeMap = new Map<string, string>()
  for (const h of history) {
    if (h.assignee?.name) stageAssigneeMap.set(h.new_stage, h.assignee.name)
  }
  const currentStageDays = daysInStage(latestHistory?.changed_at)

  const saveDate = async (historyId: string, dateStr: string) => {
    const result = await updateStageHistoryDate(projectId, historyId, dateStr)
    if (!result.error) router.refresh()
  }

  return (
    <div className="space-y-0">
      <div className="flex items-center justify-between pb-3 mb-1 border-b border-white/[0.06]">
        <span className="text-xs text-zinc-500">Total (business time)</span>
        <span className="text-sm font-semibold text-zinc-100">{formatDuration(total.days, total.hours)}</span>
      </div>

      {sorted.map((entry, i) => {
        const next = sorted[i + 1]
        const d = durations[i]
        if (!d) return null

        const isCurrent = entry.new_stage === currentStage && !next
        const stage = normalizeStage(entry.new_stage)
        const assignee = stageAssigneeMap.get(entry.new_stage) ?? (isCurrent ? currentAssignee : null)
        const end = next?.changed_at ?? new Date().toISOString()
        const overSla = isStageDurationOverSla(stage, d.startedAt, end, holidays)

        return (
          <div
            key={entry.id}
            className="flex items-start justify-between gap-3 py-2 border-b border-white/[0.04] last:border-0"
          >
            <div className="flex items-start gap-2 min-w-0 flex-1">
              <span className="text-[10px] text-zinc-600 font-mono w-5 shrink-0 pt-0.5">{i + 1}</span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <p className={`text-xs ${isCurrent ? 'text-indigo-300 font-medium' : 'text-zinc-300'}`}>
                    {stage}
                  </p>
                  {assignee && (
                    <span className="text-[10px] text-zinc-500">· {assignee}</span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1 mt-1">
                  <DateInput
                    value={entry.changed_at}
                    disabled={!canEdit}
                    onSave={date => saveDate(entry.id, date)}
                  />
                  <span className="text-[10px] text-zinc-700">→</span>
                  {next ? (
                    <DateInput
                      value={next.changed_at}
                      disabled={!canEdit}
                      onSave={date => saveDate(next.id, date)}
                    />
                  ) : (
                    <span className="text-[10px] text-zinc-600">now</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className={cn(
                'text-xs tabular-nums',
                overSla ? 'text-rose-400 font-medium' : 'text-zinc-400'
              )}>
                {formatDuration(d.days, d.hours)}
                {overSla && ' · late'}
              </span>
              {isCurrent && (
                <StageReminderButton
                  projectId={projectId}
                  assigneeName={assignee ?? currentAssignee ?? null}
                  daysInStage={currentStageDays}
                  canSend={canSendReminder}
                />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
