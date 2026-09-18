import {
  parseISO,
  isValid,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
  format,
} from 'date-fns'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { STAGES_INTERNAL } from '@/lib/constants'
import {
  isZerodhaChannelDbName,
  normalizeZerodhaBoardStage,
  STAGES_ZERODHA_INTERNAL,
  ZERODHA_READY_TO_PRODUCE,
  ZERODHA_REQUEST_RECEIVED,
} from '@/lib/zerodha-sla'
import {
  STAGES_CASH_COPIUM_INTERNAL,
  normalizeCashCopiumBoardStage,
  CC_READY_TO_PRODUCE,
  CC_REQUEST_RECEIVED,
} from '@/lib/cash-and-copium-sla'
import { isCashAndCopiumChannelDbName } from '@/lib/external-intake-flow'
import { getChannelByDbName } from '@/lib/channels'
import { isProjectDelivered } from '@/lib/timelines'
import { StageHistory } from '@/lib/types'
import {
  FINANCE_BILLING_CHANNELS,
  FINANCE_BILLING_LEGACY_CHANNELS,
  financeMonthKey,
  financeWeekStartKey,
  billingPeriodLabelForDate,
  buildFinanceNotes,
  tallyDeliveredByContentTypeFromProjects,
  mergeContentTypeCounts,
  type FinanceBillingPeriod,
  type FinanceBillingReport,
  type FinanceBillingRow,
  type FinanceBillingRowKind,
  type FinanceChannelBilling,
} from '@/lib/finance-billing-shared'

export {
  FINANCE_BILLING_CHANNELS,
  parseFinanceBillingAnchor,
  financeMonthKey,
  financeWeekStartKey,
  exportFinanceBillingCsv,
} from '@/lib/finance-billing-shared'
export type {
  FinanceBillingPeriod,
  FinanceBillingReport,
  FinanceBillingRow,
  FinanceChannelBilling,
  FinanceBillingParams,
} from '@/lib/finance-billing-shared'

type BillingProject = {
  id: string
  content_id: string
  title: string
  channel: string
  ip: string | null
  video_language: string | null
  content_type: string
  current_stage: string
  status_health: string
  is_on_hold: boolean
  picked_up_date: string | null
  delivered_date: string | null
  last_status_update_at: string | null
  created_at: string
}

const FINANCE_FETCH_CHANNELS = [
  ...FINANCE_BILLING_CHANNELS,
  ...FINANCE_BILLING_LEGACY_CHANNELS,
] as const

function financeDisplayChannel(dbName: string): string {
  if (dbName === 'Beyond Zerodha') return 'Zerodha Backoffice'
  return dbName
}

function isFinanceBillingChannel(dbName: string): boolean {
  return (FINANCE_FETCH_CHANNELS as readonly string[]).includes(dbName)
}

const VARSITY_THRESHOLD = 'Video received'

function normalizeBillingStage(channel: string, stage: string): string {
  if (isCashAndCopiumChannelDbName(channel)) return normalizeCashCopiumBoardStage(stage)
  if (isZerodhaChannelDbName(channel)) return normalizeZerodhaBoardStage(stage)
  return stage
}

function pipelineIndex(channel: string, stage: string): number {
  const normalized = normalizeBillingStage(channel, stage)
  if (isCashAndCopiumChannelDbName(channel)) {
    return (STAGES_CASH_COPIUM_INTERNAL as readonly string[]).indexOf(normalized)
  }
  if (isZerodhaChannelDbName(channel)) {
    return (STAGES_ZERODHA_INTERNAL as readonly string[]).indexOf(normalized)
  }
  return (STAGES_INTERNAL as readonly string[]).indexOf(normalized)
}

function thresholdIndex(channel: string): number {
  if (isCashAndCopiumChannelDbName(channel)) {
    return (STAGES_CASH_COPIUM_INTERNAL as readonly string[]).indexOf(CC_READY_TO_PRODUCE)
  }
  if (isZerodhaChannelDbName(channel)) {
    return (STAGES_ZERODHA_INTERNAL as readonly string[]).indexOf(ZERODHA_READY_TO_PRODUCE)
  }
  return (STAGES_INTERNAL as readonly string[]).indexOf(VARSITY_THRESHOLD)
}

function isAtBillingThreshold(channel: string, normalized: string): boolean {
  if (isCashAndCopiumChannelDbName(channel)) {
    return normalized === CC_REQUEST_RECEIVED || normalized === CC_READY_TO_PRODUCE
  }
  if (isZerodhaChannelDbName(channel)) {
    return normalized === ZERODHA_REQUEST_RECEIVED || normalized === ZERODHA_READY_TO_PRODUCE
  }
  return normalized === VARSITY_THRESHOLD
}

