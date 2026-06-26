import {
  FileText, Palette, Film, Image, Music, Scissors, MessageSquare,
  Sparkles, Layers, CheckCircle2, type LucideIcon,
} from 'lucide-react'
import { FINAL_STAGE, HEALTH_SCORES, STAGES_INTERNAL, VARSITY_IPS } from '@/lib/constants'
import { cn } from '@/lib/utils'

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

/** Solid accent colors for IP identification on board cards */
const IP_ACCENT_PALETTE = [
  { border: 'border-violet-500', bg: 'bg-violet-500', ring: 'ring-violet-200', pill: 'bg-violet-600 border-violet-600' },
  { border: 'border-purple-500', bg: 'bg-purple-500', ring: 'ring-purple-200', pill: 'bg-purple-600 border-purple-600' },
  { border: 'border-pink-500', bg: 'bg-pink-500', ring: 'ring-pink-200', pill: 'bg-pink-600 border-pink-600' },
  { border: 'border-fuchsia-500', bg: 'bg-fuchsia-500', ring: 'ring-fuchsia-200', pill: 'bg-fuchsia-600 border-fuchsia-600' },
  { border: 'border-rose-500', bg: 'bg-rose-500', ring: 'ring-rose-200', pill: 'bg-rose-600 border-rose-600' },
  { border: 'border-orange-500', bg: 'bg-orange-500', ring: 'ring-orange-200', pill: 'bg-orange-600 border-orange-600' },
  { border: 'border-amber-500', bg: 'bg-amber-500', ring: 'ring-amber-200', pill: 'bg-amber-600 border-amber-600' },
  { border: 'border-lime-500', bg: 'bg-lime-500', ring: 'ring-lime-200', pill: 'bg-lime-600 border-lime-600' },
  { border: 'border-emerald-500', bg: 'bg-emerald-500', ring: 'ring-emerald-200', pill: 'bg-emerald-600 border-emerald-600' },
  { border: 'border-teal-500', bg: 'bg-teal-500', ring: 'ring-teal-200', pill: 'bg-teal-600 border-teal-600' },
  { border: 'border-cyan-500', bg: 'bg-cyan-500', ring: 'ring-cyan-200', pill: 'bg-cyan-600 border-cyan-600' },
  { border: 'border-indigo-500', bg: 'bg-indigo-500', ring: 'ring-indigo-200', pill: 'bg-indigo-600 border-indigo-600' },
] as const

function ipColorIndex(ip: string): number {
  const known = VARSITY_IPS.indexOf(ip as typeof VARSITY_IPS[number])
  if (known >= 0) return known % IP_ACCENT_PALETTE.length
  let hash = 0
  for (let i = 0; i < ip.length; i++) hash = (hash + ip.charCodeAt(i) * 17) % IP_ACCENT_PALETTE.length
  return hash
}

export function getIpAccent(ip: string) {
  return IP_ACCENT_PALETTE[ipColorIndex(ip)]
}

export function getIpCardBorderClass(ip: string, muted = false): string {
  const accent = getIpAccent(ip)
  return cn(
    'border-[3px] bg-white shadow-sm',
    accent.border,
    muted && 'opacity-90 bg-zinc-50/40'
  )
}

export function getIpPillClass(ip: string, active: boolean): string {
  const accent = getIpAccent(ip)
  if (active) return cn('text-white', accent.pill)
  return 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'
}
