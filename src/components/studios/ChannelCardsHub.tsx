'use client'

import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ChannelStats } from '@/lib/data/channel-stats'
import { getChannelBySlug } from '@/lib/channels'

type Props = {
  stats: ChannelStats[]
  accessibleSlugs: string[]
  profileName: string
}

export function ChannelCardsHub({ stats, accessibleSlugs, profileName }: Props) {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-sm font-bold text-white shadow-sm">
              LS
            </div>
            <div>
              <h1 className="text-xl font-semibold text-zinc-900">LearnApp Studios</h1>
              <p className="text-sm text-zinc-500">
                Welcome back, {profileName} · {accessibleSlugs.length} channel{accessibleSlugs.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <p className="text-sm text-zinc-500">Select a channel to open your production dashboard.</p>
        </div>
      </header>

      {stats.length > 0 ? (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Your channels</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stats.map(s => (
              <ChannelCard key={s.slug} stat={s} />
            ))}
          </div>
        </section>
      ) : (
        <p className="rounded-xl border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-500">
          No channel access yet. Ask your admin to grant access.
        </p>
      )}
    </div>
  )
}

function ChannelCard({ stat }: { stat: ChannelStats }) {
  const ch = getChannelBySlug(stat.slug)

  return (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm transition-all hover:border-zinc-300 hover:shadow-md">
      {ch && (
        <div className={cn(
          'absolute inset-x-0 top-0 h-1 bg-gradient-to-r',
          ch.gradientFrom,
          ch.gradientTo,
        )} />
      )}

      <div className="flex items-start justify-between gap-3">
        <div className={cn(
          'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-bold text-white shadow-sm',
          ch?.gradientFrom ?? 'from-zinc-400',
          ch?.gradientTo ?? 'to-zinc-500',
        )}>
          {ch?.initial ?? '?'}
        </div>
        <Link
          href={`/studios/enter/${stat.slug}`}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-violet-50 hover:text-violet-600"
          title={`Enter ${stat.name}`}
        >
          <ArrowUpRight size={18} />
        </Link>
      </div>

      <h3 className="mt-4 text-base font-bold text-zinc-900">{stat.name}</h3>
      <p className="mt-0.5 text-sm text-zinc-500 line-clamp-2">{stat.tagline}</p>

      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-zinc-100 pt-4">
        <MiniStat label="Active" value={stat.inPipeline} />
        <MiniStat label="Done" value={stat.delivered} accent="text-emerald-600" />
        <MiniStat label="Hold" value={stat.onHold} muted />
      </div>
    </div>
  )
}

function MiniStat({
  label, value, accent, muted,
}: {
  label: string
  value: number
  accent?: string
  muted?: boolean
}) {
  return (
    <div className="text-center">
      <p className={cn(
        'text-lg font-semibold tabular-nums',
        muted ? 'text-zinc-400' : accent ?? 'text-zinc-800'
      )}>
        {value}
      </p>
      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">{label}</p>
    </div>
  )
}
