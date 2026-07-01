'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  ArrowUpRight, GitBranch, CheckCircle2, PauseCircle, Sparkles, Lock,
} from 'lucide-react'
import { ChannelStats, computeOverviewTotals, periodLabel } from '@/lib/data/channel-stats'

type Props = {
  stats: ChannelStats[]
  period: 'week' | 'month'
  accessibleSlugs: string[]
  isSuperAdmin: boolean
  profileName: string
}

function qualityTone(score: number): string {
  if (score >= 85) return 'text-emerald-700'
  if (score >= 70) return 'text-amber-700'
  return 'text-orange-700'
}

function DistributionBar({ pipeline, delivered, onHold }: { pipeline: number; delivered: number; onHold: number }) {
  const total = pipeline + delivered + onHold
  if (total === 0) return <div className="h-1.5 w-full rounded-full bg-zinc-100" />

  const pPct = (pipeline / total) * 100
  const dPct = (delivered / total) * 100
  const hPct = (onHold / total) * 100

  return (
    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
      {pipeline > 0 && <div className="h-full bg-violet-500" style={{ width: `${pPct}%` }} />}
      {delivered > 0 && <div className="h-full bg-emerald-500" style={{ width: `${dPct}%` }} />}
      {onHold > 0 && <div className="h-full bg-zinc-400" style={{ width: `${hPct}%` }} />}
    </div>
  )
}

const SUMMARY = [
  { key: 'pipeline', label: 'In pipeline', icon: GitBranch, color: 'text-violet-600', bg: 'bg-violet-50' },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { key: 'onHold', label: 'On hold', icon: PauseCircle, color: 'text-zinc-600', bg: 'bg-zinc-100' },
  { key: 'quality', label: 'Avg quality', icon: Sparkles, color: 'text-violet-600', bg: 'bg-violet-50' },
] as const

export function ChannelOverviewClient({
  stats, period, accessibleSlugs, isSuperAdmin, profileName,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const totals = computeOverviewTotals(stats.map(s => ({
    ip: s.name,
    total: s.total,
    inPipeline: s.inPipeline,
    delivered: s.delivered,
    onHold: s.onHold,
    avgQuality: s.avgQuality,
    projects: [],
  })))

  const setPeriod = (p: 'week' | 'month') => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('period', p)
    router.push(`/studios?${params.toString()}`)
  }

  const summaryValues: Record<string, string | number> = {
    pipeline: totals.inPipeline,
    delivered: totals.delivered,
    onHold: totals.onHold,
    quality: totals.avgQuality ? `${totals.avgQuality}%` : '—',
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-sm font-bold text-white shadow-sm">
              LS
            </div>
            <div>
              <h1 className="text-xl font-semibold text-zinc-900">LearnApp Studios</h1>
              <p className="text-sm text-zinc-500">
                Welcome back, {profileName}
                {isSuperAdmin ? ' · All channels' : ` · ${accessibleSlugs.length} channel${accessibleSlugs.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
          <p className="text-sm text-zinc-500">
            {periodLabel(period)} · {totals.totalProjects} projects across {stats.length} channels
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-zinc-200 bg-white">
            {(['week', 'month'] as const).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={cn(
                  'px-4 py-1.5 text-xs font-medium transition-colors',
                  period === p ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'
                )}
              >
                {p === 'week' ? 'Weekly' : 'Monthly'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {SUMMARY.map(s => {
          const Icon = s.icon
          return (
            <div key={s.key} className="rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
              <div className="mb-1 flex items-center gap-2">
                <div className={cn('rounded-md p-1', s.bg)}>
                  <Icon size={14} className={s.color} />
                </div>
                <span className="text-[11px] font-medium text-zinc-500">{s.label}</span>
              </div>
              <p className="text-xl font-semibold tabular-nums text-zinc-900">{summaryValues[s.key]}</p>
            </div>
          )
        })}
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
          <p className="text-xs font-semibold text-zinc-700">By channel</p>
          <div className="flex items-center gap-3 text-[10px] text-zinc-500">
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-violet-500" /> Pipeline</span>
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Delivered</span>
            <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-zinc-400" /> Hold</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/80 text-[10px] uppercase text-zinc-500">
                <th className="px-4 py-2.5 text-left font-semibold">Channel</th>
                <th className="w-16 px-3 py-2.5 text-right font-semibold">Active</th>
                <th className="w-16 px-3 py-2.5 text-right font-semibold">Done</th>
                <th className="w-16 px-3 py-2.5 text-right font-semibold">Hold</th>
                <th className="w-16 px-3 py-2.5 text-right font-semibold">Quality</th>
                <th className="min-w-[140px] px-4 py-2.5 text-left font-semibold">Mix</th>
                <th className="w-10 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {stats.map(s => {
                const hasAccess = accessibleSlugs.includes(s.slug)
                return (
                  <tr
                    key={s.slug}
                    className={cn(
                      'group transition-colors',
                      hasAccess ? 'hover:bg-zinc-50' : 'opacity-60'
                    )}
                  >
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-zinc-900">{s.name}</p>
                      <p className="mt-0.5 text-[10px] text-zinc-500">
                        {s.total} total{s.memberCount > 0 ? ` · ${s.memberCount} members` : ''}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-zinc-700">{s.inPipeline}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-emerald-700">{s.delivered}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-zinc-500">{s.onHold}</td>
                    <td className={cn('px-3 py-3 text-right tabular-nums font-medium', qualityTone(s.avgQuality))}>
                      {s.avgQuality ? `${s.avgQuality}%` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <DistributionBar pipeline={s.inPipeline} delivered={s.delivered} onHold={s.onHold} />
                    </td>
                    <td className="px-3 py-3">
                      {hasAccess ? (
                        <Link
                          href={`/studios/enter/${s.slug}`}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 opacity-0 transition-all hover:bg-violet-50 hover:text-violet-600 group-hover:opacity-100"
                          title={`Enter ${s.name}`}
                        >
                          <ArrowUpRight size={14} />
                        </Link>
                      ) : (
                        <span
                          className="inline-flex h-7 w-7 items-center justify-center text-zinc-300"
                          title="No access"
                        >
                          <Lock size={13} />
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-zinc-200 bg-zinc-50 text-xs">
                <td className="px-4 py-2.5 font-semibold text-zinc-600">All channels</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-zinc-700">{totals.inPipeline}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-emerald-700">{totals.delivered}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-zinc-500">{totals.onHold}</td>
                <td className={cn('px-3 py-2.5 text-right tabular-nums font-semibold', qualityTone(totals.avgQuality))}>
                  {totals.avgQuality ? `${totals.avgQuality}%` : '—'}
                </td>
                <td className="px-4 py-2.5">
                  <DistributionBar pipeline={totals.inPipeline} delivered={totals.delivered} onHold={totals.onHold} />
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
