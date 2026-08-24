import { OnTimeDeliveryStats } from '@/lib/data/dashboard-metrics'
import { monthLabel, isAllMonths, cn } from '@/lib/utils'
import { CheckCircle, GitBranch } from 'lucide-react'

type Props = {
  onTimeDelivery?: OnTimeDeliveryStats | null
  deliveredCount: number
  pipelineCount: number
  month: string
  showOnTimeRate?: boolean
}

export function DashboardStatsRow({
  onTimeDelivery, deliveredCount, pipelineCount, month, showOnTimeRate = true,
}: Props) {
  const periodLabel = isAllMonths(month) ? 'All time' : monthLabel(month)
  const { rate, onTime, total } = onTimeDelivery ?? { rate: null, onTime: 0, total: 0 }
  const hasDelivered = showOnTimeRate && total > 0

  return (
    <div className={cn(
      'grid grid-cols-1 gap-4',
      showOnTimeRate ? 'sm:grid-cols-3' : 'sm:grid-cols-2',
    )}>
      {showOnTimeRate && (
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm">
          <p className="text-xs text-zinc-500">On-time delivery rate · {periodLabel}</p>
          <p className={cn(
            'mt-2 text-3xl font-semibold tabular-nums',
            !hasDelivered ? 'text-zinc-400' : rate != null && rate >= 75 ? 'text-emerald-700' : 'text-red-600',
          )}>
            {hasDelivered && rate != null ? `${rate}%` : '—'}
          </p>
          {hasDelivered && (
            <p className="mt-1 text-xs text-zinc-500">
              {onTime} of {total} delivered on time
            </p>
          )}
          {hasDelivered && (
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-100">
              <div
                className={cn(
                  'h-full rounded-full',
                  rate != null && rate >= 75 ? 'bg-emerald-500/70' : 'bg-red-400/70',
                )}
                style={{ width: `${rate ?? 0}%` }}
              />
            </div>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm text-center">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
          <CheckCircle size={20} />
        </div>
        <p className="text-3xl font-bold tabular-nums text-zinc-900">{deliveredCount}</p>
        <p className="mt-1 text-xs text-zinc-500">Delivered</p>
      </div>

      <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm text-center">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
          <GitBranch size={20} />
        </div>
        <p className="text-3xl font-bold tabular-nums text-zinc-900">{pipelineCount}</p>
        <p className="mt-1 text-xs text-zinc-500">In pipeline</p>
      </div>
    </div>
  )
}
