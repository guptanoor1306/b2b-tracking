'use client'

import { useMemo, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  addDays, differenceInCalendarDays, eachDayOfInterval, format, isToday, parseISO, startOfDay,
} from 'date-fns'
import { CheckCircle2 } from 'lucide-react'
import { StageHistory, HoldPeriod, Project } from '@/lib/types'
import { computeStageDurations, formatDuration, daysInStage, stageHistoryEntries } from '@/lib/utils'
import { businessHoursBetweenExcluding, splitBusinessHours } from '@/lib/businessTime'
import {
  effectiveStageStartIso,
  shouldShowParallelAnimationRow,
  vdParallelStartIso,
  vdParallelAnchorEntry,
} from '@/lib/pipeline-parallel'
import { ANIMATION_VD_STAGE, GRAPHICS_VD_STAGE } from '@/lib/constants'
import { StageReminderButton } from '@/components/projects/StageReminderButton'
import { AssigneeAvatar } from '@/components/ui/AssigneeAvatar'
import { updateStageHistoryDate } from '@/lib/actions/projects'
import { isStageDurationOverSla, normalizeStage, isProjectTimelineLocked } from '@/lib/timelines'
import { mapInternalToExternalStage } from '@/lib/views'
import { cn } from '@/lib/utils'

const LABEL_WIDTH = 220
const ROW_MIN_H = 56

type Props = {
  history: StageHistory[]
  project: Pick<Project, 'level_of_video' | 'video_language' | 'channel' | 'editor_id' | 'editor_2_id' | 'designer_id' | 'designer_2_id' | 'uses_teleprompter' | 'is_on_hold' | 'current_stage' | 'delivered_date'>
  holdPeriods?: HoldPeriod[]
  currentStage?: string
  projectId: string
  currentAssignee?: string | null
  currentAssigneeId?: string | null
  canSendReminder?: boolean
  canEdit?: boolean
  holidays?: string[]
  externalView?: boolean
}

type StageRow = {
  key: string
  entryId: string
  endEntryId?: string
  startIso: string
  endIso: string
  stage: string
  start: Date
  end: Date
  isCurrent: boolean
  isComplete: boolean
  overSla: boolean
  assigneeInfo: { name: string; id?: string } | null
  durationLabel: string
  leftPct: number
  widthPct: number
}

type AxisTick = { day: Date; leftPct: number; isToday: boolean }

type DragMode = 'move' | 'resize-start' | 'resize-end'

function toIsoDate(dateStr: string): string {
  return `${dateStr}T00:00:00.000Z`
}

