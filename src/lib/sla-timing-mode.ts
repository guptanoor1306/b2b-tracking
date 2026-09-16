import { isLaSocialChannelDbName } from '@/lib/la-social-sla'
import type { BusinessHoursMode } from '@/lib/businessTime'

/** IST office window (10:30–18:30) for elapsed SLA time — LA Social only. */
export function businessHoursModeForChannel(channel: string | null | undefined): BusinessHoursMode {
  return isLaSocialChannelDbName(channel) ? 'work' : 'calendar'
}
