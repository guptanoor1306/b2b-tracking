'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { addMonths, addWeeks, parseISO, subMonths, subWeeks } from 'date-fns'
import {
  financeMonthKey,
  financeWeekStartKey,
  allFinanceBillingExportRows,
  type FinanceBillingReport,
  type FinanceBillingRow,
  type FinanceBillingRowKind,
} from '@/lib/finance-billing-shared'
import { saveFinanceBillingMarksForChannel } from '@/lib/actions/finance-billing'
import { PeriodToggle } from '@/components/ui/PeriodToggle'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import {
  CheckCircle2, Clapperboard, ChevronDown, ChevronLeft, ChevronRight,
  Download, ExternalLink, AlertTriangle, Save, Loader2,
} from 'lucide-react'

type Props = {
  report: FinanceBillingReport
}

const INPUT_CLS = 'rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-100'

export function FinanceBillingClient({ report }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [expandedChannels, setExpandedChannels] = useState<Record<string, boolean>>({})
  const [draftBilled, setDraftBilled] = useState<Record<string, boolean>>({})
  const [savingChannel, setSavingChannel] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const serverBilledSnapshot = useMemo(() => {
    const snap: Record<string, boolean> = {}
    for (const ch of report.channels) {
      for (const row of allFinanceBillingExportRows(ch)) {
        snap[row.projectId] = row.billedThisMonth
      }
    }
    return snap
  }, [report])

  useEffect(() => {
    setDraftBilled(serverBilledSnapshot)
    setSaveError(null)
  }, [serverBilledSnapshot])

  const toggleChannel = (channelName: string) => {
    setExpandedChannels(prev => ({
      ...prev,
      [channelName]: !prev[channelName],
    }))
  }

  const navigate = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    router.push(`/studios/finance?${params.toString()}`)
  }

  const setPeriod = (period: 'week' | 'month') => {
    const now = new Date()
    if (period === 'month') {
      navigate({ period, month: financeMonthKey(now), week: undefined })
      return
    }
    navigate({ period, week: financeWeekStartKey(now), month: undefined })
  }

  const shiftMonth = (delta: number) => {
    const current = parseISO(`${report.monthKey}-01`)
    const next = delta < 0 ? subMonths(current, 1) : addMonths(current, 1)
    navigate({ month: financeMonthKey(next) })
  }

  const shiftWeek = (delta: number) => {
    const current = parseISO(report.weekStartKey)
    const next = delta < 0 ? subWeeks(current, 1) : addWeeks(current, 1)
    navigate({ week: financeWeekStartKey(next) })
  }

  const downloadCsv = () => {
    const params = searchParams.toString()
    window.location.assign(`/api/studios/finance/csv${params ? `?${params}` : ''}`)
  }

  const setBilled = (projectId: string, billed: boolean) => {
    setDraftBilled(prev => ({ ...prev, [projectId]: billed }))
  }

  const saveChannelMarks = async (channelName: string, projectIds: string[]) => {
    if (!report.billingMarksEnabled || !projectIds.length) return
    setSavingChannel(channelName)
    setSaveError(null)
    const marks = projectIds.map(projectId => ({
      projectId,
      billed: draftBilled[projectId] ?? false,
    }))
    const result = await saveFinanceBillingMarksForChannel({
      monthKey: report.monthKey,
      marks,
    })
    setSavingChannel(null)
    if (!result.ok) {
      setSaveError(result.error)
      return
    }
    router.refresh()
  }

  const showBillingCheckboxes = report.period === 'month' && report.billingMarksEnabled

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-10">
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-600">Finance</p>
            <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Billing</h1>
            <p className="mt-1.5 text-sm text-zinc-500">
              Videos picked in production · Varsity, Zerodha Online, Cash & Copium, Zerodha Backoffice
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:items-end">
            <PeriodToggle period={report.period} onChange={setPeriod} />
            <div className="flex flex-wrap items-center gap-2">
              {report.period === 'month' ? (
                <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1">
                  <button type="button" onClick={() => shiftMonth(-1)} className="rounded-md p-2 text-zinc-500 hover:bg-white hover:text-zinc-800" aria-label="Previous month">
                    <ChevronLeft size={16} />
                  </button>
                  <input type="month" value={report.monthKey} onChange={e => e.target.value && navigate({ month: e.target.value })} className={cn(INPUT_CLS, 'min-w-[160px] border-0 bg-white py-1.5')} />
                  <button type="button" onClick={() => shiftMonth(1)} className="rounded-md p-2 text-zinc-500 hover:bg-white hover:text-zinc-800" aria-label="Next month">
                    <ChevronRight size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1">
                  <button type="button" onClick={() => shiftWeek(-1)} className="rounded-md p-2 text-zinc-500 hover:bg-white hover:text-zinc-800" aria-label="Previous week">
                    <ChevronLeft size={16} />
                  </button>
                  <input type="date" value={report.weekStartKey} onChange={e => e.target.value && navigate({ week: financeWeekStartKey(parseISO(e.target.value)) })} className={cn(INPUT_CLS, 'min-w-[150px] border-0 bg-white py-1.5')} />
                  <button type="button" onClick={() => shiftWeek(1)} className="rounded-md p-2 text-zinc-500 hover:bg-white hover:text-zinc-800" aria-label="Next week">
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
              <button type="button" onClick={downloadCsv} className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 shadow-sm hover:bg-zinc-50">
                <Download size={14} />
                Export CSV ({report.totals.exportRows})
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
            {report.periodLabel}
          </span>
          {showBillingCheckboxes && (
            <span className="text-xs text-zinc-500">
              Tick <span className="font-medium text-zinc-700">Billed</span> for what you invoiced, then save each channel.
            </span>
          )}
        </div>
      </div>

      <div className={cn('grid grid-cols-2 gap-4', report.period === 'month' ? 'lg:grid-cols-3' : 'lg:grid-cols-2')}>
        <SummaryCard label="Started this period" value={report.totals.startedThisPeriod} icon={Clapperboard} tone="violet" hint={`${report.totals.inPipeline} still in pipeline`} />
        <DeliveredSummaryCard delivered={report.totals.deliveredThisPeriod} periodLabel={report.periodLabel} byContentType={report.totals.deliveredByContentType} />
        {report.period === 'month' && (
          <SummaryCard
            label="Prior period"
            value={report.totals.carryOver}
            icon={AlertTriangle}
            tone="amber"
            hint={
              report.totals.deferredFromPriorMonth > 0 && report.priorMonthLabel
                ? `${report.totals.deferredFromPriorMonth} not billed in ${report.priorMonthLabel}`
                : undefined
            }
          />
        )}
      </div>

      {saveError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">{saveError}</div>
      )}

      {report.totals.onHold > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900 flex gap-2">
          <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-600" />
          <p>
            <span className="font-medium">{report.totals.onHold} on hold</span>
            <span className="text-xs text-amber-800/90"> — confirm before invoicing.</span>
          </p>
        </div>
      )}

      {report.channels.map(channel => (
        <ChannelSection
          key={channel.channel}
          channel={channel}
          expanded={!!expandedChannels[channel.channel]}
          onToggle={() => toggleChannel(channel.channel)}
          showBillingCheckboxes={showBillingCheckboxes}
          draftBilled={draftBilled}
          onSetBilled={setBilled}
          onSaveChannel={() => {
            const ids = allFinanceBillingExportRows(channel).map(r => r.projectId)
            return saveChannelMarks(channel.channel, ids)
          }}
          isSaving={savingChannel === channel.channel}
        />
      ))}
    </div>
  )
}

