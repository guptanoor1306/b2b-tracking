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
import { FINAL_STAGE, STAGES_INTERNAL } from '@/lib/constants'
import {
  isZerodhaChannelDbName,
  normalizeZerodhaBoardStage,
  STAGES_ZERODHA_INTERNAL,
  ZERODHA_READY_TO_PRODUCE,
  ZERODHA_REQUEST_RECEIVED,
} from '@/lib/zerodha-sla'
import { getChannelByDbName } from '@/lib/channels'
import { StageHistory } from '@/lib/types'
import {
  FINANCE_BILLING_CHANNELS,
  financeMonthKey,
  financeWeekStartKey,
  type FinanceBillingPeriod,
  type FinanceBillingReport,
  type FinanceBillingRow,
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
  content_type: string
  current_stage: string
  picked_up_date: string | null
  created_at: string
}

const VARSITY_THRESHOLD = 'Video received'

function pipelineIndex(channel: string, stage: string): number {
  if (isZerodhaChannelDbName(channel)) {
    return (STAGES_ZERODHA_INTERNAL as readonly string[]).indexOf(normalizeZerodhaBoardStage(stage))
  }
  return (STAGES_INTERNAL as readonly string[]).indexOf(stage)
}

function thresholdIndex(channel: string): number {
  if (isZerodhaChannelDbName(channel)) {
    return (STAGES_ZERODHA_INTERNAL as readonly string[]).indexOf(ZERODHA_READY_TO_PRODUCE)
  }
  return (STAGES_INTERNAL as readonly string[]).indexOf(VARSITY_THRESHOLD)
}

/** Picked in production = moved beyond channel billing threshold stage. */
export function isPastBillingThreshold(channel: string, stage: string): boolean {
  const normalized = isZerodhaChannelDbName(channel)
    ? normalizeZerodhaBoardStage(stage)
    : stage

  if (isZerodhaChannelDbName(channel)) {
    if (normalized === ZERODHA_REQUEST_RECEIVED || normalized === ZERODHA_READY_TO_PRODUCE) return false
  } else if (normalized === VARSITY_THRESHOLD) {
    return false
  }

  const idx = pipelineIndex(channel, normalized)
  const thresh = thresholdIndex(channel)
  if (idx >= 0 && thresh >= 0) return idx > thresh
  return normalized !== VARSITY_THRESHOLD
    && normalized !== ZERODHA_REQUEST_RECEIVED
    && normalized !== ZERODHA_READY_TO_PRODUCE
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
  if (period === 'week') {
    const start = startOfWeek(anchor, { weekStartsOn: 1 })
    const end = endOfWeek(anchor, { weekStartsOn: 1 })
    return `${format(start, 'dd MMM')} – ${format(end, 'dd MMM yyyy')}`
  }
  return format(anchor, 'MMMM yyyy')
}

export function computeFinanceBillingReport(
  projects: BillingProject[],
  historyByProject: Map<string, StageHistory[]>,
  period: FinanceBillingPeriod,
  anchor = new Date(),
): FinanceBillingReport {
  const rowsByChannel = new Map<string, FinanceBillingRow[]>()

  for (const channel of FINANCE_BILLING_CHANNELS) {
    rowsByChannel.set(channel, [])
  }

  for (const project of projects) {
    if (!(FINANCE_BILLING_CHANNELS as readonly string[]).includes(project.channel)) continue

    const pickDate = resolvePickDate(project, historyByProject.get(project.id) ?? [])
    if (!pickDate || !inBillingPeriod(pickDate, period, anchor)) continue

    const row: FinanceBillingRow = {
      projectId: project.id,
      contentId: project.content_id,
      title: project.title,
      channel: project.channel,
      contentType: project.content_type,
      pickedAt: pickDate,
      currentStage: project.current_stage,
      isDelivered: project.current_stage === FINAL_STAGE,
    }
    rowsByChannel.get(project.channel)?.push(row)
  }

  const channels: FinanceChannelBilling[] = FINANCE_BILLING_CHANNELS.map(channel => {
    const rows = (rowsByChannel.get(channel) ?? []).sort((a, b) =>
      b.pickedAt.localeCompare(a.pickedAt),
    )
    return {
      channel,
      slug: getChannelByDbName(channel)?.slug ?? channel.toLowerCase(),
      picked: rows.length,
      delivered: rows.filter(r => r.isDelivered).length,
      rows,
    }
  })

  const picked = channels.reduce((sum, c) => sum + c.picked, 0)
  const delivered = channels.reduce((sum, c) => sum + c.delivered, 0)

  return {
    period,
    periodLabel: billingPeriodLabel(period, anchor),
    monthKey: financeMonthKey(period === 'month' ? anchor : startOfMonth(anchor)),
    weekStartKey: financeWeekStartKey(anchor),
    totals: { picked, delivered },
    channels,
  }
}

async function fetchBillingProjects(): Promise<BillingProject[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('projects')
    .select('id, content_id, title, channel, content_type, current_stage, picked_up_date, created_at')
    .in('channel', [...FINANCE_BILLING_CHANNELS])
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
