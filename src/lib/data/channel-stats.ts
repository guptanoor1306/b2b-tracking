import { Project } from '@/lib/types'
import { liveStudiosChannels } from '@/lib/channels'
import { FINAL_STAGE, HEALTH_SCORES } from '@/lib/constants'
import { computeOverviewTotals, periodLabel, type Period } from '@/lib/data/ip-stats'
import { isDeliveredInMonth, isProjectRelevantInMonth } from '@/lib/utils'
import { format, startOfWeek, endOfWeek } from 'date-fns'

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

function isProjectRelevantInPeriod(p: Project, period: Period, anchor: Date): boolean {
  if (period === 'month') {
    const month = format(anchor, 'yyyy-MM')
    if (p.current_stage === FINAL_STAGE) return isDeliveredInMonth(p, month)
    return isProjectRelevantInMonth(p, month)
  }

  const start = format(startOfWeek(anchor, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const end = format(endOfWeek(anchor, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  if (p.current_stage === FINAL_STAGE) {
    const delivered = p.delivered_date?.slice(0, 10)
    return !!delivered && delivered >= start && delivered <= end
  }

  const lifecycle = (
    p.received_date
    ?? p.picked_up_date
    ?? p.created_at
    ?? p.last_status_update_at
  )?.slice(0, 10)
  if (!lifecycle) return true
  if (lifecycle > end) return false
  if (p.delivered_date && p.delivered_date.slice(0, 10) < start) return false
  return true
}

export function computeChannelStats(
  projects: Project[],
  memberCounts: Record<string, number>,
  period: Period,
  anchor = new Date()
): ChannelStats[] {
  return liveStudiosChannels().map(ch => {
    const allChannelProjects = projects.filter(p => p.channel === ch.dbName)
    const source = allChannelProjects.filter(p => isProjectRelevantInPeriod(p, period, anchor))

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
