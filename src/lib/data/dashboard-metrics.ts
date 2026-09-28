import { HoldPeriod, Project, StageHistory } from '@/lib/types'
import {
  ZERODHA_REQUEST_RECEIVED,
  internalStagesForChannel,
  normalizeZerodhaBoardStage,
  usesExternalIntakeFlow,
} from '@/lib/zerodha-sla'
import { computeStageDurations, isAllMonths, isDeliveredInMonth, isProjectRelevantInMonth, previousCalendarMonth } from '@/lib/utils'
import { isTerminalPipelineStage, normalizeStage } from '@/lib/timelines'
import { isLaSocialChannelDbName, LA_SOCIAL_TOPIC } from '@/lib/la-social-sla'
import { STAGES_INTERNAL } from '@/lib/constants'

export type OnTimeDeliveryStats = {
  onTime: number
  late: number
  total: number
  rate: number | null
}

export type TimelineMetric = {
  key: string
  label: string
  averageLabel: string
  averageHours: number | null
  sampleCount: number
  previousAverageLabel: string | null
  previousAverageHours: number | null
  previousSampleCount: number
  /** % change vs previous month; positive = slower (more hours). */
  trendPercent: number | null
}

export type TimelineMetrics = {
  metrics: TimelineMetric[]
  comparisonMonth: string | null
}

type StageMetricDef = { key: string; label: string; stage: string }

function stageMetricKey(stage: string): string {
  return stage.replace(/[^a-z0-9]+/gi, '_').toLowerCase()
}

function isExcludedFromTimelineTat(stage: string, channelDbName: string | null | undefined): boolean {
  if (isTerminalPipelineStage(stage, channelDbName)) return true
  if (isLaSocialChannelDbName(channelDbName)) {
    return normalizeStage(stage) === normalizeStage(LA_SOCIAL_TOPIC)
  }
  if (usesExternalIntakeFlow(channelDbName)) {
    return normalizeZerodhaBoardStage(stage, channelDbName) === ZERODHA_REQUEST_RECEIVED
  }
  return normalizeStage(stage) === normalizeStage('Video received')
}

function timelineStageMetricsForChannel(channelDbName: string | null | undefined): StageMetricDef[] {
  const pipeline = isLaSocialChannelDbName(channelDbName)
    ? internalStagesForChannel(channelDbName)
    : usesExternalIntakeFlow(channelDbName)
      ? internalStagesForChannel(channelDbName)
      : STAGES_INTERNAL

  return pipeline
    .filter(stage => !isExcludedFromTimelineTat(stage, channelDbName))
    .map(stage => ({
      key: stageMetricKey(stage),
      label: stage,
      stage,
    }))
}

export function computeOnTimeDeliveryStats(onTime: number, late: number): OnTimeDeliveryStats {
  const total = onTime + late
  return {
    onTime,
    late,
    total,
    rate: total > 0 ? Math.round((onTime / total) * 100) : null,
  }
}

export function projectsInMetricsScope(projects: Project[], month: string): Project[] {
  if (isAllMonths(month)) return projects
  return projects.filter(project =>
    isProjectRelevantInMonth(project, month) || isDeliveredInMonth(project, month),
  )
}

function averageHours(values: number[]): number | null {
  if (!values.length) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function formatAverageHours(hours: number | null): string {
  if (hours === null) return '—'
  if (hours < 1) return '< 1 hour'
  if (hours < 24) {
    const rounded = Math.round(hours * 10) / 10
    return `${rounded}h`
  }
  const days = Math.round((hours / 24) * 10) / 10
  return `${days} days`
}

function normalizeDurationStage(stage: string, channelDbName: string | null | undefined, laSocial: boolean): string {
  return laSocial
    ? normalizeStage(stage)
    : normalizeZerodhaBoardStage(stage, channelDbName)
}

function stageMatchesMetric(
  normalizedDurationStage: string,
  metric: StageMetricDef,
  channelDbName: string | null | undefined,
  laSocial: boolean,
): boolean {
  if (laSocial) {
    return normalizeStage(metric.stage) === normalizedDurationStage
  }
  return normalizeZerodhaBoardStage(metric.stage, channelDbName) === normalizedDurationStage
}

function collectTimelineBuckets(
  stageMetrics: StageMetricDef[],
  projects: Project[],
  historyByProject: Map<string, StageHistory[]>,
  holidays: string[],
  holdPeriodsByProjectId: Record<string, HoldPeriod[]>,
  month: string,
  channelDbName: string | null | undefined,
): Map<string, number[]> {
  const laSocial = isLaSocialChannelDbName(channelDbName)
  const scoped = projectsInMetricsScope(projects, month)
  const buckets = new Map<string, number[]>(
    stageMetrics.map(metric => [metric.key, []]),
  )

  for (const project of scoped) {
    const history = historyByProject.get(project.id) ?? []
    if (!history.length) continue

    const durations = computeStageDurations(
      history,
      holidays,
      holdPeriodsByProjectId[project.id] ?? [],
      project.channel,
    )

    for (const duration of durations) {
      if (isTerminalPipelineStage(duration.stage, channelDbName)) continue
      const normalized = normalizeDurationStage(duration.stage, channelDbName, laSocial)
      const metric = stageMetrics.find(item =>
        stageMatchesMetric(normalized, item, channelDbName, laSocial),
      )
      if (!metric || duration.totalBusinessHours <= 0) continue
      buckets.get(metric.key)?.push(duration.totalBusinessHours)
    }
  }

  return buckets
}

function buildTimelineMetrics(
  stageMetrics: StageMetricDef[],
  currentBuckets: Map<string, number[]>,
  previousBuckets: Map<string, number[]> | null,
): TimelineMetric[] {
  return stageMetrics
    .map(metric => {
      const samples = currentBuckets.get(metric.key) ?? []
      const prevSamples = previousBuckets?.get(metric.key) ?? []
      const avg = averageHours(samples)
      const prevAvg = averageHours(prevSamples.length ? prevSamples : [])

      let trendPercent: number | null = null
      if (avg != null && prevAvg != null && prevAvg > 0) {
        trendPercent = Math.round(((avg - prevAvg) / prevAvg) * 100)
      }

      return {
        key: metric.key,
        label: metric.label,
        averageLabel: formatAverageHours(avg),
        averageHours: avg,
        sampleCount: samples.length,
        previousAverageLabel: previousBuckets ? formatAverageHours(prevAvg) : null,
        previousAverageHours: prevAvg,
        previousSampleCount: prevSamples.length,
        trendPercent,
      }
    })
    .filter(metric => metric.sampleCount > 0 || metric.previousSampleCount > 0)
}

export function computeTimelineMetrics(
  projects: Project[],
  historyByProject: Map<string, StageHistory[]>,
  holidays: string[],
  holdPeriodsByProjectId: Record<string, HoldPeriod[]>,
  month: string,
  channelDbName?: string | null,
): TimelineMetrics {
  const stageMetrics = timelineStageMetricsForChannel(channelDbName)
  const currentBuckets = collectTimelineBuckets(
    stageMetrics,
    projects,
    historyByProject,
    holidays,
    holdPeriodsByProjectId,
    month,
    channelDbName,
  )

  const comparisonMonth = previousCalendarMonth(month)
  const previousBuckets = comparisonMonth
    ? collectTimelineBuckets(
      stageMetrics,
      projects,
      historyByProject,
      holidays,
      holdPeriodsByProjectId,
      comparisonMonth,
      channelDbName,
    )
    : null

  return {
    metrics: buildTimelineMetrics(stageMetrics, currentBuckets, previousBuckets),
    comparisonMonth,
  }
}
