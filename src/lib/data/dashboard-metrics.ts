import { HoldPeriod, Project, StageHistory } from '@/lib/types'
import {
  ZERODHA_REQUEST_RECEIVED,
  ZERODHA_READY_TO_PRODUCE,
  ZERODHA_FIRST_CUT_REVIEW,
  ZERODHA_FIRST_DRAFT_REVIEW,
  ZERODHA_SECOND_DRAFT_REVIEW,
  normalizeZerodhaBoardStage,
} from '@/lib/zerodha-sla'
import { computeStageDurations, isAllMonths, isDeliveredInMonth, isProjectRelevantInMonth } from '@/lib/utils'

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
  sampleCount: number
}

export type TimelineMetrics = {
  metrics: TimelineMetric[]
}

const TIMELINE_STAGE_METRICS: { key: string; label: string; stage: string }[] = [
  { key: 'request_response', label: 'Request response', stage: ZERODHA_REQUEST_RECEIVED },
  { key: 'ready_to_produce', label: 'Ready to produce → picked', stage: ZERODHA_READY_TO_PRODUCE },
  { key: 'first_cut_review', label: '1st Cut Review', stage: ZERODHA_FIRST_CUT_REVIEW },
  { key: 'first_draft_review', label: '1st Draft Review', stage: ZERODHA_FIRST_DRAFT_REVIEW },
  { key: 'second_draft_review', label: '2nd Draft Review', stage: ZERODHA_SECOND_DRAFT_REVIEW },
]

export function computeOnTimeDeliveryStats(onTime: number, late: number): OnTimeDeliveryStats {
  const total = onTime + late
  return {
    onTime,
    late,
    total,
    rate: total > 0 ? Math.round((onTime / total) * 100) : null,
  }
}

function projectsInMetricsScope(projects: Project[], month: string): Project[] {
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

export function computeTimelineMetrics(
  projects: Project[],
  historyByProject: Map<string, StageHistory[]>,
  holidays: string[],
  holdPeriodsByProjectId: Record<string, HoldPeriod[]>,
  month: string,
): TimelineMetrics {
  const scoped = projectsInMetricsScope(projects, month)
  const buckets = new Map<string, number[]>(
    TIMELINE_STAGE_METRICS.map(metric => [metric.key, []]),
  )

  for (const project of scoped) {
    const history = historyByProject.get(project.id) ?? []
    if (!history.length) continue

    const durations = computeStageDurations(
      history,
      holidays,
      holdPeriodsByProjectId[project.id] ?? [],
    )

    for (const duration of durations) {
      const normalized = normalizeZerodhaBoardStage(duration.stage)
      const metric = TIMELINE_STAGE_METRICS.find(item => item.stage === normalized)
      if (!metric || duration.totalBusinessHours <= 0) continue
      buckets.get(metric.key)?.push(duration.totalBusinessHours)
    }
  }

  return {
    metrics: TIMELINE_STAGE_METRICS.map(metric => {
      const samples = buckets.get(metric.key) ?? []
      const avg = averageHours(samples)
      return {
        key: metric.key,
        label: metric.label,
        averageLabel: formatAverageHours(avg),
        sampleCount: samples.length,
      }
    }).filter(metric => metric.sampleCount > 0),
  }
}
