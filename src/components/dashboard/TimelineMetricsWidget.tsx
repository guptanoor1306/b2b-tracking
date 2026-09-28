import { TimelineMetrics } from '@/lib/data/dashboard-metrics'
import { monthLabel, isAllMonths } from '@/lib/utils'
import { isLaSocialChannelDbName } from '@/lib/la-social-sla'
import { Clock, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  metrics: TimelineMetrics
  month: string
  channelDbName?: string | null
}

function TrendCell({
  trendPercent,
  previousLabel,
  comparisonMonth,
}: {
  trendPercent: number | null
  previousLabel: string | null
  comparisonMonth: string | null
}) {
  if (!comparisonMonth) {
    return <span className="text-xs text-zinc-400">—</span>
  }

  const priorMonthShort = monthLabel(comparisonMonth)

  if (trendPercent == null || !previousLabel || previousLabel === '—') {
    return (
      <span className="text-xs text-zinc-500">
        No avg in {priorMonthShort}
      </span>
    )
  }

  const slower = trendPercent > 0
  const faster = trendPercent < 0
  const flat = trendPercent === 0

  const changeLabel = flat
    ? 'Same as last month'
    : faster
      ? `${Math.abs(trendPercent)}% faster`
      : `${trendPercent}% slower`

  return (
    <div className="space-y-0.5">
      <span
        className={cn(
          'inline-flex items-center gap-1 text-xs font-medium',
          slower && 'text-amber-800',
          faster && 'text-emerald-800',
          flat && 'text-zinc-600',
        )}
      >
        {slower && <TrendingUp size={14} className="shrink-0" aria-hidden />}
        {faster && <TrendingDown size={14} className="shrink-0" aria-hidden />}
        {flat && <Minus size={14} className="shrink-0 opacity-70" aria-hidden />}
        {changeLabel}
      </span>
      <p className="text-[11px] text-zinc-500">
        Was <span className="tabular-nums font-medium text-zinc-600">{previousLabel}</span> in {priorMonthShort}
      </p>
    </div>
  )
}

export function TimelineMetricsWidget({ metrics, month, channelDbName }: Props) {
  const periodLabel = isAllMonths(month) ? 'All time' : monthLabel(month)
  const hoursLabel = isLaSocialChannelDbName(channelDbName) ? 'office hours' : 'business hours'
  const priorLabel = metrics.comparisonMonth ? monthLabel(metrics.comparisonMonth) : null

  if (metrics.metrics.length === 0) return null

  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">
            <Clock size={16} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Average stage times</h2>
            <p className="text-xs text-zinc-500">
              How long projects stayed in each stage · {hoursLabel}
            </p>
          </div>
        </div>
        {priorLabel ? (
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-zinc-500 sm:justify-end">
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
              Faster vs {priorLabel}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden />
              Slower vs {priorLabel}
            </span>
          </div>
        ) : null}
      </div>

      <div className="max-h-[min(24rem,55vh)] overflow-y-auto rounded-xl border border-zinc-200/80">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-zinc-200/80 bg-zinc-50 text-xs text-zinc-600">
            <tr>
              <th className="px-3 py-2.5 font-semibold">Stage</th>
              <th className="px-3 py-2.5 text-right font-semibold whitespace-nowrap">
                {periodLabel}
              </th>
              {priorLabel ? (
                <th className="px-3 py-2.5 font-semibold min-w-[9rem]">
                  Compared to {priorLabel}
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {metrics.metrics.map((metric, i) => (
              <tr
                key={metric.key}
                className={cn(
                  'border-b border-zinc-100 last:border-0',
                  i % 2 === 1 && 'bg-zinc-50/40',
                )}
              >
                <td className="px-3 py-3 text-[13px] font-medium text-zinc-800">{metric.label}</td>
                <td className="px-3 py-3 text-right text-sm font-semibold tabular-nums text-zinc-900 whitespace-nowrap">
                  {metric.averageLabel}
                </td>
                {priorLabel ? (
                  <td className="px-3 py-3">
                    <TrendCell
                      trendPercent={metric.trendPercent}
                      previousLabel={metric.previousAverageLabel}
                      comparisonMonth={metrics.comparisonMonth}
                    />
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
