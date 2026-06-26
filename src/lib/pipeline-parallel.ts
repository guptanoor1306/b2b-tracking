import { StageHistory } from '@/lib/types'
import { normalizeStage, getStageIndex } from '@/lib/timelines'
import {
  STORYBOARD_STAGE,
  GRAPHICS_VD_STAGE,
  ANIMATION_VD_STAGE,
  VD_PARALLEL_GROUP,
} from '@/lib/constants'

export { VD_PARALLEL_GROUP }

/** Entry marking the start of parallel VD work (first stage after Storyboard) */
export function vdParallelAnchorEntry(entries: StageHistory[]): StageHistory | null {
  const idx = entries.findIndex(e => normalizeStage(e.new_stage) === STORYBOARD_STAGE)
  if (idx < 0) return null
  return entries[idx + 1] ?? null
}

/** ISO timestamp when Storyboard finished — start of parallel Graphics + Animation work */
export function vdParallelStartIso(entries: StageHistory[]): string | null {
  return vdParallelAnchorEntry(entries)?.changed_at ?? null
}

export function hasVdParallelStarted(entries: StageHistory[]): boolean {
  return vdParallelStartIso(entries) != null
}

export function hasAnimationHistoryEntry(entries: StageHistory[]): boolean {
  return entries.some(e => normalizeStage(e.new_stage) === ANIMATION_VD_STAGE)
}

/** Animation runs from Storyboard completion, not from when the card enters Animation */
export function effectiveStageStartIso(entries: StageHistory[], entry: StageHistory): string {
  if (normalizeStage(entry.new_stage) === ANIMATION_VD_STAGE) {
    return vdParallelStartIso(entries) ?? entry.changed_at
  }
  return entry.changed_at
}

/** Show Animation timeline row while card is still in Graphics (parallel clock) */
export function shouldShowParallelAnimationRow(
  entries: StageHistory[],
  currentStage?: string,
): boolean {
  if (!hasVdParallelStarted(entries)) return false
  if (hasAnimationHistoryEntry(entries)) return false

  const cur = normalizeStage(currentStage ?? '')
  const curIdx = getStageIndex(cur)
  const gfxIdx = getStageIndex(GRAPHICS_VD_STAGE)
  const animIdx = getStageIndex(ANIMATION_VD_STAGE)
  return curIdx >= gfxIdx && curIdx <= animIdx
}

export function isVdParallelStage(stage: string): boolean {
  const s = normalizeStage(stage)
  return s === GRAPHICS_VD_STAGE || s === ANIMATION_VD_STAGE
}
