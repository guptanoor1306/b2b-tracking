'use client'

import Link from 'next/link'
import { useState, type ReactNode } from 'react'
import { ArrowUpRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  slug: string
  title?: string
  className?: string
}

/** GET /studios/enter/[slug] sets cookie and redirects — faster than a server action round-trip. */
export function EnterChannelButton({ slug, title, className }: Props) {
  const [pending, setPending] = useState(false)

  return (
    <Link
      href={`/studios/enter/${slug}`}
      prefetch={false}
      title={title}
      aria-busy={pending}
      onClick={() => setPending(true)}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-violet-50 hover:text-violet-600',
        pending && 'pointer-events-none bg-violet-50 text-violet-600',
        className,
      )}
    >
      {pending ? <Loader2 size={18} className="animate-spin" /> : <ArrowUpRight size={18} />}
    </Link>
  )
}

type CardLinkProps = {
  slug: string
  pendingSlug: string | null
  onEnter: (slug: string) => void
  className?: string
  children: ReactNode
}

export function EnterChannelCardLink({ slug, pendingSlug, onEnter, className, children }: CardLinkProps) {
  const isPending = pendingSlug === slug
  const dimOthers = pendingSlug != null && !isPending

  return (
    <Link
      href={`/studios/enter/${slug}`}
      prefetch={false}
      aria-busy={isPending}
      onClick={() => onEnter(slug)}
      className={cn(
        className,
        'relative',
        isPending && 'pointer-events-none',
        dimOthers && 'pointer-events-none opacity-45',
      )}
    >
      {children}
      {isPending && (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-2xl bg-white/85 backdrop-blur-[2px]"
          aria-live="polite"
        >
          <Loader2 size={28} className="animate-spin text-violet-600" />
          <span className="text-xs font-medium text-violet-700">Opening channel…</span>
        </div>
      )}
    </Link>
  )
}
