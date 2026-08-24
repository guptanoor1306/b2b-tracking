import { TeamPerformanceStats } from '@/lib/data/team-stats'
import { AssigneeAvatar } from '@/components/ui/AssigneeAvatar'
import { monthLabel, isAllMonths, cn } from '@/lib/utils'
import { Users } from 'lucide-react'

type Props = {
  stats: TeamPerformanceStats
  month: string
}

function formatOnTime(rate: number | null): string {
  if (rate === null) return '—'
  return `${rate}%`
}

function onTimeClass(rate: number | null): string {
  if (rate === null) return 'text-zinc-500'
  return rate >= 75 ? 'text-emerald-600' : 'text-red-500'
}

export function TeamPerformanceVitals({ stats, month }: Props) {
  const periodLabel = isAllMonths(month) ? 'All time' : monthLabel(month)
  const { members } = stats

  if (members.length === 0) return null

  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">
          <Users size={16} />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Team performance</h2>
          <p className="text-xs text-zinc-500">{periodLabel}</p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {members.map(member => (
          <div
            key={member.id}
            className="rounded-lg border border-zinc-100 px-3 py-2.5"
          >
            <div className="mb-2.5 flex items-center gap-2">
              <AssigneeAvatar name={member.name} id={member.id} size="sm" theme="light" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-900">{member.name}</p>
                <p className="truncate text-[11px] text-zinc-500">{member.roleLabel}</p>
              </div>
            </div>

            <dl className="grid grid-cols-3 gap-1 text-center">
              <div>
                <dt className="text-[10px] text-zinc-400">Delivered</dt>
                <dd className="text-sm tabular-nums text-zinc-800">{member.delivered}</dd>
              </div>
              <div>
                <dt className="text-[10px] text-zinc-400">Pipeline</dt>
                <dd className="text-sm tabular-nums text-zinc-800">{member.inPipeline}</dd>
              </div>
              <div>
                <dt className="text-[10px] text-zinc-400">On-time</dt>
                <dd className={cn('text-sm tabular-nums', onTimeClass(member.onTimeRate))}>
                  {formatOnTime(member.onTimeRate)}
                </dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
    </section>
  )
}
