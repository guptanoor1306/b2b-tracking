import {
  FileText, Palette, Film, Image, Music, Scissors, MessageSquare,
  Sparkles, Layers, CheckCircle2, type LucideIcon,
} from 'lucide-react'
import { FINAL_STAGE, HEALTH_SCORES, STAGES_INTERNAL } from '@/lib/constants'

const STAGE_ICON_MAP: Record<string, LucideIcon> = {
  'Video received': Film,
  'First Cut': Scissors,
  'First Cut sent for Review': MessageSquare,
  'Thumbnail Copy + RP Cuts': Image,
  'First Cut Changes': Scissors,
  'Storyboard': Layers,
  'Graphics & VD': Palette,
  'Animation & VD': Sparkles,
  'Video/Thumbnail Review': MessageSquare,
  'Final Changes': Scissors,
  'Sound': Music,
  'Final Delivery': CheckCircle2,
}

const STAGE_ICON_BG = [
  'bg-violet-100 text-violet-600',
  'bg-indigo-100 text-indigo-600',
  'bg-sky-100 text-sky-600',
  'bg-pink-100 text-pink-600',
  'bg-amber-100 text-amber-600',
  'bg-emerald-100 text-emerald-600',
  'bg-teal-100 text-teal-600',
  'bg-orange-100 text-orange-600',
]

export function getStageIcon(stage: string): LucideIcon {
  return STAGE_ICON_MAP[stage] ?? Layers
}

export function getStageIconBg(index: number): string {
  return STAGE_ICON_BG[index % STAGE_ICON_BG.length]
}

export function pipelineProgressPercent(currentStage: string): number {
  const stage = currentStage
  if (stage === FINAL_STAGE) return 100
  const idx = STAGES_INTERNAL.indexOf(stage as (typeof STAGES_INTERNAL)[number])
  if (idx < 0) return 0
  return Math.round((idx / (STAGES_INTERNAL.length - 1)) * 100)
}

export const HEALTH_PILL_V2: Record<string, string> = {
  'On track':  'bg-emerald-50 text-emerald-700 border-emerald-200',
  'At risk':   'bg-amber-50 text-amber-700 border-amber-200',
  'Delayed':   'bg-orange-50 text-orange-700 border-orange-200',
  'On hold':   'bg-zinc-100 text-zinc-600 border-zinc-200',
  'Delivered': 'bg-emerald-50 text-emerald-700 border-emerald-200',
}

export function healthScore(health: string): number {
  return HEALTH_SCORES[health] ?? 75
}

export function healthLabel(health: string): string {
  if (health === 'On track') return 'ON TRACK'
  if (health === 'Delivered') return 'DELIVERED'
  if (health === 'At risk') return 'AT RISK'
  if (health === 'Delayed') return 'DELAYED'
  if (health === 'On hold') return 'ON HOLD'
  return health.toUpperCase()
}

export function getTimelinessCardClassV2(
  status: 'on_time' | 'delayed' | 'delivered' | 'on_hold'
): string {
  if (status === 'on_hold') return 'border-zinc-300 bg-zinc-50 shadow-sm'
  if (status === 'delivered') return 'border-emerald-200 bg-white shadow-sm'
  if (status === 'delayed') return 'border-orange-200 bg-orange-50/30 shadow-sm'
  return 'border-emerald-200/80 bg-white shadow-sm'
}

export function getTimelinessTextClassV2(
  status: 'on_time' | 'delayed' | 'delivered' | 'on_hold'
): string {
  if (status === 'on_hold') return 'text-zinc-600'
  if (status === 'delayed') return 'text-orange-600'
  if (status === 'delivered') return 'text-emerald-600'
  return 'text-zinc-500'
}

const COLUMN_ACCENTS = [
  { dot: 'bg-zinc-400', border: 'border-zinc-300', bg: 'bg-zinc-50/50' },
  { dot: 'bg-violet-500', border: 'border-violet-300', bg: 'bg-zinc-50/50' },
  { dot: 'bg-zinc-500', border: 'border-zinc-400', bg: 'bg-zinc-50/50' },
  { dot: 'bg-violet-400', border: 'border-violet-200', bg: 'bg-zinc-50/50' },
]

export function getColumnAccent(index: number) {
  return COLUMN_ACCENTS[index % COLUMN_ACCENTS.length]
}

export function welcomeFirstName(name: string): string {
  const first = name.trim().split(/\s+/)[0]
  return first || name
}