/** Picked in production = moved beyond channel billing threshold stage. */
export function isPastBillingThreshold(channel: string, stage: string): boolean {
  const normalized = normalizeBillingStage(channel, stage)

  if (isAtBillingThreshold(channel, normalized)) return false

  const idx = pipelineIndex(channel, normalized)
  const thresh = thresholdIndex(channel)
  if (idx >= 0 && thresh >= 0) return idx > thresh
  return !isAtBillingThreshold(channel, normalized)
}

export function resolvePickDate(
  project: BillingProject,
  history: StageHistory[],
): string | null {
  const stageChanges = history
    .filter(h => !h.is_hold_event)
    .sort((a, b) => a.changed_at.localeCompare(b.changed_at))

  for (const entry of stageChanges) {
    if (isPastBillingThreshold(project.channel, entry.new_stage)) {
      return entry.changed_at
    }
  }

  if (!isPastBillingThreshold(project.channel, project.current_stage)) return null

  if (project.picked_up_date) {
    return project.picked_up_date.length > 10
      ? project.picked_up_date
      : `${project.picked_up_date}T12:00:00`
  }

  return stageChanges[0]?.changed_at ?? project.created_at
}

function parseBillingDate(value: string): Date | null {
  const d = parseISO(value.length > 10 ? value : `${value}T12:00:00`)
  return isValid(d) ? d : null
}

/** Delivery date for period filtering (aligns with Studios hub Done column). */
export function billingDeliveryDate(project: BillingProject): string | null {
  if (project.delivered_date) return project.delivered_date
  if (!isProjectDelivered(project)) return null
  return project.last_status_update_at ?? null
}

export function wasDeliveredInBillingPeriod(
  project: BillingProject,
  period: FinanceBillingPeriod,
  anchor: Date,
): boolean {
  const deliveryDate = billingDeliveryDate(project)
  if (!deliveryDate) return false
  return inBillingPeriod(deliveryDate, period, anchor)
}

export function inBillingPeriod(
  dateStr: string,
  period: FinanceBillingPeriod,
  anchor = new Date(),
): boolean {
  const d = parseBillingDate(dateStr)
  if (!d) return false
  const start = period === 'week'
    ? startOfWeek(anchor, { weekStartsOn: 1 })
    : startOfMonth(anchor)
  const end = period === 'week'
    ? endOfWeek(anchor, { weekStartsOn: 1 })
    : endOfMonth(anchor)
  return d >= startOfDay(start) && d <= endOfDay(end)
}

export function billingPeriodLabel(period: FinanceBillingPeriod, anchor = new Date()): string {
  return billingPeriodLabelForDate(period, anchor)
}

function billingPeriodStart(period: FinanceBillingPeriod, anchor: Date): Date {
  return startOfDay(
    period === 'week'
      ? startOfWeek(anchor, { weekStartsOn: 1 })
      : startOfMonth(anchor),
  )
}

function makeBillingRow(
  project: BillingProject,
  pickDate: string,
  kind: FinanceBillingRowKind,
  onHold: boolean,
  billedInPeriodLabel: string | null,
): FinanceBillingRow {
  return {
    projectId: project.id,
    contentId: project.content_id,
    title: project.title,
    channel: financeDisplayChannel(project.channel),
    ip: project.ip?.trim() || '—',
    videoLanguage: project.video_language?.trim() || null,
    contentType: project.content_type,
    pickedAt: pickDate,
    currentStage: project.current_stage,
    isDelivered: isProjectDelivered(project),
    kind,
    onHold,
    billedInPeriodLabel,
    financeNotes: buildFinanceNotes(kind, onHold, billedInPeriodLabel),
  }
}

