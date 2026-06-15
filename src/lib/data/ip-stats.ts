import { Project } from '@/lib/types'
import { VARSITY_IPS, FINAL_STAGE, HEALTH_SCORES } from '@/lib/constants'
import { parseISO, isValid, startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from 'date-fns'

export type Period = 'week' | 'month'

export type IpStats = {
  ip: string
  total: number
  inPipeline: number
  delivered: number
  onHold: number
  avgQuality: number
  projects: Project[]
}

function inPeriod(dateStr: string | null | undefined, period: Period, anchor: Date): boolean {
  if (!dateStr) return false
  const d = parseISO(dateStr)
  if (!isValid(d)) return false
  const start = period === 'week'
    ? startOfWeek(anchor, { weekStartsOn: 1 })
    : startOfMonth(anchor)
  const end = period === 'week'
    ? endOfWeek(anchor, { weekStartsOn: 1 })
    : endOfMonth(anchor)
  return d >= start && d <= end
}

function projectInPeriod(p: Project, period: Period, anchor: Date): boolean {
  return (
    inPeriod(p.updated_at, period, anchor) ||
    inPeriod(p.received_date, period, anchor) ||
    inPeriod(p.picked_up_date, period, anchor) ||
    inPeriod(p.delivered_date, period, anchor)
  )
}

export function computeIpStats(
  projects: Project[],
  period: Period,
  anchor = new Date()
): IpStats[] {
  const filtered = projects.filter(p => projectInPeriod(p, period, anchor))

  return VARSITY_IPS.map(ip => {
    const ipProjects = filtered.filter(p => p.ip === ip)
    const allIpProjects = projects.filter(p => p.ip === ip)
    const source = ipProjects.length > 0 ? ipProjects : allIpProjects

    const inPipeline = source.filter(
      p => p.current_stage !== FINAL_STAGE && p.status_health !== 'On hold'
    ).length
    const delivered = source.filter(p => p.current_stage === FINAL_STAGE).length
    const onHold = source.filter(p => p.status_health === 'On hold').length
    const scores = source.map(p => HEALTH_SCORES[p.status_health] ?? 75)
    const avgQuality = scores.length
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0

    return {
      ip,
      total: source.length,
      inPipeline,
      delivered,
      onHold,
      avgQuality,
      projects: source,
    }
  })
}

export function periodLabel(period: Period, anchor = new Date()): string {
  if (period === 'week') {
    const start = startOfWeek(anchor, { weekStartsOn: 1 })
    const end = endOfWeek(anchor, { weekStartsOn: 1 })
    return `${format(start, 'dd MMM')} – ${format(end, 'dd MMM yyyy')}`
  }
  return format(anchor, 'MMMM yyyy')
}

export type IpOverviewTotals = {
  totalProjects: number
  inPipeline: number
  delivered: number
  onHold: number
  avgQuality: number
}

export function computeOverviewTotals(stats: IpStats[]): IpOverviewTotals {
  const totalProjects = stats.reduce((a, s) => a + s.total, 0)
  const inPipeline = stats.reduce((a, s) => a + s.inPipeline, 0)
  const delivered = stats.reduce((a, s) => a + s.delivered, 0)
  const onHold = stats.reduce((a, s) => a + s.onHold, 0)
  const withQuality = stats.filter(s => s.avgQuality > 0)
  const avgQuality = withQuality.length
    ? Math.round(withQuality.reduce((a, s) => a + s.avgQuality, 0) / withQuality.length)
    : 0

  return { totalProjects, inPipeline, delivered, onHold, avgQuality }
}
