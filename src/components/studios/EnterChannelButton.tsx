'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { ArrowUpRight } from 'lucide-react'

type Props = {
  slug: string
  title?: string
  className?: string
}

/** GET /studios/enter/[slug] sets cookie and redirects — faster than a server action round-trip. */
export function EnterChannelButton({ slug, title, className }: Props) {
  return (
    <Link
      href={`/studios/enter/${slug}`}
      prefetch={false}
      title={title}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-violet-50 hover:text-violet-600',
        className,
      )}
    >
      <ArrowUpRight size={18} />
    </Link>
  )
}
