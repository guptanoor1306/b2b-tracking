import { TimelineMetrics } from '@/lib/data/dashboard-metrics'
import { monthLabel, isAllMonths } from '@/lib/utils'
import { Clock } from 'lucide-react'

type Props = {
  metrics: TimelineMetrics
  month: string
}

export function TimelineMetricsWidget({ metrics, month }: Props) {
  const periodLabel = isAllMonths(month) ? 'All time' : monthLabel(month)

  if (metrics.metrics.length === 0) return null

  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">
          <Clock size={16} />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Average stage times</h2>
          <p className="text-xs text-zinc-500">{periodLabel} · business hours</p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.metrics.map(metric => (
          <div
            key={metric.key}
            className="rounded-lg border border-zinc-100 bg-zinc-50/50 px-3 py-2.5"
          >
            <p className="text-[11px] text-zinc-500">{metric.label}</p>
            <p className="mt-0.5 text-base font-medium tabular-nums text-zinc-900">
              {metric.averageLabel}
            </p>
            <p className="mt-0.5 text-[10px] text-zinc-400">
              {metric.sampleCount} video{metric.sampleCount !== 1 ? 's' : ''}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