function toDateStr(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

function axisTicks(days: Date[]): AxisTick[] {
  const total = days.length
  if (total === 0) return []

  let step = 1
  if (total > 60) step = 14
  else if (total > 35) step = 7
  else if (total > 18) step = 3
  else if (total > 10) step = 2

  const ticks: AxisTick[] = []
  for (let i = 0; i < total; i++) {
    if (i === 0 || i === total - 1 || i % step === 0) {
      ticks.push({
        day: days[i],
        leftPct: (i / total) * 100,
        isToday: isToday(days[i]),
      })
    }
  }
  return ticks
}

function barGeometry(start: Date, end: Date, rangeStart: Date, totalDays: number) {
  const startIdx = differenceInCalendarDays(start, rangeStart)
  const endIdx = differenceInCalendarDays(end, rangeStart)
  const span = Math.max(1, endIdx - startIdx + 1)
  const leftPct = (startIdx / totalDays) * 100
  const widthPct = (span / totalDays) * 100
  return { leftPct, widthPct: Math.min(widthPct, 100 - leftPct) }
}

function computeBarSegments(
  barStart: Date,
  barEnd: Date,
  holdPeriods: HoldPeriod[],
): { type: 'active' | 'hold'; start: Date; end: Date }[] {
  const holds = holdPeriods
    .map(hp => ({
      start: parseISO(hp.started_at),
      end: hp.ended_at ? parseISO(hp.ended_at) : new Date(),
    }))
    .filter(h => h.end > barStart && h.start < barEnd)
    .map(h => ({
      start: h.start < barStart ? barStart : h.start,
      end: h.end > barEnd ? barEnd : h.end,
    }))
    .sort((a, b) => a.start.getTime() - b.start.getTime())

  if (holds.length === 0) {
    return [{ type: 'active', start: barStart, end: barEnd }]
  }

  const segments: { type: 'active' | 'hold'; start: Date; end: Date }[] = []
  let cursor = barStart
  for (const hold of holds) {
    if (hold.start > cursor) {
      segments.push({ type: 'active', start: cursor, end: hold.start })
    }
    segments.push({ type: 'hold', start: hold.start, end: hold.end })
    cursor = hold.end > cursor ? hold.end : cursor
  }
  if (cursor < barEnd) {
    segments.push({ type: 'active', start: cursor, end: barEnd })
  }
  return segments.filter(s => s.end > s.start)
}

function segmentWidthPct(segStart: Date, segEnd: Date, barStart: Date, barEnd: Date): number {
  const total = barEnd.getTime() - barStart.getTime()
  if (total <= 0) return 100
  return ((segEnd.getTime() - segStart.getTime()) / total) * 100
}

function GanttBar({
  row,
  canEdit,
  rangeStart,
  totalDays,
  holdPeriods,
  onSaveStart,
  onSaveEnd,
}: {
  row: StageRow
  canEdit: boolean
  rangeStart: Date
  totalDays: number
  holdPeriods: HoldPeriod[]
  onSaveStart: (dateStr: string) => void
  onSaveEnd: (dateStr: string) => void
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [preview, setPreview] = useState<{ start: Date; end: Date } | null>(null)

  const displayStart = preview?.start ?? row.start
  const displayEnd = preview?.end ?? row.end
  const { leftPct, widthPct } = barGeometry(displayStart, displayEnd, rangeStart, totalDays)

  const statusLabel = row.overSla ? 'Late' : row.isCurrent ? 'In progress' : 'On time'
  const borderClass = row.overSla
    ? 'border-[3px] border-red-500'
    : row.isCurrent
      ? 'border-[3px] border-violet-500'
      : 'border-[3px] border-emerald-500'

  const segments = computeBarSegments(displayStart, displayEnd, holdPeriods)
  const hasHoldGap = segments.some(s => s.type === 'hold')

  const startDrag = (mode: DragMode, clientX: number) => {
    if (!canEdit || !trackRef.current) return

    const track = trackRef.current
    const origStart = row.start
    const origEnd = row.end
    let latest: { start: Date; end: Date } | null = null

    const onMove = (e: MouseEvent) => {
      const rect = track.getBoundingClientRect()
      const deltaDays = Math.round(((e.clientX - clientX) / rect.width) * totalDays)

      let newStart = origStart
      let newEnd = origEnd

      if (mode === 'move') {
        newStart = addDays(origStart, deltaDays)
        newEnd = addDays(origEnd, deltaDays)
      } else if (mode === 'resize-start') {
        newStart = addDays(origStart, deltaDays)
        if (newStart >= origEnd) newStart = addDays(origEnd, -1)
        newEnd = origEnd
      } else if (mode === 'resize-end') {
        newStart = origStart
        newEnd = addDays(origEnd, deltaDays)
        if (newEnd <= origStart) newEnd = addDays(origStart, 1)
      }

      latest = { start: newStart, end: newEnd }
      setPreview(latest)
    }

    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      setPreview(null)

      if (!latest) return

      const newStartStr = toDateStr(latest.start)
      const newEndStr = toDateStr(latest.end)
      const origStartStr = toDateStr(origStart)
      const origEndStr = toDateStr(origEnd)

      if (mode === 'move') {
        if (newStartStr !== origStartStr) onSaveStart(newStartStr)
        if (row.endEntryId && newEndStr !== origEndStr) onSaveEnd(newEndStr)
      } else if (mode === 'resize-start' && newStartStr !== origStartStr) {
        onSaveStart(newStartStr)
      } else if (mode === 'resize-end' && row.endEntryId && newEndStr !== origEndStr) {
        onSaveEnd(newEndStr)
      }
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div ref={trackRef} className="absolute inset-0 px-1">
      <div
        className={cn(
          'absolute top-1/2 flex h-9 min-w-[48px] -translate-y-1/2 items-center overflow-hidden rounded-md bg-white shadow-sm',
          borderClass,
          canEdit && 'select-none',
          row.isCurrent && !row.overSla && 'ring-1 ring-violet-200'
        )}
        style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 2)}%` }}
        title={`${format(displayStart, 'dd MMM')} – ${format(displayEnd, 'dd MMM')} · ${row.durationLabel} · ${statusLabel}${hasHoldGap ? ' · includes hold' : ''}`}
      >
        <div className="absolute inset-0 flex overflow-hidden rounded-[3px]">
          {segments.map((seg, si) => (
            <div
              key={si}
              className={cn(
                'h-full shrink-0',
                seg.type === 'hold'
                  ? 'bg-zinc-300/70 border-x border-zinc-400/40'
                  : 'bg-white'
              )}
              style={{ width: `${segmentWidthPct(seg.start, seg.end, displayStart, displayEnd)}%` }}
              title={seg.type === 'hold' ? 'On hold' : undefined}
            />
          ))}
        </div>

        {canEdit && (
          <div
            className="absolute inset-y-0 left-0 z-10 w-2 cursor-ew-resize rounded-l-md hover:bg-zinc-200/60"
            onMouseDown={e => { e.preventDefault(); e.stopPropagation(); startDrag('resize-start', e.clientX) }}
          />
        )}

        <div
          className={cn(
            'relative z-[1] flex min-w-0 flex-1 items-center justify-center gap-1.5 px-2',
            canEdit && 'cursor-grab active:cursor-grabbing'
          )}
          onMouseDown={e => {
            if (!canEdit) return
            e.preventDefault()
            startDrag('move', e.clientX)
          }}
        >
          <span className={cn(
            'shrink-0 text-[10px] tabular-nums',
            row.overSla ? 'font-semibold text-red-600' : 'text-zinc-600'
          )}>
            {row.durationLabel}
          </span>
          <span className={cn(
            'shrink-0 text-[9px] font-bold uppercase tracking-wide',
            row.overSla ? 'text-red-600' : row.isCurrent ? 'text-violet-600' : 'text-emerald-600'
          )}>
            {statusLabel}
          </span>
        </div>

        {canEdit && row.endEntryId && (
          <div
            className="absolute inset-y-0 right-0 z-10 w-2 cursor-ew-resize rounded-r-md hover:bg-zinc-200/60"
            onMouseDown={e => { e.preventDefault(); e.stopPropagation(); startDrag('resize-end', e.clientX) }}
          />
        )}
      </div>
    </div>
  )
}

function collapseRowsForExternalView(
  rows: Omit<StageRow, 'leftPct' | 'widthPct'>[],
  currentStage: string | undefined,
): Omit<StageRow, 'leftPct' | 'widthPct'>[] {
  const filtered = rows.filter(r => !r.key.includes('-parallel-animation'))
  const currentExt = currentStage ? mapInternalToExternalStage(currentStage) : ''
  const collapsed: Omit<StageRow, 'leftPct' | 'widthPct'>[] = []

  for (const row of filtered) {
    const extStage = mapInternalToExternalStage(row.stage)
    const last = collapsed[collapsed.length - 1]
    if (last && last.stage === extStage) {
      if (row.end > last.end) {
        last.end = row.end
        last.endIso = row.endIso
        last.endEntryId = row.endEntryId
      }
      last.isComplete = last.isComplete && row.isComplete
      last.overSla = last.overSla || row.overSla
      if (row.isCurrent) last.isCurrent = true
    } else {
      collapsed.push({ ...row, stage: extStage, isCurrent: false })
    }
  }

  for (const row of collapsed) {
    row.isCurrent = row.stage === currentExt
  }
  return collapsed
}

export function StagePipelineGantt({
  history,
  project,
  holdPeriods = [],
  currentStage,
  projectId,
  currentAssignee,
  currentAssigneeId,
  canSendReminder,
  canEdit = false,
  holidays = [],
  externalView = false,
}: Props) {
  const router = useRouter()
  const [dateOverrides, setDateOverrides] = useState<Record<string, string>>({})

  const resolveDate = useCallback(
    (id: string, iso: string) => dateOverrides[id] ?? iso,
    [dateOverrides]
  )

  const timelineLocked = isProjectTimelineLocked(project)

  const stageEntries = useMemo(() => stageHistoryEntries(history), [history])

  const durations = computeStageDurations(history, holidays, holdPeriods)

  const stageAssigneeMap = useMemo(() => {
    const map = new Map<string, { name: string; id?: string }>()
    for (const h of stageEntries) {
      if (h.assignee?.name) map.set(h.new_stage, { name: h.assignee.name, id: h.assignee.id })
    }
    return map
  }, [stageEntries])

  const { rangeStart, rangeEnd, days, todayOffset, rows, ticks, totalDays } = useMemo(() => {
    const built: Omit<StageRow, 'leftPct' | 'widthPct'>[] = []

    stageEntries.forEach((entry, i) => {
      const next = stageEntries[i + 1]
      const d = durations[i]
      if (!d) return

      const stage = normalizeStage(entry.new_stage)
      const effectiveStart = effectiveStageStartIso(stageEntries, entry)
      const parallelAnchorEntry = stage === ANIMATION_VD_STAGE ? vdParallelAnchorEntry(stageEntries) : null
      const startIso = parallelAnchorEntry
        ? resolveDate(parallelAnchorEntry.id, effectiveStart)
        : resolveDate(entry.id, effectiveStart)
      const endIso = next ? resolveDate(next.id, next.changed_at) : new Date().toISOString()
      const start = startOfDay(parseISO(startIso))
      const endDate = next ? startOfDay(parseISO(endIso)) : startOfDay(new Date())
      const isCurrent = entry.new_stage === currentStage && !next
      const overSla = isStageDurationOverSla(stage, d.startedAt, endIso, holidays, project.level_of_video, project, holdPeriods, timelineLocked)

      built.push({
        key: entry.id,
        entryId: entry.id,
        endEntryId: next?.id,
        startIso,
        endIso,
        stage,
        start,
        end: endDate,
        isCurrent,
        isComplete: !!next,
        overSla,
        assigneeInfo: stageAssigneeMap.get(entry.new_stage) ?? (
          isCurrent && currentAssignee
            ? { name: currentAssignee, id: currentAssigneeId ?? undefined }
            : null
        ),
        durationLabel: formatDuration(d.days, d.hours),
      })

      if (
        stage === GRAPHICS_VD_STAGE
        && shouldShowParallelAnimationRow(stageEntries, currentStage)
      ) {
        const parallelStart = vdParallelStartIso(stageEntries)
        const anchorEntry = vdParallelAnchorEntry(stageEntries)
        if (parallelStart && anchorEntry) {
          const animStartIso = resolveDate(anchorEntry.id, parallelStart)
          const animEndIso = new Date().toISOString()
          const exclude = holdPeriods.map(p => ({
            start: parseISO(p.started_at),
            end: p.ended_at ? parseISO(p.ended_at) : new Date(),
          }))
          const animHours = businessHoursBetweenExcluding(
            parseISO(animStartIso),
            parseISO(animEndIso),
            holidays,
            exclude
          )
          const { days: animDays, hours: animHoursPart } = splitBusinessHours(animHours)

          built.push({
            key: `${entry.id}-parallel-animation`,
            entryId: anchorEntry.id,
            startIso: animStartIso,
            endIso: animEndIso,
            stage: ANIMATION_VD_STAGE,
            start: startOfDay(parseISO(animStartIso)),
            end: startOfDay(new Date()),
            isCurrent: true,
            isComplete: false,
            overSla: isStageDurationOverSla(
              ANIMATION_VD_STAGE,
              animStartIso,
              animEndIso,
              holidays,
              project.level_of_video,
              project,
              holdPeriods,
              timelineLocked
            ),
            assigneeInfo: stageAssigneeMap.get(ANIMATION_VD_STAGE) ?? null,
            durationLabel: formatDuration(animDays, animHoursPart),
          })
        }
      }
    })

    const finalBuilt = externalView
      ? collapseRowsForExternalView(built, currentStage)
      : built

    if (finalBuilt.length === 0) {
      const today = startOfDay(new Date())
      return {
        rangeStart: today,
        rangeEnd: today,
        days: [today],
        todayOffset: 0,
        rows: [] as StageRow[],
        ticks: [] as AxisTick[],
        totalDays: 1,
      }
    }

    let min = finalBuilt[0].start
    let max = finalBuilt[0].end
    for (const r of finalBuilt) {
      if (r.start < min) min = r.start
      if (r.end > max) max = r.end
    }

    const rangeStart = addDays(min, -1)
    const rangeEnd = addDays(max, 1)
    const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd })
    const totalDays = days.length
    const today = startOfDay(new Date())
    const todayIdx = differenceInCalendarDays(today, rangeStart)
    const todayOffset = todayIdx >= 0 && todayIdx < totalDays ? (todayIdx / totalDays) * 100 : null

    const rows: StageRow[] = finalBuilt.map(r => {
      const { leftPct, widthPct } = barGeometry(r.start, r.end, rangeStart, totalDays)
      return { ...r, leftPct, widthPct }
    })

    return {
      rangeStart,
      rangeEnd,
      days,
      todayOffset,
      rows,
      ticks: axisTicks(days),
      totalDays,
    }
  }, [stageEntries, durations, resolveDate, currentStage, currentAssignee, currentAssigneeId, stageAssigneeMap, holidays, project, holdPeriods, externalView, timelineLocked])

  const latestHistory = stageEntries[stageEntries.length - 1]
  const currentStageDays = daysInStage(latestHistory?.changed_at)
  const gridCols = `${LABEL_WIDTH}px minmax(0, 1fr)`

  const saveDate = useCallback(async (historyId: string, dateStr: string) => {
    setDateOverrides(prev => ({ ...prev, [historyId]: toIsoDate(dateStr) }))
    const result = await updateStageHistoryDate(projectId, historyId, dateStr)
    if (!result.error) router.refresh()
    else {
      setDateOverrides(prev => {
        const next = { ...prev }
        delete next[historyId]
        return next
      })
    }
  }, [projectId, router])

  if (rows.length === 0) {
    return <p className="text-sm text-zinc-500">No stage history yet.</p>
  }

  const rangeLabel = `${format(rangeStart, 'd MMM')} – ${format(rangeEnd, 'd MMM yyyy')}`

  return (
    <div className="w-full rounded-2xl border border-zinc-200 bg-white shadow-sm">
      {/* Header */}
      <div className="grid border-b border-zinc-200 bg-zinc-50/80" style={{ gridTemplateColumns: gridCols }}>
        <div className="flex items-center border-r border-zinc-200 px-4 py-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Stage</span>
        </div>
        <div className="relative min-h-[44px] px-2 py-2">
          <p className="absolute right-3 top-1.5 text-[11px] font-medium text-zinc-400">{rangeLabel}</p>
          <div className="relative mt-5 h-6 border-t border-zinc-200">
            {ticks.map(({ day, leftPct, isToday: todayTick }) => (
              <div
                key={day.toISOString()}
                className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
                style={{ left: `${leftPct}%` }}
              >
                <div className="h-1.5 w-px bg-zinc-300" />
                <span className={cn(
                  'mt-0.5 whitespace-nowrap text-[10px] font-medium uppercase',
                  todayTick ? 'text-violet-700' : 'text-zinc-500'
                )}>
                  {format(day, 'EEE d MMM')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rows */}
      {rows.map((row, i) => (
        <div
          key={row.key}
          className={cn(
            'grid border-b border-zinc-100 last:border-b-0',
            row.isCurrent && 'bg-violet-50/30'
          )}
          style={{ gridTemplateColumns: gridCols, minHeight: ROW_MIN_H }}
        >
          <div className="flex items-center gap-2 border-r border-zinc-100 px-3 py-2">
            <span className="w-4 shrink-0 text-xs font-medium text-zinc-400">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p
                  title={row.stage}
                  className={cn(
                    'truncate text-sm font-semibold cursor-default',
                    row.isCurrent ? 'text-violet-900' : 'text-zinc-800'
                  )}
                >
                  {row.stage}
                </p>
                {row.isComplete && <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />}
              </div>
              {row.assigneeInfo && (
                <div className="mt-0.5 flex items-center gap-1">
                  <AssigneeAvatar name={row.assigneeInfo.name} id={row.assigneeInfo.id} size="sm" theme="light" />
                  <span className="truncate text-[11px] text-zinc-500">{row.assigneeInfo.name}</span>
                </div>
              )}
            </div>
          </div>

          <div className="relative" style={{ minHeight: ROW_MIN_H }}>
            {days.map((day, di) => {
              const dow = day.getDay()
              if (dow !== 0 && dow !== 6) return null
              const left = (di / days.length) * 100
              const w = (1 / days.length) * 100
              return (
                <div
                  key={`we-${day.toISOString()}`}
                  className="pointer-events-none absolute inset-y-0 bg-zinc-100/70"
                  style={{ left: `${left}%`, width: `${w}%` }}
                />
              )
            })}

            {todayOffset !== null && (
              <div
                className="pointer-events-none absolute inset-y-0 z-[5] w-0.5 bg-violet-600"
                style={{ left: `${todayOffset}%` }}
              />
            )}

            <GanttBar
              row={row}
              canEdit={canEdit}
              rangeStart={rangeStart}
              totalDays={totalDays}
              holdPeriods={holdPeriods}
              onSaveStart={d => saveDate(row.entryId, d)}
              onSaveEnd={d => row.endEntryId && saveDate(row.endEntryId, d)}
            />
          </div>
        </div>
      ))}

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 bg-zinc-50/80 px-4 py-3 text-xs text-zinc-600">
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-5 w-6 rounded border-[3px] border-emerald-500 bg-white" /> On time
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-5 w-6 rounded border-[3px] border-red-500 bg-white" /> Late
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-5 w-6 rounded border-[3px] border-violet-500 bg-white" /> Active
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-4 w-0.5 bg-violet-600" /> Today
          </span>
          {canEdit && <span className="text-zinc-400">Drag bar to move · edges to resize</span>}
          {holdPeriods.length > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-4 w-6 rounded bg-zinc-400/30 border border-zinc-400/50" /> Hold
            </span>
          )}
        </div>
        {rows.some(r => r.isCurrent) && (
          <StageReminderButton
            projectId={projectId}
            assigneeName={rows.find(r => r.isCurrent)?.assigneeInfo?.name ?? currentAssignee ?? null}
            daysInStage={currentStageDays}
            canSend={canSendReminder}
          />
        )}
      </div>
    </div>
  )
}
