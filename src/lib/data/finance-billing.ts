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
  subMonths,
} from 'date-fns'
import { unstable_cache } from 'next/cache'
import { canUseDataCache } from '@/lib/supabase/cache-read'
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
  countFinanceExportRows,
  allFinanceBillingExportRows,
  allFinanceBillingProjectIds,
  previousFinanceMonthKey,
  financeMonthLabel,
  type FinanceBillingPeriod,
  type FinanceBillingReport,
  type FinanceBillingRow,
  type FinanceBillingRowKind,
  type FinanceChannelBilling,
} from '@/lib/finance-billing-shared'
import {
  billingMarkLookup,
  fetchFinanceBillingMarksForProjects,
  projectIdsMarkedBilledBeforeMonth,
} from '@/lib/data/finance-billing-marks'

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

/** Max months to walk back when chaining deferred billing (including target month). */
const FINANCE_DEFERRAL_LOOKBACK_MONTHS = 18

export const FINANCE_BILLING_CACHE_TAG = 'finance-billing'

type BillingProjectPrepared = {
  project: BillingProject
  pickDate: string
  pickParsed: Date | null
  onHold: boolean
  bucket: string
}

function buildBillingProjectPrepared(
  projects: BillingProject[],
  historyByProject: Map<string, StageHistory[]>,
): BillingProjectPrepared[] {
  const prepared: BillingProjectPrepared[] = []
  for (const project of projects) {
    if (!isFinanceBillingChannel(project.channel)) continue
    const pickDate =
      resolvePickDate(project, historyByProject.get(project.id) ?? [])
      ?? project.picked_up_date
      ?? null
    if (!pickDate) continue
    prepared.push({
      project,
      pickDate,
      pickParsed: parseBillingDate(pickDate),
      onHold: project.is_on_hold || project.status_health === 'On hold',
      bucket: financeDisplayChannel(project.channel),
    })
  }
  return prepared
}

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

function buildDeliveredInPeriodRows(
  deliveredProjects: BillingProject[],
  periodRows: FinanceBillingRow[],
  carryOverRows: FinanceBillingRow[],
  historyByProject: Map<string, StageHistory[]>,
  period: FinanceBillingPeriod,
  anchor: Date,
): FinanceBillingRow[] {
  const listed = new Set([
    ...periodRows.map(r => r.projectId),
    ...carryOverRows.map(r => r.projectId),
  ])
  const rows: FinanceBillingRow[] = []

  for (const project of deliveredProjects) {
    if (listed.has(project.id)) continue
    const pickDate =
      resolvePickDate(project, historyByProject.get(project.id) ?? [])
      ?? billingDeliveryDate(project)
      ?? project.created_at
    const pickParsed = parseBillingDate(pickDate)
    const billedInPeriodLabel = pickParsed
      ? billingPeriodLabelForDate(period, pickParsed)
      : null
    const onHold = project.is_on_hold || project.status_health === 'On hold'
    rows.push(makeBillingRow(project, pickDate, 'delivered_in_period', onHold, billedInPeriodLabel))
  }

  return rows.sort((a, b) => b.pickedAt.localeCompare(a.pickedAt))
}

type BillingRowNoteContext = {
  billedThisMonth: boolean
  periodLabel: string | null
  deferredFromMonthLabel: string | null
}

function makeBillingRow(
  project: BillingProject,
  pickDate: string,
  kind: FinanceBillingRowKind,
  onHold: boolean,
  billedInPeriodLabel: string | null,
  noteContext: BillingRowNoteContext = {
    billedThisMonth: false,
    periodLabel: null,
    deferredFromMonthLabel: null,
  },
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
    billedThisMonth: noteContext.billedThisMonth,
    financeNotes: buildFinanceNotes(
      kind,
      onHold,
      billedInPeriodLabel,
      noteContext.billedThisMonth,
      noteContext.periodLabel,
      noteContext.deferredFromMonthLabel,
    ),
  }
}

function withBillingMarksOnRow(
  row: FinanceBillingRow,
  billedThisMonth: boolean,
  periodLabel: string,
  deferredFromMonthLabel: string | null,
): FinanceBillingRow {
  return {
    ...row,
    billedThisMonth,
    financeNotes: buildFinanceNotes(
      row.kind,
      row.onHold,
      row.billedInPeriodLabel,
      billedThisMonth,
      periodLabel,
      deferredFromMonthLabel,
    ),
  }
}

