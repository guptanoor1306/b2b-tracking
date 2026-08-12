import {
  subDays,
  format,
  parseISO,
  isValid,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  addMonths,
} from 'date-fns'
import { Project } from '@/lib/types'
import { FINAL_STAGE } from '@/lib/constants'
import {
  ZERODHA_REQUEST_RECEIVED,
  ZERODHA_READY_TO_PRODUCE,
  isZerodhaIntakeStage,
  isDeclinedRequest,
} from '@/lib/zerodha-sla'

export type RollingTimeframeKey = '7d' | '15d' | '30d' | '90d'

export const REPORT_TIMEFRAMES: { key: RollingTimeframeKey; label: string; days: number }[] = [
  { key: '7d', label: 'Last 7 days', days: 7 },
  { key: '15d', label: 'Last 15 days', days: 15 },
  { key: '30d', label: 'Last 30 days', days: 30 },
  { key: '90d', label: 'Last 3 months', days: 90 },
]

/** Tool adoption — monthly reports available from this month onward. */
export const REPORT_TRACKING_START = new Date(2026, 6, 1)

export type ReportPeriod =
  | { kind: 'rolling'; key: RollingTimeframeKey }
  | { kind: 'month'; key: string }

export function encodeReportPeriod(period: ReportPeriod): string {
  return period.kind === 'rolling' ? period.key : `month:${period.key}`
}

export function decodeReportPeriod(value: string): ReportPeriod | null {
  if (value.startsWith('month:')) {
    const key = value.slice(6)
    if (!/^\d{4}-\d{2}$/.test(key)) return null
    return { kind: 'month', key }
  }
  if (REPORT_TIMEFRAMES.some(t => t.key === value)) {
    return { kind: 'rolling', key: value as RollingTimeframeKey }
  }
  return null
}

export function getReportMonthOptions(anchor = new Date()) {
  const options: { key: string; label: string }[] = []
  let cursor = startOfMonth(REPORT_TRACKING_START)
  const lastMonth = startOfMonth(anchor)

  while (cursor <= lastMonth) {
    options.push({
      key: format(cursor, 'yyyy-MM'),
      label: format(cursor, 'MMMM yyyy'),
    })
    cursor = addMonths(cursor, 1)
  }

  return options.reverse()
}

export type ChannelReportSummary = {
  delivered: number
  requestsReceived: number
  requestsDeclined: number
  toBePicked: number
  inPipeline: number
  onHold: number
  pipelineAtRisk: number
  pipelineDelayed: number
  deliveryRate: number | null
  approvalRate: number | null
  approvedRequests: number
  declinedRequests: number
  relevantVideos: number
}

export type IpReportRow = {
  ip: string
  delivered: number
  inPipeline: number
  onHold: number
  atRisk: number
  delayed: number
  total: number
}

export type ChannelReport = {
  periodKey: string
  timeframeLabel: string
  periodStart: string
  periodEnd: string
  channelName: string
  summary: ChannelReportSummary
  ipBreakdown: IpReportRow[]
  generatedAt: string
}

function pct(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null
  return Math.round((numerator / denominator) * 100)
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const d = parseISO(value.length > 10 ? value : `${value}T12:00:00`)
  return isValid(d) ? d : null
}

function inRange(value: string | null | undefined, start: Date, end: Date): boolean {
  const d = parseDate(value)
  if (!d) return false
  return d >= start && d <= end
}

function deliveredBeforePeriod(p: Project, start: Date): boolean {
  if (!p.delivered_date) return false
  const d = parseDate(p.delivered_date)
  return !!d && d < start
}

/** Project had activity touching the period (received, picked up, delivered, hold, updated). */
export function projectActiveInPeriod(p: Project, start: Date, end: Date): boolean {
  return (
    inRange(p.received_date, start, end)
    || inRange(p.picked_up_date, start, end)
    || inRange(p.delivered_date, start, end)
    || inRange(p.on_hold_since, start, end)
    || inRange(p.updated_at, start, end)
  )
}

export function isPrePipelineStage(p: Project): boolean {
  return isZerodhaIntakeStage(p.current_stage)
}

export function isRequestsReceived(p: Project): boolean {
  return p.current_stage === ZERODHA_REQUEST_RECEIVED && !isDeclinedRequest(p)
}

export function isToBePicked(p: Project): boolean {
  return p.current_stage === ZERODHA_READY_TO_PRODUCE
}

export function isProductionPipeline(p: Project): boolean {
  return (
    p.current_stage !== FINAL_STAGE
    && p.status_health !== 'On hold'
    && !isPrePipelineStage(p)
  )
}

/** Production pipeline activity during the period (excludes intake-only and pre-period deliveries). */
export function wasInProductionPipelineDuringPeriod(p: Project, start: Date, end: Date): boolean {
  if (isPrePipelineStage(p)) return false
  if (deliveredBeforePeriod(p, start)) return false
  return projectActiveInPeriod(p, start, end)
}

/**
 * A video is included in the report if any of:
 * 1. Request raised (`received_date`) in the period
 * 2. Delivered in the period
 * 3. In production pipeline with activity during the period
 * 4. On hold with hold or activity during the period
 */
