/** Shared external-intake pipeline (Zerodha Online, Cash & Copium, Zerodha Backoffice, …). */

export const CASH_AND_COPIUM_CHANNEL_DB_NAME = 'Cash & Copium'
export const CASH_AND_COPIUM_CHANNEL_SLUG = 'cash-and-copium'

export const ZERODHA_BACKOFFICE_CHANNEL_DB_NAME = 'Zerodha Backoffice'
export const ZERODHA_BACKOFFICE_CHANNEL_SLUG = 'zerodha-backoffice'

/** @deprecated Renamed to Zerodha Backoffice — kept for legacy rows/cookies */
export const LEGACY_BEYOND_ZERODHA_CHANNEL_DB_NAME = 'Beyond Zerodha'
export const LEGACY_BEYOND_ZERODHA_CHANNEL_SLUG = 'beyond-zerodha'

export const CASH_AND_COPIUM_CONTENT_TYPES = ['Long-Form', 'Reel'] as const

export type ReelTimestampPair = { start: string; end: string }

const CASH_COPIUM_STYLE_DB_NAMES = new Set<string>([
  CASH_AND_COPIUM_CHANNEL_DB_NAME,
  ZERODHA_BACKOFFICE_CHANNEL_DB_NAME,
  LEGACY_BEYOND_ZERODHA_CHANNEL_DB_NAME,
])

const CASH_COPIUM_STYLE_SLUGS = new Set<string>([
  CASH_AND_COPIUM_CHANNEL_SLUG,
  ZERODHA_BACKOFFICE_CHANNEL_SLUG,
  LEGACY_BEYOND_ZERODHA_CHANNEL_SLUG,
])

/** Same pipeline, SLAs, and intake UX as Cash & Copium. */
export function isCashAndCopiumChannelDbName(channel: string | null | undefined): boolean {
  return !!channel && CASH_COPIUM_STYLE_DB_NAMES.has(channel)
}

export function isCashAndCopiumChannelSlug(slug: string | null | undefined): boolean {
  return !!slug && CASH_COPIUM_STYLE_SLUGS.has(slug)
}

export function usesExternalIntakeFlow(channel: string | null | undefined): boolean {
  return channel === 'Zerodha Online' || isCashAndCopiumChannelDbName(channel)
}

export function externalIntakeChannelSlug(channelDbName: string | null | undefined): string | null {
  if (channelDbName === 'Zerodha Online') return 'zerodha-online'
  if (
    channelDbName === ZERODHA_BACKOFFICE_CHANNEL_DB_NAME
    || channelDbName === LEGACY_BEYOND_ZERODHA_CHANNEL_DB_NAME
  ) {
    return ZERODHA_BACKOFFICE_CHANNEL_SLUG
  }
  if (channelDbName === CASH_AND_COPIUM_CHANNEL_DB_NAME) return CASH_AND_COPIUM_CHANNEL_SLUG
  return null
}

export function requiresIntroTimelineOnFirstCutReview(channel: string | null | undefined): boolean {
  return isCashAndCopiumChannelDbName(channel)
}
