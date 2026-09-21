import {
  parseISO,
  isValid,
  startOfWeek,
  endOfWeek,
  format,
  startOfMonth,
  subMonths,
} from 'date-fns'

export const FINANCE_BILLING_CHANNELS = [
  'Varsity',
  'Zerodha Online',
  'Cash & Copium',
  'Zerodha Backoffice',
] as const

/** Legacy DB name — still fetched for billing rows. */
export const FINANCE_BILLING_LEGACY_CHANNELS = ['Beyond Zerodha'] as const

export type FinanceBillingPeriod = 'week' | 'month'

export type FinanceBillingRowKind =
  | 'current_period'
  | 'carry_over'
  | 'delivered_in_period'
  | 'deferred_prior_month'

export type FinanceBillingRow = {
  projectId: string
  contentId: string
  title: string
  channel: string
  ip: string
  videoLanguage: string | null
  contentType: string
  pickedAt: string
  currentStage: string
  isDelivered: boolean
  kind: FinanceBillingRowKind
  onHold: boolean
  /** Period label when this video was first picked / billed (prior period for carry-over). */
  billedInPeriodLabel: string | null
  /** Super-admin mark: invoiced in the selected calendar month. */
  billedThisMonth: boolean
  financeNotes: string[]
}

export type FinanceChannelBilling = {
  channel: string
  slug: string
  /** Videos that entered production (billing) in this period. */
  startedThisPeriod: number
  /** Started this period and not yet delivered. */
  inPipeline: number
  /** Videos completed (delivered) in this period — includes earlier picks. */
  deliveredThisPeriod: number
  deliveredByContentType: Record<string, number>
  onHold: number
  carryOver: number
  periodRows: FinanceBillingRow[]
  carryOverRows: FinanceBillingRow[]
  /** Delivered in selected period but production pick was in an earlier period. */
  deliveredInPeriodRows: FinanceBillingRow[]
  /** On prior month's billing list but not marked billed there — carry forward. */
  deferredBillingRows: FinanceBillingRow[]
}

export type FinanceBillingReport = {
  period: FinanceBillingPeriod
  periodLabel: string
  monthKey: string
  weekStartKey: string
  totals: {
    startedThisPeriod: number
    inPipeline: number
    deliveredThisPeriod: number
    deliveredByContentType: Record<string, number>
    onHold: number
    carryOver: number
    /** Marked billed for the selected month (monthly view only). */
    markedBilledThisMonth: number
    /** On this month's list but not marked billed yet. */
    unmarkedBilledThisMonth: number
    /** Carried from previous month — not marked billed there. */
    deferredFromPriorMonth: number
    /** Rows in CSV (= all expanded table rows combined). */
    exportRows: number
  }
  /** Previous calendar month key when period is month; used for deferred billing. */
  priorMonthKey: string | null
  priorMonthLabel: string | null
  /** Super Admin monthly billing marks enabled. */
  billingMarksEnabled: boolean
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
  billedThisMonth: boolean,
  periodLabel: string | null,
  deferredFromMonthLabel: string | null,
): string[] {
  const notes: string[] = []
  if (kind === 'deferred_prior_month' && deferredFromMonthLabel) {
    notes.push(`Not invoiced in ${deferredFromMonthLabel} — include in this month's billing if applicable`)
  }
  if (kind === 'carry_over' && billedInPeriodLabel) {
    notes.push(`Picked in ${billedInPeriodLabel} — may already have been billed then; confirm before invoicing again`)
  }
  if (kind === 'delivered_in_period' && billedInPeriodLabel) {
    notes.push(`Delivered in this period; production pick was in ${billedInPeriodLabel}`)
  }
  if (billedThisMonth && periodLabel) {
    notes.push(`Marked billed for ${periodLabel}`)
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

export function previousFinanceMonthKey(monthKey: string): string | null {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return null
  const anchor = parseISO(`${monthKey}-01`)
  if (!isValid(anchor)) return null
  return financeMonthKey(subMonths(anchor, 1))
}

export function financeMonthLabel(monthKey: string): string {
  const anchor = parseISO(`${monthKey}-01`)
  return isValid(anchor) ? format(anchor, 'MMMM yyyy') : monthKey
}

export function financeWeekStartKey(anchor: Date): string {
  return format(startOfWeek(anchor, { weekStartsOn: 1 }), 'yyyy-MM-dd')
}

export function tallyDeliveredByContentType(rows: FinanceBillingRow[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const row of rows) {
    if (!row.isDelivered) continue
    const key = row.contentType?.trim() || 'Unspecified'
    counts[key] = (counts[key] ?? 0) + 1
  }
  return Object.fromEntries(
    Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)),
  )
}