function mapChannelRowsWithMarks(
  rows: FinanceBillingRow[],
  monthKey: string,
  marks: Map<string, boolean>,
  periodLabel: string,
  deferredFromMonthLabel: string | null,
): FinanceBillingRow[] {
  return rows.map(row =>
    withBillingMarksOnRow(
      row,
      billingMarkLookup(marks, monthKey, row.projectId),
      periodLabel,
      row.kind === 'deferred_prior_month' ? deferredFromMonthLabel : null,
    ),
  )
}

export function computeFinanceBillingReport(
  projects: BillingProject[],
  historyByProject: Map<string, StageHistory[]>,
  period: FinanceBillingPeriod,
  anchor = new Date(),
  prepared?: BillingProjectPrepared[],
): FinanceBillingReport {
  const periodRowsByChannel = new Map<string, FinanceBillingRow[]>()
  const carryOverRowsByChannel = new Map<string, FinanceBillingRow[]>()

  for (const channel of FINANCE_BILLING_CHANNELS) {
    periodRowsByChannel.set(channel, [])
    carryOverRowsByChannel.set(channel, [])
  }

  const periodLabel = billingPeriodLabel(period, anchor)

  const periodStart = billingPeriodStart(period, anchor)
  const billingProjects = prepared ?? buildBillingProjectPrepared(projects, historyByProject)

  for (const { project, pickDate, pickParsed, onHold, bucket } of billingProjects) {
    const billedInPeriodLabel = pickParsed
      ? billingPeriodLabelForDate(period, pickParsed)
      : null
    const inPeriod = inBillingPeriod(pickDate, period, anchor)
    const beforePeriod = pickParsed ? pickParsed < periodStart : false

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
  for (const { project, bucket } of billingProjects) {
    if (!wasDeliveredInBillingPeriod(project, period, anchor)) continue
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
    let deliveredInPeriodRows = buildDeliveredInPeriodRows(
      deliveredInPeriod,
      periodRows,
      carryOverRows,
      historyByProject,
      period,
      anchor,
    )
    const listedIds = new Set([
      ...periodRows.map(r => r.projectId),
      ...carryOverRows.map(r => r.projectId),
      ...deliveredInPeriodRows.map(r => r.projectId),
    ])
    for (const project of deliveredInPeriod) {
      if (listedIds.has(project.id)) continue
      const pickDate =
        resolvePickDate(project, historyByProject.get(project.id) ?? [])
        ?? billingDeliveryDate(project)
        ?? project.created_at
      const pickParsed = parseBillingDate(pickDate)
      const billedInPeriodLabel = pickParsed
        ? billingPeriodLabelForDate(period, pickParsed)
        : null
      const onHold = project.is_on_hold || project.status_health === 'On hold'
      deliveredInPeriodRows.push(
        makeBillingRow(project, pickDate, 'delivered_in_period', onHold, billedInPeriodLabel),
      )
      listedIds.add(project.id)
    }
    deliveredInPeriodRows = deliveredInPeriodRows.sort((a, b) =>
      b.pickedAt.localeCompare(a.pickedAt),
    )
    const startedThisPeriod = periodRows.length
    const inPipeline = periodRows.filter(r => !r.isDelivered).length
    return {
      channel,
      slug: getChannelByDbName(channel)?.slug ?? channel.toLowerCase(),
      startedThisPeriod,
      inPipeline,
      deliveredThisPeriod: deliveredInPeriod.length,
      deliveredByContentType,
      onHold: periodRows.filter(r => r.onHold).length,
      carryOver: carryOverRows.length,
      periodRows,
      carryOverRows,
      deliveredInPeriodRows,
      deferredBillingRows: [],
    }
  })

  const startedThisPeriod = channels.reduce((sum, c) => sum + c.startedThisPeriod, 0)
  const inPipeline = channels.reduce((sum, c) => sum + c.inPipeline, 0)
  const deliveredThisPeriod = channels.reduce((sum, c) => sum + c.deliveredThisPeriod, 0)
  const onHold = channels.reduce((sum, c) => sum + c.onHold, 0)
  const carryOver = channels.reduce((sum, c) => sum + c.carryOver, 0)

  const deliveredByContentType = mergeContentTypeCounts(
    ...channels.map(c => c.deliveredByContentType),
  )

  const report: FinanceBillingReport = {
    period,
    periodLabel,
    monthKey: financeMonthKey(period === 'month' ? anchor : startOfMonth(anchor)),
    weekStartKey: financeWeekStartKey(anchor),
    totals: {
      startedThisPeriod,
      inPipeline,
      deliveredThisPeriod,
      deliveredByContentType,
      onHold,
      carryOver,
      markedBilledThisMonth: 0,
      unmarkedBilledThisMonth: 0,
      deferredFromPriorMonth: 0,
      exportRows: 0,
    },
    priorMonthKey: null,
    priorMonthLabel: null,
    billingMarksEnabled: false,
    channels,
  }
  report.totals.exportRows = countFinanceExportRows(report)
  return report
}

