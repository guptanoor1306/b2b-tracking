/** Shared external-intake pipeline (Zerodha Online, Cash & Copium, …). */

export const CASH_AND_COPIUM_CHANNEL_DB_NAME = 'Cash & Copium'
export const CASH_AND_COPIUM_CHANNEL_SLUG = 'cash-and-copium'

export const CASH_AND_COPIUM_CONTENT_TYPES = ['Long-Form', 'Reel'] as const

export type ReelTimestampPair = { start: string; end: string }

export function isCashAndCopiumChannelDbName(channel: string | null | undefined): boolean {
  return channel === CASH_AND_COPIUM_CHANNEL_DB_NAME
}

export function isCashAndCopiumChannelSlug(slug: string | null | undefined): boolean {
  return slug === CASH_AND_COPIUM_CHANNEL_SLUG
}

export function usesExternalIntakeFlow(channel: string | null | undefined): boolean {
  return channel === 'Zerodha Online' || isCashAndCopiumChannelDbName(channel)
}

export function externalIntakeChannelSlug(channelDbName: string | null | undefined): string | null {
  if (channelDbName === 'Zerodha Online') return 'zerodha-online'
  if (isCashAndCopiumChannelDbName(channelDbName)) return CASH_AND_COPIUM_CHANNEL_SLUG
  return null
}

export function requiresIntroTimelineOnFirstCutReview(channel: string | null | undefined): boolean {
  return isCashAndCopiumChannelDbName(channel)
}
