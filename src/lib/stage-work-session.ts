import type { StageWorkSession } from '@/lib/types'

export function openStageWorkSession(
  sessions: StageWorkSession[] | undefined,
  currentStage: string,
): StageWorkSession | null {
  if (!sessions?.length) return null
  return sessions.find(s => !s.ended_at && s.stage_name === currentStage) ?? null
}

export function openStageWorkStartedAt(
  sessions: StageWorkSession[] | undefined,
  currentStage: string,
): string | null {
  return openStageWorkSession(sessions, currentStage)?.started_at ?? null
}