function buildDeferredBillingByChannel(
  prevReport: FinanceBillingReport,
  prevMonthKey: string,
  marks: Map<string, boolean>,
  currentListedIds: Set<string>,
): Map<string, FinanceBillingRow[]> {
  const byChannel = new Map<string, FinanceBillingRow[]>()
  for (const channel of FINANCE_BILLING_CHANNELS) {
    byChannel.set(channel, [])
  }

  for (const ch of prevReport.channels) {
    for (const row of allFinanceBillingExportRows(ch)) {
      if (billingMarkLookup(marks, prevMonthKey, row.projectId)) continue
      if (currentListedIds.has(row.projectId)) continue
      const list = byChannel.get(ch.channel) ?? []
      list.push({
        ...row,
        kind: 'deferred_prior_month',
        billedThisMonth: false,
      })
      byChannel.set(ch.channel, list)
    }
  }

  for (const [channel, rows] of byChannel) {
    byChannel.set(
      channel,
      rows.sort((a, b) => b.pickedAt.localeCompare(a.pickedAt)),
    )
  }

  return byChannel
}

function mergeDeferredIntoReport(
  report: FinanceBillingReport,
  deferredByChannel: Map<string, FinanceBillingRow[]>,
  priorMonthKey: string,
): FinanceBillingReport {
  const channels = report.channels.map(ch => ({
    ...ch,
    deferredBillingRows: deferredByChannel.get(ch.channel) ?? [],
  }))
  const deferredFromPriorMonth = channels.reduce(
    (sum, ch) => sum + ch.deferredBillingRows.length,
    0,
  )
  const next: FinanceBillingReport = {
    ...report,
    priorMonthKey,
    priorMonthLabel: financeMonthLabel(priorMonthKey),
    channels,
    totals: {
      ...report.totals,
      deferredFromPriorMonth,
    },
  }
  next.totals.exportRows = countFinanceExportRows(next)
  return next
}

function earliestFinanceBillingMonthKey(prepared: BillingProjectPrepared[]): string {
  let earliest: string | null = null
  for (const { pickParsed } of prepared) {
    if (!pickParsed) continue
    const key = financeMonthKey(startOfMonth(pickParsed))
    if (!earliest || key < earliest) earliest = key
  }
  return earliest ?? financeMonthKey(startOfMonth(new Date()))
}

function deferralChainStartMonthKey(
  targetMonthKey: string,
  earliestMonthKey: string,
): string {
  const cap = financeMonthKey(
    subMonths(parseISO(`${targetMonthKey}-01`), FINANCE_DEFERRAL_LOOKBACK_MONTHS - 1),
  )
  return earliestMonthKey > cap ? earliestMonthKey : cap
}

/** Month keys from capped start through target (inclusive), ascending. */
function financeMonthKeyChain(
  targetMonthKey: string,
  earliestMonthKey: string,
): string[] {
  const startKey = deferralChainStartMonthKey(targetMonthKey, earliestMonthKey)
  const chain: string[] = []
  let cursor = targetMonthKey
  while (true) {
    chain.unshift(cursor)
    if (cursor <= startKey) break
    const prev = previousFinanceMonthKey(cursor)
    if (!prev) break
    cursor = prev
  }
  return chain
}

/**
 * Full billing list for a month = computed rows + deferred from prior month.
 * Built iteratively from earliest pick month so "Last month" rows chain forward.
 */
