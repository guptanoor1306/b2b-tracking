import {
  parseISO,
  isValid,
  startOfWeek,
  format,
  startOfMonth,
} from 'date-fns'

export const FINANCE_BILLING_CHANNELS = ['Varsity', 'Zerodha Online'] as const

export type FinanceBillingPeriod = 'week' | 'month'

export type FinanceBillingRow = {
  projectId: string
  contentId: string
  title: string
  channel: string
  contentType: string
  pickedAt: string
  currentStage: string
  isDelivered: boolean
}

export type FinanceChannelBilling = {
  channel: string
  slug: string
  picked: number
  delivered: number
  rows: FinanceBillingRow[]
}

export type FinanceBillingReport = {
  period: FinanceBillingPeriod
  periodLabel: string
  monthKey: string
  weekStartKey: string
  totals: { picked: number; delivered: number }
  channels: FinanceChannelBilling[]
}

export type FinanceBillingParams = {
  period: FinanceBillingPeriod
  month?: string
  week?: string
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

export function exportFinanceBillingCsv(report: FinanceBillingReport): string {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`
  const lines = [
    ['Channel', 'Content ID', 'Title', 'Video type', 'Picked date', 'Current stage', 'Status'].join(','),
  ]

  for (const channel of report.channels) {
    for (const row of channel.rows) {
      const picked = parseISO(row.pickedAt.length > 10 ? row.pickedAt : `${row.pickedAt}T12:00:00`)
      lines.push([
        escape(channel.channel),
        escape(row.contentId ?? ''),
        escape(row.title),
        escape(row.contentType ?? ''),
        escape(isValid(picked) ? format(picked, 'yyyy-MM-dd') : row.pickedAt),
        escape(row.currentStage),
        escape(row.isDelivered ? 'Delivered' : 'In pipeline'),
      ].join(','))
    }
  }

  return lines.join('\n')
}
