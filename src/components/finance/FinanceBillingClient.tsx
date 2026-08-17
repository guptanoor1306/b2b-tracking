'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { addMonths, addWeeks, format, parseISO, subMonths, subWeeks } from 'date-fns'
import {
  exportFinanceBillingCsv,
  financeMonthKey,
  financeWeekStartKey,
  type FinanceBillingReport,
  type FinanceBillingRow,
} from '@/lib/finance-billing-shared'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import {
  CheckCircle2, Clapperboard, ChevronLeft, ChevronRight,
  Download, ExternalLink, AlertTriangle, PauseCircle,
} from 'lucide-react'

type Props = {
  report: FinanceBillingReport
}

const INPUT_CLS = 'rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-100'

export function FinanceBillingClient({ report }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

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
      navigate({
        period,
        month: financeMonthKey(now),
        week: undefined,
      })
      return
    }
    navigate({
      period,
      week: financeWeekStartKey(now),
      month: undefined,
    })
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

  const handleWeekDatePick = (value: string) => {
    if (!value) return
    navigate({ week: financeWeekStartKey(parseISO(value)) })
  }

  const handleMonthPick = (value: string) => {
    if (!value) return
    navigate({ month: value })
  }

  const downloadCsv = () => {
    const csv = exportFinanceBillingCsv(report)
    const slug = report.period === 'month' ? report.monthKey : `week-${report.weekStartKey}`
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `billing-${slug}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-10">
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-600">Finance</p>
            <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Billing</h1>
            <p className="mt-1.5 text-sm text-zinc-500">
              Videos picked in production · Varsity & Zerodha Online
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:items-end">
            <div className="flex rounded-lg border border-zinc-200 overflow-hidden bg-zinc-50 p-0.5">
              {(['week', 'month'] as const).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={cn(
                    'rounded-md px-4 py-1.5 text-xs font-medium transition-colors',
                    report.period === p
                      ? 'bg-white text-zinc-900 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-700',
                  )}
                >
                  {p === 'week' ? 'Weekly' : 'Monthly'}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {report.period === 'month' ? (
                <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1">
                  <button
                    type="button"
                    onClick={() => shiftMonth(-1)}
                    className="rounded-md p-2 text-zinc-500 hover:bg-white hover:text-zinc-800"
                    aria-label="Previous month"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <input
                    type="month"
                    value={report.monthKey}
                    onChange={e => handleMonthPick(e.target.value)}
                    className={cn(INPUT_CLS, 'min-w-[160px] border-0 bg-white py-1.5')}
                  />
                  <button
                    type="button"
                    onClick={() => shiftMonth(1)}
                    className="rounded-md p-2 text-zinc-500 hover:bg-white hover:text-zinc-800"
                    aria-label="Next month"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1">
                  <button
                    type="button"
                    onClick={() => shiftWeek(-1)}
                    className="rounded-md p-2 text-zinc-500 hover:bg-white hover:text-zinc-800"
                    aria-label="Previous week"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <input
                    type="date"
                    value={report.weekStartKey}
                    onChange={e => handleWeekDatePick(e.target.value)}
                    className={cn(INPUT_CLS, 'min-w-[150px] border-0 bg-white py-1.5')}
                    title="Pick any day — the Mon–Sun week containing it is used"
                  />
                  <button
                    type="button"
                    onClick={() => shiftWeek(1)}
                    className="rounded-md p-2 text-zinc-500 hover:bg-white hover:text-zinc-800"
                    aria-label="Next week"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={downloadCsv}
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
              >
                <Download size={14} />
                Export CSV
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 inline-flex rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
          {report.periodLabel}
        </div>
      </div>

      {(report.totals.onHold > 0 || report.totals.carryOver > 0) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
          <div className="flex gap-2">
            <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-600" />
            <div className="space-y-1">
              <p className="font-medium">Review before invoicing</p>
              {report.totals.onHold > 0 && (
                <p className="text-xs text-amber-800/90">
                  {report.totals.onHold} video{report.totals.onHold !== 1 ? 's' : ''} on hold — confirm whether to include in this bill.
                </p>
              )}
              {report.totals.carryOver > 0 && (
                <p className="text-xs text-amber-800/90">
                  {report.totals.carryOver} video{report.totals.carryOver !== 1 ? 's' : ''} picked in a prior {report.period === 'month' ? 'month' : 'week'} — already billed then; do not bill again.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard
          label="Picked in production"
          value={report.totals.picked}
          icon={Clapperboard}
          tone="violet"
        />
        <SummaryCard
          label="Delivered"
          value={report.totals.delivered}
          icon={CheckCircle2}
          tone="emerald"
          hint={report.totals.picked > 0
            ? `${Math.round((report.totals.delivered / report.totals.picked) * 100)}% of picked`
            : undefined}
        />
        <SummaryCard
          label="On hold"
          value={report.totals.onHold}
          icon={PauseCircle}
          tone="amber"
          hint={report.totals.onHold > 0 ? 'Needs finance review' : undefined}
        />
        <SummaryCard
          label="Prior period"
          value={report.totals.carryOver}
          icon={AlertTriangle}
          tone="amber"
          hint={report.totals.carryOver > 0 ? 'Do not bill again' : undefined}
        />
      </div>

      {report.channels.map(channel => (
        <ChannelSection key={channel.channel} channel={channel} />
      ))}
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
}: {
  channel: FinanceBillingReport['channels'][number]
}) {
  const hasPeriodRows = channel.periodRows.length > 0
  const hasCarryOver = channel.carryOverRows.length > 0

  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-100 flex flex-wrap items-center justify-between gap-3 bg-zinc-50/50">
        <div>
          <p className="text-base font-semibold text-zinc-900">{channel.channel}</p>
          <p className="text-xs text-zinc-500 mt-0.5">
            {channel.picked} picked this period · {channel.delivered} delivered
            {channel.onHold > 0 ? ` · ${channel.onHold} on hold` : ''}
            {channel.carryOver > 0 ? ` · ${channel.carryOver} from prior period` : ''}
          </p>
        </div>
        <Link
          href={`/studios/enter/${channel.slug}`}
          className="text-xs font-medium text-violet-600 hover:text-violet-700"
        >
          Open channel →
        </Link>
      </div>

      {!hasPeriodRows && !hasCarryOver ? (
        <p className="px-5 py-10 text-sm text-zinc-400 italic text-center">
          No videos picked in production for this period.
        </p>
      ) : (
        <div className="divide-y divide-zinc-100">
          {hasPeriodRows && (
            <BillingTable
              title="Picked this period"
              subtitle="Billable for the selected period"
              rows={channel.periodRows}
            />
          )}
          {hasCarryOver && (
            <BillingTable
              title="From prior billing periods"
              subtitle="Already picked earlier — shown for review only, do not bill again"
              rows={channel.carryOverRows}
              variant="carry_over"
            />
          )}
        </div>
      )}
    </div>
  )
}

function BillingTable({
  title,
  subtitle,
  rows,
  variant = 'current',
}: {
  title: string
  subtitle: string
  rows: FinanceBillingRow[]
  variant?: 'current' | 'carry_over'
}) {
  return (
    <div className={cn(variant === 'carry_over' && 'bg-amber-50/20')}>
      <div className="px-5 py-3 border-b border-zinc-100">
        <p className="text-xs font-semibold text-zinc-800">{title}</p>
        <p className="text-[11px] text-zinc-500 mt-0.5">{subtitle}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] text-zinc-500 uppercase border-b border-zinc-100 bg-white">
              <th className="px-5 py-3 text-left font-semibold min-w-[12rem]">Video</th>
              <th className="px-4 py-3 text-left font-semibold w-28">Video type</th>
              <th className="px-4 py-3 text-left font-semibold w-36">Picked</th>
              <th className="px-4 py-3 text-left font-semibold min-w-[10rem]">Current stage</th>
              <th className="px-4 py-3 text-left font-semibold min-w-[14rem]">Finance notes</th>
              <th className="px-4 py-3 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.map(row => (
              <tr
                key={`${row.kind}-${row.projectId}`}
                className={cn(
                  'group transition-colors',
                  row.financeNotes.length > 0
                    ? 'bg-amber-50/40 hover:bg-amber-50/70'
                    : 'hover:bg-violet-50/30',
                )}
              >
                <td className="px-5 py-3.5">
                  <p className="text-sm font-medium text-zinc-900">{row.title}</p>
                  {row.contentId && (
                    <p className="text-[11px] text-zinc-400 mt-0.5 font-mono">{row.contentId}</p>
                  )}
                </td>
                <td className="px-4 py-3.5 text-zinc-600 whitespace-nowrap">
                  {row.contentType || '—'}
                </td>
                <td className="px-4 py-3.5 text-zinc-700 tabular-nums whitespace-nowrap">
                  {formatDate(row.pickedAt, 'dd MMM yyyy')}
                </td>
                <td className="px-4 py-3.5 text-zinc-600">{row.currentStage}</td>
                <td className="px-4 py-3.5">
                  <FinanceNotes notes={row.financeNotes} isDelivered={row.isDelivered} />
                </td>
                <td className="px-4 py-3.5">
                  <Link
                    href={`/projects/${row.projectId}`}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-zinc-400 hover:text-violet-600 hover:bg-violet-50 opacity-0 group-hover:opacity-100 transition-all"
                    title="Open project"
                  >
                    <ExternalLink size={15} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function FinanceNotes({ notes, isDelivered }: { notes: string[]; isDelivered: boolean }) {
  if (notes.length === 0 && !isDelivered) {
    return (
      <span className="inline-flex rounded-full bg-violet-50 px-2.5 py-0.5 text-[10px] font-semibold text-violet-700 ring-1 ring-violet-100">
        In pipeline
      </span>
    )
  }

  if (notes.length === 0 && isDelivered) {
    return (
      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
        Delivered
      </span>
    )
  }

  return (
    <ul className="space-y-1.5">
      {notes.map(note => (
        <li
          key={note}
          className="flex gap-1.5 text-[11px] leading-snug text-amber-900"
        >
          <AlertTriangle size={12} className="shrink-0 mt-0.5 text-amber-600" />
          <span>{note}</span>
        </li>
      ))}
      {isDelivered && (
        <li className="text-[10px] text-emerald-700 font-medium">Delivered</li>
      )}
    </ul>
  )
}
