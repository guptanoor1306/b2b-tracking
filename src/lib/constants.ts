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
  'Level 4',
] as const

export const PRIORITIES = ['High', 'Medium', 'Low'] as const

export const ROLES = [
  'Admin',
  'Internal Team',
  'Agency',
  'Zerodha Viewer',
  'Super Admin',
] as const

export const ROLE_LABELS: Record<string, string> = {
  'Admin': 'LearnApp Admin',
  'Internal Team': 'LearnApp Team',
  'Agency': 'External Agency',
  'Zerodha Viewer': 'External Client',
  'Super Admin': 'LearnApp Super Admin',
}

export const SUPER_ADMIN_ROLES = ['Super Admin'] as const
export const ADMIN_ROLES = ['Admin', 'Super Admin'] as const
export const INTERNAL_ROLES = ['Admin', 'Internal Team', 'Super Admin'] as const
export const EXTERNAL_ROLES = ['Agency', 'Zerodha Viewer'] as const
export const BOARD_FULL_ACCESS_ROLES = ['Admin', 'Internal Team', 'Super Admin'] as const

export const STAGES_INTERNAL = [
  'Script Received',
  'Visual Direction',
  'Video Data Received',
  'Thumbnail Title Copy Received',
  'First Cut Received',
  'First Cut Review',
  'First Cut Changes',
  'Storyboard',
  'Thumbnails',
  'Graphics Creation',
  'Animation Completion',
  'Sound',
  'Premiere',
  'Video 1st Draft',
  'Feedback from Zerodha',
  'Final Changes',
  'Final Delivery Done',
] as const

export const STAGES_EXTERNAL = [
  'Script Received',
  'Video Data Received',
  'Thumbnail Title Copy Received',
  'First Cut Review',
  'First Cut Changes',
  'Video 1st Draft',
  'Feedback from Zerodha',
  'Final Delivery Done',
] as const

export const STAGES = STAGES_INTERNAL

export const EXTERNAL_STAGE_ANCHORS: Record<string, string> = {
  'Script Received': 'Script Received',
  'Video Data Received': 'Video Data Received',
  'Thumbnail Title Copy Received': 'Thumbnail Title Copy Received',
  'First Cut Review': 'First Cut Review',
  'First Cut Changes': 'First Cut Changes',
  'Video 1st Draft': 'Video 1st Draft',
  'Feedback from Zerodha': 'Feedback from Zerodha',
  'Final Delivery Done': 'Final Delivery Done',
}

export const HEALTH_COLORS: Record<string, string> = {
  'On track':     'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30',
  'At risk':      'bg-amber-500/10 text-amber-400 border border-amber-500/30',
  'Delayed':      'bg-rose-500/10 text-rose-400 border border-rose-500/30',
  'On hold':      'bg-zinc-500/10 text-zinc-400 border border-zinc-500/25',
  'Delivered':    'bg-sky-500/10 text-sky-400 border border-sky-500/30',
  'In pipeline':  'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30',
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
  'bg-cyan-500/10 text-cyan-400 border border-cyan-500/25',
  'bg-sky-500/10 text-sky-400 border border-sky-500/25',
  'bg-blue-500/10 text-blue-400 border border-blue-500/25',
]

export const STAGE_COLORS: Record<string, string> = Object.fromEntries(
  STAGES_INTERNAL.map((s, i) => [s, STAGE_COLOR_PALETTE[i % STAGE_COLOR_PALETTE.length]])
)

export type StageOwner = 'internal' | 'external' | 'none'

export const STAGE_PIPELINE: Record<string, { owner: StageOwner; label: string }> = {
  'Script Received':                  { owner: 'internal', label: 'Script intake' },
  'Visual Direction':                 { owner: 'internal', label: 'Visual direction in progress' },
  'Video Data Received':              { owner: 'internal', label: 'Video data received' },
  'Thumbnail Title Copy Received':    { owner: 'internal', label: 'Thumbnail & title copy' },
  'First Cut Received':               { owner: 'internal', label: 'First cut received' },
  'First Cut Review':                 { owner: 'external', label: 'First cut review with client' },
  'First Cut Changes':                { owner: 'internal', label: 'First cut changes' },
  'Storyboard':                       { owner: 'internal', label: 'Storyboard in progress' },
  'Thumbnails':                       { owner: 'internal', label: 'Thumbnails in progress' },
  'Graphics Creation':                { owner: 'internal', label: 'Graphics creation' },
  'Animation Completion':             { owner: 'internal', label: 'Animation in progress' },
  'Sound':                            { owner: 'internal', label: 'Sound design & mix' },
  'Premiere':                         { owner: 'internal', label: 'Premiere export' },
  'Video 1st Draft':                  { owner: 'internal', label: 'Video 1st draft ready' },
  'Feedback from Zerodha':            { owner: 'external', label: 'Awaiting client feedback' },
  'Final Changes':                    { owner: 'internal', label: 'Final changes in progress' },
  'Final Delivery Done':              { owner: 'none',     label: 'Delivered' },
}

export const FINAL_STAGE = 'Final Delivery Done'

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