export function isReportRelevantVideo(p: Project, start: Date, end: Date): boolean {
  if (inRange(p.received_date, start, end)) return true
  if (inRange(p.delivered_date, start, end)) return true
  if (wasInProductionPipelineDuringPeriod(p, start, end)) return true
  if (
    p.status_health === 'On hold'
    && !deliveredBeforePeriod(p, start)
    && (inRange(p.on_hold_since, start, end) || projectActiveInPeriod(p, start, end))
  ) return true
  return false
}

export function reportPeriodRange(period: ReportPeriod, anchor = new Date()) {
  if (period.kind === 'rolling') {
    const config = REPORT_TIMEFRAMES.find(t => t.key === period.key)!
    const end = endOfDay(anchor)
    const start = startOfDay(subDays(anchor, config.days - 1))
    return { start, end, label: config.label }
  }

  const [year, month] = period.key.split('-').map(Number)
  const start = startOfMonth(new Date(year, month - 1))
  const monthEnd = endOfMonth(start)
  const end = monthEnd > endOfDay(anchor) ? endOfDay(anchor) : monthEnd
  return { start, end, label: format(start, 'MMMM yyyy') }
}

function buildIpRow(ip: string, videos: Project[], start: Date, end: Date): IpReportRow {
  const pipeline = videos.filter(isProductionPipeline)
  return {
    ip,
    delivered: videos.filter(p =>
      p.current_stage === FINAL_STAGE && inRange(p.delivered_date, start, end),
    ).length,
    inPipeline: pipeline.length,
    onHold: videos.filter(p => p.status_health === 'On hold').length,
    atRisk: pipeline.filter(p => p.status_health === 'At risk').length,
    delayed: pipeline.filter(p => p.status_health === 'Delayed').length,
    total: videos.length,
  }
}

export function buildChannelReport(input: {
  projects: Project[]
  period: ReportPeriod
  channelName: string
  anchor?: Date
}): ChannelReport {
  const { start, end, label } = reportPeriodRange(input.period, input.anchor)

  const relevantVideos = input.projects.filter(p => isReportRelevantVideo(p, start, end))

  const receivedInPeriod = relevantVideos.filter(p => inRange(p.received_date, start, end))

  const deliveredInPeriod = relevantVideos.filter(p =>
    inRange(p.delivered_date, start, end),
  )

  const requestsReceived = receivedInPeriod.filter(p =>
    isRequestsReceived(p) || p.request_status === 'resubmitted',
  )
  const requestsDeclined = receivedInPeriod.filter(isDeclinedRequest)
  const toBePicked = relevantVideos.filter(p =>
    isToBePicked(p)
    && (inRange(p.received_date, start, end) || inRange(p.picked_up_date, start, end)),
  )

  const inPipeline = relevantVideos.filter(p =>
    isProductionPipeline(p) && wasInProductionPipelineDuringPeriod(p, start, end),
  )
  const pipelineAtRisk = inPipeline.filter(p => p.status_health === 'At risk').length
  const pipelineDelayed = inPipeline.filter(p => p.status_health === 'Delayed').length

  const onHold = relevantVideos.filter(p =>
    p.status_health === 'On hold'
    && !deliveredBeforePeriod(p, start)
    && (inRange(p.on_hold_since, start, end) || projectActiveInPeriod(p, start, end)),
  )

  const productionRelevant = relevantVideos.filter(p =>
    !isPrePipelineStage(p) && !deliveredBeforePeriod(p, start),
  )

  const approved = receivedInPeriod.filter(p => p.request_status === 'approved').length
  const declinedDecisions = receivedInPeriod.filter(p => p.request_status === 'declined').length

  const summary: ChannelReportSummary = {
    delivered: deliveredInPeriod.length,
    requestsReceived: requestsReceived.length,
    requestsDeclined: requestsDeclined.length,
    toBePicked: toBePicked.length,
    inPipeline: inPipeline.length,
    onHold: onHold.length,
    pipelineAtRisk,
    pipelineDelayed,
    deliveryRate: pct(deliveredInPeriod.length, productionRelevant.length),
    approvalRate: pct(approved, approved + declinedDecisions),
    approvedRequests: approved,
    declinedRequests: declinedDecisions,
    relevantVideos: relevantVideos.length,
  }

  const productionVideos = relevantVideos.filter(p =>
    !isPrePipelineStage(p) && !deliveredBeforePeriod(p, start),
  )
  const ips = [...new Set(productionVideos.map(p => p.ip?.trim() || ''))].sort()

  const ipBreakdown: IpReportRow[] = ips.map(ip =>
    buildIpRow(ip, productionVideos.filter(p => (p.ip?.trim() || '') === ip), start, end),
  ).filter(row => row.total > 0)

  return {
    periodKey: encodeReportPeriod(input.period),
    timeframeLabel: label,
    periodStart: format(start, 'dd MMM yyyy'),
    periodEnd: format(end, 'dd MMM yyyy'),
    channelName: input.channelName,
    summary,
    ipBreakdown,
    generatedAt: new Date().toISOString(),
  }
}

export function formatReportRate(value: number | null): string {
  if (value == null) return '—'
  return `${value}%`
}

export const REPORT_COUNTING_HELP = [
  'Requests received / declined: request raised (received date) in the selected period.',
  'New projects to pick: at Ready to Produce with received or picked-up date in the period.',
  'In pipeline: past Ready to Produce, active in production during the period (not delivered before it started).',
  'Delivered: delivery date falls in the period.',
  'On hold: on hold during the period and not already delivered before the period.',
] as const
