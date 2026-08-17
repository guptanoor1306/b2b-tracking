import {
  parseISO,
  isValid,
  startOfWeek,
  endOfWeek,
  format,
  startOfMonth,
} from 'date-fns'

export const FINANCE_BILLING_CHANNELS = ['Varsity', 'Zerodha Online'] as const

export type FinanceBillingPeriod = 'week' | 'month'

export type FinanceBillingRowKind = 'current_period' | 'carry_over'

export type FinanceBillingRow = {
  projectId: string
  contentId: string
  title: string
  channel: string
  contentType: string
  pickedAt: string
  currentStage: string
  isDelivered: boolean
  kind: FinanceBillingRowKind
  onHold: boolean
  /** Period label when this video was first picked / billed (prior period for carry-over). */
  billedInPeriodLabel: string | null
  financeNotes: string[]
}

export type FinanceChannelBilling = {
  channel: string
  slug: string
  picked: number
  delivered: number
  onHold: number
  carryOver: number
  periodRows: FinanceBillingRow[]
  carryOverRows: FinanceBillingRow[]
}

export type FinanceBillingReport = {
  period: FinanceBillingPeriod
  periodLabel: string
  monthKey: string
  weekStartKey: string
  totals: {
    picked: number
    delivered: number
    onHold: number
    carryOver: number
  }
  channels: FinanceChannelBilling[]
}

export type FinanceBillingParams = {
  period: FinanceBillingPeriod
  month?: string
  week?: string
}

export function billingPeriodLabelForDate(
  period: FinanceBillingPeriod,
  date: Date,
): string {
  if (period === 'week') {
    const start = startOfWeek(date, { weekStartsOn: 1 })
    const end = endOfWeek(date, { weekStartsOn: 1 })
    return `${format(start, 'dd MMM')} – ${format(end, 'dd MMM yyyy')}`
  }
  return format(date, 'MMMM yyyy')
}

export function buildFinanceNotes(
  kind: FinanceBillingRowKind,
  onHold: boolean,
  billedInPeriodLabel: string | null,
): string[] {
  const notes: string[] = []
  if (kind === 'carry_over' && billedInPeriodLabel) {
    notes.push(`Already included in ${billedInPeriodLabel} billing — do not bill again for this pick`)
  }
  if (onHold) {
    notes.push('Currently on hold — verify before invoicing')
  }
  return notes
}

export function parseFinanceBillingAnchor(params: FinanceBillingParams, now = new Date()): Date {
  if (params.period === 'month' && params.month && /^\d{4}-\d{2}$/.test(params.month)) {
    const [year, month] = params.month.split('-').map(Number)
    return new Date(year, month - 1, 1)
  }
  if (params.period === 'week' && params.week && /^\d{4}-\d{2}-\d{2}$/.test(params.week)) {
    const d = parseISO(params.week)
    if (isValid(d)) return startOfWeek(d, { weekStartsOn: 1 })
  }
  if (params.period === 'week') {
    return startOfWeek(now, { weekStartsOn: 1 })
  }
  return startOfMonth(now)
}

export function financeMonthKey(anchor: Date): string {
  return format(anchor, 'yyyy-MM')
}

export function financeWeekStartKey(anchor: Date): string {
  return format(startOfWeek(anchor, { weekStartsOn: 1 }), 'yyyy-MM-dd')
}

function allChannelRows(channel: FinanceChannelBilling): FinanceBillingRow[] {
  return [...channel.periodRows, ...channel.carryOverRows]
}

export function exportFinanceBillingCsv(report: FinanceBillingReport): string {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`
  const lines = [
    [
      'Channel',
      'Content ID',
      'Title',
      'Video type',
      'Picked date',
      'Current stage',
      'Status',
      'Billing category',
      'Finance notes',
    ].join(','),
  ]

  for (const channel of report.channels) {
    for (const row of allChannelRows(channel)) {
      const picked = parseISO(row.pickedAt.length > 10 ? row.pickedAt : `${row.pickedAt}T12:00:00`)
      lines.push([
        escape(channel.channel),
        escape(row.contentId ?? ''),
        escape(row.title),
        escape(row.contentType ?? ''),
        escape(isValid(picked) ? format(picked, 'yyyy-MM-dd') : row.pickedAt),
        escape(row.currentStage),
        escape(row.isDelivered ? 'Delivered' : 'In pipeline'),
        escape(row.kind === 'carry_over' ? 'Prior period — review' : 'This period'),
        escape(row.financeNotes.join(' · ')),
      ].join(','))
    }
  }

  return lines.join('\n')
}