export function tallyDeliveredByContentTypeFromProjects(
  projects: { content_type: string | null | undefined }[],
): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const p of projects) {
    const key = p.content_type?.trim() || 'Unspecified'
    counts[key] = (counts[key] ?? 0) + 1
  }
  return Object.fromEntries(
    Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)),
  )
}

export function mergeContentTypeCounts(
  ...maps: Record<string, number>[]
): Record<string, number> {
  const merged: Record<string, number> = {}
  for (const map of maps) {
    for (const [key, n] of Object.entries(map)) {
      merged[key] = (merged[key] ?? 0) + n
    }
  }
  return Object.fromEntries(Object.entries(merged).sort(([a], [b]) => a.localeCompare(b)))
}

function billingCategoryLabel(kind: FinanceBillingRowKind): string {
  if (kind === 'carry_over') return 'Prior period — review'
  if (kind === 'delivered_in_period') return 'Delivered this period (prior pick)'
  if (kind === 'deferred_prior_month') return 'Deferred from prior month'
  return 'This period'
}

/** All billing table rows for export (same rows as expanded UI sections). */
export function allFinanceBillingExportRows(channel: FinanceChannelBilling): FinanceBillingRow[] {
  return [
    ...(channel.deferredBillingRows ?? []),
    ...channel.periodRows,
    ...channel.carryOverRows,
    ...(channel.deliveredInPeriodRows ?? []),
  ]
}

export function allFinanceBillingProjectIds(report: FinanceBillingReport): string[] {
  const ids = new Set<string>()
  for (const ch of report.channels) {
    for (const row of allFinanceBillingExportRows(ch)) {
      ids.add(row.projectId)
    }
  }
  return [...ids]
}

export function countFinanceExportRows(report: FinanceBillingReport): number {
  return report.channels.reduce(
    (sum, ch) => sum + allFinanceBillingExportRows(ch).length,
    0,
  )
}

function sanitizeCsvField(value: string): string {
  return value.replace(/\r\n/g, ' ').replace(/[\r\n]/g, ' ').replace(/"/g, '""')
}

function allChannelRows(channel: FinanceChannelBilling): FinanceBillingRow[] {
  return allFinanceBillingExportRows(channel)
}

export function exportFinanceBillingCsv(report: FinanceBillingReport): string {
  const escape = (value: string) => `"${sanitizeCsvField(value)}"`
  const lines = [
    [
      'Channel',
      'Content ID',
      'Title',
      'IP',
      'Language',
      'Video type',
      'Picked date',
      'Current stage',
      'Status',
      'Billing category',
      'Billed this month',
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
        escape(row.ip ?? ''),
        escape(row.videoLanguage ?? ''),
        escape(row.contentType ?? ''),
        escape(isValid(picked) ? format(picked, 'yyyy-MM-dd') : row.pickedAt),
        escape(row.currentStage),
        escape(row.isDelivered ? 'Delivered' : 'In pipeline'),
        escape(billingCategoryLabel(row.kind)),
        escape(row.billedThisMonth ? 'Yes' : 'No'),
        escape(row.financeNotes.join(' · ')),
      ].join(','))
    }
  }

  return `\ufeff${lines.join('\n')}`
}
