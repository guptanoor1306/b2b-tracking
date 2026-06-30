export const CHANNEL = 'Varsity'

export const VARSITY_IPS = [
  'Personal Finance',
  'Wealth',
  'Insurance',
  'Education',
  'Markets',
  'Tax Planning',
  'Credit & Loans',
  'Retirement',
  'Real Estate',
  'Career & Income',
] as const

export const CONTENT_TYPES = [
  'Long-Form',
  'Short-Form',
  'Mid-Form',
  'Reel',
  'Podcast',
] as const

export const LEVELS_OF_VIDEO = [
  'Level 1',
  'Level 2',
  'Level 3',
] as const

export const PRIORITIES = ['High', 'Medium', 'Low'] as const

export const ROLES = [
  'Channel Admin',
  'Channel Team',
  'Agency',
  'Zerodha Viewer',
  'Super Admin',
] as const

/** Roles assignable per channel (not Super Admin) */
export const CHANNEL_MEMBER_ROLES = [
  'Channel Admin',
  'Channel Team',
  'Agency',
  'Zerodha Viewer',
] as const

export const GLOBAL_ROLES = ['Super Admin', 'Member'] as const

export const ROLE_LABELS: Record<string, string> = {
  'Channel Admin': 'Channel Admin',
  'Channel Team': 'Channel Team',
  'Agency': 'External Agency',
  'Zerodha Viewer': 'External Client',
  'Super Admin': 'Super Admin',
  'Member': 'Member',
}

export const SUPER_ADMIN_ROLES = ['Super Admin'] as const
export const CHANNEL_ADMIN_ROLES = ['Channel Admin', 'Super Admin'] as const
/** @deprecated use CHANNEL_ADMIN_ROLES */
export const ADMIN_ROLES = CHANNEL_ADMIN_ROLES
export const INTERNAL_ROLES = ['Channel Admin', 'Channel Team', 'Super Admin'] as const
export const EXTERNAL_ROLES = ['Agency', 'Zerodha Viewer'] as const
export const BOARD_FULL_ACCESS_ROLES = ['Channel Admin', 'Channel Team', 'Super Admin'] as const

export const STAGES_INTERNAL = [
  'Video received',
  'First Cut',
  'First Cut sent for Review',
  'Thumbnail Copy + RP Cuts',
  'First Cut Changes',
  'Storyboard',
  'Graphics & VD',
  'Animation & VD',
  'Video/Thumbnail Review',
  'Final Changes',
  'Sound',
  'Final Delivery',
] as const

export const STAGES_EXTERNAL = [
  'Video received',
  'First Cut sent for Review',
  'Thumbnail Copy + RP Cuts',
  'Video/Thumbnail Review',
  'Final Delivery',
] as const

export const STAGES = STAGES_INTERNAL

export const EXTERNAL_STAGE_ANCHORS: Record<string, string> = {
  'Video received': 'Video received',
  'First Cut sent for Review': 'First Cut sent for Review',
  'Thumbnail Copy + RP Cuts': 'Thumbnail Copy + RP Cuts',
  'Video/Thumbnail Review': 'Video/Thumbnail Review',
  'Final Delivery': 'Final Delivery',
}

export const STAGE_ROLE_OWNER: Record<string, string> = {
  'Video received': 'Internal',
  'First Cut': 'Editor',
  'First Cut sent for Review': 'External Team',
  'Thumbnail Copy + RP Cuts': 'External Team',
  'First Cut Changes': 'Editor',
  'Storyboard': 'Writer',
  'Graphics & VD': 'Designer',
  'Animation & VD': 'Editor',
  'Video/Thumbnail Review': 'External Team',
  'Final Changes': 'Editor',
  'Sound': 'Sound Designer',
  'Final Delivery': 'Internal',
}

export const HEALTH_COLORS: Record<string, string> = {
  'On track':     'bg-emerald-50 text-emerald-700 border border-emerald-200',
  'At risk':      'bg-amber-50 text-amber-700 border border-amber-200',
  'Delayed':      'bg-orange-50 text-orange-700 border border-orange-200',
  'On hold':      'bg-zinc-100 text-zinc-600 border border-zinc-200',
  'Delivered':    'bg-emerald-50 text-emerald-700 border border-emerald-200',
  'In pipeline':  'bg-violet-50 text-violet-700 border border-violet-200',
}

const STAGE_COLOR_PALETTE = [
  'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  'bg-violet-500/10 text-violet-400 border border-violet-500/25',
  'bg-purple-500/10 text-purple-400 border border-purple-500/25',
  'bg-pink-500/10 text-pink-400 border border-pink-500/25',
  'bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/25',
  'bg-rose-500/10 text-rose-400 border border-rose-500/25',
  'bg-orange-500/10 text-orange-400 border border-orange-500/25',
  'bg-amber-500/10 text-amber-400 border border-amber-500/25',
  'bg-yellow-500/10 text-yellow-400 border border-yellow-500/25',
  'bg-lime-500/10 text-lime-400 border border-lime-500/25',
  'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25',
  'bg-teal-500/10 text-teal-400 border border-teal-500/25',
]

export const STAGE_COLORS: Record<string, string> = Object.fromEntries(
  STAGES_INTERNAL.map((s, i) => [s, STAGE_COLOR_PALETTE[i % STAGE_COLOR_PALETTE.length]])
)

export type StageOwner = 'internal' | 'external' | 'none'

export const STAGE_PIPELINE: Record<string, { owner: StageOwner; label: string }> = {
  'Video received':                   { owner: 'internal', label: 'Video received' },
  'First Cut':                        { owner: 'internal', label: 'First cut in progress' },
  'First Cut sent for Review':        { owner: 'external', label: 'First cut sent for review' },
  'Thumbnail Copy + RP Cuts':         { owner: 'external', label: 'Thumbnail copy & RP cuts' },
  'First Cut Changes':                { owner: 'internal', label: 'First cut changes' },
  'Storyboard':                       { owner: 'internal', label: 'Storyboard in progress' },
  'Graphics & VD':                    { owner: 'internal', label: 'Graphics & visual direction' },
  'Animation & VD':                   { owner: 'internal', label: 'Animation & visual direction' },
  'Video/Thumbnail Review':           { owner: 'external', label: 'Video/thumbnail review' },
  'Final Changes':                    { owner: 'internal', label: 'Final changes' },
  'Sound':                            { owner: 'internal', label: 'Sound design' },
  'Final Delivery':                   { owner: 'none',     label: 'Delivered' },
}

export const FINAL_STAGE = 'Final Delivery'

export const HEALTH_SCORES: Record<string, number> = {
  'On track': 100,
  'Delivered': 100,
  'At risk': 70,
  'On hold': 50,
  'Delayed': 40,
}

export const IP_COLORS: Record<string, string> = Object.fromEntries(
  VARSITY_IPS.map((ip, i) => [
    ip,
    STAGE_COLOR_PALETTE[i % STAGE_COLOR_PALETTE.length],
  ])
)

export const DUAL_ASSIGNEE_STAGES = ['Graphics & VD', 'Animation & VD'] as const
export const FIRST_CUT_STAGE = 'First Cut'
export const STORYBOARD_STAGE = 'Storyboard'
export const GRAPHICS_VD_STAGE = 'Graphics & VD'
export const ANIMATION_VD_STAGE = 'Animation & VD'
export const VD_PARALLEL_GROUP = 'vd_bundle'
