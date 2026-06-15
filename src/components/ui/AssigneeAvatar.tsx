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

type Props = {
  name: string
  id?: string
  size?: 'sm' | 'md'
  active?: boolean
  className?: string
}

export function AssigneeAvatar({ name, id, size = 'sm', active, className }: Props) {
  const color = assigneeColor(id ?? name)
  const dim = size === 'sm' ? 'h-6 w-6 text-[9px]' : 'h-8 w-8 text-[10px]'

  return (
    <span
      title={name}
      className={cn(
        'inline-flex items-center justify-center rounded-full border font-semibold shrink-0',
        dim,
        color,
        active && 'ring-2 ring-indigo-400 ring-offset-1 ring-offset-[#0a0a0a]',
        className
      )}
    >
      {assigneeInitials(name)}
    </span>
  )
}
