import { cn } from '@/lib/utils'

const PALETTE = [
  'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  'bg-violet-500/20 text-violet-300 border-violet-500/30',
  'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  'bg-amber-500/20 text-amber-300 border-amber-500/30',
  'bg-rose-500/20 text-rose-300 border-rose-500/30',
]

export function assigneeInitials(name: string): string {
  return name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

export function assigneeColor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i) * (i + 1)) % PALETTE.length
  return PALETTE[hash]
}

const PALETTE_LIGHT = [
  'bg-violet-100 text-violet-700 border-violet-200',
  'bg-indigo-100 text-indigo-700 border-indigo-200',
  'bg-sky-100 text-sky-700 border-sky-200',
  'bg-emerald-100 text-emerald-700 border-emerald-200',
  'bg-amber-100 text-amber-700 border-amber-200',
  'bg-rose-100 text-rose-700 border-rose-200',
]

type Props = {
  name: string
  id?: string
  avatarUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
  active?: boolean
  theme?: 'dark' | 'light'
  className?: string
}

export function AssigneeAvatar({
  name, id, avatarUrl, size = 'sm', active, theme = 'light', className,
}: Props) {
  const palette = theme === 'light' ? PALETTE_LIGHT : PALETTE
  let hash = 0
  for (let i = 0; i < (id ?? name).length; i++) hash = (hash + (id ?? name).charCodeAt(i) * (i + 1)) % palette.length
  const color = palette[hash]
  const dim = size === 'sm'
    ? 'h-6 w-6 text-[9px]'
    : size === 'lg'
      ? 'h-16 w-16 text-sm'
      : 'h-8 w-8 text-[10px]'
  const ring = active && (theme === 'light'
    ? 'ring-2 ring-violet-500 ring-offset-1 ring-offset-white'
    : 'ring-2 ring-violet-400 ring-offset-1 ring-offset-zinc-100')

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        title={name}
        className={cn(
          'inline-block rounded-full border border-zinc-200 object-cover shrink-0 bg-zinc-100',
          dim,
          ring,
          className,
        )}
      />
    )
  }

  return (
    <span
      title={name}
      className={cn(
        'inline-flex items-center justify-center rounded-full border font-semibold shrink-0',
        dim,
        color,
        ring,
        className
      )}
    >
      {assigneeInitials(name)}
    </span>
  )
}
