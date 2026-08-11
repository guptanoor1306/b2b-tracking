'use server'

import { getSessionProfile } from '@/lib/auth'
import { getActiveChannelDbName, getActiveChannelRole } from '@/lib/channel-context'
import { fetchProjects } from '@/lib/data/projects'
import { isChannelSuperAdmin, isSuperAdmin } from '@/lib/views'
import {
  buildChannelReport,
  ChannelReport,
  decodeReportPeriod,
} from '@/lib/reports/channel-report'

async function assertCanGenerateReport() {
  const profile = await getSessionProfile()
  if (!profile) throw new Error('Unauthorized')
  if (isSuperAdmin(profile.role)) return profile
  const channelRole = await getActiveChannelRole(profile)
  if (!isChannelSuperAdmin(channelRole ?? '')) throw new Error('Unauthorized')
  return profile
}

export async function generateChannelReport(
  periodKey: string,
): Promise<{ report?: ChannelReport; error?: string }> {
  try {
    await assertCanGenerateReport()
  } catch {
    return { error: 'Unauthorized' }
  }

  const period = decodeReportPeriod(periodKey)
  if (!period) return { error: 'Invalid timeframe' }

  const [projects, channelName] = await Promise.all([
    fetchProjects(),
    getActiveChannelDbName(),
  ])

  const report = buildChannelReport({
    projects,
    period,
    channelName,
  })

  return { report }
}