function DeliveredSummaryCard({
  delivered,
  periodLabel,
  byContentType,
}: {
  delivered: number
  periodLabel: string
  byContentType: Record<string, number>
}) {
  const entries = Object.entries(byContentType)
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm ring-1 ring-emerald-100">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 rounded-lg bg-emerald-50">
          <CheckCircle2 size={16} className="text-emerald-600" />
        </div>
        <span className="text-xs text-zinc-500 font-medium">Delivered</span>
      </div>
      <p className="text-3xl font-semibold text-zinc-900 tabular-nums">{delivered}</p>
      <p className="text-[11px] text-zinc-400 mt-1">Completed in {periodLabel}</p>
      {entries.length > 0 && (
        <div className="mt-3 pt-3 border-t border-zinc-100 space-y-1">
          {entries.map(([type, count]) => (
            <div key={type} className="flex items-center justify-between gap-2 text-[11px]">
              <span className="text-zinc-600 truncate">{type}</span>
              <span className="font-semibold tabular-nums text-emerald-700 shrink-0">{count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  tone,
  hint,
}: {
  label: string
  value: number
  icon: typeof Clapperboard
  tone: 'violet' | 'emerald' | 'amber'
  hint?: string
}) {
  const colors = tone === 'violet'
    ? { bg: 'bg-violet-50', text: 'text-violet-600', ring: 'ring-violet-100' }
    : tone === 'emerald'
      ? { bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-100' }
      : { bg: 'bg-amber-50', text: 'text-amber-600', ring: 'ring-amber-100' }

  return (
    <div className={cn('rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm ring-1', colors.ring)}>
      <div className="flex items-center gap-2 mb-2">
        <div className={cn('p-1.5 rounded-lg', colors.bg)}>
          <Icon size={16} className={colors.text} />
        </div>
        <span className="text-xs text-zinc-500 font-medium">{label}</span>
      </div>
      <p className="text-3xl font-semibold text-zinc-900 tabular-nums">{value}</p>
      {hint && <p className="text-[11px] text-zinc-400 mt-1">{hint}</p>}
    </div>
  )
}

function ChannelSection({
  channel,
  expanded,
  onToggle,
  showBillingCheckboxes,
  draftBilled,
  onSetBilled,
  onSaveChannel,
  isSaving,
}: {
  channel: FinanceBillingReport['channels'][number]
  expanded: boolean
  onToggle: () => void
  showBillingCheckboxes: boolean
  draftBilled: Record<string, boolean>
  onSetBilled: (projectId: string, billed: boolean) => void
  onSaveChannel: () => Promise<void>
  isSaving: boolean
}) {
  const allRows = showBillingCheckboxes
    ? allFinanceBillingExportRows(channel)
    : []
  const hasLegacySections = !showBillingCheckboxes && (
    channel.periodRows.length > 0
    || channel.carryOverRows.length > 0
    || channel.deliveredInPeriodRows.length > 0
  )
  const hasDetails = showBillingCheckboxes
    ? allRows.length > 0
    : hasLegacySections

  const billedCount = showBillingCheckboxes
    ? allRows.filter(r => draftBilled[r.projectId]).length
    : 0

  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-start gap-2 px-5 py-4 bg-zinc-50/50 border-b border-zinc-100">
        <button
          type="button"
          onClick={onToggle}
          disabled={!hasDetails}
          className={cn('mt-0.5 shrink-0 rounded-md p-1 text-zinc-500 transition-colors', hasDetails ? 'hover:bg-white hover:text-zinc-800' : 'opacity-30 cursor-default')}
          aria-expanded={expanded}
        >
          <ChevronDown size={18} className={cn('transition-transform', expanded && 'rotate-180')} />
        </button>
        <button type="button" onClick={hasDetails ? onToggle : undefined} className={cn('min-w-0 flex-1 text-left', hasDetails && 'cursor-pointer')}>
          <p className="text-base font-semibold text-zinc-900">{channel.channel}</p>
          <p className="text-xs text-zinc-500 mt-0.5">
            {channel.startedThisPeriod} started · {channel.deliveredThisPeriod} delivered
            {showBillingCheckboxes && allRows.length > 0 && (
              <> · {billedCount}/{allRows.length} marked billed</>
            )}
          </p>
        </button>
        <div className="flex shrink-0 items-center gap-2 pt-0.5">
          {showBillingCheckboxes && hasDetails && (
            <button
              type="button"
              disabled={isSaving}
              onClick={e => { e.stopPropagation(); void onSaveChannel() }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-60"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save
            </button>
          )}
          <Link href={`/studios/enter/${channel.slug}`} onClick={e => e.stopPropagation()} className="text-xs font-medium text-violet-600 hover:text-violet-700">
            Open →
          </Link>
        </div>
      </div>

      {expanded && hasDetails && showBillingCheckboxes && (
        <UnifiedBillingTable rows={allRows} draftBilled={draftBilled} onSetBilled={onSetBilled} />
      )}

      {expanded && hasDetails && !showBillingCheckboxes && (
        <div className="divide-y divide-zinc-100">
          {channel.periodRows.length > 0 && (
            <LegacyBillingTable title="Started this period" rows={channel.periodRows} />
          )}
          {channel.carryOverRows.length > 0 && (
            <LegacyBillingTable title="From prior billing periods" rows={channel.carryOverRows} tone="amber" />
          )}
          {channel.deliveredInPeriodRows.length > 0 && (
            <LegacyBillingTable title="Delivered this period (prior pick)" rows={channel.deliveredInPeriodRows} tone="emerald" />
          )}
        </div>
      )}
    </div>
  )
}

function rowKindLabel(kind: FinanceBillingRowKind): string {
  if (kind === 'deferred_prior_month') return 'Last month'
  if (kind === 'carry_over') return 'Earlier'
  if (kind === 'delivered_in_period') return 'Delivered'
  return 'This month'
}

function UnifiedBillingTable({
  rows,
  draftBilled,
  onSetBilled,
}: {
  rows: FinanceBillingRow[]
  draftBilled: Record<string, boolean>
  onSetBilled: (projectId: string, billed: boolean) => void
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] text-zinc-500 uppercase border-b border-zinc-100 bg-white">
            <th className="px-4 py-3 text-left font-semibold w-14">Billed</th>
            <th className="px-4 py-3 text-left font-semibold min-w-[11rem]">Video</th>
            <th className="px-3 py-3 text-left font-semibold w-20">List</th>
            <th className="px-3 py-3 text-left font-semibold w-24">IP</th>
            <th className="px-3 py-3 text-left font-semibold w-28">Type</th>
            <th className="px-3 py-3 text-left font-semibold w-28">Picked</th>
            <th className="px-3 py-3 text-left font-semibold min-w-[8rem]">Stage</th>
            <th className="px-3 w-10" />
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {rows.map(row => {
            const billed = draftBilled[row.projectId] ?? false
            const warn = row.onHold || row.kind === 'deferred_prior_month' || row.kind === 'carry_over'
            return (
              <tr key={`${row.kind}-${row.projectId}`} className={cn('group hover:bg-zinc-50/80', warn && !billed && 'bg-amber-50/30')}>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={billed}
                    onChange={e => onSetBilled(row.projectId, e.target.checked)}
                    aria-label={`Billed: ${row.title}`}
                    className="h-4 w-4 rounded border-zinc-300 text-violet-600 focus:ring-violet-200"
                  />
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-zinc-900">{row.title}</p>
                  {row.contentId && <p className="text-[11px] text-zinc-400 font-mono">{row.contentId}</p>}
                  {row.onHold && <p className="text-[10px] text-amber-700 mt-0.5">On hold</p>}
                </td>
                <td className="px-3 py-3">
                  <span className={cn(
                    'inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium',
                    row.kind === 'deferred_prior_month' ? 'bg-sky-100 text-sky-800' :
                    row.kind === 'carry_over' ? 'bg-amber-100 text-amber-800' :
                    row.isDelivered ? 'bg-emerald-100 text-emerald-800' :
                    'bg-zinc-100 text-zinc-700',
                  )}>
                    {rowKindLabel(row.kind)}
                  </span>
                </td>
                <td className="px-3 py-3 text-zinc-600 whitespace-nowrap">{row.ip}</td>
                <td className="px-3 py-3 text-zinc-600 whitespace-nowrap">{row.contentType || '—'}</td>
                <td className="px-3 py-3 text-zinc-700 tabular-nums whitespace-nowrap">{formatDate(row.pickedAt, 'dd MMM yyyy')}</td>
                <td className="px-3 py-3 text-zinc-600">{row.currentStage}</td>
                <td className="px-3 py-3">
                  <Link href={`/projects/${row.projectId}`} className="inline-flex w-8 h-8 items-center justify-center rounded-lg text-zinc-400 hover:text-violet-600 hover:bg-violet-50 opacity-0 group-hover:opacity-100">
                    <ExternalLink size={15} />
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function LegacyBillingTable({
  title,
  rows,
  tone,
}: {
  title: string
  rows: FinanceBillingRow[]
  tone?: 'amber' | 'emerald'
}) {
  return (
    <div className={cn(tone === 'amber' && 'bg-amber-50/20', tone === 'emerald' && 'bg-emerald-50/15')}>
      <div className="px-5 py-2 border-b border-zinc-100 text-xs font-semibold text-zinc-700">{title}</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] text-zinc-500 uppercase border-b border-zinc-100">
              <th className="px-5 py-2 text-left">Video</th>
              <th className="px-3 py-2 text-left">IP</th>
              <th className="px-3 py-2 text-left">Picked</th>
              <th className="px-3 py-2 text-left">Stage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.map(row => (
              <tr key={`${row.kind}-${row.projectId}`} className="hover:bg-violet-50/30">
                <td className="px-5 py-3 font-medium text-zinc-900">{row.title}</td>
                <td className="px-3 py-3 text-zinc-600">{row.ip}</td>
                <td className="px-3 py-3 tabular-nums">{formatDate(row.pickedAt, 'dd MMM yyyy')}</td>
                <td className="px-3 py-3 text-zinc-600">{row.currentStage}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
