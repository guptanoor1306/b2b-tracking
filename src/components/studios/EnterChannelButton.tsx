'use client'

import { useTransition } from 'react'
import { enterChannel } from '@/lib/actions/channels'
import { cn } from '@/lib/utils'
import { ArrowUpRight, Loader2 } from 'lucide-react'

type Props = {
  slug: string
  title?: string
  className?: string
}

export function EnterChannelButton({ slug, title, className }: Props) {
  const [pending, startTransition] = useTransition()

  return (
    <button
      type="button"
      title={title}
      disabled={pending}
      onClick={() => startTransition(() => enterChannel(slug))}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-violet-50 hover:text-violet-600 disabled:opacity-50',
        className,
      )}
    >
      {pending ? <Loader2 size={18} className="animate-spin" /> : <ArrowUpRight size={18} />}
    </button>
  )
}
