import { HoldPeriod } from '@/lib/types'

/** Auto-generated notes — not shown as a user-facing hold reason. */
export const SYSTEM_HOLD_NOTES = new Set([
  'Project put on hold',
  'Project on hold',
  'Backfilled open hold',
  'Project resumed',
])

export function getOpenHoldPeriod(holdPeriods: HoldPeriod[]): HoldPeriod | null {
  return holdPeriods.find(h => !h.ended_at) ?? null
}

export function displayHoldReason(note: string | null | undefined): string | null {
  if (!note?.trim()) return null
  if (SYSTEM_HOLD_NOTES.has(note.trim())) return null
  return note.trim()
}