export function computeFinanceBillingReport(
  projects: BillingProject[],
  historyByProject: Map<string, StageHistory[]>,
  period: FinanceBillingPeriod,
  anchor = new Date(),
): FinanceBillingReport {
  const periodRowsByChannel = new Map<string, FinanceBillingRow[]>()
  const carryOverRowsByChannel = new Map<string, FinanceBillingRow[]>()

  for (const channel of FINANCE_BILLING_CHANNELS) {
    periodRowsByChannel.set(channel, [])
    carryOverRowsByChannel.set(channel, [])
  }

  const periodStart = billingPeriodStart(period, anchor)

  for (const project of projects) {
    if (!isFinanceBillingChannel(project.channel)) continue

    const pickDate = resolvePickDate(project, historyByProject.get(project.id) ?? [])
    if (!pickDate) continue

    const pickParsed = parseBillingDate(pickDate)
    if (!pickParsed) continue

    const onHold = project.is_on_hold || project.status_health === 'On hold'
    const billedInPeriodLabel = billingPeriodLabelForDate(period, pickParsed)
    const inPeriod = inBillingPeriod(pickDate, period, anchor)
    const beforePeriod = pickParsed < periodStart

    const bucket = financeDisplayChannel(project.channel)

    if (inPeriod) {
      periodRowsByChannel.get(bucket)?.push(
        makeBillingRow(project, pickDate, 'current_period', onHold, null),
      )
      continue
    }

    if (period === 'month' && beforePeriod && !isProjectDelivered(project)) {
      carryOverRowsByChannel.get(bucket)?.push(
        makeBillingRow(project, pickDate, 'carry_over', onHold, billedInPeriodLabel),
      )
    }
  }

  const deliveredInPeriodByChannel = new Map<string, BillingProject[]>()
  for (const channel of FINANCE_BILLING_CHANNELS) {
    deliveredInPeriodByChannel.set(channel, [])
  }
  for (const project of projects) {
    if (!isFinanceBillingChannel(project.channel)) continue
    if (!wasDeliveredInBillingPeriod(project, period, anchor)) continue
    const bucket = financeDisplayChannel(project.channel)
    deliveredInPeriodByChannel.get(bucket)?.push(project)
  }

  const channels: FinanceChannelBilling[] = FINANCE_BILLING_CHANNELS.map(channel => {
    const periodRows = (periodRowsByChannel.get(channel) ?? []).sort((a, b) =>
      b.pickedAt.localeCompare(a.pickedAt),
    )
    const carryOverRows = (carryOverRowsByChannel.get(channel) ?? []).sort((a, b) =>
      b.pickedAt.localeCompare(a.pickedAt),
    )
    const deliveredInPeriod = deliveredInPeriodByChannel.get(channel) ?? []
    const deliveredByContentType = tallyDeliveredByContentTypeFromProjects(deliveredInPeriod)
    return {
      channel,
      slug: getChannelByDbName(channel)?.slug ?? channel.toLowerCase(),
      picked: periodRows.length,
      delivered: deliveredInPeriod.length,
      deliveredByContentType,
      onHold: periodRows.filter(r => r.onHold).length,
      carryOver: carryOverRows.length,
      periodRows,
      carryOverRows,
    }
  })

  const picked = channels.reduce((sum, c) => sum + c.picked, 0)
  const delivered = channels.reduce((sum, c) => sum + c.delivered, 0)
  const onHold = channels.reduce((sum, c) => sum + c.onHold, 0)
  const carryOver = channels.reduce((sum, c) => sum + c.carryOver, 0)

  const deliveredByContentType = mergeContentTypeCounts(
    ...channels.map(c => c.deliveredByContentType),
  )

  return {
    period,
    periodLabel: billingPeriodLabel(period, anchor),
    monthKey: financeMonthKey(period === 'month' ? anchor : startOfMonth(anchor)),
    weekStartKey: financeWeekStartKey(anchor),
    totals: { picked, delivered, deliveredByContentType, onHold, carryOver },
    channels,
  }
}

async function fetchBillingProjects(): Promise<BillingProject[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('projects')
    .select('id, content_id, title, channel, ip, video_language, content_type, current_stage, status_health, is_on_hold, picked_up_date, delivered_date, last_status_update_at, created_at')
    .in('channel', [...FINANCE_FETCH_CHANNELS])
    .order('title')

  if (error) throw error
  return (data ?? []) as BillingProject[]
}

async function fetchBillingStageHistory(projectIds: string[]): Promise<Map<string, StageHistory[]>> {
  const map = new Map<string, StageHistory[]>()
  if (!projectIds.length) return map

  const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createAdminClient()
    : await createClient()

  const { data, error } = await supabase
    .from('stage_history')
    .select('id, project_id, old_stage, new_stage, changed_at, is_hold_event')
    .in('project_id', projectIds)
    .order('changed_at', { ascending: true })

  if (error) throw error

  for (const row of data ?? []) {
    const list = map.get(row.project_id) ?? []
    list.push(row as StageHistory)
    map.set(row.project_id, list)
  }

  return map
}

export async function fetchFinanceBillingReport(
  period: FinanceBillingPeriod,
  anchor = new Date(),
): Promise<FinanceBillingReport> {
  const projects = await fetchBillingProjects()
  const historyByProject = await fetchBillingStageHistory(projects.map(p => p.id))
  return computeFinanceBillingReport(projects, historyByProject, period, anchor)
}
