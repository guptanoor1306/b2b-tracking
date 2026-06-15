'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'
import { StageHistory } from '@/lib/types'
import { formatDate, computeStageDurations, formatDuration, daysInStage } from '@/lib/utils'
import { StageReminderButton } from '@/components/projects/StageReminderButton'
import { AssigneeAvatar } from '@/components/ui/AssigneeAvatar'
import { updateStageHistoryDate } from '@/lib/actions/projects'
import { isStageDurationOverSla, normalizeStage } from '@/lib/timelines'
import { cn } from '@/lib/utils'

type Props = {
  history: StageHistory[]
  currentStage?: string
  projectId: string
  currentAssignee?: string | null
  currentAssigneeId?: string | null
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
    return <span className="text-[11px] text-zinc-500">{formatDate(value, 'dd MMM')}</span>
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
      className="text-[11px] rounded-md border border-zinc-200 bg-white px-1.5 py-0.5 text-zinc-700 w-[108px] focus:outline-none focus:ring-2 focus:ring-violet-500/20"
    />
  )
}

export function StageTimelineCards({
  history,
  currentStage,
  projectId,
  currentAssignee,
  currentAssigneeId,
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
    return <p className="text-sm text-zinc-500">No stage history yet.</p>
  }

  const latestHistory = sorted[sorted.length - 1]
  const stageAssigneeMap = new Map<string, { name: string; id?: string }>()
  for (const h of history) {
    if (h.assignee?.name) {
      stageAssigneeMap.set(h.new_stage, { name: h.assignee.name, id: h.assignee.id })
    }
  }
  const currentStageDays = daysInStage(latestHistory?.changed_at)

  const saveDate = async (historyId: string, dateStr: string) => {
    const result = await updateStageHistoryDate(projectId, historyId, dateStr)
    if (!result.error) router.refresh()
  }

  return (
    <div className="divide-y divide-zinc-100">
      {sorted.map((entry, i) => {
        const next = sorted[i + 1]
        const d = durations[i]
        if (!d) return null

        const isCurrent = entry.new_stage === currentStage && !next
        const isComplete = !!next
        const stage = normalizeStage(entry.new_stage)
        const assigneeInfo = stageAssigneeMap.get(entry.new_stage) ?? (
          isCurrent && currentAssignee
            ? { name: currentAssignee, id: currentAssigneeId ?? undefined }
            : null
        )
        const end = next?.changed_at ?? new Date().toISOString()
        const overSla = isStageDurationOverSla(stage, d.startedAt, end, holidays)

        return (
          <div
            key={entry.id}
            className={cn(
              'py-3 first:pt-0 last:pb-0',
              isCurrent && 'border-l-2 border-violet-600 pl-3 -ml-px',
              overSla && isCurrent && 'border-orange-500'
            )}
          >
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-medium text-zinc-400 w-5 shrink-0 tabular-nums">{i + 1}</span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p className={cn(
                    'text-sm font-medium text-zinc-900',
                    isCurrent && 'text-violet-900'
                  )}>
                    {stage}
                  </p>
                  <span className="text-zinc-300">·</span>
                  <div className="flex flex-wrap items-center gap-1">
                    <DateInput
                      value={entry.changed_at}
                      disabled={!canEdit}
                      onSave={date => saveDate(entry.id, date)}
                    />
                    <span className="text-[11px] text-zinc-300">→</span>
                    {next ? (
                      <DateInput
                        value={next.changed_at}
                        disabled={!canEdit}
                        onSave={date => saveDate(next.id, date)}
                      />
                    ) : (
                      <span className="text-[11px] font-medium text-violet-700">In progress</span>
                    )}
                  </div>
                  <span className={cn(
                    'text-[11px] tabular-nums',
                    overSla ? 'text-orange-600 font-medium' : 'text-zinc-400'
                  )}>
                    {formatDuration(d.days, d.hours)}
                    {overSla && ' · late'}
                  </span>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2.5">
                {assigneeInfo ? (
                  <div className="flex items-center gap-1.5">
                    <AssigneeAvatar
                      name={assigneeInfo.name}
                      id={assigneeInfo.id}
                      size="sm"
                      theme="light"
                    />
                    <span className="text-[11px] font-medium text-zinc-600 hidden sm:inline max-w-[88px] truncate">
                      {assigneeInfo.name}
                    </span>
                  </div>
                ) : (
                  <span className="text-[11px] text-zinc-400">Unassigned</span>
                )}
                {isComplete ? (
                  <CheckCircle2 size={17} className="text-emerald-600 shrink-0" />
                ) : isCurrent ? (
                  <span className="h-2 w-2 rounded-full bg-violet-600 shrink-0" />
                ) : null}
              </div>
            </div>

            {isCurrent && (
              <div className="mt-2 ml-8 flex justify-end">
                <StageReminderButton
                  projectId={projectId}
                  assigneeName={assigneeInfo?.name ?? currentAssignee ?? null}
                  daysInStage={currentStageDays}
                  canSend={canSendReminder}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
