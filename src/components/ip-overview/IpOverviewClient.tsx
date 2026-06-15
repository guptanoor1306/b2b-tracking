'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { IpStats, periodLabel, computeOverviewTotals } from '@/lib/data/ip-stats'
import { cn } from '@/lib/utils'
import { ArrowUpRight, GitBranch, CheckCircle2, PauseCircle, Sparkles } from 'lucide-react'

type Props = {
  stats: IpStats[]
  period: 'week' | 'month'
}

function qualityTone(score: number): string {
  if (score >= 85) return 'text-emerald-400'
  if (score >= 70) return 'text-amber-400'
  return 'text-rose-400'
}

function DistributionBar({ pipeline, delivered, onHold }: { pipeline: number; delivered: number; onHold: number }) {
  const total = pipeline + delivered + onHold
  if (total === 0) {
    return <div className="h-1.5 rounded-full bg-white/[0.04] w-full" />
  }

  const pPct = (pipeline / total) * 100
  const dPct = (delivered / total) * 100
  const hPct = (onHold / total) * 100

  return (
    <div className="h-1.5 rounded-full bg-white/[0.04] w-full overflow-hidden flex">
      {pipeline > 0 && <div className="h-full bg-indigo-500/70" style={{ width: `${pPct}%` }} />}
      {delivered > 0 && <div className="h-full bg-emerald-500/70" style={{ width: `${dPct}%` }} />}
      {onHold > 0 && <div className="h-full bg-zinc-500/60" style={{ width: `${hPct}%` }} />}
    </div>
  )
}

const SUMMARY = [
  { key: 'pipeline', label: 'In pipeline', icon: GitBranch, color: 'text-indigo-400' },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle2, color: 'text-emerald-400' },
  { key: 'onHold', label: 'On hold', icon: PauseCircle, color: 'text-zinc-400' },
  { key: 'quality', label: 'Avg quality', icon: Sparkles, color: 'text-violet-400' },
] as const

export function IpOverviewClient({ stats, period }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const totals = computeOverviewTotals(stats)

  const setPeriod = (p: 'week' | 'month') => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('period', p)
    router.push(`/ip-overview?${params.toString()}`)
  }

  const summaryValues: Record<string, string | number> = {
    pipeline: totals.inPipeline,
    delivered: totals.delivered,
    onHold: totals.onHold,
    quality: totals.avgQuality ? `${totals.avgQuality}%` : '—',
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">IP Overview</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {periodLabel(period)} · {totals.totalProjects} projects across {stats.length} IPs
          </p>
        </div>
        <div className="flex rounded-lg border border-white/[0.08] overflow-hidden bg-white/[0.02]">
          {(['week', 'month'] as const).map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={cn(
                'px-4 py-1.5 text-xs transition-colors',
                period === p
                  ? 'bg-white/[0.06] text-zinc-200'
                  : 'text-zinc-500 hover:text-zinc-300'
              )}
            >
              {p === 'week' ? 'Weekly' : 'Monthly'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {SUMMARY.map(s => {
          const Icon = s.icon
          return (
            <div key={s.key} className="panel px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <Icon size={14} className={s.color} />
                <span className="text-[11px] text-zinc-500">{s.label}</span>
              </div>
              <p className="text-xl font-semibold text-zinc-100 tabular-nums">{summaryValues[s.key]}</p>
            </div>
          )
        })}
      </div>

      <div className="panel overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
          <p className="text-xs font-medium text-zinc-400">By intellectual property</p>
          <div className="flex items-center gap-3 text-[10px] text-zinc-600">
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500/70" /> Pipeline</span>
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500/70" /> Delivered</span>
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-zinc-500/60" /> Hold</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] text-zinc-600 uppercase border-b border-white/[0.04]">
                <th className="px-4 py-2.5 text-left font-medium">IP</th>
                <th className="px-3 py-2.5 text-right font-medium w-16">Active</th>
                <th className="px-3 py-2.5 text-right font-medium w-16">Done</th>
                <th className="px-3 py-2.5 text-right font-medium w-16">Hold</th>
                <th className="px-3 py-2.5 text-right font-medium w-16">Quality</th>
                <th className="px-4 py-2.5 text-left font-medium min-w-[140px]">Mix</th>
                <th className="px-3 py-2.5 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {stats.map(s => (
                <tr key={s.ip} className="group hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm text-zinc-200 font-medium">{s.ip}</p>
                    <p className="text-[10px] text-zinc-600 mt-0.5">{s.total} total</p>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-zinc-300">{s.inPipeline}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-emerald-400/90">{s.delivered}</td>
                  <td className="px-3 py-3 text-right tabular-nums text-zinc-500">{s.onHold}</td>
                  <td className={cn('px-3 py-3 text-right tabular-nums font-medium', qualityTone(s.avgQuality))}>
                    {s.avgQuality ? `${s.avgQuality}%` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <DistributionBar pipeline={s.inPipeline} delivered={s.delivered} onHold={s.onHold} />
                  </td>
                  <td className="px-3 py-3">
                    <Link
                      href={`/board?ip=${encodeURIComponent(s.ip)}`}
                      className="inline-flex items-center justify-center w-7 h-7 rounded-md text-zinc-600 hover:text-indigo-400 hover:bg-indigo-500/10 opacity-0 group-hover:opacity-100 transition-all"
                      title={`View ${s.ip} on board`}
                    >
                      <ArrowUpRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-white/[0.06] bg-white/[0.02] text-xs">
                <td className="px-4 py-2.5 font-medium text-zinc-400">All IPs</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-zinc-300">{totals.inPipeline}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-emerald-400/90">{totals.delivered}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-zinc-500">{totals.onHold}</td>
                <td className={cn('px-3 py-2.5 text-right tabular-nums font-medium', qualityTone(totals.avgQuality))}>
                  {totals.avgQuality ? `${totals.avgQuality}%` : '—'}
                </td>
                <td className="px-4 py-2.5">
                  <DistributionBar
                    pipeline={totals.inPipeline}
                    delivered={totals.delivered}
                    onHold={totals.onHold}
                  />
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
