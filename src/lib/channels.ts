/** LearnApp Studios — channel registry */
export type StudioChannel = {
  slug: string
  name: string
  dbName: string
  tagline: string
  initial: string
  /** Tailwind gradient stops for card */
  gradientFrom: string
  gradientTo: string
  accent: string
  ring: string
  pillBg: string
}

export const STUDIOS_CHANNELS: StudioChannel[] = [
  {
    slug: 'varsity',
    name: 'Varsity',
    dbName: 'Varsity',
    tagline: 'Personal finance & investing content',
    initial: 'V',
    gradientFrom: 'from-violet-500',
    gradientTo: 'to-purple-600',
    accent: 'text-violet-600',
    ring: 'ring-violet-200',
    pillBg: 'bg-violet-600',
  },
  {
    slug: 'zerodha-online',
    name: 'Zerodha Online',
    dbName: 'Zerodha Online',
    tagline: 'Trading & markets education',
    initial: 'ZO',
    gradientFrom: 'from-blue-500',
    gradientTo: 'to-cyan-600',
    accent: 'text-blue-600',
    ring: 'ring-blue-200',
    pillBg: 'bg-blue-600',
  },
  {
    slug: 'tharun',
    name: 'Tharun',
    dbName: 'Tharun',
    tagline: 'Creator channel',
    initial: 'T',
    gradientFrom: 'from-orange-500',
    gradientTo: 'to-amber-600',
    accent: 'text-orange-600',
    ring: 'ring-orange-200',
    pillBg: 'bg-orange-600',
  },
  {
    slug: 'rohit',
    name: 'Rohit',
    dbName: 'Rohit',
    tagline: 'Creator channel',
    initial: 'R',
    gradientFrom: 'from-rose-500',
    gradientTo: 'to-pink-600',
    accent: 'text-rose-600',
    ring: 'ring-rose-200',
    pillBg: 'bg-rose-600',
  },
  {
    slug: 'abid-bhuvan',
    name: 'Abid-Bhuvan',
    dbName: 'Abid-Bhuvan',
    tagline: 'Creator channel',
    initial: 'AB',
    gradientFrom: 'from-fuchsia-500',
    gradientTo: 'to-purple-600',
    accent: 'text-fuchsia-600',
    ring: 'ring-fuchsia-200',
    pillBg: 'bg-fuchsia-600',
  },
  {
    slug: 'karthik-insta',
    name: 'Karthik Insta',
    dbName: 'Karthik Insta',
    tagline: 'Instagram-first content',
    initial: 'KI',
    gradientFrom: 'from-pink-500',
    gradientTo: 'to-rose-600',
    accent: 'text-pink-600',
    ring: 'ring-pink-200',
    pillBg: 'bg-pink-600',
  },
  {
    slug: 'leap-finance',
    name: 'Leap Finance',
    dbName: 'Leap Finance',
    tagline: 'Finance education',
    initial: 'LF',
    gradientFrom: 'from-emerald-500',
    gradientTo: 'to-teal-600',
    accent: 'text-emerald-600',
    ring: 'ring-emerald-200',
    pillBg: 'bg-emerald-600',
  },
  {
    slug: 'capital-mind',
    name: 'Capital Mind',
    dbName: 'Capital Mind',
    tagline: 'Markets & macro',
    initial: 'CM',
    gradientFrom: 'from-indigo-500',
    gradientTo: 'to-violet-600',
    accent: 'text-indigo-600',
    ring: 'ring-indigo-200',
    pillBg: 'bg-indigo-600',
  },
  {
    slug: 'sensibull',
    name: 'Sensibull',
    dbName: 'Sensibull',
    tagline: 'Options & derivatives',
    initial: 'S',
    gradientFrom: 'from-teal-500',
    gradientTo: 'to-cyan-600',
    accent: 'text-teal-600',
    ring: 'ring-teal-200',
    pillBg: 'bg-teal-600',
  },
]

export const ACTIVE_CHANNEL_COOKIE = 'active_channel'

export function getChannelBySlug(slug: string): StudioChannel | undefined {
  return STUDIOS_CHANNELS.find(c => c.slug === slug)
}

export function getChannelByDbName(dbName: string): StudioChannel | undefined {
  return STUDIOS_CHANNELS.find(c => c.dbName === dbName)
}

export function slugToDbName(slug: string): string | null {
  return getChannelBySlug(slug)?.dbName ?? null
}

export function allChannelSlugs(): string[] {
  return STUDIOS_CHANNELS.map(c => c.slug)
}