function computeEnrichedMonthReport(
  projects: BillingProject[],
  historyByProject: Map<string, StageHistory[]>,
  monthKey: string,
  marks: Map<string, boolean>,
  prepared: BillingProjectPrepared[],
): FinanceBillingReport {
  const earliest = earliestFinanceBillingMonthKey(prepared)
  const chain = financeMonthKeyChain(monthKey, earliest)
  const cache = new Map<string, FinanceBillingReport>()

  for (const mk of chain) {
    const anchor = parseISO(`${mk}-01`)
    let report = computeFinanceBillingReport(
      projects,
      historyByProject,
      'month',
      anchor,
      prepared,
    )
    const prevMonthKey = previousFinanceMonthKey(mk)
    if (prevMonthKey && cache.has(prevMonthKey)) {
      const prevEnriched = cache.get(prevMonthKey)!
      const deferredByChannel = buildDeferredBillingByChannel(
        prevEnriched,
        prevMonthKey,
        marks,
        new Set(allFinanceBillingProjectIds(report)),
      )
      report = mergeDeferredIntoReport(report, deferredByChannel, prevMonthKey)
    }
    cache.set(mk, report)
  }

  const result = cache.get(monthKey)
  if (!result) {
    const anchor = parseISO(`${monthKey}-01`)
    return computeFinanceBillingReport(projects, historyByProject, 'month', anchor)
  }
  return result
}

function filterBillingRows(
  rows: FinanceBillingRow[],
  closedProjectIds: Set<string>,
): FinanceBillingRow[] {
  if (!closedProjectIds.size) return rows
  return rows.filter(row => !closedProjectIds.has(row.projectId))
}

/** Drop videos already marked billed in an earlier month — they must not reappear to invoice again. */
function applyPreviouslyBilledFilter(
  report: FinanceBillingReport,
  closedProjectIds: Set<string>,
): FinanceBillingReport {
  if (!closedProjectIds.size) return report

  const channels = report.channels.map(ch => {
    const periodRows = filterBillingRows(ch.periodRows, closedProjectIds)
    const carryOverRows = filterBillingRows(ch.carryOverRows, closedProjectIds)
    const deliveredInPeriodRows = filterBillingRows(ch.deliveredInPeriodRows, closedProjectIds)
    const deferredBillingRows = filterBillingRows(ch.deferredBillingRows, closedProjectIds)
    return {
      ...ch,
      periodRows,
      carryOverRows,
      deliveredInPeriodRows,
      deferredBillingRows,
      startedThisPeriod: periodRows.length,
      inPipeline: periodRows.filter(r => !r.isDelivered).length,
      onHold: periodRows.filter(r => r.onHold).length,
      carryOver: carryOverRows.length,
    }
  })

  const next: FinanceBillingReport = {
    ...report,
    channels,
    totals: {
      ...report.totals,
      startedThisPeriod: channels.reduce((s, c) => s + c.startedThisPeriod, 0),
      inPipeline: channels.reduce((s, c) => s + c.inPipeline, 0),
      onHold: channels.reduce((s, c) => s + c.onHold, 0),
      carryOver: channels.reduce((s, c) => s + c.carryOver, 0),
      deferredFromPriorMonth: channels.reduce((s, c) => s + c.deferredBillingRows.length, 0),
    },
  }
  next.totals.exportRows = countFinanceExportRows(next)
  return next
}

function applyMonthlyBillingMarks(
  report: FinanceBillingReport,
  marks: Map<string, boolean>,
  prevMonthKey: string | null,
): FinanceBillingReport {
  const periodLabel = report.periodLabel
  const deferredFromMonthLabel = prevMonthKey ? financeMonthLabel(prevMonthKey) : null
  const monthKey = report.monthKey

  const channels = report.channels.map(ch => ({
    ...ch,
    periodRows: mapChannelRowsWithMarks(ch.periodRows, monthKey, marks, periodLabel, null),
    carryOverRows: mapChannelRowsWithMarks(ch.carryOverRows, monthKey, marks, periodLabel, null),
    deliveredInPeriodRows: mapChannelRowsWithMarks(
      ch.deliveredInPeriodRows,
      monthKey,
      marks,
      periodLabel,
      null,
    ),
    deferredBillingRows: mapChannelRowsWithMarks(
      ch.deferredBillingRows,
      monthKey,
      marks,
      periodLabel,
      deferredFromMonthLabel,
    ),
  }))

  let markedBilledThisMonth = 0
  let unmarkedBilledThisMonth = 0
  let deferredFromPriorMonth = 0

  for (const ch of channels) {
    for (const row of allFinanceBillingExportRows(ch)) {
      if (row.kind === 'deferred_prior_month') {
        deferredFromPriorMonth += 1
        continue
      }
      if (row.billedThisMonth) markedBilledThisMonth += 1
      else unmarkedBilledThisMonth += 1
    }
  }

  const next: FinanceBillingReport = {
    ...report,
    priorMonthKey: prevMonthKey,
    priorMonthLabel: deferredFromMonthLabel,
    billingMarksEnabled: true,
    channels,
    totals: {
      ...report.totals,
      markedBilledThisMonth,
      unmarkedBilledThisMonth,
      deferredFromPriorMonth,
    },
  }
  next.totals.exportRows = countFinanceExportRows(next)
  return next
}

