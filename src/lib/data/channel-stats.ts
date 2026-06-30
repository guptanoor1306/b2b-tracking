import { Project } from '@/lib/types'
import { STUDIOS_CHANNELS } from '@/lib/channels'
import { FINAL_STAGE, HEALTH_SCORES } from '@/lib/constants'
import { computeOverviewTotals, periodLabel, type Period } from '@/lib/data/ip-stats'
import { parseISO, isValid, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'

export type ChannelStats = {
  slug: string
  name: string
  tagline: string
  total: number
  inPipeline: number
  delivered: number
  onHold: number
  avgQuality: number
  memberCount: number
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

export function computeChannelStats(
  projects: Project[],
  memberCounts: Record<string, number>,
  period: Period,
  anchor = new Date()
): ChannelStats[] {
  const filtered = projects.filter(p => projectInPeriod(p, period, anchor))

  return STUDIOS_CHANNELS.map(ch => {
    const channelProjects = filtered.filter(p => p.channel === ch.dbName)
    const allChannelProjects = projects.filter(p => p.channel === ch.dbName)
    const source = channelProjects.length > 0 ? channelProjects : allChannelProjects

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
      slug: ch.slug,
      name: ch.name,
      tagline: ch.tagline,
      total: source.length,
      inPipeline,
      delivered,
      onHold,
      avgQuality,
      memberCount: memberCounts[ch.slug] ?? 0,
    }
  })
}

export { computeOverviewTotals, periodLabel }