async function fetchBillingProjects(): Promise<BillingProject[]> {
  const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createAdminClient()
    : await createClient()

  const all: BillingProject[] = []
  const pageSize = 1000
  let offset = 0

  while (true) {
    const { data, error } = await supabase
      .from('projects')
      .select('id, content_id, title, channel, ip, video_language, content_type, current_stage, status_health, is_on_hold, picked_up_date, delivered_date, last_status_update_at, created_at')
      .in('channel', [...FINANCE_FETCH_CHANNELS])
      .order('title')
      .range(offset, offset + pageSize - 1)

    if (error) throw error
    if (!data?.length) break
    all.push(...(data as BillingProject[]))
    if (data.length < pageSize) break
    offset += pageSize
  }

  return all
}

async function fetchBillingStageHistory(projectIds: string[]): Promise<Map<string, StageHistory[]>> {
  const map = new Map<string, StageHistory[]>()
  if (!projectIds.length) return map

  const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createAdminClient()
    : await createClient()

  const pageSize = 1000
  const idChunkSize = 40

  for (let i = 0; i < projectIds.length; i += idChunkSize) {
    const idChunk = projectIds.slice(i, i + idChunkSize)
    let offset = 0

    while (true) {
      const { data, error } = await supabase
        .from('stage_history')
        .select('id, project_id, old_stage, new_stage, changed_at, is_hold_event')
        .in('project_id', idChunk)
        .order('changed_at', { ascending: true })
        .range(offset, offset + pageSize - 1)

      if (error) throw error
      if (!data?.length) break

      for (const row of data) {
        const list = map.get(row.project_id) ?? []
        list.push(row as StageHistory)
        map.set(row.project_id, list)
      }

      if (data.length < pageSize) break
      offset += pageSize
    }
  }

  return map
}

async function fetchFinanceBillingReportUncached(
  period: FinanceBillingPeriod,
  anchor = new Date(),
): Promise<FinanceBillingReport> {
  const projects = await fetchBillingProjects()
  const projectIds = projects.map(p => p.id)

  const [historyByProject, marks] = await Promise.all([
    fetchBillingStageHistory(projectIds),
    period === 'month'
      ? fetchFinanceBillingMarksForProjects(projectIds)
      : Promise.resolve(new Map<string, boolean>()),
  ])

  if (period !== 'month') {
    return computeFinanceBillingReport(projects, historyByProject, period, anchor)
  }

  const prepared = buildBillingProjectPrepared(projects, historyByProject)
  const monthKey = financeMonthKey(startOfMonth(anchor))
  let report = computeEnrichedMonthReport(
    projects,
    historyByProject,
    monthKey,
    marks,
    prepared,
  )

  const closedProjectIds = projectIdsMarkedBilledBeforeMonth(marks, monthKey)
  report = applyPreviouslyBilledFilter(report, closedProjectIds)

  const prevMonthKey = previousFinanceMonthKey(monthKey)
  return applyMonthlyBillingMarks(report, marks, prevMonthKey)
}

export async function fetchFinanceBillingReport(
  period: FinanceBillingPeriod,
  anchor = new Date(),
): Promise<FinanceBillingReport> {
  if (period !== 'month' || !canUseDataCache()) {
    return fetchFinanceBillingReportUncached(period, anchor)
  }

  const monthKey = financeMonthKey(startOfMonth(anchor))
  return unstable_cache(
    async () => fetchFinanceBillingReportUncached('month', parseISO(`${monthKey}-01`)),
    ['finance-billing-report-v1', monthKey],
    { tags: [FINANCE_BILLING_CACHE_TAG], revalidate: 300 },
  )()
}
